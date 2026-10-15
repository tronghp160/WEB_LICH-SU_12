"use client";

import { ArrowDownRight, ArrowUpRight, BookOpen, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ScoreBars } from "@/components/exams/result/ScoreBars";
import { SolutionItem } from "@/components/exams/result/SolutionItem";
import { TimeBars } from "@/components/exams/result/TimeBars";
import { StampNotice } from "@/components/progress/StampNotice";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { kindRows, lessonRows, levelRows, matchesFilter, points, solutionFilterLabels, weakestLesson, type SolutionFilter } from "@/lib/exams/analytics";
import { attemptPaths, parseAttemptView, type AttemptView } from "@/lib/exams/attempt";
import { getBlueprint } from "@/lib/exams/blueprint";
import { regradedNumbers } from "@/lib/exams/quality";
import { DEVICE_HEADER, examPaths, formatScore10, generatedKey } from "@/lib/exams/exam";
import { formatDuration, parseHistory, previousAttempt, roomKeys, type HistoryEntry } from "@/lib/exams/room";
import { getDeviceId, useHydrated } from "@/lib/hooks/useLicense";
import { cn } from "@/lib/utils/cn";

type Load = { state: "loading" } | { state: "missing" } | { state: "open"; href: string } | { state: "ready"; view: AttemptView; previous: HistoryEntry | null };

const FILTERS: SolutionFilter[] = ["tat-ca", "sai", "bo-trong", "danh-dau"];

function Tile({ label, value, note, testId }: { label: string; value: string; note?: React.ReactNode; testId?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card border border-border bg-surface p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground" data-testid={testId}>
        {value}
      </span>
      {note && <span className="text-xs">{note}</span>}
    </div>
  );
}

/**
 * Trang kết quả một lượt (docs/ke-hoach-luyen-thi.md, mục 4.2). Chỉ chủ lượt xem được: tải qua API kèm mã thiết bị / phiên
 * đăng nhập. Điểm từng phần, so với lần trước (lịch sử trên máy), thứ hạng (khi đề đủ 30 lượt), phân tích theo bài / mức độ
 * / dạng / thời gian, lời giải có bộ lọc.
 */
