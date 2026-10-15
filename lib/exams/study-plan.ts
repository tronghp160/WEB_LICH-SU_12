// Lộ trình ôn (docs/ke-hoach-luyen-thi.md, mục 4.7 — GĐ5). Học sinh chọn mục tiêu điểm và số buổi / tuần; web xếp buổi
// học theo tuần: bài yếu / chưa làm trước, đề đầy đủ dày hơn khi mục tiêu cao, mỗi tuần một buổi ôn sổ câu sai. Lưu ở
// learner_profiles.study_plan (JSON ≤ 32 KB). Buổi được tick TỰ ĐỘNG từ các lượt đã làm sau khi lập — không có nút tick tay.

import { z } from "zod";
import type { AttemptSummary, LessonMastery } from "@/lib/exams/next-step";
import { addDays, vietnamDay } from "@/lib/exams/leitner";
import { sgkLessons } from "@/lib/sgk/curriculum";

export const PLAN_GOALS = [6, 7, 8, 9] as const;
export const PLAN_PER_WEEK = [2, 3, 4, 5, 6, 7] as const;
/** Không có ngày thi (NEXT_PUBLIC_EXAM_DATE trống) → lập cho ngần này tuần. */
export const DEFAULT_PLAN_WEEKS = 8;
export const MAX_PLAN_WEEKS = 26;
/** Một lượt có ít nhất ngần này câu đã chấm của bài thì tính là đã luyện bài đó. */
export const LESSON_TASK_MIN_ITEMS = 5;

const lessonSlugs = new Set(sgkLessons.map((lesson) => lesson.slug));

const taskSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().max(20), kind: z.literal("lesson"), lesson: z.string().refine((slug) => lessonSlugs.has(slug)) }),
  z.object({ id: z.string().max(20), kind: z.literal("full") }),
  z.object({ id: z.string().max(20), kind: z.literal("review") }),
]);
export type PlanTask = z.infer<typeof taskSchema>;

export const studyPlanSchema = z.object({
  version: z.literal(1),
  goal: z.number().int().min(6).max(9),
  perWeek: z.number().int().min(2).max(7),
  /** Ngày lập (YYYY-MM-DD, giờ Việt Nam) — tuần 1 bắt đầu từ ngày này. */
  startDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string(),
  weeks: z.array(z.array(taskSchema).max(7)).min(1).max(MAX_PLAN_WEEKS),
});
export type StudyPlan = z.infer<typeof studyPlanSchema>;

export function parseStudyPlan(value: unknown): StudyPlan | null {
  const parsed = studyPlanSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Số tuần của lộ trình: tới ngày thi (nếu có, tối đa 26 tuần), không thì 8 tuần. */
export function planWeeks(daysToExam: number | null): number {
  if (daysToExam === null || daysToExam <= 0) return DEFAULT_PLAN_WEEKS;
  return Math.min(MAX_PLAN_WEEKS, Math.max(1, Math.ceil(daysToExam / 7)));
}

/** Số buổi làm đề đầy đủ trong tuần thứ `week` (0-based): mục tiêu 6 → 2 tuần một đề; 7–8 → mỗi tuần; 9 → 2 đề khi học ≥ 4 buổi. */
export function fullExamsInWeek(goal: number, perWeek: number, week: number): number {
  if (goal <= 6) return week % 2 === 1 ? 1 : 0;
  if (goal >= 9 && perWeek >= 4) return 2;
  return 1;
}

/** Thứ tự ôn bài: yếu nhất trước, rồi bài chưa đủ dữ liệu (ít câu trước), rồi khá, vững để cuối. */
export function lessonPriority(mastery: readonly LessonMastery[]): string[] {
  const rank = { yeu: 0, "chua-du": 1, kha: 2, vung: 3 } as const;
  return [...mastery]
    .sort((a, b) => rank[a.level] - rank[b.level] || (a.level === "chua-du" ? a.n - b.n : (a.ratio ?? 0) - (b.ratio ?? 0)) || a.number - b.number)
    .map((lesson) => lesson.slug);
}

export function buildStudyPlan(input: { goal: number; perWeek: number; mastery: readonly LessonMastery[]; daysToExam: number | null; now?: Date }): StudyPlan {
  const now = input.now ?? new Date();
  const order = lessonPriority(input.mastery);
  const weekCount = planWeeks(input.daysToExam);
  let cursor = 0;
  const weeks: PlanTask[][] = [];
  for (let week = 0; week < weekCount; week++) {
    const tasks: PlanTask[] = [];
    const full = Math.min(fullExamsInWeek(input.goal, input.perWeek, week), input.perWeek - 1);
    const review = input.perWeek >= 3 ? 1 : 0;
    const lessons = input.perWeek - full - review;
    for (let index = 0; index < lessons; index++) {
      tasks.push({ id: `w${week + 1}-${tasks.length + 1}`, kind: "lesson", lesson: order[cursor % order.length] });
      cursor += 1;
    }
    if (review) tasks.push({ id: `w${week + 1}-${tasks.length + 1}`, kind: "review" });
    for (let index = 0; index < full; index++) tasks.push({ id: `w${week + 1}-${tasks.length + 1}`, kind: "full" });
    weeks.push(tasks);
  }
  return { version: 1, goal: input.goal, perWeek: input.perWeek, startDay: vietnamDay(now), createdAt: now.toISOString(), weeks };
}

function satisfies(task: PlanTask, attempt: AttemptSummary): boolean {
  if (attempt.status !== "submitted") return false;
  if (task.kind === "full") return attempt.kind === "full";
  if (task.kind === "review") return attempt.kind === "review";
  return (attempt.lessons[task.lesson]?.n ?? 0) >= LESSON_TASK_MIN_ITEMS;
}

/**
 * Các buổi đã xong: mỗi lượt đã nộp SAU khi lập lộ trình (cũ trước) tick buổi chưa xong đầu tiên mà nó thỏa — một lượt chỉ
 * tick một buổi.
 */
export function completedTasks(plan: StudyPlan, attempts: readonly AttemptSummary[]): Set<string> {
  const done = new Set<string>();
  const tasks = plan.weeks.flat();
  const after = attempts.filter((attempt) => (attempt.submittedAt ?? "") >= plan.createdAt).sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
  for (const attempt of after) {
    const task = tasks.find((candidate) => !done.has(candidate.id) && satisfies(candidate, attempt));
    if (task) done.add(task.id);
  }
  return done;
}

/** Tuần hiện tại (1-based, giới hạn trong lộ trình). */
export function currentPlanWeek(plan: StudyPlan, now: Date = new Date()): number {
  const days = Math.round((Date.parse(`${vietnamDay(now)}T00:00:00Z`) - Date.parse(`${plan.startDay}T00:00:00Z`)) / 86_400_000);
  return Math.min(plan.weeks.length, Math.max(1, Math.floor(days / 7) + 1));
}

/** Ngày bắt đầu tuần `week` (1-based). */
export const planWeekStart = (plan: StudyPlan, week: number) => addDays(plan.startDay, (week - 1) * 7);
