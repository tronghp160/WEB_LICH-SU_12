"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { REVIEW_TRANSITIONS, parseReviewAction, reviewNoteFor, revisionReasonSchema } from "@/lib/admin/review";
import { requireRole } from "@/lib/auth";
import { dbErrorState, readFormValues, zodErrorState, type ActionState } from "@/lib/actions/state";
import { canEditExam, canSubmitExam, examAdminPaths, examReadiness, examSetSchema } from "@/lib/exams/admin";
import { addItemToSet, loadSetItems, publishPassageOf, type SetItemRow } from "@/lib/exams/bank-server";
import { moveItem, rebalanceShifts } from "@/lib/exams/compose";
import { examPaths } from "@/lib/exams/exam";
import { parseExamFormat } from "@/lib/exams/format";
import { isUuid } from "@/lib/queries/admin-content";
import { EXAM_PACK_SLUG } from "@/lib/queries/payments";
import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/utils/labels";

// Soạn và kiểm duyệt đề luyện thi (docs/ke-hoach-thanh-toan.md, mục 10; docs/ke-hoach-luyen-thi.md, GĐ1). Đề không tự
// chứa câu mà chọn câu từ ngân hàng (exam_set_items). Chạy bằng PHIÊN nhân sự → RLS của exam_sets / exam_set_items là lớp
// quyết định cuối cùng (editor chỉ sửa khi đề đang nháp / cần chỉnh sửa, không tự công bố). Kiểm tra ở đây chỉ để báo
// lỗi sớm, dễ hiểu.

const EDIT_ROLES = ["editor", "system_admin"] as const;
const REVIEW_ROLES = ["reviewer", "system_admin"] as const;

const fail = (message: string, values: Record<string, string> = {}): ActionState => ({ status: "error", message, values });

type SetRow = { id: string; slug: string; workflow_status: Parameters<typeof canEditExam>[1]; duration_min: number; format: string };

async function loadSet(slug: string): Promise<SetRow | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("exam_sets").select("id, slug, workflow_status, duration_min, format").eq("slug", slug).maybeSingle();
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

/** Tạo đề nháp mới (slug tự đặt de-<số kế tiếp>), mặc định thuộc Gói luyện thi, cấu trúc đề đầy đủ. */
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
    format: "thpt_2025",
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

// ---------------------------------------------------------------------------------------------------------------
// Ghép câu vào đề
// ---------------------------------------------------------------------------------------------------------------

export async function addSetItemAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const slug = String(formData.get("slug") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const set = await editableSet(slug, staff.role);
  if (typeof set === "string") return fail(set);
  if (!isUuid(itemId)) return fail("Mã câu hỏi không hợp lệ.");
  const problem = await addItemToSet(slug, itemId);
  if (problem) return fail(problem);
  refresh(slug);
  return { status: "success", message: "Đã thêm câu vào đề." };
}

/** Ghi lại thứ tự + độ xoay của MỘT phần (một câu lệnh upsert; ràng buộc vị trí là DEFERRABLE nên đổi chỗ không vướng). */
async function writeSection(setId: string, rows: readonly SetItemRow[]) {
  const supabase = await createClient();
  return supabase
    .from("exam_set_items")
    .upsert(
      rows.map((row, index) => ({ set_id: setId, item_id: row.itemId, section: row.section, position: index + 1, choice_shift: row.shift })),
      { onConflict: "set_id,item_id" },
    )
    .select("item_id");
}

export async function moveSetItemAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const slug = String(formData.get("slug") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const set = await editableSet(slug, staff.role);
  if (typeof set === "string") return fail(set);
  const items = await loadSetItems(set.id);
  const target = items.find((row) => row.itemId === itemId);
  if (!target) return fail("Câu không còn trong đề. Tải lại trang.");
  const section = items.filter((row) => row.section === target.section);
  const { error } = await writeSection(set.id, moveItem(section, section.indexOf(target), direction));
  if (error) return dbErrorState(error, {});
  refresh(slug);
  return { status: "success", message: "Đã đổi thứ tự." };
}

