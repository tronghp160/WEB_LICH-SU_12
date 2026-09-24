import { cache } from "react";
import { toRelatedEvent, type RelatedEvent, type RelatedEventRow } from "@/lib/queries/events";
import { createPublicClient } from "@/lib/supabase/public";

export type FigureDetail = {
  slug: string;
  name: string;
  otherNames: string | null;
  birthYear: number | null;
  deathYear: number | null;
  biography: string | null;
  portraitUrl: string | null;
  /** Sự kiện đã công bố có nhân vật này, theo thời gian; `relationship` là vai trò trong sự kiện. */
  events: (RelatedEvent & { relationship: string | null })[];
};

/** Một nhân vật ĐÃ CÔNG BỐ theo slug kèm các sự kiện đã công bố liên quan (UC05); không có → null. */
export const getFigureDetail = cache(async (slug: string): Promise<FigureDetail | null> => {
  const supabase = await createPublicClient();

  const { data, error } = await supabase
    .from("historical_figures")
    .select(
      `slug, name, other_names, birth_year, death_year, biography, portrait_url,
       event_figures(relationship, historical_events(slug, title, summary, date_text, date_precision, is_featured, start_year, workflow_status, curriculum_topics(name, slug)))`,
    )
    .eq("slug", slug)
    .eq("workflow_status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Không tải được nhân vật: ${error.message}`);
  }
  if (!data) return null;

  const events = data.event_figures
    .flatMap((link) => {
      // Sự kiện là null lúc chạy nếu nó chưa published (RLS ẩn với khách).
      const event = link.historical_events as RelatedEventRow | null;
      return event && event.workflow_status === "published"
        ? [{ ...toRelatedEvent(event), relationship: link.relationship }]
        : [];
    })
    .sort((a, b) => a.startYear - b.startYear || a.title.localeCompare(b.title, "vi"));

  return {
    slug: data.slug,
    name: data.name,
    otherNames: data.other_names,
    birthYear: data.birth_year,
    deathYear: data.death_year,
    biography: data.biography,
    portraitUrl: data.portrait_url,
    events,
  };
});
