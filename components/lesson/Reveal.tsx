"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Trễ (ms) để các phần tử trong cùng nhóm hiện lần lượt. */
  delay?: number;
  as?: "div" | "li" | "section";
};

/**
 * Hiện dần khi cuộn tới (IntersectionObserver). Trạng thái ẩn chỉ áp dụng khi trình duyệt chạy JavaScript và người dùng
 * không bật "giảm chuyển động" (xem `.reveal` trong globals.css) — nội dung không bao giờ bị giấu vĩnh viễn.
 */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    // Trình duyệt quá cũ không có IntersectionObserver cũng không hỗ trợ `@media (scripting)` → CSS không ẩn gì cả.
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
