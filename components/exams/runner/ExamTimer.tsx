"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/exams/exam";
import { cn } from "@/lib/utils/cn";

/** Các mốc báo cho trình đọc màn hình (giây còn lại). Không phát âm thanh. */
const ALERTS = [10 * 60, 5 * 60, 60];

/**
 * Đồng hồ đếm ngược theo hạn nộp của server (đã dịch theo độ lệch giờ máy — localDeadline). Báo qua vùng aria-live ở
 * mốc 10, 5, 1 phút còn lại; đỏ ở phút cuối.
 */
export function ExamTimer({ remainingSeconds }: { remainingSeconds: number }) {
  const [announcement, setAnnouncement] = useState("");
  const announced = useRef(new Set<number>());

  useEffect(() => {
    for (const mark of ALERTS) {
      if (remainingSeconds <= mark && remainingSeconds > mark - 5 && !announced.current.has(mark)) {
        announced.current.add(mark);
        setAnnouncement(`Còn ${mark / 60} phút.`);
      }
    }
  }, [remainingSeconds]);

  return (
    <>
      <span
        className={cn("inline-flex items-center gap-1 font-mono text-base font-bold", remainingSeconds <= 60 ? "text-accent" : remainingSeconds <= 300 ? "text-gold-deep" : "text-foreground")}
        role="timer"
        aria-label={`Thời gian còn lại ${formatClock(remainingSeconds)}`}
      >
        <Clock className="h-4 w-4" aria-hidden="true" />
        {formatClock(remainingSeconds)}
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
