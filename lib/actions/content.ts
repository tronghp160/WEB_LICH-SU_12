"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditContent, canSubmitForReview, contentPaths, parseContentSegment, type ContentKind } from "@/lib/admin/content-kinds";
import { evaluateReadiness, isReady } from "@/lib/admin/readiness";
import { requireRole } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { getReadinessSnapshot, isUuid } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import type { DbErrorLike } from "@/lib/utils/db-errors";
import type { StaffRole } from "@/lib/utils/labels";
import {
  eventLinksSchema,
  eventSchema,
  figureSchema,
  locationSchema,
  mediaSchema,
  mediaUpdateSchema,
  sourceSchema,
  topicSchema,
  type EventLinksInput,
} from "@/lib/validation/content";
import { dbErrorState, readFormValues, zodErrorState, type ActionState } from "@/lib/actions/state";

// Mọi action ở đây chạy bằng PHIÊN của nhân sự → RLS ở database là lớp quyết định cuối cùng.
// requireRole() chỉ để chặn sớm và cho thông báo thân thiện; nó KHÔNG thay thế RLS.

const EDIT_ROLES = ["editor", "system_admin"] as const;

const NOT_EDITABLE_MESSAGE =
  "Không sửa được: nội dung không tồn tại hoặc đã chuyển sang trạng thái không cho phép chỉnh sửa (đang chờ duyệt hoặc đã công bố).";

type Db = SupabaseClient<Database>;
type Result<T> = PromiseLike<{ data: T | null; error: DbErrorLike | null }>;

function errorState(message: string, values: Record<string, string>): ActionState {
  return { status: "error", message, values };
}

/**
 * Khung chung cho "tạo mới hoặc cập nhật một bản ghi":
 *  - có `id` → cập nhật; RLS chặn thì 0 dòng bị ảnh hưởng → báo "không sửa được"
 *  - không có `id` → tạo mới ở trạng thái `draft` rồi chuyển tới trang sửa
 */
async function saveRecord(options: {
  segment: "chu-de" | "su-kien" | "nhan-vat" | "dia-diem" | "nguon";
  label: string;
  values: Record<string, string>;
  update: (db: Db, id: string) => Result<{ id: string }[]>;
  insert: (db: Db) => Result<{ id: string }>;
  /** Chạy sau khi ghi bản ghi chính (ví dụ lưu liên kết của sự kiện). */
  afterSave?: (db: Db, id: string) => Promise<DbErrorLike | null>;
}): Promise<ActionState> {
  const { segment, label, values } = options;
  const id = values.id?.trim();
  const supabase = await createClient();

  if (id) {
    if (!isUuid(id)) return errorState("Mã nội dung không hợp lệ.", values);

    const { data, error } = await options.update(supabase, id);
    if (error) return dbErrorState(error, values);
    if (!data || data.length === 0) return errorState(NOT_EDITABLE_MESSAGE, values);

    if (options.afterSave) {
      const linkError = await options.afterSave(supabase, id);
      if (linkError) {
        const state = dbErrorState(linkError, values);
        return { ...state, message: `Đã lưu thông tin chính nhưng chưa lưu được liên kết: ${state.message}` };
      }
    }
    // Làm mới trang sửa: checklist "Gửi duyệt" và danh sách liên kết được dựng ở server từ dữ liệu vừa lưu.
    revalidatePath(contentPaths.edit(segment, id));
    return { status: "success", message: `Đã lưu ${label}.`, values };
  }

  const { data, error } = await options.insert(supabase);
  if (error) return dbErrorState(error, values);
  if (!data) return errorState("Không tạo được bản ghi. Vui lòng thử lại.", values);

  let notice = "da-tao";
  if (options.afterSave && (await options.afterSave(supabase, data.id))) notice = "da-tao-loi-lien-ket";

  // Ngoài try/catch: redirect() hoạt động bằng cách ném một lỗi đặc biệt.
  redirect(`${contentPaths.edit(segment, data.id)}?thong-bao=${notice}`);
}

