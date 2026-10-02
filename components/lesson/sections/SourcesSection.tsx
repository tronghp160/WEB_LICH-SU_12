import { ArrowRight } from "lucide-react";
import { EditorNotes } from "@/components/lesson/EditorNotes";
import { LinkButton } from "@/components/ui/Button";
import type { Lesson } from "@/lib/lessons/types";
import { sgkPaths, type SgkPlacement } from "@/lib/sgk/curriculum";

/** Nguồn tham khảo, giấy phép, ghi chú biên soạn (chỉ cho người biên tập) và lối ra: trang sự kiện, bài SGK. */
export function SourcesSection({ lesson, placement }: { lesson: Lesson; placement?: SgkPlacement }) {
  return (
    <section aria-labelledby="nguon" className="border-t border-border pt-8">
      <h2 id="nguon" className="font-serif text-xl font-bold">
        Nguồn tham khảo và giấy phép
      </h2>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm">
        {lesson.battle.sources.map((source) => (
          <li key={source.title}>
            {source.title}
            {source.note && <span className="text-muted-foreground"> — {source.note}</span>}
          </li>
        ))}
        <li>Ảnh tư liệu và ảnh di tích: Wikimedia Commons, tác giả và giấy phép ghi dưới từng ảnh (bấm để xem trang gốc).</li>
        <li>Bản đồ nền: © OpenStreetMap contributors.</li>
      </ul>
      <EditorNotes items={lesson.toVerify} />
      <div className="mt-6 flex flex-wrap gap-2">
        <LinkButton href={`/su-kien/${lesson.eventSlug}`} variant="secondary">
          Xem trang sự kiện {lesson.title}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
        {placement && (
          <LinkButton href={sgkPaths.lesson(placement.lesson.slug)} variant="ghost">
            Về Bài {placement.lesson.number}
          </LinkButton>
        )}
      </div>
    </section>
  );
}
