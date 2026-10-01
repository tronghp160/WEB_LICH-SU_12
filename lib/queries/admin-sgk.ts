import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/lib/utils/labels";

// Trang quản trị "Bài SGK" (GĐ7): đọc bằng PHIÊN NHÂN SỰ nên thấy cả sự kiện nháp/chờ duyệt. Trang gọi phải đã qua
// requireRole().

export type AdminSgkEvent = { id: string; slug: string; title: string; dateText: string; status: WorkflowStatus; startYear: number };

export type AdminSgkAssignment = {
  id: string;
  lessonSlug: string;
  sectionId: string;
  sortOrder: number;
  event: AdminSgkEvent;
};

export type AdminSgkData =
  /** Bảng sgk_lesson_events chưa có: migration 20261001000000 chưa chạy. */
  | { available: false }
  | { available: true; assignments: AdminSgkAssignment[] };

const EVENT_FIELDS = "id, slug, title, date_text, workflow_status, start_year";

type EventRow = { id: string; slug: string; title: string; date_text: string; workflow_status: WorkflowStatus; start_year: number };

const toEvent = (row: EventRow): AdminSgkEvent => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  dateText: row.date_text,
  status: row.workflow_status,
  startYear: row.start_year,
});

/** Mọi dòng gán sự kiện (mọi trạng thái sự kiện), hoặc báo bảng chưa tồn tại. */
export async function loadSgkAssignments(lessonSlug?: string): Promise<AdminSgkData> {
  const supabase = await createClient();
  let query = supabase
    .from("sgk_lesson_events")
    .select(`id, lesson_slug, section_id, sort_order, historical_events(${EVENT_FIELDS})`)
    .order("section_id")
    .order("sort_order");
  if (lessonSlug) query = query.eq("lesson_slug", lessonSlug);
  const { data, error } = await query;
  if (error) {
    // 42P01 (Postgres) / PGRST205 (PostgREST): bảng chưa có trong schema.
    if (error.code === "42P01" || error.code === "PGRST205") return { available: false };
    throw new Error(`Không tải được cách gán sự kiện: ${error.message}`);
  }
  return {
    available: true,
    assignments: data.flatMap((row) => {
      const event = row.historical_events as EventRow | null;
      return event
        ? [{ id: row.id, lessonSlug: row.lesson_slug, sectionId: row.section_id, sortOrder: row.sort_order, event: toEvent(event) }]
        : [];
    }),
  };
}

/** Mọi sự kiện (mọi trạng thái) để chọn khi gán, sắp theo thời gian. */
export async function listEventsForSgk(): Promise<AdminSgkEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historical_events")
    .select(EVENT_FIELDS)
    .order("start_year", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw new Error(`Không tải được danh sách sự kiện: ${error.message}`);
  return (data as EventRow[]).map(toEvent);
}
