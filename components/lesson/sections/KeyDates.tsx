import { SectionHeading } from "@/components/lesson/sections/shared";
import { Card } from "@/components/ui/Card";
import type { Lesson } from "@/lib/lessons/types";

/** "Những mốc cần nhớ": các mốc thời gian chính của chuyên đề. */
export function KeyDates({ lesson }: { lesson: Lesson }) {
  return (
    <section aria-labelledby="moc-thoi-gian">
      <SectionHeading id="moc-thoi-gian" eyebrow="Dòng thời gian" title="Những mốc cần nhớ" />
      <ol className="lesson-timeline grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {lesson.keyDates.map((item) => (
          <li key={item.date} className="lesson-timeline__item">
            <Card className="h-full p-4">
              <p className="font-serif text-lg font-bold text-accent">{item.date}</p>
              <p className="mt-1 text-sm text-surface-foreground">{item.text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
