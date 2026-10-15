"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import { SolutionItem } from "@/components/exams/result/SolutionItem";
import { McqQuestion } from "@/components/exams/runner/McqQuestion";
import { TrueFalseQuestion } from "@/components/exams/runner/TrueFalseQuestion";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { loginPath } from "@/lib/auth/routes";
import { attemptPaths, parseAttemptView, type AttemptView, type PracticeOptions } from "@/lib/exams/attempt";
import { DEVICE_HEADER, LICENSE_HEADER, examAccessMessage, examPaths } from "@/lib/exams/exam";
import { EXAM_ITEM_KINDS, EXAM_ITEM_LEVELS, examItemKindLabels, examItemLevelLabels } from "@/lib/exams/items";
import { answerState } from "@/lib/exams/room";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { getDeviceId, useHydrated, useLicense } from "@/lib/hooks/useLicense";
import { useSession } from "@/lib/hooks/useSession";
import { sgkLessons } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

const MODE_TITLES: Record<string, string> = { practice: "Luyện tập", review: "Ôn câu đến hạn", retry: "Làm lại câu sai" };
const PRACTICE_MESSAGES: Record<string, string> = {
  empty: "Không có câu nào khớp lựa chọn của em. Thử bỏ bớt điều kiện lọc nhé.",
  login_required: "Ôn câu đến hạn cần đăng nhập để lưu sổ câu sai.",
  pack_required: "Ôn ngắt quãng thuộc Gói luyện thi. Em mua gói (hoặc kích hoạt mã trên máy này) để mở.",
  quota: "Em đã kiểm tra hết 10 câu luyện miễn phí hôm nay. Mai luyện tiếp nhé, hoặc mua Gói luyện thi để luyện không giới hạn.",
};
const message = (reason: string | undefined) => (reason && PRACTICE_MESSAGES[reason]) || examAccessMessage(reason).message;

/** `initialLessons`: bài chọn sẵn (?bai= — từ "việc nên làm tiếp" / lộ trình, GĐ5). */
type Props = { initialMode: "practice" | "review" | "retry"; retryFrom: string | null; initialLessons?: string[] };

/**
 * Luyện tập theo bài / dạng / mức độ (docs/ke-hoach-luyen-thi.md, mục 4.3): mỗi câu bấm "Kiểm tra" → server chấm, khóa
 * câu, trả lời giải của ĐÚNG câu đó, ghi sổ câu sai (khi đăng nhập). Không bấm giờ. Chưa có gói: 10 câu kiểm tra / ngày.
 * Cùng component cho "Ôn câu đến hạn" (sổ câu sai) và "Làm lại câu sai" của một lượt.
 */
