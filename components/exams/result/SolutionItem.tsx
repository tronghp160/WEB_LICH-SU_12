import { BookOpen, CheckCircle2, Flag, Lightbulb, XCircle } from "lucide-react";
import Link from "next/link";
import { PassageBlock } from "@/components/exams/ExamItemPreview";
import { LocationLine, TrapBadge } from "@/components/exams/KnowledgeRef";
import { ReportItemButton } from "@/components/exams/ReportItemButton";
import type { AttemptQuestion } from "@/lib/exams/attempt";
import { CHOICE_LETTERS, STATEMENT_LETTERS } from "@/lib/exams/items";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { formatScore10 } from "@/lib/exams/exam";
import { questionLocation, relatedFeatures } from "@/lib/exams/review-hints";
import { cn } from "@/lib/utils/cn";

const fullMilli = (question: AttemptQuestion) => (question.kind === "mcq" ? 250 : 1000);

type Props = {
  question: AttemptQuestion;
  position: number;
  answer: ItemAnswer | undefined;
  /** Có thì hiện nút "Báo lỗi" (câu em đã thấy đáp án). */
  attemptId?: string;
  /** Câu đã được chấm lại sau khi sửa đáp án (GĐ7). */
  regraded?: boolean;
};

/**
 * Một câu trong phần "Đáp án và giải thích" (sau khi nộp — server đã trả đáp án, lời giải từng lựa chọn / từng ý, vị trí
 * kiến thức, điểm từng câu). Trắc nghiệm: "Vì sao sai" của lựa chọn em chọn, "Vì sao đúng", gập lời giải cả 4 lựa chọn.
 * Câu cũ chưa có lời giải từng lựa chọn → hiện như trước (em chọn … / đáp án đúng …).
 */
