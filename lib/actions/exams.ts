"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { REVIEW_TRANSITIONS, parseReviewAction, reviewNoteFor, revisionReasonSchema } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { dbErrorState, readFormValues, zodErrorState, type ActionState } from "@/lib/actions/state";
import { canEditExam, canSubmitExam, examAdminPaths, examQuestionColumns, examQuestionSchema, examReadiness, examSetSchema } from "@/lib/exams/admin";
import { examPaths } from "@/lib/exams/exam";
import { isUuid } from "@/lib/queries/admin-content";
import { EXAM_PACK_SLUG } from "@/lib/queries/payments";
import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/utils/labels";

// Soạn và kiểm duyệt đề luyện thi (docs/ke-hoach-thanh-toan.md, mục 10). Chạy bằng PHIÊN nhân sự → RLS của exam_sets /
// exam_questions là lớp quyết định cuối cùng (editor chỉ sửa khi đề đang nháp / cần chỉnh sửa, không tự công bố).
// Kiểm tra ở đây chỉ để báo lỗi sớm, dễ hiểu.

const EDIT_ROLES = ["editor", "system_admin"] as const;
const REVIEW_ROLES = ["reviewer", "system_admin"] as const;

const fail = (message: string, values: Record<string, string> = {}): ActionState => ({ status: "error", message, values });

type SetRow = { id: string; slug: string; workflow_status: Parameters<typeof canEditExam>[1]; duration_min: number };

async function loadSet(slug: string): Promise<SetRow | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("exam_sets").select("id, slug, workflow_status, duration_min").eq("slug", slug).maybeSingle();
  return data;
}

async function editableSet(slug: string, role: StaffRole): Promise<SetRow | string> {
  const set = await loadSet(slug);
  if (!set) return "Không tìm thấy đề.";
  return canEditExam(role, set.workflow_status) ? set : "Đề đang chờ duyệt hoặc đã công bố nên không sửa được. Cần kiểm duyệt viên trả về chỉnh sửa.";
}

function refresh(slug: string) {
  revalidatePath(examAdminPaths.edit(slug));
  revalidatePath(examAdminPaths.list);
}

/** Tạo đề nháp mới (slug tự đặt de-<số kế tiếp>), mặc định thuộc Gói luyện thi. */
export async function createExamSetAction(): Promise<void> {
  await requireRole(EDIT_ROLES);
  const supabase = await createClient();
  const { data: sets } = await supabase.from("exam_sets").select("slug, sort_order");
  const numbers = (sets ?? []).map((set) => Number(/^de-(\d+)$/.exec(set.slug)?.[1] ?? 0));
  const next = Math.max(0, ...numbers) + 1;
  const { data: product } = await supabase.from("products").select("id").eq("slug", EXAM_PACK_SLUG).maybeSingle();
  const slug = `de-${next}`;
  const { error } = await supabase.from("exam_sets").insert({
    slug,
    title: `Đề luyện thi số ${next}`,
    product_id: product?.id ?? null,
    duration_min: 50,
    sort_order: Math.max(0, ...(sets ?? []).map((set) => set.sort_order)) + 1,
  });
  if (error) redirect(`${examAdminPaths.list}?loi=tao-de`);
  revalidatePath(examAdminPaths.list);
  redirect(examAdminPaths.edit(slug));
}

export async function updateExamSetAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const set = await editableSet(values.slug ?? "", staff.role);
  if (typeof set === "string") return fail(set, values);
  const parsed = examSetSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  const supabase = await createClient();
  let productId: string | null = null;
  if (values.free !== "on") {
    const { data: product } = await supabase.from("products").select("id").eq("slug", EXAM_PACK_SLUG).maybeSingle();
    if (!product) return fail("Không tìm thấy Gói luyện thi để gắn đề.", values);
    productId = product.id;
  }
  const { data, error } = await supabase
    .from("exam_sets")
    .update({ ...parsed.data, product_id: productId })
    .eq("id", set.id)
    .select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return fail("Không lưu được (đề đã đổi trạng thái hoặc bạn không có quyền).", values);
  refresh(set.slug);
  return { status: "success", message: "Đã lưu thông tin đề.", values };
}

export async function addExamQuestionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const set = await editableSet(values.slug ?? "", staff.role);
  if (typeof set === "string") return fail(set, values);
  const parsed = examQuestionSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  const supabase = await createClient();
  const { data: last } = await supabase.from("exam_questions").select("position").eq("set_id", set.id).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("exam_questions").insert({ ...examQuestionColumns(parsed.data), set_id: set.id, position: (last?.[0]?.position ?? 0) + 1 });
  if (error) return dbErrorState(error, values);
  refresh(set.slug);
  return { status: "success", message: "Đã thêm câu hỏi.", values: {} };
}

