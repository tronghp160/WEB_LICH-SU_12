"use client";

import { AlertTriangle, CloudOff, Flag, Keyboard, Maximize2, Minimize2, PanelBottomOpen, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import { AnswerSheet } from "@/components/exams/runner/AnswerSheet";
import { ExamTimer } from "@/components/exams/runner/ExamTimer";
import { McqQuestion } from "@/components/exams/runner/McqQuestion";
import { RoomDialog } from "@/components/exams/runner/RoomDialog";
import { TrueFalseQuestion } from "@/components/exams/runner/TrueFalseQuestion";
import { ActivateLicenseForm } from "@/components/payments/ActivateLicenseForm";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { loginPath } from "@/lib/auth/routes";
import { attemptPaths, localDeadline, parseAttemptView, parseExamIntro, type AttemptView, type ExamIntro } from "@/lib/exams/attempt";
import { DEVICE_HEADER, LICENSE_HEADER, examAccessMessage, examPaths, examSetId, formatClock } from "@/lib/exams/exam";
import { THPT_2025_LABEL } from "@/lib/exams/format";
import { SHORTCUT_HELP, addHistory, addTime, answerState, formatSavedAt, mergeAnswers, parseHistory, parseLocalAttempt, roomKeys, shortcutFor } from "@/lib/exams/room";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { getDeviceId, useHydrated, useLicense } from "@/lib/hooks/useLicense";
import { saveQuizResult } from "@/lib/hooks/useProgress";
import { useSession } from "@/lib/hooks/useSession";
import { cn } from "@/lib/utils/cn";

type Load = { state: "loading" } | { state: "blocked"; message: string; needsActivation: boolean } | { state: "ready"; intro: ExamIntro };
type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: number } | { kind: "offline" };
type FontSize = "nho" | "vua" | "lon";
type Props = { slug: string; title: string; durationMin: number; free: boolean; format: string };

/** Lưu câu trả lời lên server sau khi ngừng thao tác 2 giây; lỗi mạng thì thử lại sau 10 giây. */
const SAVE_DELAY_MS = 2000;
const RETRY_MS = 10_000;
const FONT_CLASSES: Record<FontSize, string> = { nho: "text-sm", vua: "text-base", lon: "text-lg" };
const FONT_LABELS: Record<FontSize, string> = { nho: "Chữ nhỏ", vua: "Chữ vừa", lon: "Chữ lớn" };

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Trình duyệt chặn lưu trữ: bài vẫn lưu trên server.
  }
}
function readActive(): Record<string, { id: string; deadline: string | null }> {
  try {
    const value: unknown = JSON.parse(readStorage(roomKeys.active) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, { id: string; deadline: string | null }>) : {};
  } catch {
    return {};
  }
}

/**
 * Phòng thi (docs/ke-hoach-luyen-thi.md, mục 4.1 — GĐ3). Server tạo lượt, giữ hạn nộp, chấm điểm; trình duyệt chỉ có đáp
 * án sau khi nộp. Tự lưu: mỗi lần chọn ghi ngay vào localStorage và gửi server gom 2 giây; mất mạng vẫn làm tiếp, có mạng
 * lại thì gửi. Làm tiếp được sau khi tải lại trang / đổi máy (cùng tài khoản). Nộp xong chuyển sang trang kết quả.
 */
