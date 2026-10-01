import { Quote } from "lucide-react";
import { CountUp } from "@/components/lesson/CountUp";
import { Credit, SectionHeading } from "@/components/lesson/sections/shared";
import { Card } from "@/components/ui/Card";
import { SafeImage } from "@/components/ui/SafeImage";
import type { Lesson } from "@/lib/lessons/types";

/** Kết quả (số liệu), ảnh toàn cảnh, ý nghĩa lịch sử và câu trích. */
export function ResultsSection({ lesson }: { lesson: Lesson }) {
  return (
    <section aria-labelledby="ket-qua">
      <SectionHeading
        id="ket-qua"
        eyebrow="Kết quả và ý nghĩa"
        title={lesson.copy.resultsTitle}
      />
      {lesson.results.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-3">
          {lesson.results.map((stat) => (
            <li key={stat.label}>
              <Card className="h-full p-5 text-center">
                <span className="block font-serif text-5xl font-bold text-accent">
                  <CountUp value={stat.value} />
                  {stat.suffix}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {stat.label}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {lesson.resultsImage && !lesson.resultsImage.depthSrc && (
        <figure className="mt-8 overflow-hidden rounded-card border border-border bg-surface">
          <SafeImage
            src={lesson.resultsImage.src}
            alt={lesson.resultsImage.alt}
            className="max-h-[32rem] w-full object-cover"
            fallbackClassName="aspect-[16/9]"
          />
          <figcaption className="p-3 text-sm text-surface-foreground">
            {lesson.resultsImage.caption}{" "}
            <span className="text-xs text-muted-foreground">
              (<Credit image={lesson.resultsImage} />)
            </span>
          </figcaption>
        </figure>
      )}
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {lesson.significance.map((item) => (
          <li key={item.title}>
            <Card className="h-full border-l-4 border-l-gold p-5">
              <h3 className="font-serif text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-surface-foreground">{item.text}</p>
            </Card>
          </li>
        ))}
      </ul>
      {lesson.quote && (
        <figure className="mx-auto mt-8 max-w-2xl text-center">
          <Quote className="mx-auto h-8 w-8 text-gold" aria-hidden="true" />
          <blockquote className="mt-2 whitespace-pre-line font-serif text-2xl italic text-foreground">
            {lesson.quote.text}
          </blockquote>
          <figcaption className="mt-2 text-sm text-muted-foreground">
            — {lesson.quote.author}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
