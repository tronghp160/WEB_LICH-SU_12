"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbErrorState, readFormValues, type ActionState } from "@/lib/actions/state";
import { canEditContent } from "@/lib/admin/content-kinds";
import { REVIEW_TRANSITIONS, parseReviewAction, reviewNoteFor, revisionReasonSchema } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { canSubmitExam, examAdminPaths } from "@/lib/exams/admin";
import { addItemToSet, publishPassageOf } from "@/lib/exams/bank-server";
import {
  examBankPaths,
  examItemSchema,
  importHasErrors,
  itemErrorField,
  itemFromForm,
  passageSchema,
  planImport,
  type ExamItemInput,
  type ImportPlan,
} from "@/lib/exams/items";
import type { Json } from "@/lib/database.types";
import { isUuid } from "@/lib/queries/admin-content";
import { getImportContext } from "@/lib/queries/exam-bank";
import { createClient } from "@/lib/supabase/server";
import { translateDbError, type DbErrorLike } from "@/lib/utils/db-errors";
import type { WorkflowStatus } from "@/lib/utils/labels";
import type { ZodError } from "zod";

// Ngân hàng câu hỏi luyện thi (docs/ke-hoach-luyen-thi.md, GĐ1). Chạy bằng PHIÊN nhân sự → RLS của exam_items /
// exam_passages quyết định cuối cùng (biên tập viên chỉ sửa câu đang nháp / cần chỉnh sửa, không tự công bố). Kiểm tra
// ở đây chỉ để báo lỗi sớm, dễ hiểu.

const EDIT_ROLES = ["editor", "system_admin"] as const;
const REVIEW_ROLES = ["reviewer", "system_admin"] as const;
/** Tối đa số câu mỗi lần thao tác hàng loạt. */
const BULK_LIMIT = 200;

const fail = (message: string, values: Record<string, string> = {}): ActionState => ({ status: "error", message, values });

function itemZodError(error: ZodError, values: Record<string, string>): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = itemErrorField(issue.path);
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return { status: "error", message: "Vui lòng kiểm tra lại các trường được đánh dấu.", fieldErrors, values };
}

function bankDbError(error: DbErrorLike, values: Record<string, string>): ActionState {
  if (error.code === "23505" && /fingerprint/.test(`${error.message ?? ""} ${error.details ?? ""}`)) {
    return fail("Câu này trùng với một câu đã có trong ngân hàng (cùng câu hỏi và cùng các lựa chọn / ý).", values);
  }
  if (error.code === "23505" && /content_key/.test(`${error.message ?? ""} ${error.details ?? ""}`)) {
    return fail("content_key của câu đã có trong ngân hàng — đổi khóa khác.", values);
  }
  if (error.code === "23503") return fail("Không xóa được: câu / tư liệu đang được dùng trong đề hoặc trong câu hỏi khác. Gỡ ra trước.", values);
  return dbErrorState(error, values);
}

/** Cột ghi từ form / tệp nhập. KHÔNG có content_key: form không sửa khóa này (chỉ tệp nhập đặt, lúc tạo câu). */
function itemColumns(item: ExamItemInput) {
  return {
    kind: item.kind,
    stem: item.stem,
    passage_id: item.passage_id,
    choices: item.choices,
    correct_index: item.correct_index,
    choice_notes: item.choice_notes as Json | null,
    statements: item.statements as Json | null,
    explanation: item.explanation,
    remember: item.remember,
    section_id: item.section_id,
    grade: item.grade,
    lesson_slug: item.lesson_slug,
    topic_tag: item.topic_tag,
    level: item.level,
    competency: item.competency,
    event_id: item.event_id,
    source_note: item.source_note,
  };
}

function refreshBank(id?: string) {
  revalidatePath(examBankPaths.list);
  if (id) revalidatePath(examBankPaths.edit(id));
}

// ---------------------------------------------------------------------------------------------------------------
// Câu hỏi
// ---------------------------------------------------------------------------------------------------------------

