import { getTimelineEvents, type TimelineEvent } from "@/lib/queries/events";
import { getPublishedTopics } from "@/lib/queries/topics";
import { createPublicClient } from "@/lib/supabase/public";
import { parseAccuracyLevel, type AccuracyLevel } from "@/lib/utils/labels";

export type SearchFigure = {
  slug: string;
  name: string;
  otherNames: string | null;
  birthYear: number | null;
  deathYear: number | null;
  /** Chủ đề của các sự kiện đã công bố có nhân vật này (để lọc theo chủ đề). */
  topicSlugs: string[];
};

export type SearchLocation = {
  slug: string;
  name: string;
  historicalName: string | null;
  accuracyLevel: AccuracyLevel;
  /** Chủ đề của các sự kiện đã công bố diễn ra tại địa điểm này (để lọc theo chủ đề). */
  topicSlugs: string[];
};

export type SearchIndex = {
  events: TimelineEvent[];
  figures: SearchFigure[];
  locations: SearchLocation[];
  topics: { slug: string; name: string; eventCount: number }[];
};

type LinkedEvent = { curriculum_topics: { slug: string } | null } | null;

/** Slug chủ đề (không trùng) của các sự kiện nhúng; sự kiện chưa published bị RLS ẩn nên là null. */
function topicSlugsOf(links: { historical_events: unknown }[]): string[] {
  const slugs = links.flatMap((link) => {
    const slug = (link.historical_events as LinkedEvent)?.curriculum_topics?.slug;
    return slug ? [slug] : [];
  });
  return [...new Set(slugs)];
}

/**
 * Toàn bộ dữ liệu đã công bố dùng để tra cứu (UC04). Chỉ khoảng vài chục bản ghi
 * nên tải hết một lần rồi lọc (kể cả tìm không dấu) trong trình duyệt — không cần
 * đổi schema. Khi dữ liệu lớn lên cả nghìn dòng thì chuyển sang tìm ở database
 * (unaccent + RPC hoặc cột search_text, xem Phase 8 trong KE_HOACH_DU_AN.md).
 */
export async function getSearchIndex(): Promise<SearchIndex> {
  const supabase = await createPublicClient();

  const [events, topics, figuresResult, locationsResult] = await Promise.all([
    getTimelineEvents(),
    getPublishedTopics(),
    supabase
      .from("historical_figures")
      .select(
        "slug, name, other_names, birth_year, death_year, event_figures(historical_events(curriculum_topics(slug)))",
      )
      .eq("workflow_status", "published")
      .order("name", { ascending: true }),
    supabase
      .from("historical_locations")
      .select(
        "slug, name, historical_name, accuracy_level, event_locations(historical_events(curriculum_topics(slug)))",
      )
      .eq("workflow_status", "published")
      .order("name", { ascending: true }),
  ]);

  if (figuresResult.error) {
    throw new Error(`Không tải được dữ liệu tra cứu: ${figuresResult.error.message}`);
  }
  if (locationsResult.error) {
    throw new Error(`Không tải được dữ liệu tra cứu: ${locationsResult.error.message}`);
  }

  return {
    events,
    figures: figuresResult.data.map((figure) => ({
      slug: figure.slug,
      name: figure.name,
      otherNames: figure.other_names,
      birthYear: figure.birth_year,
      deathYear: figure.death_year,
      topicSlugs: topicSlugsOf(figure.event_figures),
    })),
    locations: locationsResult.data.map((location) => ({
      slug: location.slug,
      name: location.name,
      historicalName: location.historical_name,
      accuracyLevel: parseAccuracyLevel(location.accuracy_level),
      topicSlugs: topicSlugsOf(location.event_locations),
    })),
    topics: topics
      .filter((topic) => topic.eventCount > 0)
      .map((topic) => ({ slug: topic.slug, name: topic.name, eventCount: topic.eventCount })),
  };
}
