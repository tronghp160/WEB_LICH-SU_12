"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/** Đã xem (hoặc bỏ qua) hướng dẫn lần đầu trên trình duyệt này. */
export const COACH_MARKS_KEY = "ls12:da-xem-huong-dan";

const STEPS = [
  {
    target: "muc-luc-sgk",
    title: "Đây là mục lục SGK",
    text: "6 chủ đề, 17 bài đúng như sách. Bấm vào bài em đang học trên lớp; bài có dấu ✦ có thêm chuyên đề tương tác.",
  },
  {
    target: "hoc-tiep",
    title: "Học tiếp ở đây",
    text: "Web tự nhớ em đã đọc tới mục nào. Lần sau mở web, nút này đưa em về đúng chỗ đang học dở.",
  },
  {
    target: "em-muon-lam-gi",
    title: "Ôn tập và nhận con dấu",
    text: "Làm trắc nghiệm sau mỗi bài; đạt từ 7/10 câu em được đóng dấu vào Hộ chiếu lịch sử.",
  },
];

type Box = { top: number; left: number; width: number; height: number };

function hasSeen(): boolean {
  try {
    return window.localStorage.getItem(COACH_MARKS_KEY) !== null;
  } catch {
    // Không lưu được thì cũng không làm phiền mỗi lần mở trang.
    return true;
  }
}

/**
 * Hướng dẫn lần đầu (mục 6.11): tối đa 3 bước, bỏ qua được, nhớ bằng localStorage. Tự viết (không thêm thư viện):
 * khung viền quanh phần tử được giới thiệu + một hộp nhỏ cạnh nó. Esc để đóng.
 */
export function CoachMarks() {
  const [step, setStep] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasSeen()) return;
    const timer = window.setTimeout(() => setStep(0), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(COACH_MARKS_KEY, new Date().toISOString());
    } catch {
      // bỏ qua
    }
    setStep(null);
  }, []);

  const measure = useCallback(() => {
    if (step === null) return;
    const element = document.getElementById(STEPS[step].target);
    if (!element) return setBox(null);
    const rect = element.getBoundingClientRect();
    setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  }, [step]);

  // Đổi bước: cuộn phần tử vào giữa màn hình rồi đo vị trí; đo lại khi cuộn/đổi cỡ cửa sổ.
  useLayoutEffect(() => {
    if (step === null) return;
    const target = document.getElementById(STEPS[step].target);
    // Phần tử cao quá thì cuộn cho đầu phần tử lên trên; còn lại đặt giữa màn hình.
    const block = target && target.offsetHeight > window.innerHeight * 0.5 ? "start" : "center";
    target?.scrollIntoView({ block, behavior: reducedMotion ? "auto" : "smooth" });
    // Đo ở khung hình kế tiếp (sau khi cuộn bắt đầu); cuộn mượt thì sự kiện "scroll" đo tiếp.
    const frame = window.requestAnimationFrame(measure);
    cardRef.current?.focus();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [step, measure, reducedMotion]);

  useEffect(() => {
    if (step === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, finish]);

  if (step === null) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  // Hộp nằm dưới phần tử nếu đủ chỗ, không thì nằm trên; luôn trong màn hình.
  const cardWidth = 320;
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const left = box ? Math.min(Math.max(12, box.left), viewportWidth - Math.min(cardWidth, viewportWidth - 24) - 12) : 12;
  // Phần tử cao hơn nửa màn hình (mục lục trên điện thoại): hộp nằm ở cuối màn hình, trên thanh tab, không che đầu phần tử.
  const tall = box !== null && box.height > viewportHeight * 0.5;
  const below = !box || box.top + box.height + 220 < viewportHeight;
  const top = !box
    ? 80
    : tall
      ? viewportHeight - 280
      : below
        ? Math.min(box.top + box.height + 12, viewportHeight - 200)
        : Math.max(12, box.top - 212);

  return (
    <>
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 rounded-card ring-4 ring-gold shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
          // Đặt vị trí bằng transform (không phải top/left): khung đi theo phần tử khi cuộn mà không tính là "nhảy bố cục" (CLS).
          style={{ transform: `translate(${box.left - 6}px, ${box.top - 6}px)`, width: box.width + 12, height: box.height + 12 }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="coach-title"
        aria-describedby="coach-text"
        tabIndex={-1}
        className="fixed left-0 top-0 z-50 rounded-card border border-border bg-surface p-4 text-surface-foreground shadow-2xl focus-visible:outline-none"
        style={{ transform: `translate(${left}px, ${top}px)`, width: `min(${cardWidth}px, calc(100vw - 24px))`, visibility: box ? "visible" : "hidden" }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">
            Hướng dẫn nhanh · {step + 1}/{STEPS.length}
          </p>
          <button
            type="button"
            onClick={finish}
            aria-label="Đóng hướng dẫn"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <h2 id="coach-title" className="mt-1 font-serif text-lg font-bold">
          {current.title}
        </h2>
        <p id="coach-text" className="mt-1 text-sm text-muted-foreground">
          {current.text}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={finish} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {last ? "Bắt đầu học" : "Tiếp"}
          </button>
        </div>
      </div>
    </>
  );
}
