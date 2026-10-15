// Tổng quan luyện thi (docs/ke-hoach-luyen-thi.md, mục 4.6 — GĐ5): điểm dự kiến, bản đồ thành thạo theo bài, chuỗi ngày
// học, việc nên làm tiếp. Hàm thuần — trang gọi với các lượt đọc bằng phiên của chính học sinh (RLS own_select).

import type { ScoreGroup } from "@/lib/exams/attempt";
import { examPaths } from "@/lib/exams/exam";
import { addDays, vietnamDay } from "@/lib/exams/leitner";
import { sgkLessons } from "@/lib/sgk/curriculum";

export type AttemptSummary = {
  id: string;
  /** full: đề đúng cấu trúc thi thật (đề có sẵn dạng thpt_2025 hoặc đề tự sinh thpt_2025); exam: đề khác; practice / review. */
  kind: "full" | "exam" | "practice" | "review";
  title: string;
  status: "in_progress" | "submitted" | "abandoned";
  score10: number | null;
  startedAt: string;
  submittedAt: string | null;
  lessons: Record<string, ScoreGroup>;
  /** Trang mở lại lượt dở (đề có sẵn / đề tự sinh); null với luyện tập. */
  resumeHref: string | null;
};

/** Trọng số 3 lượt đề đầy đủ gần nhất (mới nhất trước). */
export const PREDICT_WEIGHTS = [0.5, 0.3, 0.2] as const;
/** Một bài cần ít nhất ngần này câu đã chấm mới tô màu thành thạo (ít hơn: "chưa đủ dữ liệu"). */
export const MASTERY_MIN_ITEMS = 20;

const byNewest = (a: AttemptSummary, b: AttemptSummary) => (b.submittedAt ?? b.startedAt).localeCompare(a.submittedAt ?? a.startedAt);

/**
 * Điểm dự kiến = trung bình có trọng số 0,5 / 0,3 / 0,2 của 3 lượt ĐỀ ĐẦY ĐỦ đã nộp gần nhất (2 lượt: chia lại trọng số).
 * Ít hơn 2 lượt → null (một lượt chưa nói lên điều gì). Làm tròn 0,05 như thang điểm thi.
 */
export function predictedScore(attempts: readonly AttemptSummary[]): { score: number; basedOn: number } | null {
  const recent = attempts.filter((attempt) => attempt.kind === "full" && attempt.status === "submitted" && attempt.score10 !== null).sort(byNewest).slice(0, 3);
  if (recent.length < 2) return null;
  const weights = PREDICT_WEIGHTS.slice(0, recent.length);
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const value = recent.reduce((total, attempt, index) => total + (attempt.score10 ?? 0) * weights[index], 0) / sum;
  // + 1e-9: 6,625 tính bằng số thực ra 6,6249… — vẫn phải làm tròn lên 6,65.
  return { score: Math.round(value * 20 + 1e-9) / 20, basedOn: recent.length };
}

export type MasteryLevel = "chua-du" | "yeu" | "kha" | "vung";
export type LessonMastery = { slug: string; number: number; title: string; earned: number; max: number; n: number; ratio: number | null; level: MasteryLevel };

export function masteryLevel(ratio: number | null, n: number): MasteryLevel {
  if (ratio === null || n < MASTERY_MIN_ITEMS) return "chua-du";
  return ratio >= 0.8 ? "vung" : ratio >= 0.5 ? "kha" : "yeu";
}

/** Cộng điểm theo bài của mọi lượt đã chấm (thi + luyện tập) → 17 bài theo thứ tự SGK. */
export function lessonMastery(attempts: readonly AttemptSummary[]): LessonMastery[] {
  const totals = new Map<string, { earned: number; max: number; n: number }>();
  for (const attempt of attempts) {
    if (attempt.status !== "submitted") continue;
    for (const [slug, group] of Object.entries(attempt.lessons)) {
      const current = totals.get(slug) ?? { earned: 0, max: 0, n: 0 };
      totals.set(slug, { earned: current.earned + group.earned, max: current.max + group.max, n: current.n + group.n });
    }
  }
  return sgkLessons.map((lesson) => {
    const total = totals.get(lesson.slug) ?? { earned: 0, max: 0, n: 0 };
    const ratio = total.max > 0 ? total.earned / total.max : null;
    return { slug: lesson.slug, number: lesson.number, title: lesson.shortTitle, ...total, ratio, level: masteryLevel(ratio, total.n) };
  });
}

/** Số ngày học liên tiếp (theo giờ Việt Nam) tính tới hôm nay — hoặc tới hôm qua nếu hôm nay chưa học. */
export function studyStreak(startedAts: readonly string[], now: Date = new Date()): number {
  const days = new Set(startedAts.map((iso) => vietnamDay(new Date(iso))));
  const today = vietnamDay(now);
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export type NextStep = { key: string; label: string; detail: string; href: string };

/**
 * Tối đa 3 việc nên làm tiếp, theo thứ tự ưu tiên: làm tiếp bài dở → ôn câu đến hạn → luyện bài yếu nhất (đủ dữ liệu) →
 * luyện bài chưa làm → làm một đề đầy đủ nếu 7 ngày chưa làm.
 */
export function nextSteps(input: { attempts: readonly AttemptSummary[]; mastery: readonly LessonMastery[]; notebookDue: number; now?: Date }): NextStep[] {
  const steps: NextStep[] = [];
  const now = input.now ?? new Date();
  const open = input.attempts.filter((attempt) => attempt.status === "in_progress" && attempt.resumeHref).sort(byNewest)[0];
  if (open?.resumeHref) steps.push({ key: "resume", label: "Làm tiếp bài đang dở", detail: open.title, href: open.resumeHref });
  if (input.notebookDue > 0) steps.push({ key: "review", label: `Ôn ${input.notebookDue} câu đến hạn`, detail: "Trong sổ câu sai — ôn đúng hạn để nhớ lâu.", href: examPaths.review });
  const weakest = input.mastery.filter((lesson) => lesson.level === "yeu" || lesson.level === "kha").sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0))[0];
  if (weakest && (weakest.ratio ?? 1) < 0.65) {
    steps.push({ key: "weak", label: `Luyện Bài ${weakest.number}: ${weakest.title}`, detail: `Em đang đạt ${Math.round((weakest.ratio ?? 0) * 100)}% ở bài này.`, href: examPaths.practiceLesson(weakest.slug) });
  }
  const untouched = input.mastery.find((lesson) => lesson.n === 0);
  if (untouched) steps.push({ key: "new", label: `Luyện bài chưa làm: Bài ${untouched.number}`, detail: untouched.title, href: examPaths.practiceLesson(untouched.slug) });
  const lastFull = input.attempts.filter((attempt) => attempt.kind === "full" && attempt.status === "submitted").sort(byNewest)[0];
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  if (!lastFull || (lastFull.submittedAt ?? lastFull.startedAt) < weekAgo) {
    steps.push({ key: "full", label: "Làm một đề đầy đủ bấm giờ", detail: "50 phút như thi thật — để biết điểm dự kiến.", href: examPaths.list });
  }
  return steps.slice(0, 3);
}
