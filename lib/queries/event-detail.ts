import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { SourceListItem } from "@/components/content/SourceList";
import type { Database } from "@/lib/database.types";
import { toEventSummary, type EventSummary } from "@/lib/queries/events";
import { createPublicClient } from "@/lib/supabase/public";
import { parseAccuracyLevel, parseSourceType, type AccuracyLevel, type WorkflowStatus } from "@/lib/utils/labels";

export type EventDetail = EventSummary & {
  id: string;
  /** Trạng thái quy trình của chính sự kiện (trang công khai luôn là "published"; màn hình duyệt thì bất kỳ). */
  status: WorkflowStatus;
  content: string | null;
  startYear: number;
  endYear: number | null;
  figures: {
    slug: string;
    name: string;
    birthYear: number | null;
    deathYear: number | null;
    relationship: string | null;
    /** Nhân vật chưa công bố sẽ không hiện ở trang công khai — màn hình duyệt dùng để cảnh báo. */
    status: WorkflowStatus;
  }[];
  locations: {
    slug: string;
    name: string;
    historicalName: string | null;
    role: string | null;
    isPrimary: boolean;
    latitude: number | null;
    longitude: number | null;
    accuracyLevel: AccuracyLevel;
    accuracyNote: string | null;
    status: WorkflowStatus;
  }[];
  sources: (SourceListItem & { confidenceNote: string | null })[];
  media: {
    id: string;
    url: string;
    type: "image" | "document";
    caption: string | null;
    altText: string | null;
    sourceTitle: string | null;
  }[];
};

// Quan hệ nhúng có thể là null lúc chạy nếu bản ghi kia chưa published (RLS ẩn với khách),
// dù kiểu sinh ra coi là luôn có.
type Embedded<T> = T | null;

/**
 * Chi tiết một sự kiện ĐÃ CÔNG BỐ theo slug (UC05); không có / chưa công bố → null.
 * Nhân vật, địa điểm, nguồn, media chưa published bị RLS ẩn nên chỉ còn phần đã công bố.
 * Bọc `cache` để `generateMetadata` và trang dùng chung một lần truy vấn.
 */
export const getEventDetail = cache(async (slug: string): Promise<EventDetail | null> =>
  loadEventDetail(await createPublicClient(), { slug }, true),
);

/**
 * Nạp chi tiết sự kiện bằng MỘT client tùy ý:
 *  - trang công khai: client ẩn danh + `publishedOnly = true`
 *  - màn hình duyệt (Phase 11): phiên của nhân sự + `publishedOnly = false` để xem trước bản chờ duyệt
 * RLS vẫn là lớp quyết định dữ liệu nào trả về; `publishedOnly` chỉ là lớp phòng thủ thứ hai.
 */
export async function loadEventDetail(
  supabase: SupabaseClient<Database>,
  by: { slug: string } | { id: string },
  publishedOnly: boolean,
): Promise<EventDetail | null> {
  let query = supabase
    .from("historical_events")
    .select(
      `id, slug, title, summary, content, date_text, date_precision, is_featured, start_year, end_year, workflow_status,
       curriculum_topics(name, slug),
       event_figures(relationship, sort_order, historical_figures(slug, name, birth_year, death_year, workflow_status)),
       event_locations(location_role, is_primary, historical_locations(slug, name, historical_name, latitude, longitude, accuracy_level, accuracy_note, workflow_status)),
       event_sources(source_note, confidence_note, sources(id, title, citation, url, source_type)),
       media_assets(id, file_url, media_type, caption, alt_text, sort_order, sources(title))`,
    );
  query = "id" in by ? query.eq("id", by.id) : query.eq("slug", by.slug);
  if (publishedOnly) query = query.eq("workflow_status", "published");
  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Không tải được sự kiện: ${error.message}`);
  }
  if (!data) return null;

  const figures = [...data.event_figures]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .flatMap((link) => {
      const figure = link.historical_figures as Embedded<{
        slug: string;
        name: string;
        birth_year: number | null;
        death_year: number | null;
        workflow_status: WorkflowStatus;
      }>;
      return figure
        ? [
            {
              slug: figure.slug,
              name: figure.name,
              birthYear: figure.birth_year,
              deathYear: figure.death_year,
              relationship: link.relationship,
              status: figure.workflow_status,
            },
          ]
        : [];
    });

  const locations = data.event_locations
    .flatMap((link) => {
      const location = link.historical_locations as Embedded<{
        slug: string;
        name: string;
        historical_name: string | null;
        latitude: number | null;
        longitude: number | null;
        accuracy_level: string;
        accuracy_note: string | null;
        workflow_status: WorkflowStatus;
      }>;
      return location
        ? [
            {
              slug: location.slug,
              name: location.name,
              historicalName: location.historical_name,
              role: link.location_role,
              isPrimary: link.is_primary ?? false,
              latitude: location.latitude,
              longitude: location.longitude,
              accuracyLevel: parseAccuracyLevel(location.accuracy_level),
              accuracyNote: location.accuracy_note,
              status: location.workflow_status,
            },
          ]
        : [];
    })
    // Địa điểm chính lên đầu; còn lại giữ thứ tự.
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const sources = data.event_sources.flatMap((link) => {
    const source = link.sources as Embedded<{
      id: string;
      title: string;
      citation: string;
      url: string | null;
      source_type: string;
    }>;
    return source
      ? [
          {
            id: source.id,
            title: source.title,
            citation: source.citation,
            url: source.url,
            sourceType: parseSourceType(source.source_type),
            sourceNote: link.source_note,
            confidenceNote: link.confidence_note,
          },
        ]
      : [];
  });

  const media = [...data.media_assets]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => ({
      id: item.id,
      url: item.file_url,
      type: item.media_type === "document" ? ("document" as const) : ("image" as const),
      caption: item.caption,
      altText: item.alt_text,
      sourceTitle: (item.sources as Embedded<{ title: string }>)?.title ?? null,
    }));

  return {
    ...toEventSummary(data),
    id: data.id,
    status: data.workflow_status,
    content: data.content,
    startYear: data.start_year,
    endYear: data.end_year,
    figures,
    locations,
    sources,
    media,
  };
}