/** Tạo (không có `id`) hoặc sửa câu hỏi. Tạo xong chuyển sang trang câu; có `add_to_set` thì thêm luôn vào đề đó. */
export async function saveExamItemAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = examItemSchema.safeParse(itemFromForm(values));
  if (!parsed.success) return itemZodError(parsed.error, values);
  const supabase = await createClient();

  if (values.id) {
    if (!isUuid(values.id)) return fail("Mã câu hỏi không hợp lệ.", values);
    const { data: current } = await supabase.from("exam_items").select("kind, workflow_status").eq("id", values.id).maybeSingle();
    if (!current) return fail("Không tìm thấy câu hỏi.", values);
    if (!canEditContent(staff.role, current.workflow_status)) {
      return fail("Câu đang chờ duyệt hoặc đã công bố nên không sửa được. Cần kiểm duyệt viên trả về chỉnh sửa.", values);
    }
    if (current.kind !== parsed.data.kind) return fail("Không đổi được dạng câu. Hãy tạo câu mới.", values);
    const { data, error } = await supabase.from("exam_items").update(itemColumns(parsed.data)).eq("id", values.id).select("id");
    if (error) return bankDbError(error, values);
    if (!data || data.length === 0) return fail("Không lưu được (câu đã đổi trạng thái hoặc bạn không có quyền).", values);
    refreshBank(values.id);
    return { status: "success", message: "Đã lưu câu hỏi.", values };
  }

  const { data, error } = await supabase.from("exam_items").insert(itemColumns(parsed.data)).select("id").single();
  if (error) return bankDbError(error, values);
  refreshBank();
  if (values.add_to_set && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.add_to_set)) {
    const problem = await addItemToSet(values.add_to_set, data.id);
    revalidatePath(examAdminPaths.edit(values.add_to_set));
    redirect(problem ? `${examBankPaths.edit(data.id)}?thong-bao=chua-them-vao-de` : `${examAdminPaths.edit(values.add_to_set)}?thong-bao=da-them-cau`);
  }
  redirect(`${examBankPaths.edit(data.id)}?thong-bao=da-tao`);
}

// ---------------------------------------------------------------------------------------------------------------
// Tư liệu
// ---------------------------------------------------------------------------------------------------------------

export async function savePassageAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = passageSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "_")] ??= issue.message;
    return { status: "error", message: "Vui lòng kiểm tra lại các trường được đánh dấu.", fieldErrors, values };
  }
  const supabase = await createClient();

  if (values.id) {
    if (!isUuid(values.id)) return fail("Mã tư liệu không hợp lệ.", values);
    const { data: current } = await supabase.from("exam_passages").select("workflow_status").eq("id", values.id).maybeSingle();
    if (!current) return fail("Không tìm thấy tư liệu.", values);
    if (!canEditContent(staff.role, current.workflow_status)) {
      return fail("Tư liệu đang chờ duyệt hoặc đã công bố nên không sửa được. Cần kiểm duyệt viên trả về chỉnh sửa.", values);
    }
    const { data, error } = await supabase.from("exam_passages").update(parsed.data).eq("id", values.id).select("id");
    if (error) return bankDbError(error, values);
    if (!data || data.length === 0) return fail("Không lưu được (tư liệu đã đổi trạng thái hoặc bạn không có quyền).", values);
    revalidatePath(examBankPaths.passages);
    revalidatePath(examBankPaths.passage(values.id));
    return { status: "success", message: "Đã lưu tư liệu.", values };
  }

  const { data, error } = await supabase.from("exam_passages").insert(parsed.data).select("id").single();
  if (error) return bankDbError(error, values);
  revalidatePath(examBankPaths.passages);
  redirect(`${examBankPaths.passage(data.id)}?thong-bao=da-tao`);
}

// ---------------------------------------------------------------------------------------------------------------
// Gửi duyệt / kiểm duyệt / xóa — dùng chung cho câu ("cau") và tư liệu ("tu-lieu")
// ---------------------------------------------------------------------------------------------------------------

type BankKind = "cau" | "tu-lieu";
const tableOf = (kind: BankKind) => (kind === "cau" ? "exam_items" : "exam_passages");
const parseBankKind = (value: string | undefined): BankKind | null => (value === "cau" || value === "tu-lieu" ? value : null);
const pathOf = (kind: BankKind, id: string) => (kind === "cau" ? examBankPaths.edit(id) : examBankPaths.passage(id));

