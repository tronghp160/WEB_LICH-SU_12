"use client";

import { AlertTriangle, BookOpen, Clock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivateLicenseForm } from "@/components/payments/ActivateLicenseForm";
import { StampNotice } from "@/components/progress/StampNotice";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
  DEVICE_HEADER,
  LICENSE_HEADER,
  examAccessMessage,
  examPaths,
  examSetId,
  formatClock,
  formatScore10,
  scoreExam,
  type ExamQuestion,
  type ExamScore,
} from "@/lib/exams/exam";
import { getDeviceId, useHydrated, useLicense } from "@/lib/hooks/useLicense";
import { saveQuizResult } from "@/lib/hooks/useProgress";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

const LETTERS = ["A", "B", "C", "D"];

type Load =
  | { state: "loading" }
  | { state: "blocked"; message: string; needsActivation: boolean }
  | { state: "ready"; questions: ExamQuestion[] };

type Phase = "intro" | "play" | "done";

type Props = { slug: string; title: string; durationMin: number; free: boolean };

/**
 * Làm một đề luyện thi như phòng thi: bấm giờ, chọn / đổi đáp án tự do, chuyển câu bất kỳ, nộp bài (hoặc tự nộp khi
 * hết giờ) rồi mới chấm điểm thang 10 và xem giải thích. Câu hỏi tải qua /api/luyen-thi/[slug] kèm mã kích hoạt.
 */
