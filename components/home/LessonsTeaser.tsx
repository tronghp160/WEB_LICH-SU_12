import Link from "next/link";
import { InteractiveEntryGrid } from "@/components/lesson/InteractiveEntryGrid";
import { interactiveEntries } from "@/lib/lessons";

/** Mục "Bài học tương tác" ở trang chủ: bài học đầy đủ (có ảnh) và các trận tái hiện. */
export function LessonsTeaser() {
  return (
    <section aria-labelledby="bai-hoc-tuong-tac" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="bai-hoc-tuong-tac" className="font-serif text-2xl font-bold text-foreground">
          Bài học tương tác
        </h2>
        <Link href="/bai-hoc" className="text-sm font-medium text-accent hover:underline">
          Tất cả bài học
        </Link>
      </div>
      <InteractiveEntryGrid entries={interactiveEntries} />
    </section>
  );
}
