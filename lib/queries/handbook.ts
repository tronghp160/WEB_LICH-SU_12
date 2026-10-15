import "server-only";

import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import { buildTimeline, figureYears, TRICKY_LIMIT, TRICKY_MAX_P, type Handbook, type HandbookEvent, type HandbookFigure, type HandbookTricky } from "@/lib/exams/handbook";
import { STATS_MIN_ATTEMPTS } from "@/lib/exams/quality";
import { getItemStats } from "@/lib/queries/exam-quality";
import { getCurriculum } from "@/lib/queries/sgk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";

// Dữ liệu sổ tay ôn thi một bài (GĐ8). Sự kiện / nhân vật đọc bằng quyền khách (chỉ bản đã công bố). "Câu hay bị nhầm" có
// đáp án nên đọc bằng khóa bí mật — CHỈ gọi loadHandbook sau khi đã xác nhận người xem có gói (hoặc là bài xem thử).

type Statement = { text: string; is_true: boolean };

async function trickyItems(lessonSlug: string): Promise<HandbookTricky[]> {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("exam_items")
    .select("id, kind, stem, choices, correct_index, statements, explanation")
    .eq("lesson_slug", lessonSlug)
    .eq("workflow_status", "published")
    .limit(500);
  if (!items || items.length === 0) return [];
  const stats = await getItemStats(items.map((item) => item.id));
  return items
    .flatMap((item) => {
      const stat = stats.get(item.id);
      if (!stat || stat.n < STATS_MIN_ATTEMPTS || stat.p >= TRICKY_MAX_P) return [];
      const answer =
        item.kind === "mcq" && item.choices && item.correct_index !== null
          ? `${CHOICE_LETTERS[item.correct_index]}. ${item.choices[item.correct_index]}`
          : ((item.statements as Statement[] | null) ?? []).map((statement, index) => `${STATEMENT_LETTERS[index]}) ${statement.is_true ? "Đúng" : "Sai"}`).join(" · ");
      return [{ itemId: item.id, kind: item.kind, stem: item.stem, answer, explanation: item.explanation, p: stat.p }];
    })
    .sort((a, b) => a.p - b.p)
    .slice(0, TRICKY_LIMIT);
}

/** Sổ tay của một bài; bài không có trong khung SGK → null. */
export async function loadHandbook(lessonSlug: string): Promise<Handbook | null> {
  const curriculum = await getCurriculum();
  const lesson = curriculum.lessons.find((entry) => entry.slug === lessonSlug);
  if (!lesson) return null;

  const slugs = [...new Set(lesson.sections.flatMap((section) => section.eventSlugs ?? []))];
  const supabase = await createPublicClient();
  const { data: events } = slugs.length
    ? await supabase
        .from("historical_events")
        .select("slug, title, date_text, start_year, summary, event_figures(sort_order, historical_figures(slug, name, birth_year, death_year, workflow_status))")
        .in("slug", slugs)
        .eq("workflow_status", "published")
    : { data: [] };

  const bySlug = new Map<string, HandbookEvent>();
  const figures = new Map<string, HandbookFigure>();
  for (const event of events ?? []) {
    bySlug.set(event.slug, { slug: event.slug, title: event.title, dateText: event.date_text, startYear: event.start_year, summary: event.summary });
    for (const link of [...event.event_figures].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
      const figure = link.historical_figures as { slug: string; name: string; birth_year: number | null; death_year: number | null; workflow_status: string } | null;
      if (figure && figure.workflow_status === "published" && !figures.has(figure.slug)) {
        figures.set(figure.slug, { slug: figure.slug, name: figure.name, years: figureYears(figure.birth_year, figure.death_year) });
      }
    }
  }

  const sections = lesson.sections.map((section) => ({
    id: section.id,
    numeral: section.numeral,
    title: section.title,
    events: (section.eventSlugs ?? []).flatMap((slug) => (bySlug.has(slug) ? [bySlug.get(slug)!] : [])),
  }));

  return {
    lesson: { slug: lesson.slug, number: lesson.number, title: lesson.title, topicTitle: lesson.topic.title, goals: lesson.goals },
    sections,
    timeline: buildTimeline(sections),
    figures: [...figures.values()],
    tricky: await trickyItems(lesson.slug).catch(() => []),
  };
}
