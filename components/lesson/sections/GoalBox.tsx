import { Callout } from "@/components/ui/Callout";
import type { Lesson } from "@/lib/lessons/types";

/** "Học xong bài này, em có thể…" — yêu cầu cần đạt theo SGK. */
export function GoalBox({ lesson }: { lesson: Lesson }) {
  return (
    <section aria-label="Yêu cầu cần đạt">
      <Callout variant="goal" title="Học xong chuyên đề này, em có thể…">
        <p className="mb-2 text-sm text-muted-foreground">
          {lesson.textbook.series} · {lesson.textbook.lesson}
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {lesson.textbook.objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Callout>
    </section>
  );
}
