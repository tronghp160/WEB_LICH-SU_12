"use client";

import { useEffect, useRef } from "react";
import { saveLessonStudied } from "@/lib/hooks/useProgress";

/**
 * Điểm mốc vô hình đặt ở phần ôn tập cuối bài: cuộn tới đây nghĩa là đã đi hết bài học → ghi "đã học" vào tiến độ
 * (Hộ chiếu lịch sử). Không hiện gì, không chặn gì.
 */
export function LessonStudiedMarker({ slug }: { slug: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        saveLessonStudied(slug);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [slug]);

  return <div ref={ref} aria-hidden="true" className="h-px" />;
}
