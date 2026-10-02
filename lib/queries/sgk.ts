import { cache } from "react";
import {
  applyAssignments,
  flattenLessons,
  SGK_12,
  type SgkAssignment,
  type SgkLessonEntry,
  type SgkTopic,
} from "@/lib/sgk/curriculum";
import { createPublicClient } from "@/lib/supabase/public";

export type Curriculum = {
  topics: SgkTopic[];
  lessons: SgkLessonEntry[];
  /** "database": đang dùng cách gán sự kiện của biên tập viên; "code": cách gán viết sẵn trong lib/sgk/curriculum.ts. */
  source: "database" | "code";
};

const fromCode = (): Curriculum => ({ topics: SGK_12, lessons: flattenLessons(SGK_12), source: "code" });

/**
 * Khung SGK kèm cách gán sự kiện vào bài/mục (GĐ7). Đọc bảng sgk_lesson_events bằng quyền khách (RLS: chỉ liên kết
 * tới sự kiện ĐÃ CÔNG BỐ). Bảng chưa được tạo (chưa chạy migration), lỗi mạng, hoặc chưa có dòng nào → dùng cách gán
 * viết trong code, trang không bao giờ gãy vì phần này. Gọi nhiều lần trong một request chỉ truy vấn một lần.
 */
export const getCurriculum = cache(async (): Promise<Curriculum> => {
  try {
    const supabase = await createPublicClient();
    const { data, error } = await supabase
      .from("sgk_lesson_events")
      .select("lesson_slug, section_id, sort_order, historical_events(slug)")
      .order("lesson_slug")
      .order("sort_order");
    if (error || !data || data.length === 0) return fromCode();

    const assignments: SgkAssignment[] = data.flatMap((row) => {
      const event = row.historical_events as { slug: string } | null;
      return event ? [{ lessonSlug: row.lesson_slug, sectionId: row.section_id, eventSlug: event.slug, sortOrder: row.sort_order }] : [];
    });
    if (assignments.length === 0) return fromCode();
    const topics = applyAssignments(SGK_12, assignments);
    return { topics, lessons: flattenLessons(topics), source: "database" };
  } catch {
    return fromCode();
  }
});