async function loadStatus(kind: BankKind, id: string): Promise<WorkflowStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase.from(tableOf(kind)).select("workflow_status").eq("id", id).maybeSingle();
  return data?.workflow_status ?? null;
}

/** Biên tập viên gửi duyệt câu / tư liệu. Câu có tư liệu đang nháp thì gửi duyệt luôn tư liệu đó. */
export async function submitBankAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const kind = parseBankKind(String(formData.get("kind") ?? ""));
  const id = String(formData.get("id") ?? "");
  if (!kind || !isUuid(id)) return fail("Thao tác không hợp lệ.");
  const status = await loadStatus(kind, id);
  if (!status) return fail("Không tìm thấy.");
  if (!canSubmitExam(staff.role, status)) return fail("Không ở trạng thái gửi duyệt được.");

  const supabase = await createClient();
  if (kind === "cau") {
    const { data: item } = await supabase.from("exam_items").select("passage_id, exam_passages(workflow_status)").eq("id", id).maybeSingle();
    const passageStatus = item?.exam_passages?.workflow_status;
    if (item?.passage_id && passageStatus === "hidden") return fail("Đoạn tư liệu của câu đang bị ẩn — chọn tư liệu khác.");
    if (item?.passage_id && (passageStatus === "draft" || passageStatus === "needs_revision")) {
      const { error } = await supabase.from("exam_passages").update({ workflow_status: "pending_review" }).eq("id", item.passage_id).eq("workflow_status", passageStatus);
      if (error) return dbErrorState(error, {});
    }
  }
  const { data, error } = await supabase.from(tableOf(kind)).update({ workflow_status: "pending_review" }).eq("id", id).eq("workflow_status", status).select("id");
  if (error) return dbErrorState(error, {});
  if (!data || data.length === 0) return { status: "error", message: "Đã được người khác xử lý. Tải lại trang.", stale: true };
  refreshBank(kind === "cau" ? id : undefined);
  revalidatePath(pathOf(kind, id));
  return { status: "success", message: "Đã gửi cho kiểm duyệt viên." };
}

/** Câu / tư liệu đang nằm trong đề ĐÃ CÔNG BỐ → không ẩn được (đề sẽ thiếu câu mà không ai duyệt lại). */
async function publishedSetsUsing(kind: BankKind, id: string): Promise<string[]> {
  const supabase = await createClient();
  let itemIds = [id];
  if (kind === "tu-lieu") {
    const { data } = await supabase.from("exam_items").select("id").eq("passage_id", id);
    itemIds = (data ?? []).map((item) => item.id);
    if (itemIds.length === 0) return [];
  }
  const { data } = await supabase.from("exam_set_items").select("exam_sets!inner(slug, workflow_status)").in("item_id", itemIds).eq("exam_sets.workflow_status", "published");
  return [...new Set((data ?? []).map((row) => row.exam_sets.slug))];
}

/** Kiểm duyệt viên: công bố / yêu cầu chỉnh sửa (kèm lý do) / ẩn / công bố lại — cùng luật với nội dung khác. */
export async function reviewBankAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(REVIEW_ROLES);
  const values = readFormValues(formData);
  const kind = parseBankKind(values.kind);
  const action = parseReviewAction(values.action ?? "");
  const id = values.id ?? "";
  if (!kind || !action || !isUuid(id)) return fail("Thao tác không hợp lệ.", values);
  const transition = REVIEW_TRANSITIONS[action];
  const status = await loadStatus(kind, id);
  if (status !== transition.from) return { status: "error", message: "Đã đổi trạng thái. Tải lại trang.", stale: true };

  let reason: string | null = null;
  if (action === "request_revision") {
    const parsed = revisionReasonSchema.safeParse(values.reason);
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message, fieldErrors: { reason: parsed.error.issues[0]?.message ?? "" }, values };
    reason = parsed.data;
  }
  if (action === "hide") {
    const sets = await publishedSetsUsing(kind, id);
    if (sets.length > 0) return fail(`Đang nằm trong đề đã công bố (${sets.join(", ")}). Ẩn đề hoặc thay câu trong đề trước.`, values);
  }

  const supabase = await createClient();
  if (kind === "cau" && (action === "publish" || action === "republish")) {
    const published = await publishPassageOf([id]);
    if (published !== true) return fail(published, values);
  }
  const { data, error } = await supabase
    .from(tableOf(kind))
    .update({ workflow_status: transition.to, ...reviewNoteFor(action, reason) })
    .eq("id", id)
    .eq("workflow_status", transition.from)
    .select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return { status: "error", message: "Đã được người khác xử lý. Tải lại trang.", stale: true };
  refreshBank(kind === "cau" ? id : undefined);
  revalidatePath(pathOf(kind, id));
  return { status: "success", message: "Đã cập nhật trạng thái." };
}

