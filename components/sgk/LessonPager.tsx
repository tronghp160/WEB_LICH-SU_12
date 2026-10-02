import Link from "next/link";
import { ArrowLeft, ArrowRight, List } from "lucide-react";
import { adjacentLessons, sgkPaths } from "@/lib/sgk/curriculum";

/** Điều hướng cuối bài: ← Bài trước · Mục lục · Bài sau →. */
export function LessonPager({ slug }: { slug: string }) {
  const { previous, next } = adjacentLessons(slug);
  const cell =
    "flex flex-1 items-center gap-3 rounded-card border border-border bg-surface p-4 hover:border-border-strong hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";
  return (
    <nav aria-label="Bài trước, bài sau" className="flex flex-col gap-3 sm:flex-row print:hidden">
      {previous ? (
        <Link href={sgkPaths.lesson(previous.slug)} className={cell} data-topic-color={previous.topic.color}>
          <ArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Bài trước · Bài {previous.number}</span>
            <span className="block font-medium text-foreground">{previous.shortTitle}</span>
          </span>
        </Link>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
      <Link href={sgkPaths.toc} className={`${cell} justify-center sm:flex-none`}>
        <List className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium">Mục lục</span>
      </Link>
      {next ? (
        <Link href={sgkPaths.lesson(next.slug)} className={`${cell} justify-end text-right`} data-topic-color={next.topic.color}>
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Bài sau · Bài {next.number}</span>
            <span className="block font-medium text-foreground">{next.shortTitle}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      ) : (
        <span className="hidden flex-1 sm:block" />
      )}
    </nav>
  );
}
