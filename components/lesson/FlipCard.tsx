"use client";

import { RotateCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type FlipCardProps = {
  front: ReactNode;
  back: ReactNode;
  className?: string;
};

/**
 * Thẻ lật: bấm (hoặc Enter/Space) để lật. Tên của nút chính là chữ trên mặt đang hiện (mặt đang úp có `aria-hidden` và
 * `inert`), `aria-pressed` cho biết thẻ đã lật hay chưa.
 * Giảm chuyển động: đổi mặt ngay, không xoay (xem `.flip-card` trong globals.css).
 */
export function FlipCard({ front, back, className }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setFlipped((value) => !value)}
      aria-pressed={flipped}
      className={cn(
        "flip-card group block w-full rounded-card text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        flipped && "is-flipped",
        className,
      )}
    >
      <span className="flip-card__inner">
        <span className="flip-card__face" aria-hidden={flipped} inert={flipped}>
          {front}
          <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-medium text-accent">
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Bấm để lật
          </span>
        </span>
        <span className="flip-card__face flip-card__face--back" aria-hidden={!flipped} inert={!flipped}>
          {back}
          <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-medium text-accent">
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Bấm để lật lại
          </span>
        </span>
      </span>
    </button>
  );
}