/** Thao tác hàng loạt ở danh sách: biên tập viên gửi duyệt, kiểm duyệt viên công bố các câu đã chọn. */
export async function bulkBankAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const op = String(formData.get("op") ?? "");
  const ids = formData.getAll("ids").map(String).filter(isUuid).slice(0, BULK_LIMIT);
  if (ids.length === 0) return fail("Chưa chọn câu nào.");
  const supabase = await createClient();

  if (op === "submit") {
    await requireRole(EDIT_ROLES);
    const { data: items } = await supabase.from("exam_items").select("id, passage_id, exam_passages(workflow_status)").in("id", ids).in("workflow_status", ["draft", "needs_revision"]);
    const ready = (items ?? []).filter((item) => item.exam_passages?.workflow_status !== "hidden");
    const passages = [...new Set(ready.filter((item) => ["draft", "needs_revision"].includes(item.exam_passages?.workflow_status ?? "")).map((item) => item.passage_id!))];
    if (passages.length > 0) {
      const { error } = await supabase.from("exam_passages").update({ workflow_status: "pending_review" }).in("id", passages).in("workflow_status", ["draft", "needs_revision"]);
      if (error) return dbErrorState(error, {});
    }
    const { data, error } = await supabase
      .from("exam_items")
      .update({ workflow_status: "pending_review" })
      .in("id", ready.map((item) => item.id))
      .in("workflow_status", ["draft", "needs_revision"])
      .select("id");
    if (error) return dbErrorState(error, {});
    refreshBank();
    return { status: "success", message: summary("Đã gửi duyệt", data?.length ?? 0, ids.length, "không ở trạng thái nháp / cần chỉnh sửa") };
  }

  if (op === "publish") {
    await requireRole(REVIEW_ROLES);
    const { data: pending } = await supabase.from("exam_items").select("id").in("id", ids).eq("workflow_status", "pending_review");
    const pendingIds = (pending ?? []).map((item) => item.id);
    if (pendingIds.length === 0) return fail("Không có câu nào đang chờ duyệt trong các câu đã chọn.");
    const published = await publishPassageOf(pendingIds);
    if (published !== true) return fail(published);
    const { data, error } = await supabase
      .from("exam_items")
      .update({ workflow_status: "published", review_note: null })
      .in("id", pendingIds)
      .eq("workflow_status", "pending_review")
      .select("id");
    if (error) return dbErrorState(error, {});
    refreshBank();
    return { status: "success", message: summary("Đã công bố", data?.length ?? 0, ids.length, "không ở trạng thái chờ duyệt") };
  }
  return fail("Thao tác không hợp lệ.");
}

function summary(verb: string, done: number, selected: number, skippedReason: string): string {
  const skipped = selected - done;
  return skipped > 0 ? `${verb} ${done} câu (bỏ qua ${skipped} câu ${skippedReason}).` : `${verb} ${done} câu.`;
}

