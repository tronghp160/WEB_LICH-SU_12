import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotEnoughQuestions, QuizShell } from "@/components/quiz/QuizShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { getLesson } from "@/lib/lessons";
import { getQuestionPool } from "@/lib/queries/quiz";
import { MIN_QUESTIONS, questionsForLesson, ROUND_SIZE } from "@/lib/quiz/sets";

type LessonQuizPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: LessonQuizPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Không tìm thấy nội dung" };
  return {
    title: `Trắc nghiệm: ${lesson.title}`,
    description: `Kiểm tra nhanh sau bài học ${lesson.title}: câu hỏi có ảnh, đáp án và giải thích.`,
  };
}

export default async function LessonQuizPage({ params }: LessonQuizPageProps) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const pool = questionsForLesson(await getQuestionPool(), lesson);
  const title = `Trắc nghiệm: ${lesson.title}`;
  const lessonHref = `/bai-hoc/${lesson.slug}`;

  return (
    <QuizShell
      title={title}
      description={
        <>
          Kiểm tra nhanh sau{" "}
          <Link href={lessonHref} className="text-accent underline">
            bài học {lesson.title}
          </Link>
          .
        </>
      }
    >
      {pool.length < MIN_QUESTIONS ? (
        <NotEnoughQuestions />
      ) : (
        <QuizPlayer title={title} pool={pool} roundSize={ROUND_SIZE} backHref={lessonHref} backLabel="Về bài học" />
      )}
    </QuizShell>
  );
}
