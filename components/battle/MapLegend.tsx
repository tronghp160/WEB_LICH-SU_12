"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { BookKey, Pin, PinOff, X } from "lucide-react";
import type { LegendItem } from "@/lib/battles/types";
import { cn } from "@/lib/utils/cn";

const PIN_KEY = "ls12:ghim-chu-giai";
const PIN_EVENT = "ls12:ghim-chu-giai-doi";

function readPinned(): boolean {
  try {
    return window.localStorage.getItem(PIN_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(PIN_EVENT, onChange);
  return () => window.removeEventListener(PIN_EVENT, onChange);
}

/**
 * Chú giải nổi ngay trên bản đồ (V-26): bấm "Chú giải" để mở, không phải cuộn qua lại giữa bản đồ và bảng ký hiệu.
 * Trên màn hình rộng có thể ghim để luôn mở (nhớ trong trình duyệt). Esc để đóng.
 */
export function MapLegend({ items }: { items: LegendItem[] }) {
  const panelId = useId();
  const pinned = useSyncExternalStore(subscribe, readPinned, () => false);
  const [open, setOpen] = useState(false);
  const visible = open || pinned;

  useEffect(() => {
    if (!open || pinned) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pinned]);

  function setPinned(value: boolean) {
    try {
      window.localStorage.setItem(PIN_KEY, value ? "1" : "0");
    } catch {
      // Không lưu được: chỉ đổi trong lần xem này.
    }
    setOpen(value);
    window.dispatchEvent(new Event(PIN_EVENT));
  }

  return (
    <div className="pointer-events-none absolute right-2 top-2 z-[1000] flex max-w-[calc(100%-4.5rem)] flex-col items-end gap-2">
      <button
        type="button"
        aria-expanded={visible}
        aria-controls={panelId}
        onClick={() => (pinned ? setPinned(false) : setOpen((value) => !value))}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-sm font-medium text-foreground shadow-card hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <BookKey className="h-4 w-4 text-gold-deep" aria-hidden="true" />
        Chú giải
      </button>
      {visible && (
        <div
          id={panelId}
          role="region"
          aria-label="Chú giải ký hiệu trên bản đồ"
          className="pointer-events-auto max-h-[16rem] w-72 max-w-full overflow-y-auto rounded-card border border-border bg-surface/95 p-3 text-sm text-surface-foreground shadow-xl backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-semibold">Ký hiệu</span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPinned(!pinned)}
                aria-pressed={pinned}
                className="hidden items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold lg:inline-flex"
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Pin className="h-3.5 w-3.5" aria-hidden="true" />}
                {pinned ? "Bỏ ghim" : "Ghim"}
              </button>
              {!pinned && (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng chú giải"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
          <ul className="flex flex-col gap-2" aria-label="Chú giải">
            {items.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className={cn(item.className, "battle-legend-swatch shrink-0")} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
