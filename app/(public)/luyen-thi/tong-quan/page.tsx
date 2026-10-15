import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, CalendarClock, Flame, Gauge, LayoutDashboard, Target } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button, LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { saveExamGoalAction } from "@/lib/actions/study-plan";
import { loginPath } from "@/lib/auth/routes";
import { getNotebook, hasAccountPack } from "@/lib/exams/attempts-server";
import { daysUntilExam, EXAM_DATE } from "@/lib/exams/config";
import { examPaths, formatScore10 } from "@/lib/exams/exam";
import { lessonMastery, MASTERY_MIN_ITEMS, nextSteps, predictedScore, studyStreak, type MasteryLevel } from "@/lib/exams/next-step";
import { loadLearnerOverview, type LearnerOverview } from "@/lib/exams/overview-server";
import { cn } from "@/lib/utils/cn";

// Tổng quan luyện thi (docs/ke-hoach-luyen-thi.md, mục 4.6 — GĐ5): điểm dự kiến, mục tiêu, chuỗi ngày học, đếm ngược (chỉ
// khi có NEXT_PUBLIC_EXAM_DATE), việc nên làm tiếp, bản đồ thành thạo 17 bài, lịch sử lượt. Cần đăng nhập + gói. Riêng tư.
export const metadata: Metadata = { title: "Tổng quan luyện thi — Luyện thi THPT", robots: { index: false, follow: false } };

const LEVEL_LABELS: Record<MasteryLevel, string> = { vung: "Vững", kha: "Khá", yeu: "Cần ôn", "chua-du": "Chưa đủ dữ liệu" };
const LEVEL_CLASSES: Record<MasteryLevel, string> = {
  vung: "border-success bg-success-bg",
  kha: "border-info bg-info-bg",
  yeu: "border-warning bg-warning-bg",
  "chua-du": "border-dashed border-border bg-surface",
};
const GOAL_OPTIONS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

function Header() {
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Tổng quan" }]} />
      <header className="mb-6 mt-4">
        <h1 className="flex items-center gap-2 font-serif text-3xl font-bold text-foreground">
          <LayoutDashboard className="h-7 w-7 text-gold-deep" aria-hidden="true" />
          Tổng quan luyện thi
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Điểm dự kiến, bài nào vững, bài nào cần ôn và việc nên làm tiếp — tính từ các lượt em đã làm khi đăng nhập.</p>
      </header>
    </>
  );
}

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
    <Header />
    {children}
  </div>
);

