import { BookOpen } from "lucide-react";
import Link from "next/link";
import type { AttemptRef } from "@/lib/exams/attempt";
import { trapLabels, type TrapKind } from "@/lib/exams/items";
import { knowledgeLocation } from "@/lib/exams/review-hints";

/** Nhãn kiểu bẫy của lựa chọn / ý sai ("Đánh tráo thời gian"…). */
export function TrapBadge({ trap }: { trap: TrapKind | null | undefined }) {
  if (!trap) return null;
  return (
    <span className="ml-1 inline-flex items-center rounded-full border border-gold/60 bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold-deep" data-testid="trap-badge">
      {trapLabels[trap]}
    </span>
  );
}

/** "Kiến thức này ở: Bài 7 › Mục 3. …" — liên kết tới đúng mục của trang Bài; câu lớp 11 chỉ ghi chữ. */
export function LocationLine({
  refInfo,
  fallbackLesson,
  prefix = "Kiến thức này ở:",
}: {
  refInfo: Partial<Pick<AttemptRef, "lessonSlug" | "sectionId" | "ref">>;
  fallbackLesson: string | null;
  prefix?: string;
}) {
  const location = knowledgeLocation({ lessonSlug: refInfo.lessonSlug ?? null, sectionId: refInfo.sectionId ?? null, ref: refInfo.ref ?? null }, fallbackLesson);
  if (!location) return null;
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {prefix}{" "}
      {location.href ? (
        <Link href={location.href} className="text-accent underline" data-testid="knowledge-link">
          {location.label}
        </Link>
      ) : (
        <span className="text-foreground">{location.label}</span>
      )}
    </span>
  );
}