export async function updateExamQuestionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const set = await editableSet(values.slug ?? "", staff.role);
  if (typeof set === "string") return fail(set, values);
  if (!isUuid(values.question_id ?? "")) return fail("Mã câu hỏi không hợp lệ.", values);
  const parsed = examQuestionSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_questions")
    .update(examQuestionColumns(parsed.data))
    .eq("id", values.question_id)
    .eq("set_id", set.id)
    .select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return fail("Không tìm thấy câu hỏi cần sửa.", values);
  refresh(set.slug);
  return { status: "success", message: "Đã cập nhật câu hỏi.", values };
}

export async function deleteExamQuestionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const set = await editableSet(values.slug ?? "", staff.role);
  if (typeof set === "string") return fail(set, values);
  if (!isUuid(values.question_id ?? "")) return fail("Mã câu hỏi không hợp lệ.", values);

  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_questions").delete().eq("id", values.question_id).eq("set_id", set.id).select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return fail("Không tìm thấy câu hỏi cần xóa.", values);
  refresh(set.slug);
  return { status: "success", message: "Đã xóa câu hỏi.", values: {} };
}

async function readinessOf(set: SetRow) {
  const supabase = await createClient();
  const { data: questions } = await supabase.from("exam_questions").select("position, correct_index, explanation, source_note").eq("set_id", set.id);
  return examReadiness(set, questions ?? []);
}

/** Biên tập viên gửi duyệt: chặn nếu đề chưa đủ điều kiện (dưới 10 câu, thiếu giải thích / nguồn). */
export async function submitExamAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const set = await loadSet(String(formData.get("slug") ?? ""));
  if (!set) return fail("Không tìm thấy đề.");
  if (!canSubmitExam(staff.role, set.workflow_status)) return fail("Đề không ở trạng thái gửi duyệt được.");
  const { blockers } = await readinessOf(set);
  if (blockers.length > 0) return fail(`Chưa gửi duyệt được: ${blockers.join(" ")}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .update({ workflow_status: "pending_review" })
    .eq("id", set.id)
    .eq("workflow_status", set.workflow_status)
    .select("id");
  if (error) return dbErrorState(error, {});
  if (!data || data.length === 0) return { status: "error", message: "Đề đã được người khác xử lý. Tải lại trang.", stale: true };
  refresh(set.slug);
  return { status: "success", message: "Đã gửi đề cho kiểm duyệt viên." };
}

/** Kiểm duyệt viên: công bố / yêu cầu chỉnh sửa (kèm lý do) / ẩn / công bố lại — cùng luật với nội dung khác. */
export async function reviewExamAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(REVIEW_ROLES);
  const values = readFormValues(formData);
  const action = parseReviewAction(values.action ?? "");
  const set = await loadSet(values.slug ?? "");
  if (!action || !set) return fail("Thao tác không hợp lệ.", values);
  const transition = REVIEW_TRANSITIONS[action];
  if (set.workflow_status !== transition.from) return { status: "error", message: "Đề đã đổi trạng thái. Tải lại trang.", stale: true };

  let reason: string | null = null;
  if (action === "request_revision") {
    const parsed = revisionReasonSchema.safeParse(values.reason);
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message, fieldErrors: { reason: parsed.error.issues[0]?.message ?? "" }, values };
    reason = parsed.data;
  }
  if (action === "publish" || action === "republish") {
    const { blockers } = await readinessOf(set);
    if (blockers.length > 0) return fail(`Chưa công bố được: ${blockers.join(" ")}`, values);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .update({ workflow_status: transition.to, ...reviewNoteFor(action, reason) })
    .eq("id", set.id)
    .eq("workflow_status", transition.from)
    .select("id");
  if (error) return dbErrorState(error, values);
  if (!data || data.length === 0) return { status: "error", message: "Đề đã được người khác xử lý. Tải lại trang.", stale: true };
  refresh(set.slug);
  revalidatePath(examPaths.hub);
  revalidatePath(examPaths.set(set.slug));
  return { status: "success", message: "Đã cập nhật trạng thái đề." };
}

/** Xóa đề đang nháp / cần chỉnh sửa (câu hỏi bị xóa theo). Đề đã gửi duyệt hoặc công bố thì không xóa được (RLS). */
export async function deleteExamSetAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const set = await loadSet(String(formData.get("slug") ?? ""));
  if (!set) return fail("Không tìm thấy đề.");
  if (set.workflow_status !== "draft" && set.workflow_status !== "needs_revision") {
    return fail("Chỉ xóa được đề đang nháp hoặc cần chỉnh sửa. Đề đã công bố thì nên Ẩn.");
  }
  if (!canEditExam(staff.role, set.workflow_status)) return fail("Bạn không có quyền xóa đề này.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_sets").delete().eq("id", set.id).in("workflow_status", ["draft", "needs_revision"]).select("id");
  if (error) return dbErrorState(error, {});
  if (!data || data.length === 0) return fail("Không xóa được (đề đã đổi trạng thái hoặc bạn không có quyền).");
  revalidatePath(examAdminPaths.list);
  redirect(examAdminPaths.list);
}
