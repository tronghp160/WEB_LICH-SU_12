"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StampNotice } from "@/components/progress/StampNotice";
import { QuizImageFigure } from "@/components/quiz/QuizImageFigure";
import { Button, LinkButton } from "@/components/ui/Button";
import { saveQuizResult } from "@/lib/hooks/useProgress";
import { shuffle, yearGuessPoints } from "@/lib/quiz/generate";
import type { YearRound } from "@/lib/quiz/types";

type YearGuessGameProps = {
  rounds: YearRound[];
  roundSize: number;
  minYear: number;
  maxYear: number;
  backHref: string;
  /** Khóa lưu kết quả vào tiến độ học tập (quizSetIds.yearGame). */
  setId?: string;
};

type Phase = "intro" | "play" | "done";

const START_GUESS = 1950;

function nearnessText(diff: number): string {
  if (diff === 0) return "Chính xác từng năm!";
  if (diff <= 2) return "Rất gần!";
  if (diff <= 5) return "Khá gần.";
  if (diff <= 10) return "Hơi xa một chút.";
  return "Còn xa — xem lại mốc thời gian nhé.";
}

/**
 * "Nhìn ảnh đoán năm" (GĐ4.2): hiện một ảnh tư liệu, kéo thanh năm để đoán năm sự kiện diễn ra.
 * Đúng năm 100 điểm, mỗi năm lệch trừ 5 điểm. Chú thích và năm chụp chỉ hiện sau khi chốt.
 */
export function YearGuessGame({ rounds, roundSize, minYear, maxYear, backHref, setId }: YearGuessGameProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [played, setPlayed] = useState<YearRound[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState(START_GUESS);
  const [results, setResults] = useState<{ guess: number; points: number }[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const round = played[index];
  const revealed = results.length > index;
  const total = results.reduce((sum, item) => sum + item.points, 0);
  const clamp = (year: number) => Math.min(maxYear, Math.max(minYear, year));

  function start() {
    setPlayed(shuffle(rounds).slice(0, roundSize));
    setResults([]);
    setIndex(0);
    setGuess(START_GUESS);
    setPhase("play");
  }

  function lockIn() {
    if (revealed) return;
    setResults((previous) => [...previous, { guess, points: yearGuessPoints(guess, round.year) }]);
  }

  function next() {
    if (index + 1 < played.length) {
      setIndex(index + 1);
      setGuess(START_GUESS);
    } else {
      if (setId) saveQuizResult(setId, total, played.length * 100);
      setPhase("done");
    }
  }

  useEffect(() => {
    if (phase === "play") headingRef.current?.focus();
  }, [phase, index]);
  useEffect(() => {
    if (revealed) nextRef.current?.focus();
  }, [revealed]);

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-muted-foreground">
          Mỗi lượt có <strong className="text-foreground">{Math.min(roundSize, rounds.length)}</strong> ảnh tư liệu. Nhìn ảnh, kéo
          thanh để chọn năm em nghĩ sự kiện đã diễn ra rồi bấm “Chốt năm”. Đúng năm được 100 điểm, mỗi năm lệch bị trừ 5 điểm.
        </p>
        <Button size="lg" onClick={start}>
          Bắt đầu
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    const maxScore = played.length * 100;
    return (
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ket-qua-doan-nam" className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <h2 id="ket-qua-doan-nam" className="font-serif text-xl font-bold text-foreground">
            Tổng điểm
          </h2>
          <p className="font-serif text-5xl font-bold text-accent">
            {total}
            <span className="text-2xl text-muted-foreground">/{maxScore}</span>
          </p>
          {setId && <StampNotice score={total} total={maxScore} />}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Chơi lượt mới
            </Button>
            <LinkButton href={backHref} variant="secondary">
              Về trang trắc nghiệm
            </LinkButton>
          </div>
        </section>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <caption className="sr-only">Kết quả từng ảnh</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">Sự kiện</th>
                <th scope="col" className="py-2 pr-3 font-medium">Em đoán</th>
                <th scope="col" className="py-2 pr-3 font-medium">Đáp án</th>
                <th scope="col" className="py-2 font-medium">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {played.map((item, position) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-2 pr-3">
                    <Link href={item.review.href} className="text-foreground underline hover:text-accent">
                      {item.eventTitle}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{results[position]?.guess}</td>
                  <td className="py-2 pr-3 font-medium">{item.year}</td>
                  <td className="py-2 font-medium">{results[position]?.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const result = results[index];
  const diff = result ? Math.abs(result.guess - round.year) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Ảnh {index + 1}/{played.length}
        </span>
        <span>Điểm: {total}</span>
      </div>

      <QuizImageFigure key={round.id} image={round.image} revealed={revealed} />

      <h2 ref={headingRef} tabIndex={-1} className="font-serif text-xl font-bold text-foreground outline-none">
        Sự kiện trong ảnh diễn ra vào năm nào?
      </h2>

      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <p className="text-center font-serif text-5xl font-bold tabular-nums text-foreground" aria-hidden="true">
          {revealed ? result.guess : guess}
        </p>
        <label htmlFor="doan-nam-slider" className="sr-only">
          Năm em đoán
        </label>
        <input
          id="doan-nam-slider"
          type="range"
          min={minYear}
          max={maxYear}
          step={1}
          value={revealed ? result.guess : guess}
          disabled={revealed}
          onChange={(event) => setGuess(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") lockIn();
          }}
          aria-valuetext={`Năm ${guess}`}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
        {!revealed && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[-10, -1, 1, 10].map((step) => (
              <Button key={step} variant="secondary" size="sm" onClick={() => setGuess((value) => clamp(value + step))} aria-label={`${step > 0 ? "Tăng" : "Giảm"} ${Math.abs(step)} năm`}>
                {step > 0 ? <Plus className="h-3 w-3" aria-hidden="true" /> : <Minus className="h-3 w-3" aria-hidden="true" />}
                {Math.abs(step)}
              </Button>
            ))}
            <Button size="md" onClick={lockIn} className="ml-2">
              Chốt năm {guess}
            </Button>
          </div>
        )}
      </div>

      <div role="status" aria-live="polite">
        {revealed && (
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
            <p className="font-bold text-foreground">
              Đáp án: <span className="text-accent">{round.year}</span> — em đoán {result.guess}
              {diff > 0 && ` (lệch ${diff} năm)`}. <span className="text-success">+{result.points} điểm</span>
            </p>
            <p className="text-muted-foreground">{nearnessText(diff)}</p>
            <p className="text-foreground">
              Sự kiện: <strong>{round.eventTitle}</strong> ({round.dateText}).
            </p>
            <Link href={round.review.href} target="_blank" className="text-sm font-medium text-accent underline">
              Đọc thêm về sự kiện (mở thẻ mới)
            </Link>
          </div>
        )}
      </div>

      {revealed && (
        <div>
          <Button ref={nextRef} size="lg" onClick={next}>
            {index + 1 === played.length ? "Xem tổng điểm" : "Ảnh tiếp theo"}
          </Button>
        </div>
      )}
    </div>
  );
}
