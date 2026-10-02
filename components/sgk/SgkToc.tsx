"use client";

import Link from "next/link";
import { useState } from "react";
import { LessonProgressBadge, useLessonsDone } from "@/components/sgk/LessonBadges";
import { LessonStatusBadge } from "@/components/sgk/LessonStatusBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useProgress } from "@/lib/hooks/useProgress";
import { lessonCompletion } from "@/lib/progress/progress";
import { lessonStatus, SGK_12, sgkLessons, sgkPaths, type SgkLessonStatus, type SgkTopic } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

type Filter = "all" | "feature" | "unread";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả bài" },
  { value: "feature", label: "Có chuyên đề tương tác" },
  { value: "unread", label: "Bài chưa học xong" },
];

/**
 * Mục lục SGK kiểu trang đầu cuốn sách (mục 6.2): chủ đề có màu gáy, số bài lớn, dòng chấm dẫn, trạng thái nội dung và
 * tiến độ học trên máy này. `topics` để dùng lại cho trang một chủ đề.
 */
export function SgkToc({
  topics = SGK_12,
  showFilters = true,
  statuses,
}: {
  topics?: SgkTopic[];
  showFilters?: boolean;
  /** Trạng thái nội dung từng bài tính ở server (theo cách gán sự kiện trong database); thiếu thì tính từ khung trong code. */
  statuses?: Record<string, SgkLessonStatus>;
}) {
  const statusOf = (lesson: SgkTopic["lessons"][number]) => statuses?.[lesson.slug] ?? lessonStatus(lesson);
  const [filter, setFilter] = useState<Filter>("all");
  const progress = useProgress();
  const lessonsInView = topics.flatMap((topic) => topic.lessons);
  const summary = useLessonsDone(lessonsInView);

  const visible = (lesson: SgkTopic["lessons"][number]) => {
    if (filter === "feature") return statusOf(lesson) === "ready";
    if (filter === "unread") {
      return !progress || lessonCompletion(progress, lesson.slug, lesson.sections.map((section) => section.id)) < 1;
    }
    return true;
  };

  return (
    <div>
      {showFilters && (
        <div className="mb-8 flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div role="group" aria-label="Lọc bài" className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                  filter === item.value ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex min-w-56 flex-col gap-1">
            <span className="text-sm text-muted-foreground">
              Tiến độ: <strong className="text-foreground">{summary?.done ?? 0}</strong>/{lessonsInView.length} bài đã học
              {summary && summary.started > 0 && ` · ${summary.started} bài đang học`}
            </span>
            <ProgressBar value={(summary?.done ?? 0) / lessonsInView.length} label="Số bài đã học xong" />
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-10">
        {topics.map((topic) => {
          const lessons = topic.lessons.filter(visible);
          if (lessons.length === 0) return null;
          return (
            <li key={topic.slug} data-topic-color={topic.color} className="break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-[var(--topic)] pb-2">
                <h2 className="font-serif text-lg font-bold text-[var(--topic)] sm:text-xl">
                  <Link href={sgkPaths.topic(topic.slug)} className="hover:underline">
                    <span className="mr-1 text-sm uppercase tracking-wide">Chủ đề {topic.number} ·</span> {topic.title}
                  </Link>
                </h2>
                <span className="text-sm text-muted-foreground">{topic.periods} tiết</span>
              </div>
              <ol className="mt-2 flex flex-col">
                {lessons.map((lesson) => (
                  <li key={lesson.slug} className="border-b border-border last:border-b-0">
                    <Link
                      href={sgkPaths.lesson(lesson.slug)}
                      className="group flex items-start gap-4 rounded-lg px-2 py-3 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sm:items-center"
                    >
                      <span className="w-14 shrink-0 font-serif text-sm text-muted-foreground sm:w-16">
                        Bài <span className="text-2xl font-bold text-[var(--topic)]">{lesson.number}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="font-medium text-foreground group-hover:text-accent">{lesson.title}</span>
                        <span aria-hidden="true" className="hidden min-w-6 flex-1 translate-y-1 border-b-2 border-dotted border-border-strong sm:block" />
                        <span className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
                          <LessonStatusBadge status={statusOf(lesson)} compact />
                          <LessonProgressBadge lesson={lesson} className="min-w-28" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
      {filter !== "all" && topics.every((topic) => topic.lessons.filter(visible).length === 0) && (
        <p className="mt-6 text-muted-foreground">Không có bài nào khớp bộ lọc này.</p>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span>Tổng cộng {sgkLessons.length} bài. Chú giải:</span>
        <LessonStatusBadge status="ready" />
        <LessonStatusBadge status="partial" />
        <LessonStatusBadge status="drafting" />
      </div>
    </div>
  );
}
