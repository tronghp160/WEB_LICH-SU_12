import type { Metadata } from "next";
import { Passport } from "@/components/progress/Passport";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { lessons } from "@/lib/lessons";
import { buildStampCatalog } from "@/lib/progress/progress";
import { getQuestionPool, getYearRounds } from "@/lib/queries/quiz";
import { getPublishedTopics } from "@/lib/queries/topics";
import { MIN_QUESTIONS, questionsForLesson, questionsForTopic } from "@/lib/quiz/sets";

export const metadata: Metadata = {
  title: "Hộ chiếu lịch sử",
  description: "Sưu tầm con dấu khi học xong bài và đạt trắc nghiệm — tiến độ lưu ngay trên trình duyệt, không cần đăng nhập.",
};

export default async function PassportPage() {
  const [pool, rounds, topics] = await Promise.all([getQuestionPool(), getYearRounds(), getPublishedTopics()]);

  // Chỉ bộ trắc nghiệm đang mở (đủ câu, giống trang /trac-nghiem) mới có con dấu.
  const stamps = buildStampCatalog({
    lessons: lessons.filter((lesson) => questionsForLesson(pool, lesson).length >= MIN_QUESTIONS),
    topics: topics.filter((topic) => questionsForTopic(pool, topic.slug).length >= MIN_QUESTIONS),
    hasAllQuiz: pool.length >= MIN_QUESTIONS,
    hasYearGame: rounds.length >= MIN_QUESTIONS,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Hộ chiếu lịch sử" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Hộ chiếu lịch sử</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mỗi bộ trắc nghiệm em làm đạt từ 7/10 sẽ được đóng một con dấu. Sưu tầm đủ dấu của các bài học và chủ đề nhé!
        </p>
      </header>
      <Passport
        stamps={stamps}
        lessons={lessons.map((lesson) => ({ slug: lesson.slug, title: lesson.title, dateText: lesson.dateText }))}
      />
    </div>
  );
}