export function ExamRunner({ slug, title, durationMin, free }: Props) {
  const license = useLicense();
  const hydrated = useHydrated();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [score, setScore] = useState<ExamScore | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const licenseCode = license?.code ?? null;
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const headers: Record<string, string> = { [DEVICE_HEADER]: getDeviceId() };
    if (licenseCode) headers[LICENSE_HEADER] = licenseCode;
    fetch(examPaths.api(slug), { headers, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string; questions?: ExamQuestion[] } | null;
        if (cancelled) return;
        if (!body?.ok || !Array.isArray(body.questions)) {
          setLoad({ state: "blocked", ...examAccessMessage(body?.reason) });
          return;
        }
        setLoad({ state: "ready", questions: body.questions });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "blocked", ...examAccessMessage(undefined) });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, licenseCode, slug]);

  const questions = useMemo(() => (load.state === "ready" ? load.questions : []), [load]);
  const remainingSeconds = Math.max(0, Math.ceil((deadline - now) / 1000));

  const start = useCallback(() => {
    setAnswers(questions.map(() => null));
    setIndex(0);
    setScore(null);
    setTimedOut(false);
    const startedAt = Date.now();
    setNow(startedAt);
    setDeadline(startedAt + durationMin * 60_000);
    setPhase("play");
  }, [questions, durationMin]);

  const finish = useCallback(
    (byTimeout: boolean) => {
      const result = scoreExam(questions, answers);
      setScore(result);
      setTimedOut(byTimeout);
      saveQuizResult(examSetId(slug), result.correct, result.total);
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [questions, answers, slug],
  );

  // Đồng hồ: cập nhật mỗi giây, hết giờ thì tự nộp bài (gọi bản finish mới nhất qua ref — bài làm luôn đầy đủ).
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);
  useEffect(() => {
    if (phase !== "play") return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) finishRef.current(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, deadline]);

  // Đang làm bài mà đóng/tải lại trang → trình duyệt hỏi lại (bài làm chưa nộp sẽ mất).
  useEffect(() => {
    if (phase !== "play") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  useEffect(() => {
    if (phase === "play") headingRef.current?.focus();
  }, [phase, index]);

  function choose(choice: number) {
    setAnswers((previous) => previous.map((value, position) => (position === index ? choice : value)));
  }

  function submit() {
    const unanswered = answers.filter((value) => value === null).length;
    if (unanswered > 0 && !window.confirm(`Em còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`)) return;
    finish(false);
  }

  if (load.state === "loading") {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-muted-foreground" role="status">
        Đang tải đề…
      </p>
    );
  }

  if (load.state === "blocked") {
    return (
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="flex items-start gap-2 text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          {load.message}
        </p>
        {load.needsActivation && !free && (
          <>
            <ActivateLicenseForm />
            <p className="text-sm text-muted-foreground">
              Chưa có mã?{" "}
              <Link href={examPaths.hub} className="text-accent underline">
                Xem Gói luyện thi
              </Link>
            </p>
          </>
        )}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Callout variant="info" title="Đề đang được biên soạn">
        Đề này chưa có câu hỏi. Em thử đề khác nhé.
      </Callout>
    );
  }

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-foreground">
          <li>
            <strong>{questions.length}</strong> câu trắc nghiệm, thời gian <strong>{durationMin} phút</strong>.
          </li>
          <li>Chọn, đổi đáp án và chuyển câu tùy ý; hết giờ bài tự nộp.</li>
          <li>Nộp bài xong mới thấy điểm, đáp án và lời giải thích từng câu.</li>
          <li>Đạt từ 7 điểm được đóng dấu vào Hộ chiếu lịch sử.</li>
        </ul>
        <Button size="lg" onClick={start}>
          Bắt đầu làm bài
        </Button>
      </div>
    );
  }

  if (phase === "done" && score) {
    return (
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ket-qua" className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <h2 id="ket-qua" className="font-serif text-xl font-bold text-foreground">
            Kết quả: {title}
          </h2>
          {timedOut && <p className="text-sm font-medium text-accent">Hết giờ — bài đã được tự nộp.</p>}
          <p className="font-serif text-5xl font-bold text-accent" data-testid="exam-score">
            {formatScore10(score.score10)} điểm
          </p>
          <p className="text-muted-foreground">
            Đúng {score.correct}/{score.total} câu{score.unanswered > 0 ? ` · bỏ trống ${score.unanswered} câu` : ""}
          </p>
          <StampNotice score={score.correct} total={score.total} />
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button onClick={start}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Làm lại
            </Button>
            <LinkButton href={examPaths.hub} variant="secondary">
              Các đề khác
            </LinkButton>
          </div>
        </section>

        <section aria-labelledby="giai-thich" className="flex flex-col gap-3">
          <h2 id="giai-thich" className="font-serif text-lg font-bold text-foreground">
            Đáp án và giải thích
          </h2>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {questions.map((question, position) => {
              const chosen = answers[position];
              const right = chosen === question.correctIndex;
              const lesson = question.lessonSlug ? getSgkLesson(question.lessonSlug) : undefined;
              return (
                <li key={question.position} className={cn("rounded-card border bg-surface p-4", right ? "border-success/60" : "border-accent/60")}>
                  <p className="font-medium text-foreground">
                    <span className={cn("mr-1 font-bold", right ? "text-success" : "text-accent")}>
                      Câu {position + 1}.
                    </span>
                    {question.question}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {chosen === null || chosen === undefined ? "Em bỏ trống. " : right ? "Em chọn đúng. " : `Em chọn ${LETTERS[chosen]}. `}
                    Đáp án đúng:{" "}
                    <strong className="text-success">
                      {LETTERS[question.correctIndex]}. {question.choices[question.correctIndex]}
                    </strong>
                  </p>
                  <p className="mt-2 text-sm text-foreground">{question.explanation}</p>
                  {(lesson || question.eventSlug) && (
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {lesson && (
                        <Link href={sgkPaths.lesson(lesson.slug)} className="inline-flex items-center gap-1 text-accent underline">
                          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                          Bài {lesson.number}. {lesson.shortTitle}
                        </Link>
                      )}
                      {question.eventSlug && (
                        <Link href={`/su-kien/${question.eventSlug}`} className="text-accent underline">
                          Sự kiện: {question.eventTitle ?? question.eventSlug}
                        </Link>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    );
  }

  const question = questions[index];
  const chosen = answers[index] ?? null;
  const answeredCount = answers.filter((value) => value !== null).length;
  const lowTime = remainingSeconds <= 60;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 flex items-center justify-between gap-3 rounded-card border border-border bg-surface/95 px-4 py-2 text-sm shadow-card backdrop-blur">
        <span className="font-semibold text-foreground">
          Câu {index + 1}/{questions.length} · đã làm {answeredCount}
        </span>
        <span
          className={cn("inline-flex items-center gap-1 font-mono text-base font-bold", lowTime ? "text-accent" : "text-foreground")}
          role="timer"
          aria-label={`Thời gian còn lại ${formatClock(remainingSeconds)}`}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          {formatClock(remainingSeconds)}
        </span>
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="font-serif text-xl font-bold text-foreground outline-none sm:text-2xl">
        {question.question}
      </h2>

      <ul className="m-0 grid list-none gap-2 p-0" aria-label="Các đáp án">
        {question.choices.map((choice, position) => (
          <li key={position}>
            <button
              type="button"
              onClick={() => choose(position)}
              aria-pressed={chosen === position}
              className={cn(
                "flex w-full items-start gap-3 rounded-card border bg-surface p-3 text-left text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                chosen === position ? "border-accent bg-accent/10" : "border-border hover:border-accent hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                  chosen === position ? "border-accent bg-accent text-accent-foreground" : "border-border",
                )}
                aria-hidden="true"
              >
                {LETTERS[position]}
              </span>
              <span className="pt-0.5">{choice}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIndex(index - 1)} disabled={index === 0}>
            Câu trước
          </Button>
          <Button variant="secondary" onClick={() => setIndex(index + 1)} disabled={index + 1 === questions.length}>
            Câu sau
          </Button>
        </div>
        <Button onClick={submit}>Nộp bài</Button>
      </div>

      <nav aria-label="Chuyển nhanh tới câu">
        <ol className="m-0 grid list-none grid-cols-8 gap-1.5 p-0 sm:grid-cols-10">
          {questions.map((item, position) => (
            <li key={item.position}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-current={position === index ? "step" : undefined}
                aria-label={`Câu ${position + 1}${answers[position] !== null ? " (đã làm)" : ""}`}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-lg border text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                  answers[position] !== null ? "border-accent/40 bg-accent/10 text-foreground" : "border-border bg-surface text-muted-foreground",
                  position === index && "ring-2 ring-foreground/50",
                )}
              >
                {position + 1}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Tải lại hay rời trang khi chưa nộp bài sẽ mất bài làm.
      </p>
    </div>
  );
}
