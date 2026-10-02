import { CalendarClock, Layers, ListChecks, Stamp, WalletCards } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ReviewSuggestion, ReviewTable, type LessonQuestionCounts } from "@/components/quiz/ReviewByLesson";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SafeImage } from "@/components/ui/SafeImage";
import { lessons } from "@/lib/lessons";
import { getQuestionPool, getYearRounds } from "@/lib/queries/quiz";
import { getPublishedTopics } from "@/lib/queries/topics";
import { MIN_QUESTIONS, questionsForLesson, questionsForTopic, quizPaths } from "@/lib/quiz/sets";
import { getCurriculum } from "@/lib/queries/sgk";
import { questionsForSgkLesson } from "@/lib/sgk/quiz";
import { sgkQuizPaths } from "@/lib/sgk/review";
import { responsiveImage } from "@/lib/utils/text";

export const metadata: Metadata = {
  title: "Ôn tập",
  description: "Ôn tập Lịch sử 12 theo từng bài SGK: trắc nghiệm có ảnh tư liệu, thẻ ghi nhớ, trò chơi nhìn ảnh đoán năm.",
};

type SetCardProps = {
  href: string;
  title: string;
  meta: string;
  description?: string;
  image?: { url: string; focalPoint: string | null };
  icon: ReactNode;
};

function SetCard({ href, title, meta, description, image, icon }: SetCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      >
        <div className="relative aspect-[16/9] bg-muted">
          {image ? (
            <SafeImage
              {...responsiveImage(image.url, 400)}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              style={image.focalPoint ? { objectPosition: image.focalPoint } : undefined}
              fallbackClassName="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gold-deep">{icon}</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <span className="text-xs font-medium uppercase tracking-wide text-gold-deep">{meta}</span>
          <span className="font-serif text-lg font-bold text-foreground group-hover:text-accent">{title}</span>
          {description && <span className="text-sm text-muted-foreground">{description}</span>}
        </div>
      </Link>
    </li>
  );
}

export default async function QuizHubPage() {
  const [pool, rounds, topics, curriculum] = await Promise.all([getQuestionPool(), getYearRounds(), getPublishedTopics(), getCurriculum()]);

  const topicSets = topics
    .map((topic) => ({ topic, count: questionsForTopic(pool, topic.slug).length }))
    .filter((item) => item.count >= MIN_QUESTIONS);
  const lessonSets = lessons
    .map((lesson) => ({ lesson, count: questionsForLesson(pool, lesson).length }))
    .filter((item) => item.count >= MIN_QUESTIONS);
  const lessonCounts: LessonQuestionCounts = Object.fromEntries(
    curriculum.lessons.map((lesson) => [lesson.slug, questionsForSgkLesson(pool, lesson).length]),
  );
  const photoOf = (index: number) => {
    const photo = pool.filter((question) => question.kind === "photo-event")[index]?.image;
    return photo ? { url: photo.url, focalPoint: photo.focalPoint } : undefined;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Ôn tập" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Ôn tập</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mỗi lượt 10 câu, phần lớn có ảnh tư liệu. Trả lời xong mỗi câu em thấy ngay đáp án, lời giải thích và trang để đọc
          thêm. Không cần đăng nhập.
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
          <Stamp className="h-4 w-4 text-accent" aria-hidden="true" />
          Đạt từ 7/10 là được đóng dấu vào{" "}
          <Link href="/ho-chieu" className="font-medium text-accent underline">
            Hộ chiếu lịch sử
          </Link>{" "}
          của em.
        </p>
      </header>

      <ReviewSuggestion counts={lessonCounts} minQuestions={MIN_QUESTIONS} />

      <section aria-labelledby="theo-bai-sgk" className="mt-10">
        <h2 id="theo-bai-sgk" className="mb-1 font-serif text-2xl font-bold text-foreground">
          Ôn theo bài
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Mỗi bài một bộ câu hỏi về các sự kiện trong bài. Làm sai câu nào, cuối lượt có gợi ý mục cần đọc lại.
        </p>
        <ReviewTable counts={lessonCounts} minQuestions={MIN_QUESTIONS} />
      </section>

      <section aria-labelledby="choi-nhanh" className="mt-12">
        <h2 id="choi-nhanh" className="mb-4 font-serif text-2xl font-bold text-foreground">
          Ôn nhanh
        </h2>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {pool.length >= MIN_QUESTIONS && (
            <SetCard
              href={quizPaths.all}
              title="Trắc nghiệm tổng hợp"
              meta={`${pool.length} câu hỏi`}
              description="Câu hỏi ngẫu nhiên từ mọi chủ đề."
              image={photoOf(0)}
              icon={<ListChecks className="h-12 w-12" aria-hidden="true" />}
            />
          )}
          {rounds.length >= MIN_QUESTIONS && (
            <SetCard
              href={quizPaths.yearGame}
              title="Nhìn ảnh đoán năm"
              meta={`${rounds.length} ảnh tư liệu`}
              description="Kéo thanh năm để đoán — càng gần càng nhiều điểm."
              image={{ url: rounds[rounds.length - 1].image.url, focalPoint: rounds[rounds.length - 1].image.focalPoint }}
              icon={<CalendarClock className="h-12 w-12" aria-hidden="true" />}
            />
          )}
          <SetCard
            href={sgkQuizPaths.flashcards}
            title="Thẻ ghi nhớ"
            meta={`${lessons.reduce((sum, lesson) => sum + lesson.flashcards.length, 0)} thẻ hỏi – đáp`}
            description="Tự hỏi – tự đáp, lật thẻ xem đáp án."
            icon={<WalletCards className="h-12 w-12" aria-hidden="true" />}
          />
        </ul>
      </section>

      {lessonSets.length > 0 && (
        <section aria-labelledby="theo-bai-hoc" className="mt-12">
          <h2 id="theo-bai-hoc" className="mb-4 font-serif text-2xl font-bold text-foreground">
            Theo chuyên đề tương tác
          </h2>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {lessonSets.map(({ lesson, count }) => (
              <SetCard
                key={lesson.slug}
                href={quizPaths.lesson(lesson.slug)}
                title={lesson.title}
                meta={`${count} câu hỏi · ${lesson.dateText}`}
                image={{ url: lesson.hero.src, focalPoint: null }}
                icon={<Layers className="h-12 w-12" aria-hidden="true" />}
              />
            ))}
          </ul>
        </section>
      )}

      {topicSets.length > 0 && (
        <section aria-labelledby="theo-chu-de" className="mt-12">
          <h2 id="theo-chu-de" className="mb-4 font-serif text-2xl font-bold text-foreground">
            Ôn cả chủ đề
          </h2>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {topicSets.map(({ topic, count }) => (
              <SetCard
                key={topic.slug}
                href={quizPaths.topic(topic.slug)}
                title={topic.name}
                meta={`${count} câu hỏi`}
                image={topic.cover ? { url: topic.cover.url, focalPoint: topic.cover.focalPoint } : undefined}
                icon={<Layers className="h-12 w-12" aria-hidden="true" />}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
