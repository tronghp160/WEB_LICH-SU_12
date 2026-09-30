"use server";

import { revalidatePath } from "next/cache";
import { canEditContent, contentPaths } from "@/lib/admin/content-kinds";
import { requireRole } from "@/lib/auth";
import { isUuid } from "@/lib/queries/admin-content";
import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/utils/labels";
import { quizQuestionColumns, quizQuestionSchema } from "@/lib/validation/content";
import { dbErrorState, readFormValues, zodErrorState, type ActionState } from "@/lib/actions/state";

// Câu hỏi trắc nghiệm soạn tay (GĐ4.1) gắn với một sự kiện và được duyệt CÙNG sự kiện đó.
// Như mọi action khác: chạy bằng phiên nhân sự, RLS của quiz_questions là lớp quyết định cuối cùng
// (editor chỉ ghi khi sự kiện đang draft/needs_revision); kiểm tra ở đây chỉ để báo lỗi sớm và dễ hiểu.

const EDIT_ROLES = ["editor", "system_admin"] as const;

const NOT_EDITABLE_MESSAGE =
  "Không sửa được: sự kiện không tồn tại hoặc đã chuyển sang trạng thái không cho phép chỉnh sửa (đang chờ duyệt hoặc đã công bố).";

function errorState(message: string, values: Record<string, string>): ActionState {
  return { status: "error", message, values };
}

async function assertEventEditable(eventId: string, role: StaffRole): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("historical_events").select("workflow_status").eq("id", eventId).maybeSingle();
  if (error) return dbErrorState(error, {}).message ?? "Không kiểm tra được sự kiện.";
  if (!data) return "Sự kiện không tồn tại.";
  return canEditContent(role, data.workflow_status) ? null : NOT_EDITABLE_MESSAGE;
}

export async function addQuizQuestionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const parsed = quizQuestionSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  const blocked = await assertEventEditable(parsed.data.event_id, staff.role);
  if (blocked) return errorState(blocked, values);

  const supabase = await createClient();
  const { count } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("event_id", parsed.data.event_id);

  const { error } = await supabase.from("quiz_questions").insert({
    ...quizQuestionColumns(parsed.data),
    event_id: parsed.data.event_id,
    sort_order: (count ?? 0) + 1,
  });
  if (error) return dbErrorState(error, values);

  revalidatePath(contentPaths.edit("su-kien", parsed.data.event_id));
  return { status: "success", message: "Đã thêm câu hỏi.", values: {} };
}

export async function updateQuizQuestionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const questionId = values.question_id?.trim() ?? "";
  if (!isUuid(questionId)) return errorState("Mã câu hỏi không hợp lệ.", values);

  const parsed = quizQuestionSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  const blocked = await assertEventEditable(parsed.data.event_id, staff.role);
  if (blocked) return errorState(blocked, values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .update(quizQuestionColumns(parsed.data))
    .eq("id", questionId)
    .eq("event_id", parsed.data.event_id)
    .select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return errorState("Không tìm thấy câu hỏi cần sửa.", values);

  revalidatePath(contentPaths.edit("su-kien", parsed.data.event_id));
  return { status: "success", message: "Đã cập nhật câu hỏi.", values };
}

export async function deleteQuizQuestionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const questionId = values.question_id?.trim() ?? "";
  const eventId = values.event_id?.trim() ?? "";
  if (!isUuid(questionId) || !isUuid(eventId)) return errorState("Mã câu hỏi không hợp lệ.", values);

  const blocked = await assertEventEditable(eventId, staff.role);
  if (blocked) return errorState(blocked, values);

  const supabase = await createClient();
  const { data, error } = await supabase.from("quiz_questions").delete().eq("id", questionId).eq("event_id", eventId).select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return errorState("Không tìm thấy câu hỏi cần xóa.", values);

  revalidatePath(contentPaths.edit("su-kien", eventId));
  return { status: "success", message: "Đã xóa câu hỏi.", values: {} };
}
