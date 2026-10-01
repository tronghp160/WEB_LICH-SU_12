import { cache } from "react";
import { PUBLIC_MEDIA_FIELDS, toMediaItem, type MediaRow } from "@/lib/media";
import { buildQuestionPool, buildYearRounds } from "@/lib/quiz/generate";
import type { QuizQuestion, QuizSourceData, SourceImage, YearRound } from "@/lib/quiz/types";
import { createPublicClient } from "@/lib/supabase/public";
import { mediaHonestyLabels } from "@/lib/utils/labels";

function toSourceImages(rows: readonly MediaRow[]): SourceImage[] {
  return rows
    .filter((row) => row.media_type === "image")
    .map((row) => {
      const item = toMediaItem(row);
      return {
        id: row.id,
        url: item.url,
        alt: item.altText ?? "",
        caption: item.caption,
        labels: item.labels,
        // Cùng nhãn trung thực nhưng bỏ năm chụp: năm có thể làm lộ đáp án câu hỏi "năm nào?".
        neutralLabels: mediaHonestyLabels({ ...row, year_taken: null }),
        photographer: item.photographer,
        license: item.license,
        licenseUrl: item.licenseUrl,
        sourcePageUrl: item.sourcePageUrl,
        focalPoint: item.focalPoint,
        width: item.width,
        height: item.height,
        era: row.era,
        isCover: row.is_cover,
        sortOrder: row.sort_order ?? 0,
      };
    });
}

/**
 * Dữ liệu ĐÃ CÔNG BỐ để sinh câu hỏi: sự kiện (kèm chủ đề, nhân vật, địa điểm, ảnh), nhân vật, địa điểm và câu hỏi
 * soạn tay. Khách đọc bằng anon key nên RLS chỉ trả nội dung published; vẫn lọc rõ `published` để phòng thủ hai lớp.
 */
export const getQuizSourceData = cache(async (): Promise<QuizSourceData> => {
  const supabase = await createPublicClient();

  const [events, figures, locations, authored] = await Promise.all([
    supabase
      .from("historical_events")
      .select(
        `id, slug, title, summary, date_text, date_precision, start_year, curriculum_topics(slug), event_topics(curriculum_topics(slug)), event_figures(figure_id), event_locations(location_id), media_assets(${PUBLIC_MEDIA_FIELDS})`,
      )
      .eq("workflow_status", "published")
      .order("start_year", { ascending: true })
      .order("title", { ascending: true }),
    supabase
      .from("historical_figures")
      .select(`id, slug, name, biography, media_assets(${PUBLIC_MEDIA_FIELDS})`)
      .eq("workflow_status", "published")
      .order("name", { ascending: true }),
    supabase
      .from("historical_locations")
      .select(`id, slug, name, description, media_assets(${PUBLIC_MEDIA_FIELDS})`)
      .eq("workflow_status", "published")
      .order("name", { ascending: true }),
    supabase
      .from("quiz_questions")
      .select("id, event_id, question, choices, correct_index, explanation, media_id, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const error = events.error ?? figures.error ?? locations.error ?? authored.error;
  if (error) {
    throw new Error(`Không tải được dữ liệu trắc nghiệm: ${error.message}`);
  }

  return {
    events: (events.data ?? []).map((event) => {
      // Chủ đề/chủ đề phụ chưa công bố bị RLS ẩn (null) → bỏ qua.
      const topic = event.curriculum_topics as { slug: string } | null;
      const secondary = event.event_topics.flatMap((link) => {
        const item = link.curriculum_topics as { slug: string } | null;
        return item ? [item.slug] : [];
      });
      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        summary: event.summary,
        dateText: event.date_text,
        datePrecision: event.date_precision,
        startYear: event.start_year,
        topicSlugs: [...(topic ? [topic.slug] : []), ...secondary],
        figureIds: event.event_figures.map((link) => link.figure_id),
        locationIds: event.event_locations.map((link) => link.location_id),
        images: toSourceImages(event.media_assets as MediaRow[]),
      };
    }),
    figures: (figures.data ?? []).map((figure) => ({
      id: figure.id,
      slug: figure.slug,
      name: figure.name,
      biography: figure.biography,
      images: toSourceImages(figure.media_assets as MediaRow[]),
    })),
    locations: (locations.data ?? []).map((location) => ({
      id: location.id,
      slug: location.slug,
      name: location.name,
      description: location.description,
      images: toSourceImages(location.media_assets as MediaRow[]),
    })),
    authored: (authored.data ?? []).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      question: row.question,
      choices: row.choices,
      correctIndex: row.correct_index,
      explanation: row.explanation,
      mediaId: row.media_id,
    })),
  };
});

/** Toàn bộ câu hỏi có thể có (soạn tay + tự sinh). */
export const getQuestionPool = cache(async (): Promise<QuizQuestion[]> => buildQuestionPool(await getQuizSourceData()));

/** Các vòng "Đoán năm". */
export const getYearRounds = cache(async (): Promise<YearRound[]> => buildYearRounds(await getQuizSourceData()));
