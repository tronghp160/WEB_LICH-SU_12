import { createPublicClient } from "@/lib/supabase/public";
import { parseDatePrecision, type DatePrecision } from "@/lib/utils/labels";

/** Thông tin tóm tắt một sự kiện đã công bố — đủ để vẽ EventCard. */
export type EventSummary = {
  slug: string;
  title: string;
  summary: string;
  dateText: string;
  datePrecision: DatePrecision;
  isFeatured: boolean;
  topicName?: string;
  topicSlug?: string;
};

/**
 * Sự kiện nổi bật (`is_featured = true`) đã công bố, sắp theo thời gian:
 * `start_year`, rồi `start_date` (null xếp sau), rồi `title` (UC01).
 */
export async function getFeaturedEvents(limit = 12): Promise<EventSummary[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from("historical_events")
    .select(
      "slug, title, summary, date_text, date_precision, is_featured, curriculum_topics(name, slug)",
    )
    .eq("workflow_status", "published")
    .eq("is_featured", true)
    .order("start_year", { ascending: true })
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Không tải được sự kiện nổi bật: ${error.message}`);
  }

  return data.map((event) => {
    // Chủ đề có thể là null lúc chạy nếu nó chưa published (RLS ẩn với khách),
    // dù kiểu sinh ra coi là luôn có (topic_id NOT NULL).
    const topic = event.curriculum_topics as { name: string; slug: string } | null;

    return {
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      dateText: event.date_text,
      datePrecision: parseDatePrecision(event.date_precision),
      isFeatured: event.is_featured ?? false,
      topicName: topic?.name,
      topicSlug: topic?.slug,
    };
  });
}