// ---------- Chủ đề ----------

export async function saveTopicAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = topicSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  return saveRecord({
    segment: "chu-de",
    label: "chủ đề",
    values,
    update: (db, id) => db.from("curriculum_topics").update(parsed.data).eq("id", id).select("id"),
    insert: (db) =>
      db.from("curriculum_topics").insert({ ...parsed.data, workflow_status: "draft" }).select("id").single(),
  });
}

// ---------- Nhân vật ----------

export async function saveFigureAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = figureSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  return saveRecord({
    segment: "nhan-vat",
    label: "nhân vật",
    values,
    update: (db, id) => db.from("historical_figures").update(parsed.data).eq("id", id).select("id"),
    insert: (db) =>
      db.from("historical_figures").insert({ ...parsed.data, workflow_status: "draft" }).select("id").single(),
  });
}

// ---------- Địa điểm ----------

export async function saveLocationAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = locationSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  // Cột `geom` là cột sinh tự động từ latitude/longitude → KHÔNG ghi trực tiếp.
  return saveRecord({
    segment: "dia-diem",
    label: "địa điểm",
    values,
    update: (db, id) => db.from("historical_locations").update(parsed.data).eq("id", id).select("id"),
    insert: (db) =>
      db.from("historical_locations").insert({ ...parsed.data, workflow_status: "draft" }).select("id").single(),
  });
}

// ---------- Sự kiện (kèm liên kết) ----------

/**
 * Đồng bộ liên kết của sự kiện theo danh sách mới. Thứ tự "thêm/cập nhật trước, xóa phần thừa sau"
 * để nếu gián đoạn giữa chừng thì không mất hết liên kết cũ (supabase-js không có transaction).
 */
async function applyEventLinks(db: Db, eventId: string, links: EventLinksInput): Promise<DbErrorLike | null> {
  // Nhân vật
  if (links.figures.length > 0) {
    const { error } = await db.from("event_figures").upsert(
      links.figures.map((link, index) => ({
        event_id: eventId,
        figure_id: link.figure_id,
        relationship: link.relationship,
        sort_order: index,
      })),
      { onConflict: "event_id,figure_id" },
    );
    if (error) return error;
  }
  {
    const keep = links.figures.map((link) => link.figure_id);
    const query = db.from("event_figures").delete().eq("event_id", eventId);
    const { error } = keep.length > 0 ? await query.not("figure_id", "in", `(${keep.join(",")})`) : await query;
    if (error) return error;
  }

  // Địa điểm: bỏ cờ "chính" cũ trước để không vi phạm partial unique (mỗi sự kiện tối đa 1 địa điểm chính).
  {
    const { error } = await db.from("event_locations").update({ is_primary: false }).eq("event_id", eventId);
    if (error) return error;
  }
  if (links.locations.length > 0) {
    const { error } = await db.from("event_locations").upsert(
      links.locations.map((link) => ({
        event_id: eventId,
        location_id: link.location_id,
        location_role: link.location_role,
        is_primary: link.is_primary,
      })),
      { onConflict: "event_id,location_id" },
    );
    if (error) return error;
  }
  {
    const keep = links.locations.map((link) => link.location_id);
    const query = db.from("event_locations").delete().eq("event_id", eventId);
    const { error } = keep.length > 0 ? await query.not("location_id", "in", `(${keep.join(",")})`) : await query;
    if (error) return error;
  }

  // Nguồn
  if (links.sources.length > 0) {
    const { error } = await db.from("event_sources").upsert(
      links.sources.map((link) => ({
        event_id: eventId,
        source_id: link.source_id,
        source_note: link.source_note,
        confidence_note: link.confidence_note,
      })),
      { onConflict: "event_id,source_id" },
    );
    if (error) return error;
  }
  {
    const keep = links.sources.map((link) => link.source_id);
    const query = db.from("event_sources").delete().eq("event_id", eventId);
    const { error } = keep.length > 0 ? await query.not("source_id", "in", `(${keep.join(",")})`) : await query;
    if (error) return error;
  }

  return null;
}

