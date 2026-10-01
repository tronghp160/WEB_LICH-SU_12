import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, History, ListChecks, Map as MapIcon, MapPin, PenLine } from "lucide-react";
import { EventCard } from "@/components/content/EventCard";
import { FeatureCard } from "@/components/sgk/FeatureCard";
import { LessonProgressBadge } from "@/components/sgk/LessonBadges";
import { LessonPager } from "@/components/sgk/LessonPager";
import { LessonStatusBadge } from "@/components/sgk/LessonStatusBadge";
import { PrintButton } from "@/components/sgk/PrintButton";
import { SectionNav, type SectionNavItem } from "@/components/sgk/SectionNav";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Callout } from "@/components/ui/Callout";
import { getLesson } from "@/lib/lessons";
import type { Lesson } from "@/lib/lessons/types";
import { getEventsBySlugs, type RelatedEvent } from "@/lib/queries/events";
import { getCurriculum } from "@/lib/queries/sgk";
import { getQuestionPool } from "@/lib/queries/quiz";
import { MIN_QUESTIONS, quizPaths } from "@/lib/quiz/sets";
import { questionsForSgkLesson } from "@/lib/sgk/quiz";
import { sgkQuizPaths } from "@/lib/sgk/review";
import {
  getSgkLesson,
  LESSON_TO_LEGACY_TOPIC,
  lessonEventSlugs,
  lessonFeatureSlugs,
  lessonStatus,
  SGK_SERIES,
  sgkPaths,
} from "@/lib/sgk/curriculum";

export async function generateMetadata({ params }: PageProps<"/bai/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getSgkLesson(slug);
  if (!lesson) return { title: "Không tìm thấy nội dung" };
  const title = `Bài ${lesson.number}. ${lesson.title}`;
  const description = `Chủ đề ${lesson.topic.number}: ${lesson.topic.shortTitle}. ${lesson.goals[0]}`;
  // Ảnh chia sẻ theo bài: ảnh mở đầu của chuyên đề tương tác trong bài (nếu có), không thì ảnh mặc định của web.
  const feature = lessonFeatureSlugs(lesson).map((featureSlug) => getLesson(featureSlug)).find(Boolean);
  return { title, description, openGraph: { title, description, ...(feature ? { images: [feature.hero.src] } : {}) } };
}

/** Sự kiện là nội dung phụ của khung bài: database lỗi thì vẫn hiện khung bài, kèm một dòng báo. */
async function loadEvents(slugs: string[]): Promise<{ events: Map<string, RelatedEvent>; failed: boolean }> {
  try {
    const events = await getEventsBySlugs(slugs);
    return { events: new Map(events.map((event) => [event.slug, event])), failed: false };
  } catch {
    return { events: new Map(), failed: true };
  }
}

/** Số câu trắc nghiệm của bài (để biết bộ của bài đã mở chưa); lỗi tải thì coi như chưa có. */
async function countQuestions(lesson: NonNullable<ReturnType<typeof getSgkLesson>>): Promise<number> {
  try {
    return questionsForSgkLesson(await getQuestionPool(), lesson).length;
  } catch {
    return 0;
  }
}

const sectionHeadingClass = "scroll-mt-32 font-serif text-2xl font-bold text-foreground sm:text-[1.75rem] lg:scroll-mt-24";

/**
 * Trang Bài SGK — khuôn "trang sách" (mục 6.4): mục lục bài dính bên trái, nội dung theo đúng các mục của SGK ở giữa,
 * cột công cụ bên phải. Mỗi mục: sự kiện liên quan (đọc từ database) và chuyên đề tương tác nếu có.
 */
