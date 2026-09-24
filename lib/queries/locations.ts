import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { toRelatedEvent, type RelatedEvent, type RelatedEventRow } from "@/lib/queries/events";
import { createPublicClient } from "@/lib/supabase/public";
import { parseAccuracyLevel, type AccuracyLevel, type WorkflowStatus } from "@/lib/utils/labels";

export type MapLocationEvent = {
  slug: string;
  title: string;
  dateText: string;
  topicSlug?: string;
  /** Địa điểm này là địa điểm CHÍNH của sự kiện. */
  isPrimary: boolean;
};

/** Địa điểm đã công bố CÓ TỌA ĐỘ, kèm các sự kiện đã công bố liên quan (UC03). */
export type MapLocation = {
  id: string;
  slug: string;
  name: string;
  historicalName: string | null;
  latitude: number;
  longitude: number;
  accuracyLevel: AccuracyLevel;
  accuracyNote: string | null;
  events: MapLocationEvent[];
};

type EmbeddedEvent = {
  slug: string;
  title: string;
  date_text: string;
  workflow_status: string;
  curriculum_topics: { slug: string } | null;
};

/**
 * Địa điểm published có tọa độ + sự kiện published liên quan, sắp theo tên.
 * Địa điểm không có tọa độ thì không đưa vào (không tạo marker).
 */
export async function getMapLocations(): Promise<MapLocation[]> {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from("historical_locations")
    .select(
      "id, slug, name, historical_name, latitude, longitude, accuracy_level, accuracy_note, event_locations(is_primary, historical_events(slug, title, date_text, workflow_status, start_year, curriculum_topics(slug)))",
    )
    .eq("workflow_status", "published")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Không tải được địa điểm trên bản đồ: ${error.message}`);
  }

  return data.flatMap((location) => {
    // Cột nullable nhưng đã lọc `not is null` ở trên; kiểm tra lại để thu hẹp kiểu.
    if (location.latitude === null || location.longitude === null) return [];

    const events = location.event_locations
      .flatMap((link) => {
        // Sự kiện là null lúc chạy nếu nó chưa published (RLS ẩn với khách).
        const event = link.historical_events as (EmbeddedEvent & { start_year: number }) | null;
        if (!event || event.workflow_status !== "published") return [];
        return [{ event, isPrimary: link.is_primary ?? false }];
      })
      // Sự kiện xếp theo thời gian trong popup/danh sách.
      .sort((a, b) => a.event.start_year - b.event.start_year)
      .map(({ event, isPrimary }) => ({
        slug: event.slug,
        title: event.title,
        dateText: event.date_text,
        topicSlug: event.curriculum_topics?.slug,
        isPrimary,
      }));

    return [
      {
        id: location.id,
        slug: location.slug,
        name: location.name,
        historicalName: location.historical_name,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyLevel: parseAccuracyLevel(location.accuracy_level),
        accuracyNote: location.accuracy_note,
        events,
      },
    ];
  });
}

export type LocationDetail = {
  status: WorkflowStatus;
  slug: string;
  name: string;
  historicalName: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyLevel: AccuracyLevel;
  accuracyNote: string | null;
  /** Sự kiện đã công bố diễn ra tại địa điểm, theo thời gian; `role` là vai trò của địa điểm trong sự kiện. */
  events: (RelatedEvent & { role: string | null; isPrimary: boolean })[];
};

/** Một địa điểm ĐÃ CÔNG BỐ theo slug kèm các sự kiện đã công bố liên quan (UC05); không có → null. */
export const getLocationDetail = cache(async (slug: string): Promise<LocationDetail | null> =>
  loadLocationDetail(await createPublicClient(), { slug }, true),
);

/** Nạp địa điểm bằng client tùy ý (công khai: ẩn danh + chỉ published; màn hình duyệt: phiên nhân sự, mọi trạng thái). */
export async function loadLocationDetail(
  supabase: SupabaseClient<Database>,
  by: { slug: string } | { id: string },
  publishedOnly: boolean,
): Promise<LocationDetail | null> {
  let query = supabase
    .from("historical_locations")
    .select(
      `slug, name, historical_name, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status,
       event_locations(location_role, is_primary, historical_events(slug, title, summary, date_text, date_precision, is_featured, start_year, workflow_status, curriculum_topics(name, slug)))`,
    );
  query = "id" in by ? query.eq("id", by.id) : query.eq("slug", by.slug);
  if (publishedOnly) query = query.eq("workflow_status", "published");
  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Không tải được địa điểm: ${error.message}`);
  }
  if (!data) return null;

  const events = data.event_locations
    .flatMap((link) => {
      // Sự kiện là null lúc chạy nếu nó chưa published (RLS ẩn với khách).
      const event = link.historical_events as RelatedEventRow | null;
      return event && event.workflow_status === "published"
        ? [{ ...toRelatedEvent(event), role: link.location_role, isPrimary: link.is_primary ?? false }]
        : [];
    })
    .sort((a, b) => a.startYear - b.startYear || a.title.localeCompare(b.title, "vi"));

  return {
    status: data.workflow_status,
    slug: data.slug,
    name: data.name,
    historicalName: data.historical_name,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
    accuracyLevel: parseAccuracyLevel(data.accuracy_level),
    accuracyNote: data.accuracy_note,
    events,
  };
}
