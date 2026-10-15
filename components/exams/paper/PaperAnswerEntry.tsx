"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { attemptPaths, parseAttemptView, type AttemptView } from "@/lib/exams/attempt";
import { DEVICE_HEADER, examPaths } from "@/lib/exams/exam";
import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { getDeviceId, useHydrated } from "@/lib/hooks/useLicense";
import { cn } from "@/lib/utils/cn";

type Load = { state: "loading" } | { state: "missing" } | { state: "ready"; view: AttemptView };

/**
 * Nhập đáp án đã làm trên giấy (docs/ke-hoach-luyen-thi.md, mục 4.9 — GĐ8): phiếu trả lời số của lượt in → nộp → chấm và
 * phân tích như bài làm online. Chỉ chủ lượt (máy / tài khoản đã tạo bản in) mở được.
 */
export function PaperAnswerEntry({ slug, attemptId }: { slug: string; attemptId: string | null }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [load, setLoad] = useState<Load>({ state: attemptId ? "loading" : "missing" });
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !attemptId) return;
    let cancelled = false;
    fetch(attemptPaths.attempt(attemptId), { headers: { [DEVICE_HEADER]: getDeviceId() }, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;
        if (cancelled) return;
        const view = body?.ok ? parseAttemptView(body) : null;
        if (!view || view.mode !== "paper") return setLoad({ state: "missing" });
        if (view.status === "submitted") return router.replace(examPaths.result(view.id));
        setAnswers(view.answers);
        setLoad({ state: "ready", view });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, attemptId, router]);

  if (load.state === "loading") {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-muted-foreground" role="status">
        Đang tải phiếu trả lời…
      </p>
    );
  }
  if (load.state === "missing") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6">
        <p className="flex items-start gap-2 text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          Không tìm thấy bản in này. Phiếu chỉ mở được trên máy (hoặc tài khoản) đã tạo bản in.
        </p>
        <Link href={examPaths.print(slug)} className="text-accent underline">
          Tạo bản in
        </Link>
      </div>
    );
  }

  const { view } = load;
  const partOne = view.questions.filter((question) => question.kind === "mcq");
  const partTwo = view.questions.filter((question) => question.kind === "true_false");
  const done = view.questions.filter((question) =>
    question.kind === "mcq" ? typeof answers[question.itemId]?.choice === "number" : (answers[question.itemId]?.tf ?? []).some((value) => value !== null && value !== undefined),
  ).length;
  const cell = (active: boolean) =>
    cn(
      "h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
      active ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-muted",
    );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(attemptPaths.submit(view.id), {
        method: "POST",
        headers: { [DEVICE_HEADER]: getDeviceId(), "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!body?.ok) throw new Error("submit");
      router.push(examPaths.result(view.id));
    } catch {
      setBusy(false);
      setError("Chưa nộp được. Em kiểm tra mạng rồi thử lại nhé.");
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="paper-entry">
      <p className="text-sm text-muted-foreground">
        Mã bài in: <strong className="text-foreground">{view.id.slice(0, 8).toUpperCase()}</strong> (đối chiếu với tờ đề). Chọn đúng như em đã làm
        trên giấy rồi bấm Chấm điểm.
      </p>
      {partOne.length > 0 && (
        <section aria-labelledby="phan-1" className="flex flex-col gap-2">
          <h2 id="phan-1" className="font-serif text-xl font-semibold text-foreground">
            Phần I
          </h2>
          <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {partOne.map((question) => (
              <li key={question.itemId} className="flex items-center gap-2" role="group" aria-label={`Câu ${question.n}`}>
                <span className="w-14 text-sm font-semibold text-foreground">Câu {question.n}</span>
                {CHOICE_LETTERS.map((letter, index) => {
                  const active = answers[question.itemId]?.choice === index;
                  return (
                    <button
                      key={letter}
                      type="button"
                      aria-pressed={active}
                      className={cell(active)}
                      onClick={() => setAnswers((current) => ({ ...current, [question.itemId]: { ...current[question.itemId], choice: active ? null : index } }))}
                    >
                      {letter}
                    </button>
                  );
                })}
              </li>
            ))}
          </ol>
        </section>
      )}
      {partTwo.length > 0 && (
        <section aria-labelledby="phan-2" className="flex flex-col gap-2">
          <h2 id="phan-2" className="font-serif text-xl font-semibold text-foreground">
            Phần II
          </h2>
          <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {partTwo.map((question, number) => (
              <li key={question.itemId} className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-3">
                <span className="text-sm font-semibold text-foreground">Câu {number + 1}</span>
                {STATEMENT_LETTERS.map((letter, slot) => {
                  const value = answers[question.itemId]?.tf?.[slot] ?? null;
                  const set = (next: boolean) =>
                    setAnswers((current) => {
                      const tf = [0, 1, 2, 3].map((position) => (position === slot ? (value === next ? null : next) : (current[question.itemId]?.tf?.[position] ?? null)));
                      return { ...current, [question.itemId]: { ...current[question.itemId], tf } };
                    });
                  return (
                    <span key={letter} className="flex items-center gap-2" role="group" aria-label={`Câu ${number + 1} ý ${letter})`}>
                      <span className="w-6 text-sm text-foreground">{letter})</span>
                      <button type="button" aria-pressed={value === true} className={cell(value === true)} onClick={() => set(true)}>
                        Đúng
                      </button>
                      <button type="button" aria-pressed={value === false} className={cell(value === false)} onClick={() => set(false)}>
                        Sai
                      </button>
                    </span>
                  );
                })}
              </li>
            ))}
          </ol>
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={() => void submit()} disabled={busy}>
          {busy ? "Đang chấm…" : "Chấm điểm"}
        </Button>
        <span className="text-sm text-muted-foreground">
          Đã nhập {done}/{view.questions.length} câu (câu bỏ trống tính 0 điểm)
        </span>
      </div>
    </div>
  );
}
