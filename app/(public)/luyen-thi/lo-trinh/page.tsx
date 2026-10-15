import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";
import { CheckCircle2, Circle, Route } from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { buildStudyPlanAction } from "@/lib/actions/study-plan";
import { loginPath } from "@/lib/auth/routes";
import { hasAccountPack } from "@/lib/exams/attempts-server";
import { EXAM_DATE } from "@/lib/exams/config";
import { examPaths } from "@/lib/exams/exam";
import { loadLearnerOverview, type LearnerOverview } from "@/lib/exams/overview-server";
import { completedTasks, currentPlanWeek, DEFAULT_PLAN_WEEKS, PLAN_GOALS, PLAN_PER_WEEK, planWeekStart, type PlanTask, type StudyPlan } from "@/lib/exams/study-plan";
import { sgkLessons } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

// Lộ trình ôn (docs/ke-hoach-luyen-thi.md, mục 4.7 — GĐ5): chọn mục tiêu điểm + số buổi / tuần → lịch theo tuần; buổi tự
// tick từ các lượt đã làm sau khi lập. Cần đăng nhập + gói. Riêng tư.
export const metadata: Metadata = { title: "Lộ trình ôn — Luyện thi THPT", robots: { index: false, follow: false } };

const lessonInfo = new Map(sgkLessons.map((lesson) => [lesson.slug, lesson]));
const GOAL_LABELS: Record<number, string> = { 6: "6 điểm", 7: "7 điểm", 8: "8 điểm", 9: "9 điểm trở lên" };

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Lộ trình ôn" }]} />
      <header className="mb-6 mt-4">
        <h1 className="flex items-center gap-2 font-serif text-3xl font-bold text-foreground">
          <Route className="h-7 w-7 text-gold-deep" aria-hidden="true" />
          Lộ trình ôn
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Chọn mục tiêu điểm và số buổi học mỗi tuần — web xếp lịch: bài yếu / chưa làm trước, đề đầy đủ dày hơn khi mục tiêu cao,
          mỗi tuần một buổi ôn sổ câu sai. Buổi tự đánh dấu xong khi em làm bài tương ứng.
        </p>
      </header>
      {children}
    </div>
  );
}

async function load(): Promise<{ overview: LearnerOverview | null; failed: boolean }> {
  try {
    return { overview: await loadLearnerOverview(), failed: false };
  } catch (error) {
    unstable_rethrow(error);
    return { overview: null, failed: true };
  }
}

function taskView(task: PlanTask): { label: string; href: string } {
  if (task.kind === "full") return { label: "Làm một đề đầy đủ bấm giờ (50 phút)", href: examPaths.list };
  if (task.kind === "review") return { label: "Ôn câu đến hạn trong sổ câu sai", href: examPaths.review };
  const lesson = lessonInfo.get(task.lesson);
  return { label: `Luyện Bài ${lesson?.number ?? "?"}: ${lesson?.shortTitle ?? task.lesson} (từ 5 câu)`, href: examPaths.practiceLesson(task.lesson) };
}

function formatDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