export function ExamResult({ id, timedOut }: { id: string; timedOut: boolean }) {
  const hydrated = useHydrated();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [filter, setFilter] = useState<SolutionFilter>("tat-ca");

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetch(attemptPaths.attempt(id), { headers: { [DEVICE_HEADER]: getDeviceId() }, cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;
        if (cancelled) return;
        const view = body?.ok ? parseAttemptView(body) : null;
        if (!view) return setLoad({ state: "missing" });
        if (view.status !== "submitted" || view.score10 === null) return setLoad({ state: "open", href: view.set ? examPaths.set(view.set.slug) : view.blueprint ? examPaths.generated(view.blueprint) : examPaths.hub });
        let history: HistoryEntry[] = [];
        try {
          history = parseHistory(window.localStorage.getItem(roomKeys.history));
        } catch {
          // Không đọc được lịch sử: bỏ phần so sánh.
        }
        const key = view.set?.slug ?? (view.blueprint ? generatedKey(view.blueprint) : null);
        const previous = key && view.submittedAt ? previousAttempt(history, key, view.id, view.submittedAt) : null;
        setLoad({ state: "ready", view, previous });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "missing" });
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, id]);

  if (load.state === "loading") {
    return (
      <p className="rounded-card border border-border bg-surface p-6 text-muted-foreground" role="status">
        Đang tải kết quả…
      </p>
    );
  }
  if (load.state === "missing") {
    return (
      <Callout variant="warning" title="Không xem được kết quả này">
        Kết quả chỉ xem được trên máy (hoặc tài khoản) đã làm bài.{" "}
        <Link href={examPaths.hub} className="text-accent underline">
          Về danh sách đề
        </Link>
      </Callout>
    );
  }
  if (load.state === "open") {
    return (
      <Callout variant="info" title="Bài chưa nộp">
        Em vẫn đang làm bài này.{" "}
        <Link href={load.href} className="text-accent underline">
          Quay lại làm tiếp
        </Link>
      </Callout>
    );
  }

  const { view, previous } = load;
  const score10 = view.score10 ?? 0;
  const groups = view.groups ?? { sections: {}, lessons: {}, levels: {}, kinds: {} };
  const sections = Object.entries(groups.sections).sort(([a], [b]) => a.localeCompare(b));
  const used = view.submittedAt ? Date.parse(view.submittedAt) - Date.parse(view.startedAt) : null;
  const delta = previous ? Math.round((score10 - previous.score10) * 100) / 100 : null;
  const weakest = weakestLesson(groups.lessons);
  const times = view.questions.map((question) => view.answers[question.itemId]?.ms ?? 0);
  const counts = Object.fromEntries(FILTERS.map((key) => [key, view.questions.filter((question) => matchesFilter(key, question, view.answers[question.itemId])).length])) as Record<SolutionFilter, number>;
  const practice = view.mode === "practice" || view.mode === "review";
  const blueprint = view.blueprint ? getBlueprint(view.blueprint) : null;
  const regraded = regradedNumbers(view.questions, view.regradedItems);
  const againHref = view.set ? examPaths.set(view.set.slug) : blueprint ? examPaths.generated(blueprint.id) : null;
  // Câu chưa đạt tối đa (thi: kể cả bỏ trống; luyện tập: trong số câu đã kiểm tra) — như start_practice_attempt "retry".
  const retryable = view.questions.filter((question) => (practice ? question.checked : true) && (question.earnedMilli ?? 0) < (question.kind === "mcq" ? 250 : 1000)).length;
  const visible = view.questions.map((question, position) => ({ question, position })).filter(({ question }) => matchesFilter(filter, question, view.answers[question.itemId]));

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="ket-qua" className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <h2 id="ket-qua" className="font-serif text-xl font-bold text-foreground">
          Kết quả: {view.set?.title ?? (blueprint ? `Đề tự sinh — ${blueprint.label}` : view.mode === "review" ? "Ôn câu đến hạn" : "Luyện tập")}
        </h2>
        {timedOut && <p className="text-sm font-medium text-accent">Hết giờ — bài đã được tự nộp.</p>}
        {regraded.length > 0 && (
          <p className="text-sm font-medium text-info" data-testid="regraded-note">
            Điểm đã được cập nhật do sửa đáp án câu {regraded.join(", ")}.
          </p>
        )}
        <p className="font-serif text-5xl font-bold text-accent" data-testid="exam-score">
          {formatScore10(score10)} điểm
        </p>
        <p className="text-muted-foreground">
          Đạt điểm tối đa {view.correct}/{view.total} câu{view.unanswered ? ` · bỏ trống ${view.unanswered} câu` : ""}
        </p>
        {practice ? (
          <p className="text-sm text-muted-foreground">Điểm tính trên {view.total} câu em đã kiểm tra.</p>
        ) : (
          !blueprint && <StampNotice score={Math.round(score10 * 100)} total={1000} scale10 />
        )}
        {view.percentile !== null && <p className="text-sm text-foreground">Em cao hơn {view.percentile}% số lượt đã làm đề này.</p>}
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {againHref && (
            <LinkButton href={againHref}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {blueprint ? "Làm đề mới cùng dạng" : "Làm lại đề này"}
            </LinkButton>
          )}
          {retryable > 0 && (
            <LinkButton href={examPaths.retry(view.id)} variant={againHref ? "secondary" : "primary"}>
              Làm lại các câu sai ({retryable})
            </LinkButton>
          )}
          {practice && (
            <LinkButton href={examPaths.practice} variant="secondary">
              Luyện tiếp
            </LinkButton>
          )}
          {weakest?.href && (
            <LinkButton href={weakest.href} variant="secondary">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Ôn bài yếu nhất: {weakest.label.split(".")[0]}
            </LinkButton>
          )}
          <LinkButton href={examPaths.list} variant="secondary">
            Thi đề khác
          </LinkButton>
        </div>
      </section>

      <section aria-labelledby="tom-tat" className="flex flex-col gap-3">
        <h2 id="tom-tat" className="sr-only">
          Tóm tắt
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sections.map(([section, group]) => (
            <Tile
              key={section}
              label={section === "1" ? "Phần I — Trắc nghiệm" : "Phần II — Đúng/Sai"}
              value={`${formatScore10(points(group.earned))} / ${formatScore10(points(group.max))} điểm`}
              testId={`part-${section}`}
            />
          ))}
          {used !== null && <Tile label="Thời gian làm" value={formatDuration(used)} />}
          {previous && delta !== null && (
            <Tile
              label="So với lần trước"
              value={`${delta > 0 ? "+" : ""}${formatScore10(delta)} điểm`}
              note={
                <span className={cn("inline-flex items-center gap-0.5", delta >= 0 ? "text-success" : "text-accent")}>
                  {delta >= 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> : <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
                  lần trước {formatScore10(previous.score10)} điểm
                </span>
              }
            />
          )}
        </div>
      </section>

      <section aria-labelledby="phan-tich" className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5">
        <div>
          <h2 id="phan-tich" className="font-serif text-lg font-bold text-foreground">
            Phân tích
          </h2>
          <p className="text-sm text-muted-foreground">Tỉ lệ điểm đạt trên điểm tối đa của từng nhóm câu. Bài thấp nhất ở trên cùng.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ScoreBars title="Theo bài" rows={lessonRows(groups.lessons)} sorted />
          <div className="flex flex-col gap-6">
            <ScoreBars title="Theo mức độ" rows={levelRows(groups.levels)} />
            <ScoreBars title="Theo dạng câu" rows={kindRows(groups.kinds)} />
          </div>
        </div>
        <TimeBars times={times} />
      </section>

      <section aria-labelledby="giai-thich" className="flex flex-col gap-3">
        <h2 id="giai-thich" className="font-serif text-lg font-bold text-foreground">
          Đáp án và giải thích
        </h2>
        <div role="group" aria-label="Lọc câu" className="flex flex-wrap gap-2">
          {FILTERS.map((key) => (
            <Button key={key} type="button" size="sm" variant={filter === key ? "primary" : "secondary"} aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {solutionFilterLabels[key]} ({counts[key]})
            </Button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có câu nào trong mục này.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0" data-testid="solutions">
            {visible.map(({ question, position }) => (
              <SolutionItem
                key={question.itemId}
                question={question}
                position={position}
                answer={view.answers[question.itemId]}
                attemptId={!practice || question.checked ? view.id : undefined}
                regraded={view.regradedItems.includes(question.itemId)}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