export function PracticeRoom({ initialMode, retryFrom, initialLessons = [] }: Props) {
  const router = useRouter();
  const hydrated = useHydrated();
  const license = useLicense();
  const session = useSession();
  const signedIn = session.status === "signed-in";
  const [view, setView] = useState<AttemptView | null>(null);
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, ItemAnswer>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);
  const [lessons, setLessons] = useState<string[]>(initialLessons);
  const [kinds, setKinds] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [passage, setPassage] = useState<"tat-ca" | "co" | "khong">("tat-ca");
  const [count, setCount] = useState<10 | 20 | 30>(10);
  const [onlyNew, setOnlyNew] = useState(false);
  const [preferWrong, setPreferWrong] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const autoStarted = useRef(false);

  const licenseCode = license?.code ?? null;
  const headers = useCallback((): Record<string, string> => {
    const value: Record<string, string> = { [DEVICE_HEADER]: getDeviceId(), "Content-Type": "application/json" };
    if (licenseCode) value[LICENSE_HEADER] = licenseCode;
    return value;
  }, [licenseCode]);

  const start = useCallback(
    async (options: PracticeOptions) => {
      setBusy(true);
      setError(null);
      setQuota(false);
      try {
        const response = await fetch(attemptPaths.practice, { method: "POST", headers: headers(), body: JSON.stringify(options) });
        const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
        const attempt = body?.ok ? parseAttemptView(body) : null;
        if (!attempt) {
          setError(message(body?.reason));
          return;
        }
        setView(attempt);
        setDrafts({});
        setIndex(0);
      } catch {
        setError(message(undefined));
      } finally {
        setBusy(false);
      }
    },
    [headers],
  );

  // Vào từ sổ câu sai ("Ôn ngay") hoặc trang kết quả ("Làm lại các câu sai"): bắt đầu luôn, không cần chọn bộ lọc.
  useEffect(() => {
    if (!hydrated || session.status === "loading" || autoStarted.current || initialMode === "practice") return;
    autoStarted.current = true;
    void start(initialMode === "review" ? { mode: "review" } : { mode: "retry", from_attempt: retryFrom ?? "" });
  }, [hydrated, session.status, initialMode, retryFrom, start]);

  useEffect(() => {
    if (view) headingRef.current?.focus();
  }, [view, index]);

  const questions = view?.questions ?? [];
  const question = questions[index];

  async function check() {
    if (!view || !question) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(attemptPaths.check(view.id), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ item_id: question.itemId, answer: drafts[question.itemId] ?? {} }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      const next = body?.ok ? parseAttemptView(body) : null;
      if (!next) {
        if (body?.reason === "quota") setQuota(true);
        setError(message(body?.reason));
        return;
      }
      setView(next);
    } catch {
      setError("Chưa kiểm tra được (mất mạng?). Em thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!view) return;
    setBusy(true);
    try {
      const response = await fetch(attemptPaths.submit(view.id), { method: "POST", headers: headers(), body: JSON.stringify({ answers: {} }) });
      const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;
      if (!body?.ok) throw new Error("submit");
      router.push(examPaths.result(view.id));
    } catch {
      setError("Chưa kết thúc được (mất mạng?). Em thử lại nhé.");
      setBusy(false);
    }
  }

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  // ----- Chọn bộ lọc -----
  if (!view) {
    if (initialMode !== "practice") {
      return error ? (
        <Callout variant="warning" title={MODE_TITLES[initialMode]}>
          {error}{" "}
          <Link href={initialMode === "review" ? examPaths.notebook : examPaths.hub} className="text-accent underline">
            Quay lại
          </Link>
        </Callout>
      ) : (
        <p className="rounded-card border border-border bg-surface p-6 text-muted-foreground" role="status">
          Đang chọn câu…
        </p>
      );
    }
    return (
      <form
        className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void start({ mode: "practice", lessons, kinds: kinds as ("mcq" | "true_false")[], levels: levels as ("nhan_biet" | "thong_hieu" | "van_dung")[], passage: passage === "tat-ca" ? null : passage === "co", count, only_new: onlyNew, prefer_wrong: preferWrong });
        }}
      >
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 font-semibold text-foreground">Bài (bỏ trống = mọi bài)</legend>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {sgkLessons.map((lesson) => (
              <label key={lesson.slug} className="flex items-start gap-2 text-sm text-foreground">
                <input type="checkbox" checked={lessons.includes(lesson.slug)} onChange={() => toggle(lessons, lesson.slug, setLessons)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
                <span>
                  Bài {lesson.number}. {lesson.shortTitle}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 font-semibold text-foreground">Dạng câu</legend>
            {EXAM_ITEM_KINDS.map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={kinds.includes(kind)} onChange={() => toggle(kinds, kind, setKinds)} className="h-4 w-4 accent-[var(--accent)]" />
                {examItemKindLabels[kind]}
              </label>
            ))}
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 font-semibold text-foreground">Mức độ</legend>
            {EXAM_ITEM_LEVELS.map((level) => (
              <label key={level} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={levels.includes(level)} onChange={() => toggle(levels, level, setLevels)} className="h-4 w-4 accent-[var(--accent)]" />
                {examItemLevelLabels[level]}
              </label>
            ))}
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 font-semibold text-foreground">Tư liệu</legend>
            {(
              [
                ["tat-ca", "Tất cả"],
                ["co", "Chỉ câu có tư liệu"],
                ["khong", "Không có tư liệu"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="tu-lieu" checked={passage === value} onChange={() => setPassage(value)} className="h-4 w-4 accent-[var(--accent)]" />
                {label}
              </label>
            ))}
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1 font-semibold text-foreground">Số câu</legend>
            {([10, 20, 30] as const).map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" name="so-cau" checked={count === value} onChange={() => setCount(value)} className="h-4 w-4 accent-[var(--accent)]" />
                {value} câu
              </label>
            ))}
          </fieldset>
        </div>
        {signedIn ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyNew} onChange={(event) => setOnlyNew(event.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Chỉ câu em chưa làm
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={preferWrong} onChange={(event) => setPreferWrong(event.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Ưu tiên câu em từng sai
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href={loginPath(examPaths.practice)} className="text-accent underline">
              Đăng nhập
            </Link>{" "}
            để lưu câu sai vào sổ, chọn “chỉ câu chưa làm” hay “ưu tiên câu từng sai”.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Đang chọn câu…" : "Bắt đầu luyện"}
          </Button>
          <span className="text-sm text-muted-foreground">Chưa có gói: kiểm tra 10 câu mỗi ngày. Có gói: không giới hạn.</span>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-accent">
            {error}
          </p>
        )}
      </form>
    );
  }

  // ----- Làm từng câu -----
  if (!question) return null;
  const checkedCount = questions.filter((item) => item.checked).length;
  const rightCount = questions.filter((item) => item.checked && item.earnedMilli === (item.kind === "mcq" ? 250 : 1000)).length;
  const draft = drafts[question.itemId];
  const ready = answerState(question, draft) !== "empty";
  const title = MODE_TITLES[view.mode === "review" ? "review" : initialMode === "retry" ? "retry" : "practice"];

  return (
    <div className="flex flex-col gap-4" data-testid="practice-room">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-2 text-sm">
        <span className="font-semibold text-foreground">
          {title} · Câu {index + 1}/{questions.length}
        </span>
        <span className="text-muted-foreground" data-testid="practice-progress">
          Đã kiểm tra {checkedCount} · đúng {rightCount}
        </span>
      </div>

      {question.passage && <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />}

      {question.checked ? (
        <div className="flex flex-col gap-2">
          <p className={cn("flex items-center gap-2 font-semibold", question.earnedMilli === (question.kind === "mcq" ? 250 : 1000) ? "text-success" : "text-accent")} role="status">
            {question.earnedMilli === (question.kind === "mcq" ? 250 : 1000) ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}
            {question.earnedMilli === (question.kind === "mcq" ? 250 : 1000) ? "Chính xác!" : question.kind === "mcq" ? "Chưa đúng." : "Chưa đúng hết các ý."}
          </p>
          <h2 ref={headingRef} tabIndex={-1} className="sr-only">
            Câu {index + 1}
          </h2>
          <ol className="m-0 list-none p-0">
            <SolutionItem question={{ ...question, passage: null }} position={index} answer={view.answers[question.itemId]} attemptId={view.id} />
          </ol>
        </div>
      ) : (
        <section aria-labelledby="cau-luyen-tap" className="flex flex-col gap-4">
          <h2 id="cau-luyen-tap" ref={headingRef} tabIndex={-1} className="whitespace-pre-line font-serif text-xl font-bold text-foreground outline-none">
            {question.stem}
          </h2>
          {question.kind === "mcq" && question.choices ? (
            <McqQuestion
              choices={question.choices}
              chosen={typeof draft?.choice === "number" ? draft.choice : null}
              onChoose={(choice) => setDrafts((previous) => ({ ...previous, [question.itemId]: { choice: draft?.choice === choice ? null : choice } }))}
            />
          ) : (
            <TrueFalseQuestion
              statements={question.statements ?? []}
              values={draft?.tf ?? [null, null, null, null]}
              onSet={(statement, value) =>
                setDrafts((previous) => ({ ...previous, [question.itemId]: { tf: [0, 1, 2, 3].map((slot) => (slot === statement ? value : (draft?.tf?.[slot] ?? null))) } }))
              }
            />
          )}
          <div>
            <Button onClick={() => void check()} disabled={busy || !ready || quota}>
              {busy ? "Đang chấm…" : "Kiểm tra"}
            </Button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-accent">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {error}
            {quota && (
              <>
                {" "}
                <Link href={examPaths.hub} className="underline">
                  Xem Gói luyện thi
                </Link>
              </>
            )}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIndex(index - 1)} disabled={index === 0}>
            Câu trước
          </Button>
          <Button variant="secondary" onClick={() => setIndex(index + 1)} disabled={index + 1 === questions.length}>
            Câu tiếp
          </Button>
        </div>
        <Button variant={checkedCount === questions.length ? "primary" : "secondary"} onClick={() => void finish()} disabled={busy || checkedCount === 0}>
          Kết thúc, xem tổng kết
        </Button>
      </div>
      {!signedIn && <p className="text-xs text-muted-foreground">Em chưa đăng nhập nên câu sai chưa được lưu vào sổ câu sai.</p>}
    </div>
  );
}
