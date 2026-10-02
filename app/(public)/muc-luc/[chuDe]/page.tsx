import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { CompactTimeline } from "@/components/content/CompactTimeline";
import { SgkToc } from "@/components/sgk/SgkToc";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEventsBySlugs, type RelatedEvent } from "@/lib/queries/events";
import { getCurriculum } from "@/lib/queries/sgk";
import { quizPaths } from "@/lib/quiz/sets";
import { getSgkTopic, LESSON_TO_LEGACY_TOPIC, lessonEventSlugs, lessonStatuses, sgkPaths } from "@/lib/sgk/curriculum";

export async function generateMetadata({ params }: PageProps<"/muc-luc/[chuDe]">): Promise<Metadata> {
  const { chuDe } = await params;
  const topic = getSgkTopic(chuDe);
  if (!topic) return { title: "Không tìm thấy nội dung" };
  return { title: `Chủ đề ${topic.number}. ${topic.shortTitle}`, description: topic.summary };
}

async function loadEvents(slugs: string[]): Promise<RelatedEvent[] | null> {
  try {
    return await getEventsBySlugs(slugs);
  } catch {
    return null;
  }
}

/** Trang một chủ đề SGK (mục 6.3): giới thiệu, các bài, dòng thời gian thu nhỏ gồm sự kiện của chủ đề. */
export default async function SgkTopicPage({ params }: PageProps<"/muc-luc/[chuDe]">) {
  const { chuDe } = await params;
  const { topics } = await getCurriculum();
  const topic = getSgkTopic(chuDe, topics);
  if (!topic) notFound();

  const events = await loadEvents([...new Set(topic.lessons.flatMap(lessonEventSlugs))]);
  // Ôn cả chủ đề: dùng bộ trắc nghiệm của chủ đề cũ tương ứng với bài đầu tiên có ánh xạ (nếu có).
  const legacyTopic = topic.lessons.map((lesson) => LESSON_TO_LEGACY_TOPIC[lesson.number]).find(Boolean);

  return (
    <div data-topic-color={topic.color} className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumb items={[{ label: "Mục lục", href: sgkPaths.toc }, { label: `Chủ đề ${topic.number}` }]} />
      <header className="mb-10 mt-5 border-l-4 border-[var(--topic)] pl-4 sm:pl-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--topic)]">
          Chủ đề {topic.number} · {topic.periods} tiết · {topic.lessons.length} bài
        </p>
        <h1 className="mt-1 text-balance font-serif text-3xl font-bold text-foreground sm:text-[2.5rem] sm:leading-tight">{topic.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{topic.summary}</p>
        {legacyTopic && (
          <LinkButton href={quizPaths.topic(legacyTopic)} variant="secondary" className="mt-5">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            Ôn tập cả chủ đề
          </LinkButton>
        )}
      </header>

      <section aria-label="Các bài trong chủ đề">
        <SgkToc topics={[topic]} showFilters={false} statuses={lessonStatuses(topics)} />
      </section>

      <section aria-labelledby="dong-thoi-gian-chu-de" className="mt-14">
        <h2 id="dong-thoi-gian-chu-de" className="mb-6 font-serif text-2xl font-bold text-foreground">
          Dòng thời gian của chủ đề
        </h2>
        {events === null ? (
          <p role="status" className="rounded-card border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            Chưa tải được các sự kiện (lỗi kết nối). Tải lại trang để thử lại.
          </p>
        ) : events.length === 0 ? (
          <EmptyState title="Chưa có sự kiện" description="Các sự kiện của chủ đề này đang được biên soạn." />
        ) : (
          <CompactTimeline events={events} label={`Sự kiện của chủ đề ${topic.number}`} />
        )}
      </section>
    </div>
  );
}
