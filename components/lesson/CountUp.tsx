"use client";

import { useEffect, useRef, useState } from "react";
import { easeInOut } from "@/lib/battles/animation";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

const DURATION_MS = 1600;
const format = (value: number) => value.toLocaleString("vi-VN");

/**
 * Con số đếm từ 0 lên khi cuộn tới. HTML từ server đã có sẵn số cuối (đúng cả khi chưa chạy JS / với trình đọc màn hình);
 * Trình đọc màn hình chỉ đọc số cuối (bản `sr-only`), không đọc các số trung gian.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || typeof IntersectionObserver === "undefined") return;
    let frameId = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      let startedAt: number | null = null;
      const tick = (now: number) => {
        startedAt ??= now;
        const t = Math.min(1, (now - startedAt) / DURATION_MS);
        setShown(Math.round(value * easeInOut(t)));
        if (t < 1) frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [value, reducedMotion]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
