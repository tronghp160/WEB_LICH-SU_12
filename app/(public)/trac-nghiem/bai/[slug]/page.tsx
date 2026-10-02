import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotEnoughQuestions, QuizShell } from "@/components/quiz/QuizShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { getQuestionPool } from "@/lib/queries/quiz";
import { getCurriculum } from "@/lib/queries/sgk";
import { MIN_QUESTIONS, ROUND_SIZE } from "@/lib/quiz/sets";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";
import { questionsForSgkLesson } from "@/lib/sgk/quiz";
import { sgkQuizSetId } from "@/lib/sgk/review";

export async function generateMetadata({ params }: PageProps<"/trac-nghiem/bai/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getSgkLesson(slug);
  if (!lesson) return { title: "Không tìm thấy nội dung" };
  return {
    title: `Trắc nghiệm Bài ${lesson.number}: ${lesson.shortTitle}`,
    description: `Ôn tập Bài ${lesson.number}. ${lesson.title} — câu hỏi có ảnh tư liệu, đáp án và giải thích, gợi ý mục cần ôn lại.`,
  };
}

/** Trắc nghiệm theo Bài SGK (mục 6.6): câu về các sự kiện của bài + câu của chuyên đề tương tác trong bài. */
export default async function SgkLessonQuizPage({ params }: PageProps<"/trac-nghiem/bai/[slug]">) {
  const { slug } = await params;
  const lesson = getSgkLesson(slug, (await getCurriculum()).lessons);
  if (!lesson) notFound();

  const pool = questionsForSgkLesson(await getQuestionPool(), lesson);
  const title = `Trắc nghiệm Bài ${lesson.number}`;
  const lessonHref = sgkPaths.lesson(lesson.slug);

  return (
    <QuizShell
      title={title}
      description={
        <>
          Ôn tập{" "}
          <Link href={lessonHref} className="text-accent underline">
            Bài {lesson.number}. {lesson.title}
          </Link>
          .
        </>
      }
    >
      {pool.length < MIN_QUESTIONS ? (
        <NotEnoughQuestions />
      ) : (
        <QuizPlayer
          title={title}
          pool={pool}
          roundSize={ROUND_SIZE}
          backHref={lessonHref}
          backLabel={`Về Bài ${lesson.number}`}
          setId={sgkQuizSetId(lesson.slug)}
          reviewLessonSlug={lesson.slug}
        />
      )}
    </QuizShell>
  );
}
