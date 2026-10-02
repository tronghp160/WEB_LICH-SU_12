"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { saveSectionRead, useProgress } from "@/lib/hooks/useProgress";
import { cn } from "@/lib/utils/cn";

export type SectionNavItem = {
  id: string;
  label: string;
  /** "1", "2"… cho mục SGK; không có với phần phụ (Mở đầu, Luyện tập). */
  numeral?: string;
  /** Mục SGK được tính vào tiến độ đọc. */
  tracked?: boolean;
};

/** Dưới header (64px) + thanh mục lục trên điện thoại (~48px). */
const ACTIVE_OFFSET = 128;

/** Mục đang đọc: mục cuối cùng có đầu mục đã cuộn qua mép trên; cuộn hết trang thì là mục cuối. */
function findActive(ids: readonly string[]): string | undefined {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom) return ids[ids.length - 1];
  let active: string | undefined = ids[0];
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element && element.getBoundingClientRect().top <= ACTIVE_OFFSET) active = id;
  }
  return active;
}

/**
 * Mục lục trong bài (mục 6.4): cột trái dính trên desktop, thanh dính "Mục 2 ▾" trên điện thoại. Tô sáng mục đang đọc
 * và ghi tiến độ đọc theo mục vào trình duyệt (lib/hooks/useProgress).
 */
export function SectionNav({
  lessonSlug,
  items,
  title,
  variant,
}: {
  lessonSlug: string;
  items: SectionNavItem[];
  title: string;
  /** "mobile": thanh dính phải nằm trực tiếp trong khối bao cả bài (sticky chỉ dính trong phần tử cha). */
  variant: "mobile" | "desktop";
}) {
  const [active, setActive] = useState<string | undefined>(items[0]?.id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const progress = useProgress();
  const readSections = progress?.sgk[lessonSlug]?.sections ?? {};

  useEffect(() => {
    const ids = items.map((item) => item.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      setActive(findActive(ids));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  // Đọc tới mục nào thì ghi mục đó (ghi lần đầu + "mục gần nhất" cho nút Học tiếp). Chỉ bản desktop ghi để không ghi hai lần;
  // trên điện thoại bản desktop vẫn được dựng (ẩn bằng CSS) nên vẫn ghi.
  useEffect(() => {
    if (variant !== "desktop") return;
    const item = items.find((entry) => entry.id === active);
    if (item?.tracked) saveSectionRead(lessonSlug, item.id);
  }, [active, items, lessonSlug, variant]);

  const activeItem = items.find((item) => item.id === active);

  const list = (onNavigate?: () => void) => (
    <ol className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = item.id === active;
        const isRead = item.tracked && Boolean(readSections[item.id]);
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={onNavigate}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "flex items-start gap-2 rounded-md border-l-2 py-1.5 pl-3 pr-2 text-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                isActive ? "border-[var(--topic)] bg-muted font-semibold text-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {item.numeral && <span className="w-4 shrink-0 font-serif font-bold text-[var(--topic)]">{item.numeral}</span>}
              <span className="flex-1">{item.label}</span>
              {isRead && <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="đã đọc" />}
            </a>
          </li>
        );
      })}
    </ol>
  );

  if (variant === "mobile") {
    return (
      <nav aria-label={`Mục lục ${title} (thu gọn)`} className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden print:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="section-nav-mobile"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-12 w-full items-center gap-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          <span className="text-muted-foreground">Đang đọc:</span>
          <span className="min-w-0 flex-1 truncate font-semibold">
            {activeItem?.numeral && `${activeItem.numeral}. `}
            {activeItem?.label}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", mobileOpen && "rotate-180")} aria-hidden="true" />
        </button>
        {mobileOpen && (
          <div id="section-nav-mobile" className="max-h-[60vh] overflow-y-auto pb-3">
            {list(() => setMobileOpen(false))}
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav aria-label={`Mục lục ${title}`} className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto lg:block print:hidden">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mục lục bài</p>
      {list()}
    </nav>
  );
}
