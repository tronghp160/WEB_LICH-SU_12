"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminContentTargets, deleteBlockedMessages } from "@/lib/admin/admin-content-rules";
import { contentPaths, parseContentSegment, type ContentKind } from "@/lib/admin/content-kinds";
import { dbErrorState, readFormValues, type ActionState } from "@/lib/actions/state";
import { requireRole } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { isUuid } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import type { DbErrorLike } from "@/lib/utils/db-errors";
import type { WorkflowStatus } from "@/lib/utils/labels";

// Quản trị nội dung (UC14) — CHỈ quản trị viên; chạy bằng phiên của admin nên RLS `admin_all` áp dụng.
// Ưu tiên ẨN hơn xóa cứng; xóa cứng bị khóa ngoại chặn nếu còn được nơi khác dùng.

type Db = SupabaseClient<Database>;
type Result = { data: { id: string }[] | null; error: DbErrorLike | null };

/** Đổi trạng thái, KÈM điều kiện "chưa ở trạng thái đích" để không ghi đè vô nghĩa. */
function setStatus(db: Db, kind: ContentKind, id: string, to: WorkflowStatus): PromiseLike<Result> {
  switch (kind) {
    case "chu-de":
      return db.from("curriculum_topics").update({ workflow_status: to }).eq("id", id).neq("workflow_status", to).select("id");
    case "su-kien":
      return db.from("historical_events").update({ workflow_status: to }).eq("id", id).neq("workflow_status", to).select("id");
    case "nhan-vat":
      return db.from("historical_figures").update({ workflow_status: to }).eq("id", id).neq("workflow_status", to).select("id");
    case "dia-diem":
      return db.from("historical_locations").update({ workflow_status: to }).eq("id", id).neq("workflow_status", to).select("id");
  }
}

function removeRow(db: Db, kind: ContentKind, id: string): PromiseLike<Result> {
  switch (kind) {
    case "chu-de":
      return db.from("curriculum_topics").delete().eq("id", id).select("id");
    case "su-kien":
      return db.from("historical_events").delete().eq("id", id).select("id");
    case "nhan-vat":
      return db.from("historical_figures").delete().eq("id", id).select("id");
    case "dia-diem":
      return db.from("historical_locations").delete().eq("id", id).select("id");
  }
}

/** Đọc và kiểm tra `kind` + `id` từ form (dùng chung cho các action bên dưới). */
function readTarget(formData: FormData): { kind: ContentKind; id: string; values: Record<string, string> } | { error: ActionState } {
  const values = readFormValues(formData);
  const segment = parseContentSegment(values.kind ?? "");
  const id = values.id?.trim() ?? "";
  if (!segment || segment === "nguon" || !isUuid(id)) {
    return { error: { status: "error", message: "Yêu cầu không hợp lệ.", values } };
  }
  return { kind: segment, id, values };
}

async function changeStatus(formData: FormData, action: "restore_draft" | "hide", doneMessage: string): Promise<ActionState> {
  await requireRole(["system_admin"]);
  const target = readTarget(formData);
  if ("error" in target) return target.error;

  const supabase = await createClient();
  const { data, error } = await setStatus(supabase, target.kind, target.id, adminContentTargets[action]);
  if (error) return dbErrorState(error, target.values);
  if (!data || data.length === 0) {
    return { status: "error", message: "Không cập nhật được: nội dung đã ở trạng thái này hoặc không còn tồn tại. Hãy tải lại trang.", stale: true, values: target.values };
  }

  revalidatePath(contentPaths.edit(target.kind, target.id));
  revalidatePath(contentPaths.list(target.kind));
  return { status: "success", message: doneMessage, values: target.values };
}

/** "Khôi phục về bản nháp": đưa nội dung ở bất kỳ trạng thái nào về draft để biên tập lại. */
export async function restoreToDraftAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return changeStatus(formData, "restore_draft", "Đã khôi phục về bản nháp. Nội dung không còn hiển thị ở trang công khai.");
}

/** Ẩn nội dung khỏi trang công khai (thay cho xóa). */
export async function adminHideAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return changeStatus(formData, "hide", "Đã ẩn nội dung khỏi trang công khai.");
}

/**
 * Xóa vĩnh viễn (có hộp thoại xác nhận ở giao diện). Khóa ngoại chặn khi còn được nơi khác dùng → thông báo rõ.
 * Xóa sự kiện cascade các liên kết/ảnh trong DB; tệp ảnh trong Storage được dọn theo (không làm hỏng thao tác nếu lỗi).
 */
export async function deleteContentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["system_admin"]);
  const target = readTarget(formData);
  if ("error" in target) return target.error;

  const supabase = await createClient();
  const { data, error } = await removeRow(supabase, target.kind, target.id);
  if (error) {
    return error.code === "23503"
      ? { status: "error", message: deleteBlockedMessages[target.kind], values: target.values }
      : dbErrorState(error, target.values);
  }
  if (!data || data.length === 0) {
    return { status: "error", message: "Không xóa được: nội dung không còn tồn tại hoặc bạn không có quyền.", values: target.values };
  }

  if (target.kind === "su-kien") {
    const { data: files } = await supabase.storage.from("media").list(`events/${target.id}`);
    if (files && files.length > 0) {
      await supabase.storage.from("media").remove(files.map((file) => `events/${target.id}/${file.name}`));
    }
  }

  revalidatePath(contentPaths.list(target.kind));
  redirect(`${contentPaths.list(target.kind)}?thong-bao=da-xoa`);
}
