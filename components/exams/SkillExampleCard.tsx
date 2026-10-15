import Link from "next/link";
import { BookOpen } from "lucide-react";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import type { SkillExample } from "@/lib/exams/skills";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";

/** Một ví dụ trong chuyên đề kỹ năng: đề → em tự làm → mở "Đáp án và lời giải" (không cần JavaScript). */
export function SkillExampleCard({ example, number }: { example: SkillExample; number: number }) {
  const lesson = getSgkLesson(example.lesson);
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:p-5" data-testid={`vi-du-${example.id}`}>
      <h3 className="font-serif text-lg font-semibold text-foreground">Ví dụ {number}</h3>
      {example.passage && <PassageBlock passage={{ body: example.passage.body, source_citation: example.passage.source }} />}
      <p className="whitespace-pre-line font-medium text-foreground">{example.stem}</p>
      {example.kind === "mcq" ? (
        <ol className="m-0 flex list-none flex-col gap-1 p-0 text-foreground">
          {example.choices.map((choice, index) => (
            <li key={index}>
              <strong>{CHOICE_LETTERS[index]}.</strong> {choice}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1 p-0 text-foreground">
          {example.statements.map((statement, index) => (
            <li key={index}>
              <strong>{STATEMENT_LETTERS[index]})</strong> {statement.text}
            </li>
          ))}
        </ol>
      )}
      <details className="group rounded-lg border border-border bg-background p-3">
        <summary className="cursor-pointer font-semibold text-accent">Xem đáp án và lời giải</summary>
        {example.kind === "mcq" ? (
          <div className="mt-2 flex flex-col gap-1 text-sm text-foreground">
            <p className="font-semibold text-success">
              Đáp án: {CHOICE_LETTERS[example.correct]}. {example.choices[example.correct]}
            </p>
            <p>{example.why}</p>
          </div>
        ) : (
          <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-sm">
            {example.statements.map((statement, index) => (
              <li key={index} className="text-foreground">
                <strong>{STATEMENT_LETTERS[index]})</strong> <span className={statement.truth ? "font-semibold text-success" : "font-semibold text-accent"}>{statement.truth ? "Đúng" : "Sai"}</span>{" "}
                — {statement.why}
              </li>
            ))}
          </ul>
        )}
      </details>
      {lesson && (
        <Link href={sgkPaths.lesson(lesson.slug)} className="inline-flex items-center gap-1 self-start text-sm text-accent underline">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Ôn lại Bài {lesson.number}. {lesson.shortTitle}
        </Link>
      )}
    </li>
  );
}