export default async function SgkLessonPage({ params }: PageProps<"/bai/[slug]">) {
  const { slug } = await params;
  // 17 bài viết cứng trong lib/sgk: slug lạ → 404. Sự kiện gán vào từng mục: bảng sgk_lesson_events (GĐ7), chưa có thì
  // dùng cách gán trong code (lib/queries/sgk.ts).
  const lesson = getSgkLesson(slug, (await getCurriculum()).lessons);
  if (!lesson) notFound();

  const { topic } = lesson;
  const status = lessonStatus(lesson);
  const [{ events, failed }, questionCount] = await Promise.all([loadEvents(lessonEventSlugs(lesson)), countQuestions(lesson)]);
  const hasLessonQuiz = questionCount >= MIN_QUESTIONS;
  const features = lessonFeatureSlugs(lesson)
    .map((featureSlug) => getLesson(featureSlug))
    .filter((item): item is Lesson => item !== undefined);
  const legacyTopic = LESSON_TO_LEGACY_TOPIC[lesson.number];

  const navItems: SectionNavItem[] = [
    { id: "mo-dau", label: "Mở đầu: yêu cầu cần đạt" },
    ...lesson.sections.map((section) => ({ id: section.id, label: section.title, numeral: section.numeral, tracked: true })),
    { id: "luyen-tap", label: "Luyện tập và vận dụng" },
  ];

  return (
    <div data-topic-color={topic.color} className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumb
        items={[
          { label: "Mục lục", href: sgkPaths.toc },
          { label: `Chủ đề ${topic.number}`, href: sgkPaths.topic(topic.slug) },
          { label: `Bài ${lesson.number}` },
        ]}
      />

      <header className="mt-5 border-l-4 border-[var(--topic)] pl-4 sm:pl-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--topic)]">
          Chủ đề {topic.number} · Bài {lesson.number}
        </p>
        <h1 className="mt-1 text-balance font-serif text-3xl font-bold text-foreground sm:text-[2.5rem] sm:leading-tight">{lesson.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {lesson.periods} tiết
          </span>
          <span>{SGK_SERIES}</span>
          <LessonStatusBadge status={status} />
          <LessonProgressBadge lesson={lesson} />
        </div>
      </header>

      <SectionNav lessonSlug={lesson.slug} items={navItems} title={`Bài ${lesson.number}`} variant="mobile" />

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside className="hidden lg:block">
          <SectionNav lessonSlug={lesson.slug} items={navItems} title={`Bài ${lesson.number}`} variant="desktop" />
        </aside>

        <article className="flex min-w-0 flex-col gap-14">
          <section id="mo-dau" aria-labelledby="mo-dau-tieu-de" className="flex flex-col gap-4">
            <h2 id="mo-dau-tieu-de" className="sr-only">
              Mở đầu
            </h2>
            <Callout variant="goal" title="Học xong bài này, em có thể">
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                {lesson.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </Callout>
            {status === "drafting" && (
              <Callout variant="warning" title="Nội dung bài này đang biên soạn">
                Dưới đây là khung bài theo SGK (tên các mục và yêu cầu cần đạt) để em theo dõi. Em vẫn có thể đọc bài trong sách, rồi dùng{" "}
                <Link href="/dong-thoi-gian" className="text-accent underline">
                  dòng thời gian
                </Link>{" "}
                và{" "}
                <Link href="/ban-do" className="text-accent underline">
                  bản đồ
                </Link>{" "}
                để ôn.
              </Callout>
            )}
            {failed && (
              <p role="status" className="rounded-card border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                Chưa tải được các sự kiện liên quan (lỗi kết nối). Khung bài vẫn dùng được; tải lại trang để thử lại.
              </p>
            )}
          </section>

          {lesson.sections.map((section) => {
            const sectionEvents = (section.eventSlugs ?? []).flatMap((eventSlug) => events.get(eventSlug) ?? []);
            const sectionFeatures = features.filter((feature) => section.featureSlugs?.includes(feature.slug));
            const empty = sectionEvents.length === 0 && sectionFeatures.length === 0;
            return (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-tieu-de`} className="flex flex-col gap-5">
                <h2 id={`${section.id}-tieu-de`} className={sectionHeadingClass}>
                  <span className="mr-2 text-[var(--topic)]">{section.numeral}.</span>
                  {section.title}
                </h2>

                {sectionFeatures.map((feature) => (
                  <FeatureCard key={feature.slug} lesson={feature} />
                ))}

                {sectionEvents.length > 0 && (
                  <div>
                    <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      Sự kiện trong mục này
                    </h3>
                    <ul className="grid gap-4 sm:grid-cols-2">
                      {sectionEvents.map((event) => (
                        <li key={event.slug}>
                          <EventCard {...event} showFeaturedBadge={false} hideTopic />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {empty && (
                  <p className="flex items-start gap-2 rounded-card border border-dashed border-border-strong px-4 py-4 text-muted-foreground">
                    <PenLine className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    Nội dung mục này đang biên soạn. Em đọc mục {section.numeral} trong SGK trước nhé.
                  </p>
                )}
              </section>
            );
          })}

          <section id="luyen-tap" aria-labelledby="luyen-tap-tieu-de" className="flex flex-col gap-5">
            <h2 id="luyen-tap-tieu-de" className={sectionHeadingClass}>
              Luyện tập và vận dụng
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {hasLessonQuiz && (
                <li>
                  <PracticeLink
                    href={sgkQuizPaths.lesson(lesson.slug)}
                    icon={ListChecks}
                    title={`Làm 10 câu trắc nghiệm Bài ${lesson.number}`}
                    text={`${questionCount} câu có ảnh tư liệu, chấm điểm ngay, gợi ý mục cần đọc lại. Đạt 7/10 được đóng dấu.`}
                    primary
                  />
                </li>
              )}
              {legacyTopic && (
                <li>
                  <PracticeLink
                    href={quizPaths.topic(legacyTopic)}
                    icon={ListChecks}
                    title="Trắc nghiệm theo chủ đề"
                    text="Câu hỏi về các sự kiện cùng giai đoạn, có giải thích đáp án."
                  />
                </li>
              )}
              <li>
                <PracticeLink
                  href="/di-tich-gan-em"
                  icon={MapPin}
                  title="Vận dụng: di tích gần em"
                  text="Tìm một di tích gắn với bài học ở gần nơi em ở, tìm hiểu và kể lại cho bạn bè."
                />
              </li>
              {features.length > 0 && (
                <li>
                  <PracticeLink href={sgkQuizPaths.flashcards} icon={ListChecks} title="Thẻ ghi nhớ" text="Tự hỏi – tự đáp với các thẻ lật của chuyên đề trong bài." />
                </li>
              )}
              {!hasLessonQuiz && !legacyTopic && (
                <li>
                  <PracticeLink href={quizPaths.all} icon={ListChecks} title="Trắc nghiệm tổng hợp" text="Ôn ngẫu nhiên các câu hỏi đã có của cả chương trình." />
                </li>
              )}
            </ul>
          </section>

          <LessonPager slug={lesson.slug} />
        </article>

        <aside aria-label="Công cụ của bài" className="hidden xl:block print:hidden">
          <div className="sticky top-24 flex flex-col gap-5 rounded-card border border-border bg-sunken p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Công cụ</p>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link
                  href={legacyTopic ? `/dong-thoi-gian?chu-de=${legacyTopic}` : "/dong-thoi-gian"}
                  className="inline-flex items-center gap-2 text-foreground hover:text-accent"
                >
                  <History className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                  Dòng thời gian
                </Link>
              </li>
              <li>
                <Link href="/ban-do" className="inline-flex items-center gap-2 text-foreground hover:text-accent">
                  <MapIcon className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                  Bản đồ lịch sử
                </Link>
              </li>
              <li>
                <Link href={sgkPaths.topic(topic.slug)} className="inline-flex items-center gap-2 text-foreground hover:text-accent">
                  <ArrowRight className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                  Các bài cùng chủ đề {topic.number}
                </Link>
              </li>
            </ul>
            {features.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Học sâu</p>
                <ul className="flex flex-col gap-2">
                  {features.map((feature) => (
                    <li key={feature.slug}>
                      <Link href={`/bai-hoc/${feature.slug}`} className="inline-block py-1 font-medium text-accent hover:underline">
                        ★ {feature.title}
                      </Link>
                      <Link
                        href={`/bai-hoc/${feature.slug}/trinh-chieu`}
                        className="block py-1.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Trình chiếu trên lớp
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="border-t border-border pt-4">
              <PrintButton label="In khung bài" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PracticeLink({
  href,
  icon: Icon,
  title,
  text,
  primary,
}: {
  href: string;
  icon: typeof ListChecks;
  title: string;
  text: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "flex h-full gap-3 rounded-card border-2 border-accent bg-surface p-4 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          : "flex h-full gap-3 rounded-card border border-border bg-surface p-4 hover:border-border-strong hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      }
    >
      <Icon className={primary ? "mt-0.5 h-5 w-5 shrink-0 text-accent" : "mt-0.5 h-5 w-5 shrink-0 text-gold-deep"} aria-hidden="true" />
      <span>
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{text}</span>
      </span>
    </Link>
  );
}
