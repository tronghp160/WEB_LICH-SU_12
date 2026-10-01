"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type TabItem = {
  id: string;
  label: ReactNode;
  /** Nhãn phụ nhỏ cạnh tên tab (số mục, dung lượng). */
  hint?: string;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  /** Tên nhóm tab cho trình đọc màn hình. */
  label: string;
  /** Tab mở sẵn; `null` = chưa mở tab nào (nội dung nặng chỉ tải khi người học chủ động chọn). */
  defaultValue?: string | null;
  className?: string;
};

/**
 * Nhóm tab theo mẫu WAI-ARIA (mũi tên trái/phải, Home/End). CHỈ dựng nội dung của tab đang mở: chuyển tab là gỡ hẳn
 * trình xem cũ (video, 3D) → mỗi lúc chỉ một trình xem nặng chạy.
 */
export function Tabs({ items, label, defaultValue, className }: TabsProps) {
  const baseId = useId();
  const [active, setActive] = useState<string | null>(defaultValue === undefined ? (items[0]?.id ?? null) : defaultValue);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    const target =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (target < 0) return;
    event.preventDefault();
    setActive(items[target].id);
    tabRefs.current[target]?.focus();
  }

  const activeItem = items.find((item) => item.id === active);
  const focusable = active ?? items[0]?.id;

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((item, index) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={item.id === focusable ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
                selected ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {item.hint && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.hint}</span>}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
          className="pt-6 focus-visible:outline-none"
        >
          {activeItem.content}
        </div>
      ) : (
        <p className="pt-6 text-sm text-muted-foreground">Chọn một mục ở trên để mở. Tư liệu chỉ tải khi em mở.</p>
      )}
    </div>
  );
}
