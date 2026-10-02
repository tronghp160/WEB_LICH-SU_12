"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutGrid, List, MapPin } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { EventCard } from "@/components/content/EventCard";
import { TopicFilter, type TopicFilterOption } from "@/components/timeline/TopicFilter";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TimelineEvent } from "@/lib/queries/events";
import { sgkPaths, type SgkPlacement } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";
import {
  TOPIC_FILTER_PARAM,
  buildFilterUrl,
  groupEventsByYear,
  parseTopicFilter,
  pickJumpTargets,
  toggleTopic,
  yearAnchorId,
} from "@/lib/utils/timeline";

type TimelineProps = {
  events: TimelineEvent[];
  /** Sự kiện → các bài/mục SGK chứa nó (tính ở server theo cách gán hiện hành). */
  placements: Record<string, SgkPlacement[]>;
  topics: TopicFilterOption[];
};

/**
 * Dòng thời gian (UC02): nhóm sự kiện theo năm trên một trục dọc, lọc chủ đề
 * nhiều lựa chọn và nhảy nhanh tới giai đoạn. Bộ lọc nằm trên URL
 * (`?chu-de=a,b`) để chia sẻ được; lọc chạy ngay trong trình duyệt trên dữ liệu
 * đã tải, và URL được cập nhật bằng `history.replaceState` (Next.js đồng bộ với
 * `useSearchParams`) nên không phát sinh thêm request tới server.
 */
export function Timeline({ events, topics, placements }: TimelineProps) {
  const pathname = usePathname();
  // Thu gọn: mỗi sự kiện một dòng (ngày · tên · Bài N) cho người muốn lướt nhanh (mục 6.8).
  const [compact, setCompact] = useState(false);
  const searchParams = useSearchParams();

  const selected = parseTopicFilter(
    searchParams.get(TOPIC_FILTER_PARAM),
    topics.map((topic) => topic.slug),
  );

  const visibleEvents =
    selected.length === 0
      ? events
      : events.filter((event) => event.topicSlugs.some((slug) => selected.includes(slug)));
  const groups = groupEventsByYear(visibleEvents);
  const jumpTargets = pickJumpTargets(groups);

  function updateFilter(next: string[]) {
    window.history.replaceState(null, "", buildFilterUrl(pathname, next));
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3">
        <TopicFilter
          topics={topics}
          selected={selected}
          onToggle={(slug) => updateFilter(toggleTopic(selected, slug))}
          onClear={() => updateFilter([])}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {selected.length > 0
              ? `Đang hiển thị ${visibleEvents.length} / ${events.length} sự kiện.`
              : `Tất cả ${events.length} sự kiện.`}
          </p>
          <div role="group" aria-label="Kiểu hiển thị" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
            {[
              { value: false, label: "Thẻ có ảnh", icon: LayoutGrid },
              { value: true, label: "Thu gọn", icon: List },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-pressed={compact === value}
                onClick={() => setCompact(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                  compact === value ? "bg-foreground text-background" : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {jumpTargets.length > 0 && (
        <nav
          aria-label="Nhảy nhanh tới giai đoạn"
          className="sticky top-16 z-30 -mx-4 mb-8 flex items-center gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
        >
          <span className="shrink-0 text-sm text-muted-foreground">Nhảy tới:</span>
          {jumpTargets.map((target) => (
            <a
              key={target.milestone}
              href={`#${yearAnchorId(target.year)}`}
              className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-surface px-3 text-sm font-medium text-surface-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {target.milestone}
            </a>
          ))}
        </nav>
      )}

      {groups.length === 0 ? (
        <EmptyState
          title="Không có sự kiện phù hợp"
          description="Chưa có sự kiện nào thuộc các chủ đề đã chọn. Hãy bỏ bớt bộ lọc để xem thêm."
          action={
            <Button variant="secondary" onClick={() => updateFilter([])}>
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <ol aria-label="Dòng thời gian các sự kiện lịch sử" className="ml-2">
          {groups.map((group) => {
            const headingId = `${yearAnchorId(group.year)}-tieu-de`;
            return (
              <li
                key={group.year}
                id={yearAnchorId(group.year)}
                aria-labelledby={headingId}
                className="relative scroll-mt-32 border-l-2 border-border pb-10 pl-6 last:pb-0 sm:pl-8"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[9px] top-2 h-4 w-4 rounded-full border-4 border-background bg-accent"
                />
                {/* Năm dính phía trên khi cuộn (dưới header và thanh "Nhảy tới"). */}
                <h2
                  id={headingId}
                  className="sticky top-[7.25rem] z-20 -ml-1 mb-4 inline-block rounded-md bg-background/95 py-1 pl-1 pr-3 font-serif text-3xl font-bold leading-none text-accent backdrop-blur sm:text-4xl"
                >
                  {group.year}
                </h2>
                {compact ? (
                  <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
                    {group.events.map((event) => (
                      <li key={event.slug} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
                        <span className="w-28 shrink-0 text-sm font-medium text-gold-deep">{event.dateText}</span>
                        <Link href={`/su-kien/${event.slug}`} className="min-w-0 flex-1 font-medium text-foreground hover:text-accent">
                          {event.title}
                        </Link>
                        <span className="flex gap-1.5">
                          {[...new Map((placements[event.slug] ?? []).map((item) => [item.lesson.slug, item])).values()].map(({ lesson, section }) => (
                            <Link
                              key={lesson.slug}
                              href={sgkPaths.section(lesson.slug, section.id)}
                              data-topic-color={lesson.topic.color}
                              className="rounded-md border border-[var(--topic)] px-1.5 text-xs font-semibold text-[var(--topic)] hover:bg-[var(--topic)] hover:text-background"
                            >
                              Bài {lesson.number}
                            </Link>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {group.events.map((event) => (
                    <li key={event.slug}>
                      <EventCard {...event} placements={placements[event.slug]}>
                        {event.primaryLocation && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{event.primaryLocation.name}</span>
                            </span>
                            <LinkButton
                              href={`/ban-do?su-kien=${event.slug}`}
                              variant="secondary"
                              size="sm"
                            >
                              Xem trên bản đồ
                              <span className="sr-only">: {event.title}</span>
                            </LinkButton>
                          </div>
                        )}
                      </EventCard>
                    </li>
                  ))}
                </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