export async function saveEventAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);

  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  let rawLinks: unknown;
  try {
    rawLinks = JSON.parse(values.links || '{"figures":[],"locations":[],"sources":[]}');
  } catch {
    return errorState("Danh sách liên kết không hợp lệ. Hãy tải lại trang và thử lại.", values);
  }
  const links = eventLinksSchema.safeParse(rawLinks);
  if (!links.success) {
    return errorState(links.error.issues[0]?.message ?? "Danh sách liên kết không hợp lệ.", values);
  }

  return saveRecord({
    segment: "su-kien",
    label: "sự kiện",
    values,
    update: (db, id) => db.from("historical_events").update(parsed.data).eq("id", id).select("id"),
    insert: (db) =>
      db.from("historical_events").insert({ ...parsed.data, workflow_status: "draft" }).select("id").single(),
    afterSave: (db, id) => applyEventLinks(db, id, links.data),
  });
}

// ---------- Nguồn tham khảo (UC08) ----------

export async function saveSourceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = sourceSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  return saveRecord({
    segment: "nguon",
    label: "nguồn",
    values,
    update: (db, id) => db.from("sources").update(parsed.data).eq("id", id).select("id"),
    insert: (db) => db.from("sources").insert(parsed.data).select("id").single(),
  });
}

/** Xóa nguồn: bị chặn nếu đang được sự kiện sử dụng (khóa ngoại) — thông báo tiếng Việt. */
export async function deleteSourceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const id = values.id?.trim() ?? "";
  if (!isUuid(id)) return errorState("Mã nguồn không hợp lệ.", values);

  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").delete().eq("id", id).select("id");
  if (error) {
    const state = dbErrorState(error, values);
    return error.code === "23503"
      ? { ...state, message: "Không xóa được nguồn này vì đang được gắn với sự kiện. Hãy gỡ nguồn khỏi các sự kiện trước." }
      : state;
  }
  if (!data || data.length === 0) return errorState("Không xóa được: nguồn không tồn tại hoặc bạn không có quyền.", values);

  redirect(`${contentPaths.list("nguon")}?thong-bao=da-xoa`);
}

// ---------- Media (UC08) ----------

/** Chỉ cho sửa media khi sự kiện đang ở trạng thái mà vai trò hiện tại được phép chỉnh sửa. */
async function assertEventEditable(db: Db, eventId: string, role: StaffRole): Promise<string | null> {
  const { data, error } = await db.from("historical_events").select("workflow_status").eq("id", eventId).maybeSingle();
  if (error) return dbErrorState(error, {}).message ?? "Không kiểm tra được sự kiện.";
  if (!data) return "Sự kiện không tồn tại.";
  return canEditContent(role, data.workflow_status) ? null : NOT_EDITABLE_MESSAGE;
}

export async function addMediaAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = mediaSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  const supabase = await createClient();
  const blocked = await assertEventEditable(supabase, parsed.data.event_id, staff.role);
  if (blocked) return errorState(blocked, values);

  const { count } = await supabase
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", parsed.data.event_id);

  const { error } = await supabase.from("media_assets").insert({
    ...parsed.data,
    media_type: "image",
    sort_order: (count ?? 0) + 1,
  });
  if (error) return dbErrorState(error, values);

  revalidatePath(contentPaths.edit("su-kien", parsed.data.event_id));
  return { status: "success", message: "Đã thêm ảnh.", values: {} };
}

