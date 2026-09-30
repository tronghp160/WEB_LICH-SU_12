import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotEnoughQuestions, QuizShell } from "@/components/quiz/QuizShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { getQuestionPool } from "@/lib/queries/quiz";
import { getTopicDetail } from "@/lib/queries/topics";
import { MIN_QUESTIONS, questionsForTopic, quizPaths, quizSetIds, ROUND_SIZE } from "@/lib/quiz/sets";

type TopicQuizPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: TopicQuizPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicDetail(slug);
  if (!topic) return { title: "Không tìm thấy nội dung" };
  return {
    title: `Trắc nghiệm: ${topic.name}`,
    description: `Câu hỏi trắc nghiệm có ảnh tư liệu về chủ đề ${topic.name}, có đáp án và giải thích.`,
  };
}

export default async function TopicQuizPage({ params }: TopicQuizPageProps) {
  const { slug } = await params;
  const topic = await getTopicDetail(slug);
  if (!topic) notFound();

  const pool = questionsForTopic(await getQuestionPool(), topic.slug);
  const title = `Trắc nghiệm: ${topic.name}`;

  return (
    <QuizShell
      title={title}
      description={
        <>
          Câu hỏi về các sự kiện thuộc chủ đề{" "}
          <Link href={`/chu-de/${topic.slug}`} className="text-accent underline">
            {topic.name}
          </Link>
          .
        </>
      }
    >
      {pool.length < MIN_QUESTIONS ? (
        <NotEnoughQuestions />
      ) : (
        <QuizPlayer title={title} pool={pool} roundSize={ROUND_SIZE} backHref={quizPaths.hub} backLabel="Chọn bộ khác" setId={quizSetIds.topic(topic.slug)} />
      )}
    </QuizShell>
  );
}
