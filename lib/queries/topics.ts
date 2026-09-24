import { createPublicClient } from "@/lib/supabase/public";

export type PublishedTopic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Số sự kiện ĐÃ CÔNG BỐ thuộc chủ đề này. */
  eventCount: number;
};

/** Chủ đề đã công bố, sắp theo `sort_order`, kèm số sự kiện published (UC01). */
export async function getPublishedTopics(): Promise<PublishedTopic[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from("curriculum_topics")
    .select("id, slug, name, description, historical_events(count)")
    .eq("workflow_status", "published")
    // Chỉ đếm sự kiện published (RLS đã lọc cho anon, đây là lớp phòng thủ thứ hai).
    .eq("historical_events.workflow_status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Không tải được danh sách chủ đề: ${error.message}`);
  }

  return data.map((topic) => ({
    id: topic.id,
    slug: topic.slug,
    name: topic.name,
    description: topic.description,
    eventCount: topic.historical_events[0]?.count ?? 0,
  }));
}