export async function updateMediaAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const mediaId = values.media_id?.trim() ?? "";
  if (!isUuid(mediaId)) return errorState("Mã ảnh không hợp lệ.", values);

  const parsed = mediaUpdateSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  const supabase = await createClient();
  const blocked = await assertEventEditable(supabase, parsed.data.event_id, staff.role);
  if (blocked) return errorState(blocked, values);

  const { data, error } = await supabase
    .from("media_assets")
    .update({ alt_text: parsed.data.alt_text, caption: parsed.data.caption, source_id: parsed.data.source_id })
    .eq("id", mediaId)
    .eq("event_id", parsed.data.event_id)
    .select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return errorState("Không tìm thấy ảnh cần sửa.", values);

  revalidatePath(contentPaths.edit("su-kien", parsed.data.event_id));
  return { status: "success", message: "Đã cập nhật ảnh.", values };
}

export async function deleteMediaAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const mediaId = values.media_id?.trim() ?? "";
  const eventId = values.event_id?.trim() ?? "";
  if (!isUuid(mediaId) || !isUuid(eventId)) return errorState("Mã ảnh không hợp lệ.", values);

  const supabase = await createClient();
  const blocked = await assertEventEditable(supabase, eventId, staff.role);
  if (blocked) return errorState(blocked, values);

  const { data, error } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", mediaId)
    .eq("event_id", eventId)
    .select("file_url");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return errorState("Không tìm thấy ảnh cần xóa.", values);

  // Dọn tệp trong Storage nếu ảnh do hệ thống lưu (bỏ qua nếu là URL bên ngoài). Lỗi dọn không làm hỏng thao tác.
  const match = /\/storage\/v1\/object\/public\/media\/(.+)$/.exec(data[0].file_url);
  if (match) {
    await supabase.storage.from("media").remove([decodeURIComponent(match[1])]);
  }

  revalidatePath(contentPaths.edit("su-kien", eventId));
  return { status: "success", message: "Đã xóa ảnh.", values: {} };
}

// ---------- Gửi kiểm duyệt (UC09) ----------

/**
 * Gửi một bản ghi sang `pending_review`. Kiểm tra lại toàn bộ điều kiện Ở SERVER (dữ liệu mới nhất
 * trong DB, không tin client): thiếu điều kiện bắt buộc thì giữ nguyên trạng thái và liệt kê lỗi.
 * Trigger G4 ở database là chốt chặn cuối cho quy tắc "≥ 1 nguồn".
 */
export async function submitForReviewAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);

  const segment = parseContentSegment(values.kind ?? "");
  const id = values.id?.trim() ?? "";
  if (!segment || segment === "nguon" || !isUuid(id)) return errorState("Yêu cầu không hợp lệ.", values);
  const kind: ContentKind = segment;

  const current = await getReadinessSnapshot(kind, id);
  if (!current) return errorState("Nội dung không tồn tại.", values);
  if (!canSubmitForReview(staff.role, current.status)) {
    return errorState("Chỉ gửi duyệt được bản nháp hoặc bản đang cần chỉnh sửa.", values);
  }

  const readiness = evaluateReadiness(current.snapshot);
  if (!isReady(readiness)) {
    return {
      status: "error",
      message: "Chưa thể gửi duyệt. Vui lòng bổ sung các mục bắt buộc bên dưới rồi thử lại.",
      warnings: readiness.blocking,
      values,
    };
  }

  const table = {
    "chu-de": "curriculum_topics",
    "su-kien": "historical_events",
    "nhan-vat": "historical_figures",
    "dia-diem": "historical_locations",
  }[kind] as "curriculum_topics" | "historical_events" | "historical_figures" | "historical_locations";

  const supabase = await createClient();
  // Điều kiện `in(...)` chặn xử lý đồng thời: nếu bản ghi vừa đổi trạng thái thì không có dòng nào bị cập nhật.
  const { data, error } = await supabase
    .from(table)
    .update({ workflow_status: "pending_review" })
    .eq("id", id)
    .in("workflow_status", ["draft", "needs_revision"])
    .select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) {
    return errorState("Không gửi duyệt được: nội dung đã đổi trạng thái hoặc bạn không có quyền. Hãy tải lại trang.", values);
  }

  redirect(`${contentPaths.list(kind)}?thong-bao=da-gui-duyet`);
}
