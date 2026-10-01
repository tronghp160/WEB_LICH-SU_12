"use client";

import Link from "next/link";
import { ArrowRight, Check, Lightbulb, Stamp } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { useProgress } from "@/lib/hooks/useProgress";
import { latestSgkLesson, lessonCompletion } from "@/lib/progress/progress";
import { getSgkLesson, SGK_12, sgkPaths } from "@/lib/sgk/curriculum";
import { sgkQuizPaths, sgkQuizSetId } from "@/lib/sgk/review";

/** Số câu hỏi đang có của mỗi Bài SGK (tính ở server từ dữ liệu đã công bố). */
export type LessonQuestionCounts = Record<string, number>;

/**
 * "Gợi ý cho em" (mục 6.6): bài đọc gần nhất → nếu chưa đạt trắc nghiệm của bài thì mời làm 10 câu; chưa học bài nào thì
 * gợi ý bắt đầu từ mục lục.
 */
export function ReviewSuggestion({ counts, minQuestions }: { counts: LessonQuestionCounts; minQuestions: number }) {
  const progress = useProgress();
  if (!progress) return <div className="h-20" aria-hidden="true" />;

  const latest = latestSgkLesson(progress);
  const lesson = latest && getSgkLesson(latest.slug);
  const box = "flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-5 sm:flex-row sm:items-center sm:justify-between";

  if (!lesson) {
    return (
      <div className={box}>
        <p className="flex items-start gap-2 text-foreground">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
          <span>Em chưa học bài nào trên máy này. Học một bài trong mục lục trước, rồi quay lại đây làm trắc nghiệm của bài đó nhé.</span>
        </p>
        <LinkButton href={sgkPaths.toc} variant="secondary">
          Mở mục lục
        </LinkButton>
      </div>
    );
  }

  const percent = Math.round(lessonCompletion(progress, lesson.slug, lesson.sections.map((section) => section.id)) * 100);
  const record = progress.quizzes[sgkQuizSetId(lesson.slug)];
  const hasQuiz = (counts[lesson.slug] ?? 0) >= minQuestions;
  const status = record ? `cao nhất ${record.best}/${record.total}${record.passedAt ? ", đã có dấu" : ""}` : "chưa làm trắc nghiệm";

  return (
    <div className={box} data-topic-color={lesson.topic.color}>
      <p className="flex items-start gap-2 text-foreground">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
        <span>
          <strong>Gợi ý cho em:</strong> Bài {lesson.number} · {lesson.shortTitle} (đã đọc {percent}%, {status}).
        </span>
      </p>
      {hasQuiz ? (
        <LinkButton href={sgkQuizPaths.lesson(lesson.slug)}>
          {record?.passedAt ? "Làm lại 10 câu" : "Làm 10 câu"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </LinkButton>
      ) : (
        <LinkButton href={sgkPaths.lesson(lesson.slug)} variant="secondary">
          Học tiếp Bài {lesson.number}
        </LinkButton>
      )}
    </div>
  );
}

/** Bảng ôn tập theo mục lục: mỗi bài một dòng — số câu, điểm cao nhất, con dấu (đọc từ trình duyệt). */
export function ReviewTable({ counts, minQuestions }: { counts: LessonQuestionCounts; minQuestions: number }) {
  const progress = useProgress();
  return (
    <div className="flex flex-col gap-8">
      {SGK_12.map((topic) => (
        <section key={topic.slug} aria-labelledby={`on-tap-${topic.slug}`} data-topic-color={topic.color}>
          <h3 id={`on-tap-${topic.slug}`} className="mb-2 border-b-2 border-[var(--topic)] pb-1 font-serif text-lg font-bold text-[var(--topic)]">
            Chủ đề {topic.number} · {topic.shortTitle}
          </h3>
          <table className="w-full text-left text-sm">
            <thead className="sr-only">
              <tr>
                <th scope="col">Bài</th>
                <th scope="col">Số câu</th>
                <th scope="col">Điểm cao nhất</th>
                <th scope="col">Con dấu</th>
                <th scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {topic.lessons.map((lesson) => {
                const count = counts[lesson.slug] ?? 0;
                const open = count >= minQuestions;
                const record = progress?.quizzes[sgkQuizSetId(lesson.slug)];
                return (
                  <tr key={lesson.slug} className="border-b border-border last:border-b-0">
                    <th scope="row" className="py-2.5 pr-3 font-normal">
                      <Link href={sgkPaths.lesson(lesson.slug)} className="hover:text-accent">
                        <span className="font-semibold text-[var(--topic)]">Bài {lesson.number}.</span> {lesson.shortTitle}
                      </Link>
                    </th>
                    <td className="hidden w-20 py-2.5 pr-3 text-muted-foreground sm:table-cell">{open ? `${count} câu` : "—"}</td>
                    <td className="w-24 py-2.5 pr-3 tabular-nums text-muted-foreground">{record ? `${record.best}/${record.total}` : ""}</td>
                    <td className="w-10 py-2.5 pr-3">
                      {record?.passedAt ? (
                        <Stamp className="h-5 w-5 text-accent" aria-label="Đã có dấu" />
                      ) : record ? (
                        <Check className="h-5 w-5 text-muted-foreground" aria-label="Đã làm, chưa đạt 7/10" />
                      ) : null}
                    </td>
                    <td className="w-32 py-2.5 text-right">
                      {open ? (
                        <Link href={sgkQuizPaths.lesson(lesson.slug)} className="font-medium text-accent hover:underline">
                          {record ? "Làm lại" : "Làm trắc nghiệm"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Chưa đủ câu</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
