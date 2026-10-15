"use client";

import { AlertTriangle, BookOpen, Clock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import { ActivateLicenseForm } from "@/components/payments/ActivateLicenseForm";
import { StampNotice } from "@/components/progress/StampNotice";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { attemptPaths, localDeadline, parseAttemptView, parseExamIntro, type AttemptQuestion, type AttemptView, type ExamIntro } from "@/lib/exams/attempt";
import { DEVICE_HEADER, LICENSE_HEADER, examAccessMessage, examPaths, examSetId, formatClock, formatScore10 } from "@/lib/exams/exam";
import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { loginPath } from "@/lib/auth/routes";
import { getDeviceId, useHydrated, useLicense } from "@/lib/hooks/useLicense";
import { useSession } from "@/lib/hooks/useSession";
import { saveQuizResult } from "@/lib/hooks/useProgress";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

type Load = { state: "loading" } | { state: "blocked"; message: string; needsActivation: boolean } | { state: "ready"; intro: ExamIntro };
type Phase = "intro" | "play" | "done";
type Props = { slug: string; title: string; durationMin: number; free: boolean };

/** Lưu câu trả lời lên server sau khi ngừng thao tác 2 giây (gom nhiều lần chọn thành một request). */
const SAVE_DELAY_MS = 2000;

function isAnswered(question: AttemptQuestion, answer: ItemAnswer | undefined): boolean {
  return question.kind === "mcq" ? typeof answer?.choice === "number" : (answer?.tf ?? []).some((value) => typeof value === "boolean");
}

/**
 * Làm một đề luyện thi như phòng thi (docs/ke-hoach-luyen-thi.md, GĐ2): server tạo lượt làm bài, giữ giờ nộp, lưu câu
 * trả lời và CHẤM ĐIỂM — trình duyệt chỉ nhận đáp án và lời giải sau khi nộp. Tải lại trang thì bấm "Bắt đầu" để làm tiếp
 * lượt đang dở (còn đúng thời gian còn lại). Giao diện phòng thi đầy đủ ở GĐ3.
 */
export function ExamRunner({ slug, title, durationMin, free }: Props) {
  const license = useLicense();
  const hydrated = useHydrated();
  const session = useSession();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [phase, setPhase] = useState<Phase>("intro");
  const [view, setView] = useState<AttemptView | null>(null);
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [index, setIndex] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<AttemptView | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answersRef = useRef(answers);
  const dirty = useRef(new Set<string>());
  const saveTimer = useRef<number | null>(null);
  const submitting = useRef(false);

  const licenseCode = license?.code ?? null;
  const headers = useCallback((): Record<string, string> => {
    const value: Record<string, string> = { [DEVICE_HEADER]: getDeviceId(), "Content-Type": "application/json" };
    if (licenseCode) value[LICENSE_HEADER] = licenseCode;
    return value;
  }, [licenseCode]);

  // Đổi phiên (vừa đăng nhập / đăng xuất) hoặc mã → tải lại: gói gắn với tài khoản mở đề không cần mã.
  const sessionKey = session.status === "signed-in" ? session.userId : session.status;
  useEffect(() => {
    if (!hydrated || sessionKey === "loading") return;
    let cancelled = false;
    fetch(attemptPaths.intro(slug), { headers: headers(), cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
        if (cancelled) return;
        const intro = body?.ok ? parseExamIntro(body) : null;
        setLoad(intro ? { state: "ready", intro } : { state: "blocked", ...examAccessMessage(body?.reason) });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "blocked", ...examAccessMessage(undefined) });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, headers, slug, sessionKey]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const viewId = view?.id ?? null;
  /** Gửi các câu vừa đổi. `keepalive` khi rời trang để request vẫn đi sau khi tab đóng. */
  const flush = useCallback(
    (keepalive = false) => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (!viewId || dirty.current.size === 0) return;
      const sent = [...dirty.current];
      dirty.current.clear();
      const body = { answers: Object.fromEntries(sent.map((id) => [id, answersRef.current[id] ?? { choice: null }])) };
      fetch(attemptPaths.attempt(viewId), { method: "PATCH", headers: headers(), body: JSON.stringify(body), keepalive }).then(
        (response) => {
          // Lỗi mạng / server: giữ lại để gửi kèm lần sau (nộp bài luôn gửi đủ mọi câu).
          if (!response.ok && response.status >= 500) sent.forEach((id) => dirty.current.add(id));
        },
        () => sent.forEach((id) => dirty.current.add(id)),
      );
    },
    [viewId, headers],
  );

  useEffect(() => {
    if (phase !== "play") return;
    const leave = () => flush(true);
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, [phase, flush]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(attemptPaths.start(slug), { method: "POST", headers: headers() });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      const attempt = body?.ok ? parseAttemptView(body) : null;
      if (!attempt) {
        setError(examAccessMessage(body?.reason).message);
        return;
      }
      const received = Date.now();
      dirty.current.clear();
      submitting.current = false;
      setView(attempt);
      setAnswers(attempt.answers);
      setIndex(0);
      setResult(null);
      setTimedOut(false);
      setNow(received);
      setDeadline(localDeadline(attempt.deadlineAt, attempt.serverNow, received));
      setPhase("play");
    } catch {
      setError(examAccessMessage(undefined).message);
    } finally {
      setBusy(false);
    }
  }

  const finish = useCallback(
    async (byTimeout: boolean) => {
      if (!viewId || submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError(null);
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      try {
        const response = await fetch(attemptPaths.submit(viewId), { method: "POST", headers: headers(), body: JSON.stringify({ answers: answersRef.current }) });
        const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;
        const graded = body?.ok ? parseAttemptView(body) : null;
        if (!graded || graded.score10 === null) throw new Error("submit");
        dirty.current.clear();
        setResult(graded);
        setTimedOut(byTimeout);
        // Tiến độ / Hộ chiếu (mục 3.11): điểm thang 10 lưu dạng score10 × 100 trên 1000 — so sánh theo tỉ lệ nên đúng ngưỡng 7.
        saveQuizResult(examSetId(slug), Math.round(graded.score10 * 100), 1000);
        setPhase("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        submitting.current = false;
        setError(byTimeout ? "Đã hết giờ nhưng chưa gửi được bài (mất mạng?). Bài đã lưu trên máy chủ tới lần lưu gần nhất — bấm Nộp bài để thử lại." : "Chưa nộp được bài. Em kiểm tra mạng rồi bấm Nộp bài lại nhé.");
      } finally {
        setBusy(false);
      }
    },
    [viewId, headers, slug],
  );

  // Đồng hồ theo hạn nộp của server; hết giờ thì tự nộp (một lần).
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);
  useEffect(() => {
    if (phase !== "play" || deadline === null) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) void finishRef.current(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, deadline]);

  useEffect(() => {
    if (phase === "play") headingRef.current?.focus();
  }, [phase, index]);

  function update(itemId: string, answer: ItemAnswer) {
    setAnswers((previous) => ({ ...previous, [itemId]: answer }));
    dirty.current.add(itemId);
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => flush(), SAVE_DELAY_MS);
  }

  const questions = view?.questions ?? [];

  function submit() {
    const unanswered = questions.filter((question) => !isAnswered(question, answers[question.itemId])).length;
    if (unanswered > 0 && !window.confirm(`Em còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`)) return;
    void finish(false);
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
              {session.status === "anonymous" && (
                <>
                  {" · "}Đã mua khi đăng nhập?{" "}
                  <Link href={loginPath(examPaths.set(slug))} className="text-accent underline">
                    Đăng nhập để mở đề
                  </Link>
                </>
              )}
            </p>
          </>
        )}
      </div>
    );
  }

  const errorNote = error && (
    <p role="alert" className="text-sm font-medium text-accent">
      {error}
    </p>
  );

  if (phase === "intro") {
    const { intro } = load;
    if (intro.questionCount === 0) {
      return (
        <Callout variant="info" title="Đề đang được biên soạn">
          Đề này chưa có câu hỏi. Em thử đề khác nhé.
        </Callout>
      );
    }
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-foreground">
          <li>
            <strong>{intro.questionCount}</strong> câu, thời gian <strong>{durationMin} phút</strong>.
          </li>
          <li>Chọn, đổi đáp án và chuyển câu tùy ý; bài được lưu tự động, hết giờ bài tự nộp.</li>
          <li>Nộp bài xong mới thấy điểm, đáp án và lời giải thích từng câu.</li>
          <li>Đạt từ 7 điểm được đóng dấu vào Hộ chiếu lịch sử.</li>
          {intro.access === "account" && <li data-testid="exam-access-account">Đề mở bằng gói trong tài khoản của em — không tốn lượt thiết bị.</li>}
        </ul>
        {intro.inProgress && (
          <p className="text-sm text-foreground" data-testid="exam-in-progress">
            Em đang làm dở bài này
            {intro.inProgress.remainingSeconds !== null && <> (còn {formatClock(intro.inProgress.remainingSeconds)})</>} — bấm để làm tiếp.
          </p>
        )}
        <Button size="lg" onClick={start} disabled={busy}>
          {busy ? "Đang mở đề…" : "Bắt đầu làm bài"}
        </Button>
        {errorNote}
      </div>
    );
  }

  if (phase === "done" && result && result.score10 !== null) {
    const score = Math.round(result.score10 * 100);
    return (
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ket-qua" className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-6 text-center shadow-card">
          <h2 id="ket-qua" className="font-serif text-xl font-bold text-foreground">
            Kết quả: {title}
          </h2>
          {timedOut && <p className="text-sm font-medium text-accent">Hết giờ — bài đã được tự nộp.</p>}
          <p className="font-serif text-5xl font-bold text-accent" data-testid="exam-score">
            {formatScore10(result.score10)} điểm
          </p>
          <p className="text-muted-foreground">
            Đúng {result.correct}/{result.total} câu{result.unanswered ? ` · bỏ trống ${result.unanswered} câu` : ""}
          </p>
          <StampNotice score={score} total={1000} scale10 />
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button onClick={start} disabled={busy}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Làm lại
            </Button>
            <LinkButton href={examPaths.hub} variant="secondary">
              Các đề khác
            </LinkButton>
          </div>
          {errorNote}
        </section>

        <section aria-labelledby="giai-thich" className="flex flex-col gap-3">
          <h2 id="giai-thich" className="font-serif text-lg font-bold text-foreground">
            Đáp án và giải thích
          </h2>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {result.questions.map((question, position) => (
              <ResultItem key={question.itemId} question={question} position={position} answer={result.answers[question.itemId]} />
            ))}
          </ol>
        </section>
      </div>
    );
  }

  const question = questions[index];
  if (!question) return null;
  const answer = answers[question.itemId];
  const answeredCount = questions.filter((item) => isAnswered(item, answers[item.itemId])).length;
  const remainingSeconds = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 flex items-center justify-between gap-3 rounded-card border border-border bg-surface/95 px-4 py-2 text-sm shadow-card backdrop-blur">
        <span className="font-semibold text-foreground">
          Câu {index + 1}/{questions.length} · đã làm {answeredCount}
        </span>
        {remainingSeconds !== null && (
          <span
            className={cn("inline-flex items-center gap-1 font-mono text-base font-bold", remainingSeconds <= 60 ? "text-accent" : "text-foreground")}
            role="timer"
            aria-label={`Thời gian còn lại ${formatClock(remainingSeconds)}`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {formatClock(remainingSeconds)}
          </span>
        )}
      </div>

      {question.passage && <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />}
      <h2 ref={headingRef} tabIndex={-1} className="whitespace-pre-line font-serif text-xl font-bold text-foreground outline-none sm:text-2xl">
        {question.stem}
      </h2>

      {question.kind === "mcq" && question.choices ? (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Các đáp án">
          {question.choices.map((choice, position) => {
            const chosen = answer?.choice === position;
            return (
              <li key={position}>
                <button
                  type="button"
                  onClick={() => update(question.itemId, { ...answer, choice: position })}
                  aria-pressed={chosen}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-card border bg-surface p-3 text-left text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                    chosen ? "border-accent bg-accent/10" : "border-border hover:border-accent hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                      chosen ? "border-accent bg-accent text-accent-foreground" : "border-border",
                    )}
                    aria-hidden="true"
                  >
                    {CHOICE_LETTERS[position]}
                  </span>
                  <span className="pt-0.5">{choice}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0" aria-label="Các ý Đúng/Sai">
          {(question.statements ?? []).map((statement, position) => {
            const value = answer?.tf?.[position] ?? null;
            const set = (next: boolean) => {
              const tf = [0, 1, 2, 3].map((slot) => (slot === position ? next : (answer?.tf?.[slot] ?? null)));
              update(question.itemId, { ...answer, tf });
            };
            return (
              <li key={position} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3 sm:flex-row sm:items-center">
                <span className="flex-1 text-foreground">
                  <strong>{STATEMENT_LETTERS[position]})</strong> {statement}
                </span>
                <span className="flex gap-2" role="group" aria-label={`Ý ${STATEMENT_LETTERS[position]})`}>
                  {([true, false] as const).map((option) => (
                    <Button key={String(option)} type="button" size="sm" variant={value === option ? "primary" : "secondary"} aria-pressed={value === option} onClick={() => set(option)}>
                      {option ? "Đúng" : "Sai"}
                    </Button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIndex(index - 1)} disabled={index === 0}>
            Câu trước
          </Button>
          <Button variant="secondary" onClick={() => setIndex(index + 1)} disabled={index + 1 === questions.length}>
            Câu sau
          </Button>
        </div>
        <Button onClick={submit} disabled={busy}>
          {busy ? "Đang nộp…" : "Nộp bài"}
        </Button>
      </div>
      {errorNote}

      <nav aria-label="Chuyển nhanh tới câu">
        <ol className="m-0 grid list-none grid-cols-8 gap-1.5 p-0 sm:grid-cols-10">
          {questions.map((item, position) => {
            const done = isAnswered(item, answers[item.itemId]);
            return (
              <li key={item.itemId}>
                <button
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-current={position === index ? "step" : undefined}
                  aria-label={`Câu ${position + 1}${done ? " (đã làm)" : ""}`}
                  className={cn(
                    "flex h-9 w-full items-center justify-center rounded-lg border text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                    done ? "border-accent/40 bg-accent/10 text-foreground" : "border-border bg-surface text-muted-foreground",
                    position === index && "ring-2 ring-foreground/50",
                  )}
                >
                  {position + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Bài được lưu tự động. Tải lại trang thì bấm “Bắt đầu làm bài” để làm tiếp — đồng hồ vẫn chạy.
      </p>
    </div>
  );
}

/** Một câu trong phần "Đáp án và giải thích" (sau khi nộp — server đã trả đáp án, lời giải, điểm từng câu). */
function ResultItem({ question, position, answer }: { question: AttemptQuestion; position: number; answer: ItemAnswer | undefined }) {
  const full = question.kind === "mcq" ? 250 : 1000;
  const right = question.earnedMilli === full;
  const lesson = question.lessonSlug ? getSgkLesson(question.lessonSlug) : undefined;
  const chosen = answer?.choice;
  return (
    <li className={cn("rounded-card border bg-surface p-4", right ? "border-success/60" : "border-accent/60")}>
      {question.passage && <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />}
      <p className="mt-2 whitespace-pre-line font-medium text-foreground first:mt-0">
        <span className={cn("mr-1 font-bold", right ? "text-success" : "text-accent")}>Câu {position + 1}.</span>
        {question.stem}
      </p>
      {question.kind === "mcq" && question.choices && question.correctIndex !== null ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {typeof chosen !== "number" ? "Em bỏ trống. " : right ? "Em chọn đúng. " : `Em chọn ${CHOICE_LETTERS[chosen]}. `}
          Đáp án đúng:{" "}
          <strong className="text-success">
            {CHOICE_LETTERS[question.correctIndex]}. {question.choices[question.correctIndex]}
          </strong>
        </p>
      ) : (
        <ul className="mt-2 flex list-none flex-col gap-1 p-0 text-sm">
          {(question.statements ?? []).map((statement, slot) => {
            const truth = question.truths?.[slot];
            const given = answer?.tf?.[slot];
            return (
              <li key={slot} className="text-foreground">
                <strong>{STATEMENT_LETTERS[slot]})</strong> {statement} —{" "}
                <span className={given === truth ? "text-success" : "text-accent"}>
                  {truth ? "Đúng" : "Sai"}
                  {given === undefined || given === null ? " (em bỏ trống)" : given === truth ? " (em đúng)" : " (em chọn sai)"}
                </span>
                {question.statementExplanations?.[slot] && <span className="block text-muted-foreground">{question.statementExplanations[slot]}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {question.explanation && <p className="mt-2 text-sm text-foreground">{question.explanation}</p>}
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
}
