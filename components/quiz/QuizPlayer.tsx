"use client";

import { BookOpen, Check, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { StampNotice } from "@/components/progress/StampNotice";
import { QuizImageFigure } from "@/components/quiz/QuizImageFigure";
import { Button, LinkButton } from "@/components/ui/Button";
import { saveQuizResult } from "@/lib/hooks/useProgress";
import { drawRound } from "@/lib/quiz/generate";
import type { QuizQuestion } from "@/lib/quiz/types";
import { sectionReviewFor } from "@/lib/sgk/review";
import { cn } from "@/lib/utils/cn";

type QuizPlayerProps = {
  title: string;
  pool: QuizQuestion[];
  roundSize: number;
  backHref: string;
  backLabel: string;
  /** Khóa lưu kết quả vào tiến độ học tập (quizSetIds); có thì cuối bài báo con dấu "Hộ chiếu lịch sử". */
  setId?: string;
  /** Đang ôn một Bài SGK: "Ôn lại phần sai" ưu tiên các mục của bài này. */
  reviewLessonSlug?: string;
};

type Phase = "intro" | "play" | "done";

const LETTERS = ["A", "B", "C", "D"];

/** Lời nhận xét cuối bài theo tỉ lệ đúng. */
export function scoreMessage(correct: number, total: number): string {
  const ratio = total === 0 ? 0 : correct / total;
  if (ratio === 1) return "Xuất sắc! Em trả lời đúng tất cả các câu.";
  if (ratio >= 0.8) return "Rất tốt! Em đã nắm chắc phần lớn kiến thức.";
  if (ratio >= 0.5) return "Khá rồi! Ôn lại vài phần bên dưới là em sẽ nắm chắc hơn.";
  return "Chưa sao cả — đọc lại các phần gợi ý bên dưới rồi thử lượt mới nhé.";
}

/**
 * Trắc nghiệm có chấm điểm (GĐ4.1): mỗi lượt xáo câu hỏi và đáp án (chỉ ở trình duyệt, sau khi bấm "Bắt đầu" nên
 * không lệch hydrate), trả lời xong hiện ngay đúng/sai kèm giải thích và link ôn lại; cuối bài hiện điểm và gợi ý.
 * Bàn phím: phím 1–4 hoặc A–D để chọn, Enter để sang câu tiếp.
 */
export function QuizPlayer({ title, pool, roundSize, backHref, backLabel, setId, reviewLessonSlug }: QuizPlayerProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const question = round[index];
  const chosen = answers[index] ?? null;
  const answered = chosen !== null;
  const correctCount = round.filter((item, position) => answers[position] === item.correctIndex).length;

  const start = useCallback(() => {
    const drawn = drawRound(pool, roundSize);
    setRound(drawn);
    setAnswers(drawn.map(() => null));
    setIndex(0);
    setPhase("play");
  }, [pool, roundSize]);

  const choose = useCallback(
    (choice: number) => {
      if (phase !== "play" || answered) return;
      setAnswers((previous) => previous.map((value, position) => (position === index ? choice : value)));
    },
    [phase, answered, index],
  );

  const next = useCallback(() => {
    if (index + 1 < round.length) {
      setIndex(index + 1);
      return;
    }
    if (setId) saveQuizResult(setId, correctCount, round.length);
    setPhase("done");
  }, [index, round.length, setId, correctCount]);

  // Chuyển câu → đưa tiêu điểm lên câu hỏi (trình đọc màn hình đọc câu mới); trả lời xong → tiêu điểm vào nút "Tiếp".
  useEffect(() => {
    if (phase === "play") headingRef.current?.focus();
  }, [phase, index]);
  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  useEffect(() => {
    if (phase !== "play") return;
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const key = event.key.toUpperCase();
      const choice = ["1", "2", "3", "4"].includes(key) ? Number(key) - 1 : LETTERS.indexOf(key);
      if (!answered && choice >= 0) {
        event.preventDefault();
        choose(choice);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, answered, choose]);

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="text-muted-foreground">
          Có <strong className="text-foreground">{pool.length}</strong> câu hỏi trong bộ này. Mỗi lượt em trả lời{" "}
          <strong className="text-foreground">{Math.min(roundSize, pool.length)}</strong> câu chọn ngẫu nhiên; trả lời xong mỗi
          câu sẽ thấy ngay đáp án và lời giải thích.
        </p>
        <p className="text-sm text-muted-foreground">Mẹo: bấm phím 1–4 (hoặc A–D) để chọn đáp án.</p>
        <Button size="lg" onClick={start}>
          Bắt đầu
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    const wrong = round.filter((item, position) => answers[position] !== item.correctIndex);
    const reviews = [...new Map(wrong.map((item) => [item.review.href, item.review])).values()];
    // Câu sai thuộc mục nào của SGK → "Ôn lại phần sai: Bài 7 › mục 3" (mục 6.6).
    const sections = [
      ...new Map(
        wrong.flatMap((item) => {
          const review = sectionReviewFor(item, reviewLessonSlug);
          return review ? [[review.href, review] as const] : [];
        }),
      ).values(),
    ];
    return (
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ket-qua" className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <h2 id="ket-qua" className="font-serif text-xl font-bold text-foreground">
            Kết quả: {title}
          </h2>
          <p className="font-serif text-5xl font-bold text-accent">
            {correctCount}/{round.length}
          </p>
          <p className="text-muted-foreground">{scoreMessage(correctCount, round.length)}</p>
          {setId && <StampNotice score={correctCount} total={round.length} />}
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Chơi lượt mới
            </Button>
            <LinkButton href={backHref} variant="secondary">
              {backLabel}
            </LinkButton>
          </div>
        </section>

        {reviews.length > 0 && (
          <section aria-labelledby="on-lai" className="flex flex-col gap-3">
            <h2 id="on-lai" className="font-serif text-lg font-bold text-foreground">
              Ôn lại phần sai
            </h2>
            {sections.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Mục cần đọc lại trong SGK">
                {sections.map((section) => (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      className="flex items-center gap-2 rounded-card border border-accent/50 bg-surface px-4 py-3 font-medium text-foreground hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      {section.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">Đọc thêm:</p>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {reviews.map((review) => (
                <li key={review.href}>
                  <Link href={review.href} className="inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-accent hover:text-accent">
                    {review.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {wrong.map((item) => (
                <li key={item.id} className="rounded-card border border-border bg-surface p-3 text-sm">
                  <p className="font-medium text-foreground">{item.prompt}</p>
                  <p className="text-muted-foreground">
                    Đáp án đúng: <strong className="text-success">{item.choices[item.correctIndex]}</strong>
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    );
  }

  const isLast = index + 1 === round.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-foreground">
          Câu {index + 1}/{round.length}
        </span>
        <span className="text-muted-foreground">
          Đúng: <strong className="text-success">{correctCount}</strong>
        </span>
      </div>
      {/* Thanh tiến trình chia ô theo từng câu: đúng (xanh), sai (đỏ), đang làm (viền), chưa làm (xám). */}
      <ol className="m-0 flex list-none gap-1 p-0" aria-label={`Tiến trình: đã trả lời ${index + (answered ? 1 : 0)} trên ${round.length} câu`}>
        {round.map((item, position) => {
          const value = answers[position];
          const state =
            value === null || value === undefined ? (position === index ? "current" : "todo") : value === item.correctIndex ? "right" : "wrong";
          return (
            <li
              key={item.id}
              className={cn(
                "h-3 flex-1 rounded-full transition-colors",
                state === "right" && "bg-success",
                state === "wrong" && "bg-accent",
                state === "current" && "bg-muted ring-2 ring-inset ring-foreground/40",
                state === "todo" && "bg-muted",
              )}
            />
          );
        })}
      </ol>

      {question.image && <QuizImageFigure key={question.id} image={question.image} revealed={answered} />}

      <h2 ref={headingRef} tabIndex={-1} className="font-serif text-xl font-bold text-foreground outline-none sm:text-2xl">
        {question.prompt}
      </h2>

      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2" aria-label="Các đáp án">
        {question.choices.map((choice, position) => {
          const isCorrect = position === question.correctIndex;
          const isChosen = position === chosen;
          return (
            <li key={choice}>
              <button
                type="button"
                onClick={() => choose(position)}
                disabled={answered}
                aria-pressed={isChosen}
                className={cn(
                  "flex h-full w-full items-start gap-3 rounded-card border bg-surface p-3 text-left text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                  !answered && "border-border hover:border-accent hover:bg-muted",
                  answered && isCorrect && "border-success bg-success/10",
                  answered && isChosen && !isCorrect && "border-accent bg-accent/10",
                  answered && !isCorrect && !isChosen && "border-border opacity-60",
                  "disabled:cursor-default",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                    answered && isCorrect ? "border-success bg-success text-background" : answered && isChosen ? "border-accent bg-accent text-accent-foreground" : "border-border",
                  )}
                  aria-hidden="true"
                >
                  {answered && isCorrect ? <Check className="h-4 w-4" /> : answered && isChosen ? <X className="h-4 w-4" /> : LETTERS[position]}
                </span>
                <span className="pt-0.5">
                  {choice}
                  {answered && isCorrect && <span className="sr-only"> (đáp án đúng)</span>}
                  {answered && isChosen && !isCorrect && <span className="sr-only"> (em đã chọn — chưa đúng)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div role="status" aria-live="polite">
        {answered && (
          <div className={cn("flex flex-col gap-2 rounded-card border p-4", chosen === question.correctIndex ? "border-success" : "border-accent")}>
            <p className={cn("font-bold", chosen === question.correctIndex ? "text-success" : "text-accent")}>
              {chosen === question.correctIndex ? "Chính xác!" : `Chưa đúng. Đáp án đúng: ${question.choices[question.correctIndex]}`}
            </p>
            <p className="text-foreground">{question.explanation}</p>
            <Link href={question.review.href} className="text-sm font-medium text-accent underline" target="_blank">
              Đọc thêm: {question.review.label} (mở thẻ mới)
            </Link>
          </div>
        )}
      </div>

      {answered && (
        <div>
          <Button ref={nextRef} size="lg" onClick={next}>
            {isLast ? "Xem kết quả" : "Câu tiếp theo"}
          </Button>
        </div>
      )}
    </div>
  );
}
