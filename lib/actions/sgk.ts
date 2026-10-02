"use server";

import { revalidatePath } from "next/cache";
import { sgkAdminPath } from "@/lib/admin/routes";
import { requireRole } from "@/lib/auth";
import { dbErrorState, readFormValues, type ActionState } from "@/lib/actions/state";
import { isUuid } from "@/lib/queries/admin-content";
import { getSgkLesson } from "@/lib/sgk/curriculum";
import { createClient } from "@/lib/supabase/server";

// Gán / bỏ gán sự kiện vào bài/mục SGK (GĐ7). Chạy bằng phiên nhân sự; RLS của sgk_lesson_events (chỉ editor và
// system_admin được ghi) là lớp quyết định cuối cùng — kiểm tra ở đây để báo lỗi sớm và dễ hiểu.

const EDIT_ROLES = ["editor", "system_admin"] as const;

function error(message: string, values: Record<string, string> = {}): ActionState {
  return { status: "error", message, values };
}

/** Bài và mục phải có trong khung SGK (lib/sgk/curriculum.ts). */
function validTarget(lessonSlug: string, sectionId: string): boolean {
  return Boolean(getSgkLesson(lessonSlug)?.sections.some((section) => section.id === sectionId));
}

export async function addSgkLessonEventAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const lessonSlug = values.lesson_slug ?? "";
  const sectionId = values.section_id ?? "";
  const eventId = values.event_id ?? "";
  if (!validTarget(lessonSlug, sectionId)) return error("Bài hoặc mục không hợp lệ.", values);
  if (!isUuid(eventId)) return error("Hãy chọn một sự kiện.", values);

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("sgk_lesson_events")
    .select("sort_order")
    .eq("lesson_slug", lessonSlug)
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await supabase
    .from("sgk_lesson_events")
    .insert({ lesson_slug: lessonSlug, section_id: sectionId, event_id: eventId, sort_order: (last?.sort_order ?? 0) + 1 });
  if (insertError) {
    if (insertError.code === "23505") return error("Sự kiện này đã có trong mục.", values);
    return dbErrorState(insertError, values);
  }

  revalidatePath(sgkAdminPath(lessonSlug));
  revalidatePath(sgkAdminPath());
  return { status: "success", message: "Đã gán sự kiện vào mục.", values: {} };
}

export async function removeSgkLessonEventAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(EDIT_ROLES);
  const values = readFormValues(formData);
  const id = values.assignment_id ?? "";
  const lessonSlug = values.lesson_slug ?? "";
  if (!isUuid(id)) return error("Mã dòng gán không hợp lệ.");

  const supabase = await createClient();
  const { data, error: deleteError } = await supabase.from("sgk_lesson_events").delete().eq("id", id).select("id");
  if (deleteError) return dbErrorState(deleteError, values);
  if (!data || data.length === 0) return error("Không tìm thấy dòng gán cần bỏ (có thể đã được người khác bỏ).");

  revalidatePath(sgkAdminPath(lessonSlug));
  revalidatePath(sgkAdminPath());
  return { status: "success", message: "Đã bỏ sự kiện khỏi mục.", values: {} };
}
