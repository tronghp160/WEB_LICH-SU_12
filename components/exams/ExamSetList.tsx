"use client";

import { Clock, Hourglass, Lock, LockOpen, Sparkles, Stamp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { examPaths, examSetId, formatScore10 } from "@/lib/exams/exam";
import { examDifficultyLabels, THPT_2025_MCQ, THPT_2025_TRUE_FALSE } from "@/lib/exams/format";
import { roomKeys } from "@/lib/exams/room";
import { useHydrated, useLicense } from "@/lib/hooks/useLicense";
import { useProgress } from "@/lib/hooks/useProgress";
import { isPassing } from "@/lib/progress/progress";
import { cn } from "@/lib/utils/cn";

export type ExamSetCard = {
  slug: string;
  title: string;
  description: string | null;
  durationMin: number;
  questionCount: number | null;
  free: boolean;
  format: string;
  difficulty: number | null;
  publishedAt: string | null;
};

/** Đề công bố trong 14 ngày gần đây được gắn nhãn "Đề mới". */
const NEW_DAYS = 14;

/** Đề có lượt đang làm dở (chưa hết giờ) trên máy này — ghi bởi phòng thi (lib/exams/room.ts, roomKeys.active). */
function useActiveSlugs(): Set<string> {
  const [slugs, setSlugs] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(roomKeys.active) ?? "{}");
      const now = Date.now();
      const active = Object.entries(value && typeof value === "object" ? (value as Record<string, { deadline?: string | null }>) : {})
        .filter(([, entry]) => !entry?.deadline || Date.parse(entry.deadline) > now)
        .map(([slug]) => slug);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi hydrate
      setSlugs(new Set(active));
    } catch {
      // Không đọc được: không hiện nhãn.
    }
  }, []);
  return slugs;
}

/** Lưới đề luyện thi: đề miễn phí / đã mở khóa / còn khóa, kèm điểm cao nhất đã làm trên máy này. */
export function ExamSetList({ sets }: { sets: ExamSetCard[] }) {
  const license = useLicense();
  const progress = useProgress();
  const hydrated = useHydrated();
  const active = useActiveSlugs();
  const [now] = useState(() => Date.now());

  return (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
      {sets.map((set) => {
        const unlocked = set.free || Boolean(license);
        const record = progress?.quizzes[examSetId(set.slug)];
        const passed = record ? isPassing(record.best, record.total) : false;
        return (
          <li key={set.slug}>
            <Link
              href={examPaths.set(set.slug)}
              className="flex h-full flex-col gap-2 rounded-card border border-border bg-surface p-4 hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="font-serif text-lg font-semibold text-foreground">{set.title}</span>
                {set.free ? (
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Miễn phí</span>
                ) : hydrated ? (
                  <span
                    className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", unlocked ? "text-success" : "text-muted-foreground")}
                  >
                    {unlocked ? <LockOpen className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                    {unlocked ? "Đã mở" : "Trả phí"}
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap gap-1.5 text-xs">
                {set.format === "thpt_2025" && <span className="rounded-full bg-gold/20 px-2 py-0.5 font-medium text-foreground">{THPT_2025_MCQ} + {THPT_2025_TRUE_FALSE} câu · đúng cấu trúc đề thi</span>}
                {set.difficulty && (set.difficulty === 1 || set.difficulty === 2 || set.difficulty === 3) && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{examDifficultyLabels[set.difficulty]}</span>
                )}
                {set.publishedAt && now - Date.parse(set.publishedAt) < NEW_DAYS * 86_400_000 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    Đề mới
                  </span>
                )}
                {active.has(set.slug) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-2 py-0.5 font-medium text-foreground" data-testid="exam-card-in-progress">
                    <Hourglass className="h-3 w-3" aria-hidden="true" />
                    Đang làm dở
                  </span>
                )}
              </span>
              {set.description && <span className="text-sm text-muted-foreground">{set.description}</span>}
              <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {set.durationMin} phút{set.questionCount ? ` · ${set.questionCount} câu` : ""}
                </span>
                {record && (
                  <span className={cn("inline-flex items-center gap-1", passed && "font-medium text-foreground")}>
                    <Stamp className={cn("h-4 w-4", passed ? "text-accent" : "")} aria-hidden="true" />
                    Cao nhất: {formatScore10((record.best / record.total) * 10)} điểm
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
