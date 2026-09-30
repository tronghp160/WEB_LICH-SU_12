import { pickCardCover, type CardCover, type CardMediaRow } from "@/lib/media";
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
  /** Chủ đề chính + các chủ đề phụ (event_topics) — dùng để lọc theo chủ đề. */
  topicSlugs: string[];
  /** Chủ đề phụ (đã công bố) để hiện thêm nhãn. */
  secondaryTopics: { name: string; slug: string }[];
  /** Năm bắt đầu — thẻ không có ảnh sẽ hiện năm lớn thay cho ảnh. */
  year?: number;
  /** Ảnh bìa (hoặc ảnh đầu tiên) để hiện trên thẻ; không có ảnh → undefined. */
  cover?: CardCover;
};

/** Ảnh nhúng cho thẻ sự kiện (RLS chỉ trả ảnh của sự kiện đã công bố). */
export const EVENT_CARD_MEDIA = "media_assets(file_url, alt_text, media_type, is_cover, focal_point, sort_order, width, height), event_topics(curriculum_topics(name, slug))" as const;

/**
 * Sự kiện nổi bật (`is_featured = true`) đã công bố, sắp theo thời gian:
 * `start_year`, rồi `start_date` (null xếp sau), rồi `title` (UC01).
 */
export async function getFeaturedEvents(limit = 12): Promise<EventSummary[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from("historical_events")
    .select(
      `slug, title, summary, date_text, date_precision, is_featured, start_year, curriculum_topics(name, slug), ${EVENT_CARD_MEDIA}`,
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

  return data.map(toEventSummary);
}

type EventRow = {
  slug: string;
  title: string;
  summary: string;
  date_text: string;
  date_precision: string;
  is_featured: boolean | null;
  curriculum_topics: unknown;
  start_year?: number;
  media_assets?: CardMediaRow[];
  event_topics?: { curriculum_topics: unknown }[];
};

export function toEventSummary(event: EventRow): EventSummary {
  // Chủ đề có thể là null lúc chạy nếu nó chưa published (RLS ẩn với khách),
  // dù kiểu sinh ra coi là luôn có (topic_id NOT NULL).
  const topic = event.curriculum_topics as { name: string; slug: string } | null;
  // Chủ đề phụ: chủ đề chưa công bố bị RLS ẩn (null) → bỏ qua.
  const secondaryTopics = (event.event_topics ?? []).flatMap((link) => {
    const secondary = link.curriculum_topics as { name: string; slug: string } | null;
    return secondary ? [secondary] : [];
  });

  return {
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    dateText: event.date_text,
    datePrecision: parseDatePrecision(event.date_precision),
    isFeatured: event.is_featured ?? false,
    topicName: topic?.name,
    topicSlug: topic?.slug,
    topicSlugs: [...(topic ? [topic.slug] : []), ...secondaryTopics.map((item) => item.slug)],
    secondaryTopics,
    year: event.start_year,
    cover: event.media_assets ? pickCardCover(event.media_assets) : undefined,
  };
}

/** Sự kiện rút gọn kèm năm — dùng cho danh sách liên quan ở trang nhân vật/địa điểm/chủ đề. */
export type RelatedEvent = EventSummary & { startYear: number };

/** Hàng sự kiện nhúng (embedded) đủ trường để dựng RelatedEvent. */
export type RelatedEventRow = EventRow & { start_year: number; workflow_status: string };

export function toRelatedEvent(event: RelatedEventRow): RelatedEvent {
  return { ...toEventSummary(event), startYear: event.start_year };
}

/** Sự kiện trên dòng thời gian: thêm năm (để nhóm) và địa điểm chính (để nối sang bản đồ). */
export type TimelineEvent = EventSummary & {
  startYear: number;
  primaryLocation?: { name: string; slug: string };
};

/**
 * Toàn bộ sự kiện đã công bố cho dòng thời gian (UC02), sắp theo `start_year`,
 * rồi `start_date` (null xếp sau), rồi `title`; kèm chủ đề và địa điểm chính.
 * Chỉ 25–35 sự kiện nên lấy hết một lần, lọc chủ đề làm phía trình duyệt.
 */
export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from("historical_events")
    .select(
      `slug, title, summary, date_text, date_precision, is_featured, start_year, curriculum_topics(name, slug), event_locations(is_primary, historical_locations(name, slug)), ${EVENT_CARD_MEDIA}`,
    )
    .eq("workflow_status", "published")
    // Chỉ nhúng địa điểm chính (không dùng !inner nên sự kiện không có vẫn được trả về).
    .eq("event_locations.is_primary", true)
    .order("start_year", { ascending: true })
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Không tải được dòng thời gian: ${error.message}`);
  }

  return data.map((event) => {
    // Địa điểm là null lúc chạy nếu nó chưa published (RLS ẩn với khách).
    const location = event.event_locations
      .map((link) => link.historical_locations as { name: string; slug: string } | null)
      .find((item) => item !== null);

    return {
      ...toEventSummary(event),
      startYear: event.start_year,
      primaryLocation: location ? { name: location.name, slug: location.slug } : undefined,
    };
  });
}