/** Xóa câu / tư liệu đang nháp hoặc cần chỉnh sửa. Câu đang nằm trong đề / tư liệu đang có câu dùng thì không xóa được. */
export async function deleteBankAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const kind = parseBankKind(String(formData.get("kind") ?? ""));
  const id = String(formData.get("id") ?? "");
  if (!kind || !isUuid(id)) return fail("Thao tác không hợp lệ.");
  const status = await loadStatus(kind, id);
  if (!status) return fail("Không tìm thấy.");
  if (status !== "draft" && status !== "needs_revision") return fail("Chỉ xóa được bản nháp hoặc cần chỉnh sửa. Bản đã công bố thì nên Ẩn.");
  if (!canEditContent(staff.role, status)) return fail("Bạn không có quyền xóa.");
  const supabase = await createClient();
  const { data, error } = await supabase.from(tableOf(kind)).delete().eq("id", id).in("workflow_status", ["draft", "needs_revision"]).select("id");
  if (error) return bankDbError(error, {});
  if (!data || data.length === 0) return fail("Không xóa được (đã đổi trạng thái hoặc bạn không có quyền).");
  const list = kind === "cau" ? examBankPaths.list : examBankPaths.passages;
  revalidatePath(list);
  redirect(`${list}?thong-bao=da-xoa`);
}

// ---------------------------------------------------------------------------------------------------------------
// Nhập hàng loạt từ JSON (mục 7.2)
// ---------------------------------------------------------------------------------------------------------------

export type ImportState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** Kết quả chạy thử (không có khi đã ghi xong). */
  plan?: Pick<ImportPlan, "fileErrors" | "passages" | "rows"> & { ready: boolean; itemCount: number; passageCount: number };
};

/** `mode=kiem-tra`: chạy thử, không ghi. `mode=ghi`: kiểm lại rồi ghi tất cả ở trạng thái nháp (có lỗi thì không ghi gì). */
export async function importExamBankAction(_previous: ImportState, formData: FormData): Promise<ImportState> {
  await requireRole(EDIT_ROLES);
  const raw = String(formData.get("json") ?? "");
  const mode = String(formData.get("mode") ?? "kiem-tra");
  if (raw.trim() === "") return { status: "error", message: "Chưa có nội dung JSON." };

  const context = await getImportContext();
  const plan = planImport(raw, {
    existingFingerprints: context.existingFingerprints,
    eventSlugs: new Set(context.eventIds.keys()),
    existingContentKeys: context.existingContentKeys,
  });
  const ready = !importHasErrors(plan);
  const report = {
    fileErrors: plan.fileErrors,
    passages: plan.passages.map(({ key, input, errors }) => ({ key, input, errors })),
    rows: plan.rows,
    ready,
    itemCount: plan.items.length,
    passageCount: plan.passages.length,
  };
  if (mode !== "ghi" || !ready) {
    return ready
      ? { status: "success", message: `Hợp lệ: ${plan.items.length} câu, ${plan.passages.length} đoạn tư liệu. Bấm “Ghi vào ngân hàng” để lưu (trạng thái nháp).`, plan: report }
      : { status: "error", message: "Tệp còn lỗi — sửa rồi kiểm tra lại. Chưa ghi gì.", plan: report };
  }

  const supabase = await createClient();
  const passageIds = new Map<string, string>();
  if (plan.passages.length > 0) {
    const { data, error } = await supabase
      .from("exam_passages")
      .insert(plan.passages.map((passage) => passage.input!))
      .select("id");
    if (error) return { status: "error", message: translateDbError(error).message, plan: report };
    plan.passages.forEach((passage, index) => passageIds.set(passage.key, data[index].id));
  }
  // Một câu lệnh INSERT cho mọi câu: lỗi thì không câu nào được ghi; dọn tư liệu vừa tạo.
  const { error } = await supabase.from("exam_items").insert(
    plan.items.map(({ passage_key, event_slug, ...item }) =>
      ({
        ...itemColumns({ ...item, passage_id: passage_key ? passageIds.get(passage_key)! : null, event_id: event_slug ? (context.eventIds.get(event_slug) ?? null) : null }),
        content_key: item.content_key,
      }),
    ),
  );
  if (error) {
    if (passageIds.size > 0) await supabase.from("exam_passages").delete().in("id", [...passageIds.values()]);
    const failed = bankDbError(error, {});
    return { status: "error", message: `Không ghi được: ${failed.message} Chưa có câu nào được lưu.`, plan: report };
  }
  refreshBank();
  revalidatePath(examBankPaths.passages);
  return { status: "success", message: `Đã ghi ${plan.items.length} câu và ${plan.passages.length} đoạn tư liệu vào ngân hàng (trạng thái nháp).` };
}
