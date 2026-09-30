import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { pickCardCover, type CardCover, type CardMediaRow } from "@/lib/media";
import { createPublicClient } from "@/lib/supabase/public";
import type { WorkflowStatus } from "@/lib/utils/labels";

export type PublishedTopic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Số sự kiện ĐÃ CÔNG BỐ thuộc chủ đề này. */
  eventCount: number;
  /** Ảnh đại diện: ảnh bìa của sự kiện sớm nhất (đã công bố) có ảnh trong chủ đề. */
  cover?: CardCover;
};

/** Chủ đề đã công bố, sắp theo `sort_order`, kèm số sự kiện published (UC01). */
export async function getPublishedTopics(): Promise<PublishedTopic[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from("curriculum_topics")
    .select(
      "id, slug, name, description, historical_events(count), covers:historical_events(start_year, media_assets(file_url, alt_text, media_type, is_cover, focal_point, sort_order))",
    )
    .eq("workflow_status", "published")
    // Chỉ đếm sự kiện published (RLS đã lọc cho anon, đây là lớp phòng thủ thứ hai).
    .eq("historical_events.workflow_status", "published")
    .eq("covers.workflow_status", "published")
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
    cover: topicCover(topic.covers as { start_year: number; media_assets: CardMediaRow[] }[]),
  }));
}

function topicCover(events: { start_year: number; media_assets: CardMediaRow[] }[]): CardCover | undefined {
  return [...events]
    .sort((a, b) => a.start_year - b.start_year)
    .map((event) => pickCardCover(event.media_assets))
    .find((cover) => cover !== undefined);
}

export type TopicDetail = Omit<PublishedTopic, "eventCount"> & { status: WorkflowStatus };

/** Một chủ đề ĐÃ CÔNG BỐ theo slug (UC05); không có / chưa công bố → null. */
export const getTopicDetail = cache(async (slug: string): Promise<TopicDetail | null> =>
  loadTopicDetail(await createPublicClient(), { slug }, true),
);

/** Nạp chủ đề bằng client tùy ý (công khai: ẩn danh + chỉ published; màn hình duyệt: phiên nhân sự, mọi trạng thái). */
export async function loadTopicDetail(
  supabase: SupabaseClient<Database>,
  by: { slug: string } | { id: string },
  publishedOnly: boolean,
): Promise<TopicDetail | null> {
  let query = supabase.from("curriculum_topics").select("id, slug, name, description, workflow_status");
  query = "id" in by ? query.eq("id", by.id) : query.eq("slug", by.slug);
  if (publishedOnly) query = query.eq("workflow_status", "published");
  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Không tải được chủ đề: ${error.message}`);
  }
  return data
    ? { id: data.id, slug: data.slug, name: data.name, description: data.description, status: data.workflow_status }
    : null;
}