async function load(): Promise<{ overview: LearnerOverview | null; failed: boolean }> {
  try {
    return { overview: await loadLearnerOverview(), failed: false };
  } catch (error) {
    unstable_rethrow(error);
    return { overview: null, failed: true };
  }
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

export default async function OverviewPage({ searchParams }: PageProps<"/luyen-thi/tong-quan">) {
  const query = await searchParams;
  const { overview, failed } = await load();
  if (failed) {
    return (
      <Shell>
        <Callout variant="warning" title="Chưa tải được tổng quan">
          Em tải lại trang sau ít phút nhé.
        </Callout>
      </Shell>
    );
  }
  if (!overview) {
    return (
      <Shell>
        <Callout variant="info" title="Đăng nhập để xem tổng quan">
          Tổng quan tính từ các lượt làm bài gắn với tài khoản.{" "}
          <Link href={loginPath(examPaths.overview)} className="text-accent underline">
            Đăng nhập
          </Link>
        </Callout>
      </Shell>
    );
  }
  const [pack, notebook] = await Promise.all([hasAccountPack(overview.userId), getNotebook(overview.userId)]);
  if (!pack) {
    return (
      <Shell>
        <Callout variant="info" title="Tổng quan thuộc Gói luyện thi">
          Có gói, em xem được điểm dự kiến, bản đồ thành thạo 17 bài, chuỗi ngày học và lộ trình ôn theo mục tiêu điểm.{" "}
          <Link href={examPaths.hub} className="text-accent underline">
            Xem Gói luyện thi
          </Link>{" "}
          (đã mua bằng mã? Thêm mã vào tài khoản ở trang Tài khoản).
        </Callout>
      </Shell>
    );
  }

  const { attempts } = overview;
  const predicted = predictedScore(attempts);
  const mastery = lessonMastery(attempts);
  const streak = studyStreak(attempts.map((attempt) => attempt.startedAt));
  const daysLeft = daysUntilExam(EXAM_DATE);
  const steps = nextSteps({ attempts, mastery, notebookDue: notebook?.due ?? 0 });
  const history = attempts.filter((attempt) => attempt.status === "submitted" && attempt.score10 !== null).slice(0, 15);
  const tile = "flex flex-col gap-1 rounded-card border border-border bg-surface p-4";

  return (
    <Shell>
      {query["da-luu"] === "muc-tieu" && (
        <p role="status" className="mb-4 text-sm font-medium text-success">
          Đã lưu mục tiêu điểm.
        </p>
      )}
      {query.loi === "muc-tieu" && (
        <p role="alert" className="mb-4 text-sm font-medium text-accent">
          Chưa lưu được mục tiêu. Em thử lại nhé.
        </p>
      )}

      <section aria-label="Chỉ số chính" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={tile} data-testid="predicted-score">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Gauge className="h-4 w-4" aria-hidden="true" />
            Điểm dự kiến
          </span>
          {predicted ? (
            <>
              <span className="font-serif text-3xl font-bold text-foreground">{formatScore10(predicted.score)}</span>
              <span className="text-xs text-muted-foreground">Từ {predicted.basedOn} đề đầy đủ gần nhất (trọng số 0,5 / 0,3 / 0,2).</span>
            </>
          ) : (
            <span className="text-sm text-foreground">Làm ít nhất 2 đề đầy đủ (24 + 4 câu, 50 phút) để có điểm dự kiến.</span>
          )}
        </div>
        <div className={tile}>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="h-4 w-4" aria-hidden="true" />
            Mục tiêu
          </span>
          <form action={saveExamGoalAction} className="flex items-center gap-2">
            <label htmlFor="goal" className="sr-only">
              Mục tiêu điểm
            </label>
            <select id="goal" name="goal" defaultValue={overview.examGoal ?? 7} className="h-9 rounded-lg border border-border bg-surface px-2 text-foreground" data-testid="goal-select">
              {GOAL_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatScore10(value)} điểm
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Lưu
            </Button>
          </form>
          {overview.examGoal !== null && predicted && (
            <span className="text-xs text-muted-foreground" data-testid="goal-gap">
              {predicted.score >= overview.examGoal ? "Điểm dự kiến đã đạt mục tiêu." : `Còn ${formatScore10(Math.round((overview.examGoal - predicted.score) * 100) / 100)} điểm nữa.`}
            </span>
          )}
        </div>
        <div className={tile} data-testid="streak">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flame className="h-4 w-4" aria-hidden="true" />
            Chuỗi ngày học
          </span>
          <span className="font-serif text-3xl font-bold text-foreground">{streak}</span>
          <span className="text-xs text-muted-foreground">{streak > 0 ? "ngày liên tiếp" : "Làm một câu hôm nay để bắt đầu chuỗi."}</span>
        </div>
        {daysLeft !== null && daysLeft >= 0 && (
          <div className={tile} data-testid="countdown">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Đến kỳ thi
            </span>
            <span className="font-serif text-3xl font-bold text-foreground">{daysLeft}</span>
            <span className="text-xs text-muted-foreground">ngày</span>
          </div>
        )}
      </section>

      <section aria-labelledby="viec-tiep" className="mt-8 flex flex-col gap-3">
        <h2 id="viec-tiep" className="font-serif text-2xl font-semibold text-foreground">
          Việc nên làm tiếp
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3" data-testid="next-steps">
          {steps.map((step) => (
            <li key={step.key}>
              <Link href={step.href} className="flex h-full flex-col gap-1 rounded-card border border-border bg-surface p-4 hover:border-accent">
                <span className="flex items-center justify-between gap-2 font-semibold text-foreground">
                  {step.label}
                  <ArrowRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                </span>
                <span className="text-sm text-muted-foreground">{step.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          <Link href={examPaths.plan} className="text-accent underline">
            Lộ trình ôn theo tuần
          </Link>
          {" · "}
          <Link href={examPaths.notebook} className="text-accent underline">
            Sổ câu sai{notebook ? ` (${notebook.total})` : ""}
          </Link>
        </p>
      </section>

      <section aria-labelledby="thanh-thao" className="mt-8 flex flex-col gap-3">
        <h2 id="thanh-thao" className="font-serif text-2xl font-semibold text-foreground">
          Bản đồ thành thạo 17 bài
        </h2>
        <p className="text-sm text-muted-foreground">
          Tỉ lệ điểm đạt trên mọi câu đã chấm của bài (thi và luyện tập). Bài có dưới {MASTERY_MIN_ITEMS} câu ghi “chưa đủ dữ liệu”. Vững ≥ 80% · Khá
          50–79% · Cần ôn &lt; 50%.
        </p>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-4" data-testid="mastery-map">
          {mastery.map((lesson) => (
            <li key={lesson.slug}>
              <Link
                href={examPaths.practiceLesson(lesson.slug)}
                className={cn("flex h-full flex-col gap-0.5 rounded-card border p-3 hover:border-accent", LEVEL_CLASSES[lesson.level])}
                data-level={lesson.level}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bài {lesson.number}</span>
                <span className="text-sm font-medium leading-snug text-foreground">{lesson.title}</span>
                <span className="mt-auto pt-1 text-xs text-foreground">
                  {LEVEL_LABELS[lesson.level]}
                  {lesson.ratio !== null && ` · ${Math.round(lesson.ratio * 100)}%`} · {lesson.n} câu
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lich-su" className="mt-8 flex flex-col gap-3">
        <h2 id="lich-su" className="font-serif text-2xl font-semibold text-foreground">
          Lịch sử làm bài
        </h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground">Em chưa nộp lượt nào khi đăng nhập.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="w-full min-w-[28rem] text-sm" data-testid="attempt-history">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Ngày</th>
                  <th scope="col" className="px-3 py-2 font-medium">Bài làm</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {history.map((attempt) => (
                  <tr key={attempt.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDay(attempt.submittedAt ?? attempt.startedAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={examPaths.result(attempt.id)} className="text-accent hover:underline">
                        {attempt.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">{formatScore10(attempt.score10 ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <LinkButton href={examPaths.hub} variant="secondary" className="self-start">
          Làm đề
        </LinkButton>
      </section>
    </Shell>
  );
}
