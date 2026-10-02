"use client";

import { Check, Circle, CircleDashed } from "lucide-react";
import { useProgress } from "@/lib/hooks/useProgress";
import { lessonCompletion } from "@/lib/progress/progress";
import type { SgkLesson } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

/**
 * Trạng thái học của một bài trên máy này: chưa học / đang học x% / đã học (đọc tới mọi mục).
 * Lúc dựng ở server chưa đọc được trình duyệt → hiện "chưa học" mờ, không nhảy bố cục.
 */
export function LessonProgressBadge({ lesson, className }: { lesson: SgkLesson; className?: string }) {
  const progress = useProgress();
  const completion = progress ? lessonCompletion(progress, lesson.slug, lesson.sections.map((section) => section.id)) : 0;
  const percent = Math.round(completion * 100);

  if (percent >= 100) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-sm font-medium text-success", className)}>
        <Check className="h-4 w-4" aria-hidden="true" />
        Đã học
      </span>
    );
  }
  if (percent > 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-sm font-medium text-[var(--topic,var(--foreground))]", className)}>
        <CircleDashed className="h-4 w-4" aria-hidden="true" />
        Đang học {percent}%
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm text-muted-foreground", progress ? "" : "opacity-0", className)}>
      <Circle className="h-4 w-4" aria-hidden="true" />
      Chưa học
    </span>
  );
}

/** Số bài đã đọc hết / tổng số bài, cho thanh tiến độ ở đầu trang mục lục. */
export function useLessonsDone(lessons: readonly SgkLesson[]): { done: number; started: number } | null {
  const progress = useProgress();
  if (!progress) return null;
  let done = 0;
  let started = 0;
  for (const lesson of lessons) {
    const completion = lessonCompletion(progress, lesson.slug, lesson.sections.map((section) => section.id));
    if (completion >= 1) done += 1;
    else if (completion > 0) started += 1;
  }
  return { done, started };
}