export function SolutionItem({ question, position, answer, attemptId, regraded }: Props) {
  const earned = question.earnedMilli ?? 0;
  const right = earned === fullMilli(question);
  const chosen = answer?.choice;
  const location = questionLocation(question);
  const features = relatedFeatures(question.lessonSlug, question.sectionId);
  const notes = question.choiceNotes;
  return (
    <li className={cn("flex flex-col gap-2 rounded-card border bg-surface p-4", right ? "border-success/60" : "border-accent/60")} data-testid="solution-item">
      {question.passage && <PassageBlock passage={{ body: question.passage.body, source_citation: question.passage.sourceCitation }} />}
      <p className="whitespace-pre-line font-medium text-foreground">
        <span className={cn("mr-1 font-bold", right ? "text-success" : "text-accent")}>Câu {position + 1}.</span>
        {question.stem}
      </p>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {formatScore10(earned / 1000)} / {formatScore10(fullMilli(question) / 1000)} điểm
        </span>
        {regraded && <span className="font-medium text-info">Đã chấm lại do sửa đáp án</span>}
        {answer?.flagged && (
          <span className="inline-flex items-center gap-1 text-gold-deep">
            <Flag className="h-3 w-3 fill-gold" aria-hidden="true" />
            Em đã đánh dấu
          </span>
        )}
      </p>
      {question.kind === "mcq" && question.choices && question.correctIndex !== null ? (
        notes ? (
          <div className="flex flex-col gap-2 text-sm">
            {typeof chosen === "number" && chosen !== question.correctIndex ? (
              <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2" data-testid="wrong-choice">
                <p className="flex items-start gap-1.5 font-medium text-accent">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Sai — em chọn {CHOICE_LETTERS[chosen]}. {question.choices[chosen]}
                  </span>
                </p>
                <p className="mt-1 text-foreground">
                  <strong>Vì sao sai:</strong> {notes[chosen].note}
                  <TrapBadge trap={notes[chosen].trap} />
                </p>
                <LocationLine refInfo={notes[chosen]} fallbackLesson={question.lessonSlug} />
              </div>
            ) : (
              typeof chosen !== "number" && <p className="text-muted-foreground">Em bỏ trống câu này.</p>
            )}
            <div className="rounded-lg border border-success/40 bg-success/5 px-3 py-2">
              <p className="flex items-start gap-1.5 font-medium text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {chosen === question.correctIndex ? "Đúng — em chọn" : "Đáp án đúng:"} {CHOICE_LETTERS[question.correctIndex]}. {question.choices[question.correctIndex]}
                </span>
              </p>
              <p className="mt-1 text-foreground">
                <strong>Vì sao đúng:</strong> {notes[question.correctIndex].note}
              </p>
              <LocationLine refInfo={notes[question.correctIndex]} fallbackLesson={question.lessonSlug} />
            </div>
            <details className="rounded-lg border border-border px-3 py-2">
              <summary className="cursor-pointer font-medium text-foreground">Xem giải thích cả 4 phương án</summary>
              <ol className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                {question.choices.map((choice, slot) => (
                  <li key={slot} className="flex flex-col">
                    <span className="text-foreground">
                      <strong>{CHOICE_LETTERS[slot]}.</strong> {choice} —{" "}
                      <span className={slot === question.correctIndex ? "font-medium text-success" : "font-medium text-accent"}>{slot === question.correctIndex ? "Đúng" : "Sai"}</span>
                      {slot !== question.correctIndex && <TrapBadge trap={notes[slot].trap} />}
                    </span>
                    <span className="text-muted-foreground">{notes[slot].note}</span>
                    <LocationLine refInfo={notes[slot]} fallbackLesson={question.lessonSlug} prefix="Ở:" />
                  </li>
                ))}
              </ol>
            </details>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {typeof chosen !== "number" ? "Em bỏ trống. " : right ? "Em chọn đúng. " : `Em chọn ${CHOICE_LETTERS[chosen]}. ${question.choices[chosen]}. `}
            Đáp án đúng:{" "}
            <strong className="text-success">
              {CHOICE_LETTERS[question.correctIndex]}. {question.choices[question.correctIndex]}
            </strong>
          </p>
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {(question.statements ?? []).map((statement, slot) => {
            const truth = question.truths?.[slot];
            const given = answer?.tf?.[slot];
            const missed = given !== undefined && given !== null && given !== truth;
            const refInfo = question.statementRefs?.[slot];
            return (
              <li key={slot} className={cn("rounded-md px-2 py-1 text-foreground", missed && "bg-accent/5")}>
                <strong>{STATEMENT_LETTERS[slot]})</strong> {statement} —{" "}
                <span className={given === truth ? "font-medium text-success" : "font-medium text-accent"}>
                  {truth ? "Đúng" : "Sai"}
                  {given === undefined || given === null ? " (em bỏ trống)" : given === truth ? " (em đúng)" : " (em chọn sai)"}
                </span>
                {truth === false && <TrapBadge trap={refInfo?.trap ?? null} />}
                {question.statementExplanations?.[slot] && <span className="block text-muted-foreground">{question.statementExplanations[slot]}</span>}
                {refInfo && (refInfo.sectionId || refInfo.lessonSlug || refInfo.ref) && <LocationLine refInfo={refInfo} fallbackLesson={question.lessonSlug} prefix="Ở:" />}
              </li>
            );
          })}
        </ul>
      )}
      {question.explanation && <p className="text-sm text-foreground">{question.explanation}</p>}
      {question.remember && (
        <p className="flex items-start gap-1.5 rounded-lg bg-gold/10 px-3 py-2 text-sm text-foreground" data-testid="remember">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
          <span>
            <strong>Ghi nhớ:</strong> {question.remember}
          </span>
        </p>
      )}
      {(location || question.eventSlug || features.length > 0) && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {location &&
            (location.href ? (
              <Link href={location.href} className="inline-flex items-center gap-1 text-accent underline">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {location.label}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {location.label}
              </span>
            ))}
          {question.eventSlug && (
            <Link href={`/su-kien/${question.eventSlug}`} className="text-accent underline">
              Sự kiện: {question.eventTitle ?? question.eventSlug}
            </Link>
          )}
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href} className="text-accent underline">
              Bài học tương tác: {feature.label}
            </Link>
          ))}
        </p>
      )}
      {attemptId && <ReportItemButton attemptId={attemptId} itemId={question.itemId} position={position + 1} />}
    </li>
  );
}
