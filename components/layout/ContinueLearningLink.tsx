"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { useProgress } from "@/lib/hooks/useProgress";
import { latestSgkLesson, lessonCompletion, type Progress } from "@/lib/progress/progress";
import { getSgkLesson, sgkPaths, type SgkLessonEntry, type SgkSection } from "@/lib/sgk/curriculum";

export type ContinueTarget = { lesson: SgkLessonEntry; section?: SgkSection; href: string; completion: number };

/** Bài đọc gần nhất trên máy này và mục đang dở (null: chưa học bài nào, hoặc bài đã bị đổi tên). */
export function continueTarget(progress: Progress | null): ContinueTarget | null {
  if (!progress) return null;
  const latest = latestSgkLesson(progress);
  const lesson = latest && getSgkLesson(latest.slug);
  if (!latest || !lesson) return null;
  const section = lesson.sections.find((item) => item.id === latest.record.lastSection);
  return {
    lesson,
    section,
    href: section ? sgkPaths.section(lesson.slug, section.id) : sgkPaths.lesson(lesson.slug),
    completion: lessonCompletion(progress, lesson.slug, lesson.sections.map((item) => item.id)),
  };
}

/** Dòng "Học tiếp: Bài 7 · Mục 3 (50%)" trong menu; chưa có tiến độ thì không hiện gì. */
export function ContinueLearningLink({ onNavigate }: { onNavigate?: () => void }) {
  const target = continueTarget(useProgress());
  if (!target) return <span />;
  return (
    <Link
      href={target.href}
      onClick={onNavigate}
      data-topic-color={target.lesson.topic.color}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-sm hover:border-[var(--topic)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
    >
      <PlayCircle className="h-4 w-4 text-[var(--topic)]" aria-hidden="true" />
      <span>
        <strong>Học tiếp:</strong> Bài {target.lesson.number}
        {target.section && ` · Mục ${target.section.numeral}`} ({Math.round(target.completion * 100)}%)
      </span>
    </Link>
  );
}