export function ExamRoom({ slug, title, durationMin, free, format }: Props) {
  const router = useRouter();
  const license = useLicense();
  const hydrated = useHydrated();
  const session = useSession();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [view, setView] = useState<AttemptView | null>(null);
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [index, setIndex] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"submit" | "help" | "sheet" | "restart" | null>(null);
  // Cỡ chữ đã nhớ: đọc ngay khi tạo state (lúc server dựng trang chỉ có dòng "Đang tải đề…", không dùng cỡ chữ).
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const stored = typeof window === "undefined" ? null : readStorage(roomKeys.fontSize);
    return stored === "nho" || stored === "lon" ? stored : "vua";
  });
  const [focusMode, setFocusMode] = useState(false);
  const [waitingNetwork, setWaitingNetwork] = useState(false);

  const roomRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answersRef = useRef(answers);
  const indexRef = useRef(index);
  const dirty = useRef(new Set<string>());
  const savedAt = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);
  const enteredAt = useRef<number | null>(null);
  const submitting = useRef(false);
  /** Bản flush mới nhất — để hẹn giờ gửi lại gọi được chính nó. */
  const flushRef = useRef<() => void>(() => undefined);

  const licenseCode = license?.code ?? null;
  const headers = useCallback((): Record<string, string> => {
    const value: Record<string, string> = { [DEVICE_HEADER]: getDeviceId(), "Content-Type": "application/json" };
    if (licenseCode) value[LICENSE_HEADER] = licenseCode;
    return value;
  }, [licenseCode]);

  // ----- Trang đề: quyền, số câu, lượt dở -----
  const sessionKey = session.status === "signed-in" ? session.userId : session.status;
  useEffect(() => {
    // Tải trang đề sau khi biết phiên: gói gắn với tài khoản mở đề không cần mã.
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
  }, [hydrated, sessionKey, slug, headers]);

  const attemptId = view?.id ?? null;
  const questions = useMemo(() => view?.questions ?? [], [view]);

  // ----- Lưu -----
  const persistLocal = useCallback(() => {
    if (!attemptId) return;
    writeStorage(roomKeys.attempt(attemptId), JSON.stringify({ answers: answersRef.current, dirty: [...dirty.current], index: indexRef.current, savedAt: savedAt.current }));
  }, [attemptId]);

  const flush = useCallback(
    async (keepalive = false) => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (!attemptId || dirty.current.size === 0) return;
      const sent = Object.fromEntries([...dirty.current].map((id) => [id, answersRef.current[id] ?? { choice: null }]));
      setSaveState({ kind: "saving" });
      try {
        const response = await fetch(attemptPaths.attempt(attemptId), { method: "PATCH", headers: headers(), body: JSON.stringify({ answers: sent }), keepalive });
        if (response.ok) {
          // Chỉ bỏ khỏi danh sách cần gửi những câu không đổi thêm trong lúc chờ.
          for (const [id, answer] of Object.entries(sent)) if (JSON.stringify(answersRef.current[id]) === JSON.stringify(answer)) dirty.current.delete(id);
          savedAt.current = Date.now();
          setSaveState({ kind: "saved", at: savedAt.current });
        } else if (response.status === 409) {
          // Đã nộp / đã hết giờ: không gửi thêm.
          dirty.current.clear();
        } else {
          throw new Error(String(response.status));
        }
      } catch {
        setSaveState({ kind: "offline" });
        saveTimer.current = window.setTimeout(() => flushRef.current(), RETRY_MS);
      } finally {
        persistLocal();
      }
    },
    [attemptId, headers, persistLocal],
  );

  useEffect(() => {
    flushRef.current = () => void flush();
  }, [flush]);

  const update = useCallback(
    (itemId: string, answer: ItemAnswer) => {
      answersRef.current = { ...answersRef.current, [itemId]: answer };
      setAnswers(answersRef.current);
      dirty.current.add(itemId);
      persistLocal();
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush, persistLocal],
  );

  /** Cộng thời gian xem câu hiện tại vào câu trả lời của câu đó. */
  const accumulate = useCallback(() => {
    const question = questions[indexRef.current];
    if (!question || enteredAt.current === null) return;
    const elapsed = Date.now() - enteredAt.current;
    enteredAt.current = Date.now();
    if (elapsed >= 1000) update(question.itemId, addTime(answersRef.current[question.itemId], elapsed));
  }, [questions, update]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= questions.length) return;
      accumulate();
      indexRef.current = next;
      setIndex(next);
      persistLocal();
    },
    [accumulate, questions.length, persistLocal],
  );

  // Rời trang / ẩn tab: ghi thời gian, gửi nốt (keepalive). Có mạng lại: gửi ngay.
  useEffect(() => {
    if (!attemptId) return;
    const leave = () => {
      accumulate();
      void flush(true);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") {
        leave();
        enteredAt.current = null;
      } else enteredAt.current = Date.now();
    };
    const online = () => void flush();
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", online);
    };
  }, [attemptId, accumulate, flush]);

  // ----- Bắt đầu / làm tiếp / bắt đầu lại -----
  async function open() {
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
      const local = parseLocalAttempt(readStorage(roomKeys.attempt(attempt.id)));
      const merged = mergeAnswers(attempt.answers, local, attempt.questions.map((question) => question.itemId));
      const start = Math.min(local?.index ?? 0, attempt.questions.length - 1);
      dirty.current = new Set(merged.dirty);
      answersRef.current = merged.answers;
      indexRef.current = start;
      savedAt.current = local?.savedAt ?? null;
      submitting.current = false;
      enteredAt.current = Date.now();
      setAnswers(merged.answers);
      setIndex(start);
      setView(attempt);
      setNow(received);
      setDeadline(localDeadline(attempt.deadlineAt, attempt.serverNow, received));
      setSaveState(savedAt.current ? { kind: "saved", at: savedAt.current } : { kind: "idle" });
      writeStorage(roomKeys.active, JSON.stringify({ ...readActive(), [slug]: { id: attempt.id, deadline: attempt.deadlineAt } }));
    } catch {
      setError(examAccessMessage(undefined).message);
    } finally {
      setBusy(false);
    }
  }

  /** Ghi kết quả đã chấm: tiến độ / Hộ chiếu (mục 3.11), lịch sử trên máy, bỏ bản lưu tạm. */
  const record = useCallback(
    (graded: AttemptView) => {
      if (graded.score10 === null) return;
      saveQuizResult(examSetId(slug), Math.round(graded.score10 * 100), 1000);
      writeStorage(roomKeys.history, JSON.stringify(addHistory(parseHistory(readStorage(roomKeys.history)), { id: graded.id, slug, title, score10: graded.score10, submittedAt: graded.submittedAt ?? new Date().toISOString() })));
      writeStorage(roomKeys.attempt(graded.id), null);
      const active = readActive();
      delete active[slug];
      writeStorage(roomKeys.active, JSON.stringify(active));
    },
    [slug, title],
  );

  const submitAttempt = useCallback(
    async (id: string, answersToSend: Record<string, ItemAnswer>): Promise<AttemptView | null> => {
      const response = await fetch(attemptPaths.submit(id), { method: "POST", headers: headers(), body: JSON.stringify({ answers: answersToSend }) });
      const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      const graded = body?.ok ? parseAttemptView(body) : null;
      return graded && graded.score10 !== null ? graded : null;
    },
    [headers],
  );

  /** "Bắt đầu lại": nộp lượt đang dở (chấm phần đã làm) rồi mở lượt mới. */
  async function restart(intro: ExamIntro) {
    if (!intro.inProgress) return;
    setDialog(null);
    setBusy(true);
    try {
      const local = parseLocalAttempt(readStorage(roomKeys.attempt(intro.inProgress.id)));
      const graded = await submitAttempt(intro.inProgress.id, local?.answers ?? {});
      if (graded) record(graded);
    } catch {
      // Không nộp được lượt cũ: vẫn mở (server trả lại lượt cũ nếu còn hạn).
    }
    await open();
  }

  // ----- Nộp bài -----
  const finish = useCallback(
    async (byTimeout: boolean) => {
      if (!attemptId || submitting.current) return;
      submitting.current = true;
      setDialog(null);
      setBusy(true);
      setError(null);
      accumulate();
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      try {
        const graded = await submitAttempt(attemptId, answersRef.current);
        if (!graded) throw new Error("submit");
        dirty.current.clear();
        record(graded);
        router.push(`${examPaths.result(graded.id)}${byTimeout ? "?het-gio=1" : ""}`);
      } catch {
        submitting.current = false;
        setBusy(false);
        if (byTimeout) {
          setWaitingNetwork(true);
          setError("Đã hết giờ. Bài sẽ được nộp khi có mạng (phần đã lưu trước hạn được chấm).");
        } else {
          setError("Chưa nộp được bài. Em kiểm tra mạng rồi bấm Nộp bài lại nhé — bài vẫn được lưu trên máy.");
        }
      }
    },
    [attemptId, accumulate, record, router, submitAttempt],
  );

  // Hết giờ mà mất mạng: có mạng lại thì nộp.
  useEffect(() => {
    if (!waitingNetwork) return;
    const retry = () => void finish(true);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [waitingNetwork, finish]);

  // ----- Đồng hồ theo hạn nộp của server; hết giờ tự nộp (một lần) -----
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);
  useEffect(() => {
    if (!attemptId || deadline === null) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !submitting.current && !waitingNetwork) void finishRef.current(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attemptId, deadline, waitingNetwork]);

  useEffect(() => {
    if (attemptId) headingRef.current?.focus();
  }, [attemptId, index]);

  // ----- Phím tắt -----
  const question = questions[index];
  useEffect(() => {
    if (!attemptId || !question) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || dialog !== null) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const action = shortcutFor(event.key, question.kind);
      if (!action) return;
      event.preventDefault();
      const answer = answersRef.current[question.itemId];
      if (action.type === "prev") goTo(indexRef.current - 1);
      else if (action.type === "next") goTo(indexRef.current + 1);
      else if (action.type === "help") setDialog("help");
      else if (action.type === "flag") update(question.itemId, { ...answer, flagged: !answer?.flagged });
      else if (action.type === "choose" && question.kind === "mcq") update(question.itemId, { ...answer, choice: action.choice });
      else if (action.type === "statement" && question.kind === "true_false") {
        const tf = [0, 1, 2, 3].map((slot) => (slot === action.statement ? action.value : (answer?.tf?.[slot] ?? null)));
        update(question.itemId, { ...answer, tf });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attemptId, question, dialog, goTo, update]);

  // ----- Chế độ tập trung (toàn màn hình) -----
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setFocusMode(false);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  async function toggleFocus() {
    if (focusMode) {
      setFocusMode(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      return;
    }
    setFocusMode(true);
    // Trình duyệt chặn toàn màn hình (iPhone…): vẫn phủ kín cửa sổ, ẩn đầu / cuối trang.
    await roomRef.current?.requestFullscreen?.().catch(() => undefined);
  }

  function changeFont(next: FontSize) {
    setFontSize(next);
    writeStorage(roomKeys.fontSize, next);
  }

  // ================================================================================================================
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

  if (!view || !question) {
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
            <strong>{intro.questionCount}</strong> câu, thời gian <strong>{durationMin} phút</strong>
            {format === "thpt_2025" && <> — đúng cấu trúc đề thi tốt nghiệp ({THPT_2025_LABEL})</>}.
          </li>
          <li>Bài tự lưu trên máy và trên máy chủ: tải lại trang, mất mạng hay đổi máy (cùng tài khoản) vẫn làm tiếp được.</li>
          <li>Đánh dấu câu để xem lại; bấm phím ? trong phòng thi để xem phím tắt. Hết giờ bài tự nộp.</li>
          <li>Nộp bài xong mới thấy điểm, đáp án, lời giải và phân tích. Đạt từ 7 điểm được đóng dấu vào Hộ chiếu lịch sử.</li>
          {intro.access === "account" && <li data-testid="exam-access-account">Đề mở bằng gói trong tài khoản của em — không tốn lượt thiết bị.</li>}
        </ul>
        {intro.inProgress ? (
          <>
            <p className="font-medium text-foreground" data-testid="exam-in-progress">
              Em đang làm dở bài này{intro.inProgress.remainingSeconds !== null && <> (còn {formatClock(intro.inProgress.remainingSeconds)})</>}. Làm tiếp hay
              bắt đầu lại?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => void open()} disabled={busy}>
                {busy ? "Đang mở đề…" : "Làm tiếp"}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setDialog("restart")} disabled={busy}>
                Bắt đầu lại
              </Button>
            </div>
            <RoomDialog open={dialog === "restart"} onClose={() => setDialog(null)} title="Bắt đầu lại?">
              <p className="text-sm text-foreground">Bài đang làm dở sẽ được nộp và chấm theo phần em đã làm, rồi mở một lượt mới với đủ thời gian.</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={() => setDialog(null)}>
                  Thôi, làm tiếp
                </Button>
                <Button onClick={() => void restart(intro)}>Nộp bài cũ và bắt đầu lại</Button>
              </div>
            </RoomDialog>
          </>
        ) : (
          <Button size="lg" onClick={() => void open()} disabled={busy}>
            {busy ? "Đang mở đề…" : "Bắt đầu làm bài"}
          </Button>
        )}
        {errorNote}
      </div>
    );
  }

  const answer = answers[question.itemId];
  const answered = questions.filter((item) => answerState(item, answers[item.itemId]) === "done").length;
  const partial = questions.filter((item) => answerState(item, answers[item.itemId]) === "partial").length;
  const unanswered = questions.length - answered - partial;
  const flagged = questions.filter((item) => answers[item.itemId]?.flagged).length;
  const firstOpen = questions.findIndex((item) => answerState(item, answers[item.itemId]) !== "done");
  const remainingSeconds = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
  const sheet = <AnswerSheet questions={questions} answers={answers} current={index} onJump={(target) => { goTo(target); setDialog(null); }} />;

  return (
    <div
      ref={roomRef}
      className={cn("flex flex-col gap-4", FONT_CLASSES[fontSize], focusMode && "fixed inset-0 z-50 overflow-y-auto bg-background p-3 sm:p-6")}
      data-testid="exam-room"
    >
      {/* Thanh trên: tiến độ, trạng thái lưu, đồng hồ, công cụ, nộp bài */}
      <div className={cn("z-10 flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface/95 px-3 py-2 text-sm shadow-card backdrop-blur", focusMode ? "sticky top-0" : "sticky top-16")}>
        <span className="font-semibold text-foreground">
          Câu {index + 1}/{questions.length} · đã làm {answered}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status" data-testid="save-status">
          {saveState.kind === "saving" && "Đang lưu…"}
          {saveState.kind === "saved" && (
            <>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Đã lưu lúc {formatSavedAt(saveState.at)}
            </>
          )}
          {saveState.kind === "offline" && (
            <span className="inline-flex items-center gap-1 text-accent">
              <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
              Mất mạng — đã lưu trên máy, sẽ gửi lại
            </span>
          )}
        </span>
        {remainingSeconds !== null && <ExamTimer remainingSeconds={remainingSeconds} />}
        <span className="flex flex-wrap items-center gap-1">
          <span role="group" aria-label="Cỡ chữ" className="flex">
            {(["nho", "vua", "lon"] as const).map((size, position) => (
              <button
                key={size}
                type="button"
                aria-pressed={fontSize === size}
                aria-label={FONT_LABELS[size]}
                onClick={() => changeFont(size)}
                className={cn("h-8 min-w-8 border border-border px-1.5 font-serif focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold", position === 0 && "rounded-l-lg", position === 2 && "rounded-r-lg", fontSize === size ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-muted", ["text-xs", "text-sm", "text-base"][position])}
              >
                A
              </button>
            ))}
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => void toggleFocus()} aria-pressed={focusMode}>
            {focusMode ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
            <span className="sr-only sm:not-sr-only">{focusMode ? "Thoát toàn màn hình" : "Toàn màn hình"}</span>
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setDialog("help")}>
            <Keyboard className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Phím tắt</span>
          </Button>
          <Button type="button" size="sm" onClick={() => setDialog("submit")} disabled={busy}>
            {busy ? "Đang nộp…" : "Nộp bài"}
          </Button>
        </span>
      </div>
      {errorNote}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <div className={cn("grid gap-4", question.passage && "xl:grid-cols-2 xl:items-start")}>
          {question.passage &&
            (
              <details open className="group rounded-card xl:sticky xl:top-32" data-testid="passage">
                <summary className="mb-2 cursor-pointer text-sm font-semibold text-gold-deep xl:hidden">Tư liệu (bấm để thu gọn / mở)</summary>
                <div className="xl:max-h-[70vh] xl:overflow-y-auto">
                  <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />
                </div>
              </details>
            )}
          <section aria-labelledby="cau-hoi-hien-tai" className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold uppercase tracking-wide text-gold-deep">
                Câu {index + 1} · {question.section === 1 ? "Phần I" : "Phần II"}
              </span>
              <Button
                type="button"
                size="sm"
                variant={answer?.flagged ? "primary" : "secondary"}
                aria-pressed={answer?.flagged === true}
                onClick={() => update(question.itemId, { ...answer, flagged: !answer?.flagged })}
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
                {answer?.flagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}
              </Button>
            </div>
            <h2 id="cau-hoi-hien-tai" ref={headingRef} tabIndex={-1} className="whitespace-pre-line font-serif text-[1.25em] font-bold leading-snug text-foreground outline-none">
              {question.stem}
            </h2>
            {question.kind === "mcq" && question.choices ? (
              <McqQuestion
                choices={question.choices}
                chosen={typeof answer?.choice === "number" ? answer.choice : null}
                onChoose={(choice) => update(question.itemId, { ...answer, choice: answer?.choice === choice ? null : choice })}
              />
            ) : (
              <TrueFalseQuestion
                statements={question.statements ?? []}
                values={answer?.tf ?? [null, null, null, null]}
                onSet={(statement, value) =>
                  update(question.itemId, { ...answer, tf: [0, 1, 2, 3].map((slot) => (slot === statement ? value : (answer?.tf?.[slot] ?? null))) })
                }
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0}>
                Câu trước
              </Button>
              <Button variant="secondary" onClick={() => goTo(index + 1)} disabled={index + 1 === questions.length}>
                Câu sau
              </Button>
            </div>
          </section>
        </div>

        <aside className="hidden rounded-card border border-border bg-surface p-4 lg:sticky lg:top-32 lg:block" aria-label="Phiếu trả lời">
          {sheet}
        </aside>
      </div>

      {/* Điện thoại / máy tính bảng: phiếu trả lời mở từ thanh dưới */}
      {/* Nằm trên thanh điều hướng dưới của trang (MobileTabBar, h-14, ẩn từ md); chế độ toàn màn hình thì sát đáy. */}
      <div
        className={cn(
          "sticky z-10 -mx-4 border-t border-border bg-surface/95 px-4 py-2 backdrop-blur lg:hidden",
          focusMode ? "-mx-3 bottom-0 sm:-mx-6" : "bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0",
        )}
      >
        <Button type="button" variant="secondary" className="w-full" onClick={() => setDialog("sheet")}>
          <PanelBottomOpen className="h-4 w-4" aria-hidden="true" />
          Phiếu trả lời ({answered}/{questions.length})
        </Button>
      </div>

      <RoomDialog open={dialog === "sheet"} onClose={() => setDialog(null)} title="Phiếu trả lời">
        {sheet}
      </RoomDialog>

      <RoomDialog open={dialog === "submit"} onClose={() => setDialog(null)} title="Nộp bài?">
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-foreground">
          <li>Đã làm {answered}/{questions.length} câu.</li>
          {unanswered > 0 && <li className="text-accent">Còn {unanswered} câu chưa làm.</li>}
          {partial > 0 && <li className="text-accent">{partial} câu Đúng/Sai còn ý chưa chọn (ý bỏ trống tính là sai).</li>}
          {flagged > 0 && <li>{flagged} câu đang đánh dấu xem lại.</li>}
          {remainingSeconds !== null && <li>Còn {formatClock(remainingSeconds)}.</li>}
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          {firstOpen >= 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                goTo(firstOpen);
                setDialog(null);
              }}
            >
              Xem lại câu chưa làm
            </Button>
          )}
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Làm tiếp
          </Button>
          <Button onClick={() => void finish(false)} disabled={busy}>
            Nộp bài
          </Button>
        </div>
      </RoomDialog>

      <RoomDialog open={dialog === "help"} onClose={() => setDialog(null)} title="Phím tắt">
        <table className="w-full text-sm">
          <tbody>
            {SHORTCUT_HELP.map(([keys, action]) => (
              <tr key={keys} className="border-b border-border last:border-0">
                <th scope="row" className="py-1.5 pr-3 text-left font-mono font-semibold text-foreground">
                  {keys}
                </th>
                <td className="py-1.5 text-foreground">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Đóng
          </Button>
        </div>
      </RoomDialog>
    </div>
  );
}