function PlanForm({ plan, goal }: { plan: StudyPlan | null; goal: number | null }) {
  const defaultGoal = plan?.goal ?? (goal !== null ? Math.min(9, Math.max(6, Math.floor(goal))) : 7);
  const select = "h-10 rounded-lg border border-border bg-surface px-2 text-foreground";
  return (
    <form action={buildStudyPlanAction} className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4" data-testid="plan-form">
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Mục tiêu điểm
        <select name="goal" defaultValue={defaultGoal} className={select}>
          {PLAN_GOALS.map((value) => (
            <option key={value} value={value}>
              {GOAL_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Số buổi mỗi tuần
        <select name="perWeek" defaultValue={plan?.perWeek ?? 4} className={select}>
          {PLAN_PER_WEEK.map((value) => (
            <option key={value} value={value}>
              {value} buổi
            </option>
          ))}
        </select>
      </label>
      <Button type="submit">{plan ? "Lập lại lộ trình" : "Lập lộ trình"}</Button>
      <p className="w-full text-xs text-muted-foreground">
        {EXAM_DATE ? "Lộ trình kéo dài tới ngày thi (tối đa 26 tuần)." : `Chưa có lịch thi chính thức nên lộ trình dài ${DEFAULT_PLAN_WEEKS} tuần; lập lại bất cứ lúc nào.`}
        {plan && " Lập lại sẽ xếp lịch mới theo điểm hiện tại; buổi đã làm trước đó không được tính vào lịch mới."}
      </p>
    </form>
  );
}

export default async function StudyPlanPage({ searchParams }: PageProps<"/luyen-thi/lo-trinh">) {
  const query = await searchParams;
  const { overview, failed } = await load();
  if (failed) {
    return (
      <Shell>
        <Callout variant="warning" title="Chưa tải được lộ trình">
          Em tải lại trang sau ít phút nhé.
        </Callout>
      </Shell>
    );
  }
  if (!overview) {
    return (
      <Shell>
        <Callout variant="info" title="Đăng nhập để lập lộ trình">
          Lộ trình gắn với tài khoản và tự đánh dấu theo bài em làm.{" "}
          <Link href={loginPath(examPaths.plan)} className="text-accent underline">
            Đăng nhập
          </Link>
        </Callout>
      </Shell>
    );
  }
  if (!(await hasAccountPack(overview.userId))) {
    return (
      <Shell>
        <Callout variant="info" title="Lộ trình ôn thuộc Gói luyện thi">
          <Link href={examPaths.hub} className="text-accent underline">
            Xem Gói luyện thi
          </Link>{" "}
          (đã mua bằng mã? Thêm mã vào tài khoản ở trang Tài khoản).
        </Callout>
      </Shell>
    );
  }

  const plan = overview.studyPlan;
  const done = plan ? completedTasks(plan, overview.attempts) : new Set<string>();
  const total = plan ? plan.weeks.flat().length : 0;
  const week = plan ? currentPlanWeek(plan) : 1;

  return (
    <Shell>
      {query["da-luu"] === "1" && (
        <p role="status" className="mb-4 text-sm font-medium text-success">
          Đã lập lộ trình.
        </p>
      )}
      {query.loi === "1" && (
        <p role="alert" className="mb-4 text-sm font-medium text-accent">
          Chưa lập được lộ trình. Em thử lại nhé.
        </p>
      )}
      <PlanForm plan={plan} goal={overview.examGoal} />

      {plan && (
        <section aria-labelledby="lich-tuan" className="mt-8 flex flex-col gap-4">
          <h2 id="lich-tuan" className="font-serif text-2xl font-semibold text-foreground">
            Mục tiêu {GOAL_LABELS[plan.goal]} · {plan.perWeek} buổi / tuần
          </h2>
          <p className="text-foreground" data-testid="plan-progress">
            Đã xong <strong>{done.size}</strong>/{total} buổi · đang ở tuần {week}/{plan.weeks.length}.
          </p>
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {plan.weeks.map((tasks, index) => {
              const number = index + 1;
              const finished = tasks.every((task) => done.has(task.id));
              return (
                <li key={number}>
                  <details open={number === week || (number === week + 1 && finished)} className={cn("rounded-card border bg-surface p-4", number === week ? "border-accent" : "border-border")}>
                    <summary className="cursor-pointer font-semibold text-foreground">
                      Tuần {number} · từ {formatDay(planWeekStart(plan, number))}
                      {number === week && " · tuần này"} — {tasks.filter((task) => done.has(task.id)).length}/{tasks.length} buổi
                    </summary>
                    <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0" data-testid={`plan-week-${number}`}>
                      {tasks.map((task) => {
                        const view = taskView(task);
                        const isDone = done.has(task.id);
                        return (
                          <li key={task.id} className="flex items-start gap-2" data-done={isDone}>
                            {isDone ? (
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                            ) : (
                              <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            )}
                            <span className="sr-only">{isDone ? "Đã xong:" : "Chưa làm:"}</span>
                            <Link href={view.href} className={cn("hover:underline", isDone ? "text-muted-foreground line-through" : "text-accent")}>
                              {view.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </Shell>
  );
}