export async function removeSetItemAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const slug = String(formData.get("slug") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const set = await editableSet(slug, staff.role);
  if (typeof set === "string") return fail(set);
  if (!isUuid(itemId)) return fail("Mã câu hỏi không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_set_items").delete().eq("set_id", set.id).eq("item_id", itemId).select("section");
  if (error) return dbErrorState(error, {});
  if (!data || data.length === 0) return fail("Câu không còn trong đề. Tải lại trang.");
  // Đánh số lại phần vừa bớt câu để vị trí liền mạch.
  const rest = (await loadSetItems(set.id)).filter((row) => row.section === data[0].section);
  if (rest.length > 0) {
    const { error: renumberError } = await writeSection(set.id, rest);
    if (renumberError) return dbErrorState(renumberError, {});
  }
  refresh(slug);
  return { status: "success", message: "Đã gỡ câu khỏi đề (câu vẫn còn trong ngân hàng)." };
}

/** Xếp lại độ xoay lựa chọn của mọi câu trắc nghiệm theo thứ tự hiện tại để đáp án đúng rải đều A/B/C/D. */
export async function rebalanceSetAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const slug = String(formData.get("slug") ?? "");
  const set = await editableSet(slug, staff.role);
  if (typeof set === "string") return fail(set);
  const items = rebalanceShifts(await loadSetItems(set.id));
  for (const section of [1, 2]) {
    const rows = items.filter((row) => row.section === section);
    if (rows.length === 0) continue;
    const { error } = await writeSection(set.id, rows);
    if (error) return dbErrorState(error, {});
  }
  refresh(slug);
  return { status: "success", message: "Đã rải đều đáp án đúng A/B/C/D." };
}

// ---------------------------------------------------------------------------------------------------------------
// Gửi duyệt / kiểm duyệt / xóa đề
// ---------------------------------------------------------------------------------------------------------------

async function readinessOf(set: SetRow) {
  const items = await loadSetItems(set.id);
  return { items, readiness: examReadiness({ duration_min: set.duration_min, format: parseExamFormat(set.format) }, items.map((row) => row.readiness)) };
}

/** Biên tập viên gửi duyệt: chặn nếu đề chưa đủ điều kiện (cấu trúc, câu chưa gửi duyệt, thiếu giải thích / nguồn). */
export async function submitExamAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requireRole(EDIT_ROLES);
  const set = await loadSet(String(formData.get("slug") ?? ""));
  if (!set) return fail("Không tìm thấy đề.");
  if (!canSubmitExam(staff.role, set.workflow_status)) return fail("Đề không ở trạng thái gửi duyệt được.");
  const { readiness } = await readinessOf(set);
  if (readiness.blockers.length > 0) return fail(`Chưa gửi duyệt được: ${readiness.blockers.join(" ")}`);

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

/**
 * Kiểm duyệt viên: công bố / yêu cầu chỉnh sửa (kèm lý do) / ẩn / công bố lại — cùng luật với nội dung khác. Công bố đề
 * thì công bố luôn các câu (và tư liệu) trong đề đang chờ duyệt — người duyệt đọc toàn bộ câu ở trang đề.
 */
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
  const supabase = await createClient();
  if (action === "publish" || action === "republish") {
    const { items, readiness } = await readinessOf(set);
    const blockers = [...readiness.blockers, ...readiness.publishBlockers];
    if (blockers.length > 0) return fail(`Chưa công bố được: ${blockers.join(" ")}`, values);
    const pending = items.filter((row) => row.readiness.status === "pending_review").map((row) => row.itemId);
    if (pending.length > 0) {
      const passages = await publishPassageOf(pending);
      if (passages !== true) return fail(passages, values);
      const { error } = await supabase.from("exam_items").update({ workflow_status: "published", review_note: null }).in("id", pending).eq("workflow_status", "pending_review");
      if (error) return dbErrorState(error, values);
    }
  }

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

/** Xóa đề đang nháp / cần chỉnh sửa (câu chỉ gỡ khỏi đề, vẫn còn trong ngân hàng). Đề đã gửi duyệt / công bố thì không xóa (RLS). */
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
