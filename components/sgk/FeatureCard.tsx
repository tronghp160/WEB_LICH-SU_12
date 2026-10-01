import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Lesson } from "@/lib/lessons/types";

/**
 * Thẻ "Chuyên đề tương tác" (bản đồ diễn biến, ảnh tư liệu, video…) đặt trong mục bài tương ứng. Chữ nằm trên nền
 * phẳng cạnh ảnh (không đè chữ lên ảnh sáng — V-14).
 */
export function FeatureCard({ lesson, compact }: { lesson: Lesson; compact?: boolean }) {
  return (
    <Link
      href={`/bai-hoc/${lesson.slug}`}
      className="group flex overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow hover:border-accent hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh đã nén trong public/ */}
      <img
        src={lesson.hero.src}
        alt=""
        loading="lazy"
        className={compact ? "h-auto w-24 shrink-0 object-cover" : "hidden w-40 shrink-0 object-cover sm:block md:w-56"}
      />
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Chuyên đề tương tác
        </span>
        <span className="font-serif text-lg font-bold text-foreground">{lesson.title}</span>
        <span className="text-sm font-medium text-gold-deep">{lesson.dateText}</span>
        {!compact && <span className="text-sm text-muted-foreground">{lesson.copy.cardDescription}</span>}
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
          Mở chuyên đề
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
