import type { Metadata } from "next";
import { NotEnoughQuestions, QuizShell } from "@/components/quiz/QuizShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { getQuestionPool } from "@/lib/queries/quiz";
import { MIN_QUESTIONS, quizPaths, ROUND_SIZE } from "@/lib/quiz/sets";

export const metadata: Metadata = {
  title: "Trắc nghiệm tổng hợp",
  description: "10 câu hỏi ngẫu nhiên có ảnh tư liệu về các sự kiện Lịch sử Việt Nam lớp 12, có đáp án và giải thích.",
};

export default async function QuizAllPage() {
  const pool = await getQuestionPool();

  return (
    <QuizShell title="Trắc nghiệm tổng hợp" description="Câu hỏi ngẫu nhiên từ mọi chủ đề: ảnh tư liệu, năm diễn ra, nhân vật và di tích.">
      {pool.length < MIN_QUESTIONS ? (
        <NotEnoughQuestions />
      ) : (
        <QuizPlayer title="Trắc nghiệm tổng hợp" pool={pool} roundSize={ROUND_SIZE} backHref={quizPaths.hub} backLabel="Chọn bộ khác" />
      )}
    </QuizShell>
  );
}
