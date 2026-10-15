import { BookOpen, Flag } from "lucide-react";
import Link from "next/link";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import type { AttemptQuestion } from "@/lib/exams/attempt";
import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { formatScore10 } from "@/lib/exams/exam";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

const fullMilli = (question: AttemptQuestion) => (question.kind === "mcq" ? 250 : 1000);

/** Một câu trong phần "Đáp án và giải thích" (sau khi nộp — server đã trả đáp án, lời giải từng ý, điểm từng câu). */
export function SolutionItem({ question, position, answer }: { question: AttemptQuestion; position: number; answer: ItemAnswer | undefined }) {
  const earned = question.earnedMilli ?? 0;
  const right = earned === fullMilli(question);
  const lesson = question.lessonSlug ? getSgkLesson(question.lessonSlug) : undefined;
  const chosen = answer?.choice;
  return (
    <li className={cn("flex flex-col gap-2 rounded-card border bg-surface p-4", right ? "border-success/60" : "border-accent/60")}>
      {question.passage && <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />}
      <p className="whitespace-pre-line font-medium text-foreground">
        <span className={cn("mr-1 font-bold", right ? "text-success" : "text-accent")}>Câu {position + 1}.</span>
        {question.stem}
      </p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {formatScore10(earned / 1000)} / {formatScore10(fullMilli(question) / 1000)} điểm
        </span>
        {answer?.flagged && (
          <span className="inline-flex items-center gap-1 text-gold-deep">
            <Flag className="h-3 w-3 fill-gold" aria-hidden="true" />
            Em đã đánh dấu
          </span>
        )}
      </p>
      {question.kind === "mcq" && question.choices && question.correctIndex !== null ? (
        <p className="text-sm text-muted-foreground">
          {typeof chosen !== "number" ? "Em bỏ trống. " : right ? "Em chọn đúng. " : `Em chọn ${CHOICE_LETTERS[chosen]}. ${question.choices[chosen]}. `}
          Đáp án đúng:{" "}
          <strong className="text-success">
            {CHOICE_LETTERS[question.correctIndex]}. {question.choices[question.correctIndex]}
          </strong>
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {(question.statements ?? []).map((statement, slot) => {
            const truth = question.truths?.[slot];
            const given = answer?.tf?.[slot];
            return (
              <li key={slot} className="text-foreground">
                <strong>{STATEMENT_LETTERS[slot]})</strong> {statement} —{" "}
                <span className={given === truth ? "font-medium text-success" : "font-medium text-accent"}>
                  {truth ? "Đúng" : "Sai"}
                  {given === undefined || given === null ? " (em bỏ trống)" : given === truth ? " (em đúng)" : " (em chọn sai)"}
                </span>
                {question.statementExplanations?.[slot] && <span className="block text-muted-foreground">{question.statementExplanations[slot]}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {question.explanation && <p className="text-sm text-foreground">{question.explanation}</p>}
      {(lesson || question.eventSlug) && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {lesson && (
            <Link href={sgkPaths.lesson(lesson.slug)} className="inline-flex items-center gap-1 text-accent underline">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Bài {lesson.number}. {lesson.shortTitle}
            </Link>
          )}
          {question.eventSlug && (
            <Link href={`/su-kien/${question.eventSlug}`} className="text-accent underline">
              Sự kiện: {question.eventTitle ?? question.eventSlug}
            </Link>
          )}
        </p>
      )}
    </li>
  );
}
