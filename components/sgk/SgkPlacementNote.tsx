import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getCurriculum } from "@/lib/queries/sgk";
import { placementsForEvent, sgkPaths } from "@/lib/sgk/curriculum";

/** Khối "Trong SGK" ở đầu trang sự kiện (mục 6.9): sự kiện thuộc Bài nào, mục nào — kèm lối về bài. */
export async function SgkPlacementNote({ eventSlug }: { eventSlug: string }) {
  const placements = placementsForEvent(eventSlug, (await getCurriculum()).lessons);
  if (placements.length === 0) return null;
  return (
    <aside aria-label="Vị trí trong sách giáo khoa" className="mt-5 flex max-w-3xl flex-col gap-2">
      {placements.map(({ lesson, section }) => (
        <Link
          key={`${lesson.slug}-${section.id}`}
          href={sgkPaths.section(lesson.slug, section.id)}
          data-topic-color={lesson.topic.color}
          className="group flex items-center gap-3 rounded-card border border-border border-l-4 border-l-[var(--topic)] bg-surface-raised px-4 py-3 text-sm hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <BookOpen className="h-5 w-5 shrink-0 text-[var(--topic)]" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-foreground">Trong SGK: Bài {lesson.number}</span>
            <span className="text-muted-foreground">
              {" "}
              · mục {section.numeral}. {section.title}
            </span>
          </span>
          <span className="shrink-0 font-medium text-accent group-hover:underline">Học bài này</span>
        </Link>
      ))}
    </aside>
  );
}
