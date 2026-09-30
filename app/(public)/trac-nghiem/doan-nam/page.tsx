import type { Metadata } from "next";
import { NotEnoughQuestions, QuizShell } from "@/components/quiz/QuizShell";
import { YearGuessGame } from "@/components/quiz/YearGuessGame";
import { getYearRounds } from "@/lib/queries/quiz";
import { MIN_QUESTIONS, quizPaths, quizSetIds, ROUND_SIZE } from "@/lib/quiz/sets";

export const metadata: Metadata = {
  title: "Nhìn ảnh đoán năm",
  description: "Trò chơi nhanh: nhìn ảnh tư liệu, kéo thanh năm để đoán sự kiện diễn ra năm nào.",
};

/** Thanh năm mặc định 1900–2010 (kế hoạch GĐ4.2), nới ra nếu có sự kiện ngoài khoảng này. */
const DEFAULT_RANGE = [1900, 2010] as const;

export default async function YearGamePage() {
  const rounds = await getYearRounds();
  const years = rounds.map((round) => round.year);

  return (
    <QuizShell title="Nhìn ảnh đoán năm" description="Nhìn ảnh tư liệu và đoán xem sự kiện diễn ra năm nào. Càng gần càng nhiều điểm!">
      {rounds.length < MIN_QUESTIONS ? (
        <NotEnoughQuestions />
      ) : (
        <YearGuessGame
          rounds={rounds}
          roundSize={ROUND_SIZE}
          minYear={Math.min(DEFAULT_RANGE[0], ...years)}
          maxYear={Math.max(DEFAULT_RANGE[1], ...years)}
          backHref={quizPaths.hub}
          setId={quizSetIds.yearGame}
        />
      )}
    </QuizShell>
  );
}
