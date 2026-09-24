"use client";

import { cn } from "@/lib/utils/cn";

export type TopicFilterOption = {
  slug: string;
  name: string;
  eventCount: number;
};

type TopicFilterProps = {
  topics: TopicFilterOption[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
};

/**
 * Bộ lọc chủ đề chọn nhiều: mỗi chủ đề là một nút bật/tắt (`aria-pressed`) nên
 * dùng được bằng bàn phím và đọc được bằng trình đọc màn hình. Không chọn chủ
 * đề nào = hiện tất cả.
 */
export function TopicFilter({ topics, selected, onToggle, onClear }: TopicFilterProps) {
  return (
    <div role="group" aria-label="Lọc theo chủ đề" className="flex flex-wrap items-center gap-2">
      {topics.map((topic) => {
        const isSelected = selected.includes(topic.slug);
        return (
          <button
            key={topic.slug}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(topic.slug)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
              isSelected
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface text-surface-foreground hover:bg-muted",
            )}
          >
            <span>{topic.name}</span>
            <span aria-hidden="true" className={isSelected ? "opacity-80" : "text-muted-foreground"}>
              {topic.eventCount}
            </span>
            <span className="sr-only">({topic.eventCount} sự kiện)</span>
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="min-h-9 rounded-full px-3 py-1 text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}
