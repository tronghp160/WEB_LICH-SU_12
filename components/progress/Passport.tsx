"use client";

import { BookOpen, Check, RotateCcw, Stamp as StampIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProgressTransfer } from "@/components/progress/ProgressTransfer";
import { StampSeal } from "@/components/progress/StampSeal";
import { Button, LinkButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { clearProgress, useProgress } from "@/lib/hooks/useProgress";
import { evaluateStamps, lessonCompletion, stampDate, type Progress, type Stamp, type StampDef } from "@/lib/progress/progress";
import { SGK_12, sgkLessons, sgkPaths } from "@/lib/sgk/curriculum";

type PassportLesson = { slug: string; title: string; dateText: string };

type PassportProps = {
  stamps: StampDef[];
  lessons: PassportLesson[];
};

const KIND_LABEL: Record<Stamp["kind"], string> = { lesson: "Bài", topic: "Chủ đề", special: "Thử thách" };

const completionOf = (progress: Progress, lesson: (typeof sgkLessons)[number]) =>
  lessonCompletion(progress, lesson.slug, lesson.sections.map((section) => section.id));

/** Tiến độ đọc 17 Bài SGK, nhóm theo chủ đề (mục 6.7). */
function SgkProgress({ progress }: { progress: Progress }) {
  return (
    <div className="flex flex-col gap-6">
      {SGK_12.map((topic) => {
        const done = topic.lessons.filter((lesson) => completionOf(progress, { ...lesson, topic }) >= 1).length;
        return (
          <section key={topic.slug} aria-labelledby={`tien-do-${topic.slug}`} data-topic-color={topic.color} className="rounded-card border border-border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`tien-do-${topic.slug}`} className="font-serif font-bold text-[var(--topic)]">
                Chủ đề {topic.number} · {topic.shortTitle}
              </h3>
              <span className="text-sm text-muted-foreground">
                {done}/{topic.lessons.length} bài
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {topic.lessons.map((lesson) => {
                const completion = completionOf(progress, { ...lesson, topic });
                return (
                  <li key={lesson.slug} className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <Link href={sgkPaths.lesson(lesson.slug)} className="truncate text-sm text-foreground hover:text-accent">
                      <span className="font-semibold">Bài {lesson.number}.</span> {lesson.shortTitle}
                    </Link>
                    <ProgressBar value={completion} label={`Bài ${lesson.number}: đã đọc`} showValue />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function score(stamp: Stamp): string {
  return stamp.record ? `${stamp.record.best}/${stamp.record.total}` : "";
}

function StampCard({ stamp }: { stamp: Stamp }) {
  const earned = Boolean(stamp.earnedAt);
  return (
    <li className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-4 text-center shadow-card">
      {earned && stamp.earnedAt ? (
        <StampSeal id={stamp.setId} kind={stamp.kind} motto={stamp.motto} date={stampDate(stamp.earnedAt)} className="h-28 w-28" />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground">
          <StampIcon className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-gold-deep">{KIND_LABEL[stamp.kind]}</span>
        <span className="font-serif font-bold text-foreground">{stamp.title}</span>
        {earned ? (
          <span className="text-sm text-muted-foreground">
            <span className="sr-only">Đã có dấu. </span>
            Điểm cao nhất {score(stamp)} · {stamp.record?.attempts} lượt
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            <span className="sr-only">Chưa có dấu. </span>
            {stamp.requirement}
            {stamp.record && ` · cao nhất hiện tại ${score(stamp)}`}
          </span>
        )}
      </div>
      <Link href={stamp.href} className="text-sm font-medium text-accent underline">
        {earned ? "Làm lại" : "Làm ngay"}
      </Link>
    </li>
  );
}

/**
 * "Hộ chiếu lịch sử" (GĐ4.4): con dấu cho mỗi bộ trắc nghiệm đạt từ 7/10, danh sách bài học đã đọc hết. Dữ liệu chỉ
 * nằm trong localStorage của trình duyệt này — không đăng nhập, không gửi lên máy chủ.
 */
export function Passport({ stamps: defs, lessons }: PassportProps) {
  const progress = useProgress();
  const [confirming, setConfirming] = useState(false);

  if (!progress) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const stamps = evaluateStamps(defs, progress);
  const earnedCount = stamps.filter((stamp) => stamp.earnedAt).length;
  const studiedCount = lessons.filter((lesson) => progress.lessons[lesson.slug]).length;
  const sgkDone = sgkLessons.filter((lesson) => completionOf(progress, lesson) >= 1).length;
  const hasAnything =
    Object.keys(progress.quizzes).length > 0 || Object.keys(progress.lessons).length > 0 || Object.keys(progress.sgk).length > 0;

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-label="Tóm tắt hộ chiếu"
        className="flex flex-col gap-4 rounded-card bg-[#5c1a15] p-6 text-[#f3e3c3] shadow-card sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#e9c98f]">Hộ chiếu lịch sử</p>
          <p className="mt-1 font-serif text-3xl font-bold">
            {earnedCount}/{stamps.length} con dấu
          </p>
          <p className="mt-1 text-sm text-[#f3e3c3]/80">
            Đã học xong {sgkDone}/{sgkLessons.length} bài SGK · {studiedCount}/{lessons.length} chuyên đề tương tác
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/15 sm:w-64" aria-hidden="true">
          <div className="h-full rounded-full bg-[#e9c98f]" style={{ width: `${stamps.length ? (earnedCount / stamps.length) * 100 : 0}%` }} />
        </div>
      </section>

      {!hasAnything && (
        <p className="rounded-card border border-border bg-muted p-4 text-foreground">
          Hộ chiếu của em còn trống. Học xong một bài rồi làm trắc nghiệm, đạt từ 7/10 là em nhận được con dấu đầu tiên!
        </p>
      )}

      <Tabs
        label="Hộ chiếu"
        items={[
          {
            id: "tien-do",
            label: "Tiến độ học",
            content: (
              <div className="flex flex-col gap-10">
                <section aria-labelledby="bai-sgk">
                  <h2 id="bai-sgk" className="mb-4 font-serif text-2xl font-bold text-foreground">
                    Bài trong sách giáo khoa
                  </h2>
                  <SgkProgress progress={progress} />
                </section>
                <section aria-labelledby="bai-da-hoc">
                  <h2 id="bai-da-hoc" className="mb-4 font-serif text-2xl font-bold text-foreground">
                    Chuyên đề tương tác
                  </h2>
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {lessons.map((lesson) => {
                      const studied = progress.lessons[lesson.slug];
                      return (
                        <li key={lesson.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
                          <div className="flex items-center gap-3">
                            {studied ? (
                              <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                            ) : (
                              <BookOpen className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{lesson.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {studied ? `Đã học ngày ${stampDate(studied.studiedAt)}` : `Chưa học · ${lesson.dateText}`}
                              </p>
                            </div>
                          </div>
                          <LinkButton href={`/bai-hoc/${lesson.slug}`} variant="secondary" size="sm">
                            {studied ? "Học lại" : "Bắt đầu học"}
                          </LinkButton>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            ),
          },
          {
            id: "con-dau",
            label: "Con dấu",
            hint: `${earnedCount}/${stamps.length}`,
            content: (
              <section aria-labelledby="con-dau">
                <h2 id="con-dau" className="mb-4 font-serif text-2xl font-bold text-foreground">
                  Con dấu
                </h2>
                <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
                  {stamps.map((stamp) => (
                    <StampCard key={stamp.setId} stamp={stamp} />
                  ))}
                </ul>
              </section>
            ),
          },
        ]}
      />

      <ProgressTransfer />

      <section aria-labelledby="luu-tru" className="flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
        <h2 id="luu-tru" className="font-serif text-lg font-bold text-foreground">
          Hộ chiếu được lưu ở đâu?
        </h2>
        <p>
          Chỉ trong trình duyệt trên máy này — không cần đăng nhập và không gửi lên máy chủ. Nếu em dùng máy khác, chế độ ẩn
          danh, hoặc xóa dữ liệu trình duyệt thì hộ chiếu sẽ bắt đầu lại từ đầu.
        </p>
        {hasAnything &&
          (confirming ? (
            <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Xác nhận xóa tiến độ">
              <span className="font-medium text-foreground">Xóa toàn bộ con dấu và tiến độ trên máy này?</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  clearProgress();
                  setConfirming(false);
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Xóa hết
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Giữ lại
              </Button>
            </div>
          ) : (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Xóa tiến độ trên máy này
              </Button>
            </div>
          ))}
      </section>
    </div>
  );
}
