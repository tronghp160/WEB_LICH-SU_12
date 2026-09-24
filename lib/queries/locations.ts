import { createPublicClient } from "@/lib/supabase/public";
import { parseAccuracyLevel, type AccuracyLevel } from "@/lib/utils/labels";

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
