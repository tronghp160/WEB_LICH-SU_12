import type { Metadata } from "next";
import { Passport } from "@/components/progress/Passport";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { lessons } from "@/lib/lessons";
import { buildStampCatalog } from "@/lib/progress/progress";
import { getQuestionPool, getYearRounds } from "@/lib/queries/quiz";
import { getPublishedTopics } from "@/lib/queries/topics";
import { MIN_QUESTIONS, questionsForLesson, questionsForTopic } from "@/lib/quiz/sets";
import { getCurriculum } from "@/lib/queries/sgk";
import { questionsForSgkLesson } from "@/lib/sgk/quiz";

export const metadata: Metadata = {
  title: "Tiến độ học tập",
  description: "Tiến độ 17 bài SGK và con dấu Hộ chiếu lịch sử — lưu ngay trên trình duyệt, chuyển sang máy khác bằng mã tiến độ.",
};

export default async function PassportPage() {
  const [pool, rounds, topics, curriculum] = await Promise.all([getQuestionPool(), getYearRounds(), getPublishedTopics(), getCurriculum()]);

  // Chỉ bộ trắc nghiệm đang mở (đủ câu, giống trang /trac-nghiem) mới có con dấu.
  const stamps = buildStampCatalog({
    sgkLessons: curriculum.lessons.filter((lesson) => questionsForSgkLesson(pool, lesson).length >= MIN_QUESTIONS),
    lessons: lessons.filter((lesson) => questionsForLesson(pool, lesson).length >= MIN_QUESTIONS),
    topics: topics.filter((topic) => questionsForTopic(pool, topic.slug).length >= MIN_QUESTIONS),
    hasAllQuiz: pool.length >= MIN_QUESTIONS,
    hasYearGame: rounds.length >= MIN_QUESTIONS,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tiến độ học tập" }]} />
      <header className="mb-8 mt-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">Hộ chiếu lịch sử</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-foreground sm:text-4xl">Tiến độ học tập</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Em đã đọc tới đâu trong 17 bài, và các con dấu nhận được khi làm trắc nghiệm đạt từ 7/10. Sưu tầm đủ dấu của các bài và chủ đề nhé!
        </p>
      </header>
      <Passport
        stamps={stamps}
        lessons={lessons.map((lesson) => ({ slug: lesson.slug, title: lesson.title, dateText: lesson.dateText }))}
      />
    </div>
  );
}
