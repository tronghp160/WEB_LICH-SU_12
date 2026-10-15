// Chấm điểm lượt làm bài (docs/ke-hoach-luyen-thi.md, mục 3.11) — GIỐNG HỆT hàm SQL public.exam_grade_attempt
// (migration 20261026000000_exam_attempts.sql); server chấm bằng SQL, bản này để unit test và hiển thị. Tính bằng phần
// nghìn điểm (số nguyên) để hai bên không lệch do làm tròn số thực.

import { THPT_2025, TRUE_FALSE_POINTS } from "@/lib/exams/format";

/** Điểm một câu trắc nghiệm, phần nghìn: 0,25 → 250. */
export const MCQ_MILLI = Math.round(THPT_2025.sections[0].pointsEach * 1000);
/** Điểm một câu Đúng/Sai theo số ý đúng 0–4, phần nghìn: 0 / 100 / 250 / 500 / 1000. */
export const TRUE_FALSE_MILLI = TRUE_FALSE_POINTS.map((points) => Math.round(points * 1000));

export type GradeItem = { kind: "mcq"; correct: number } | { kind: "true_false"; truths: readonly boolean[] };
/** Câu trả lời đã lưu của một câu (exam_attempts.answers["<item_id>"]). */
export type ItemAnswer = { choice?: number | null; tf?: readonly (boolean | null)[]; flagged?: boolean; ms?: number };

export function itemMaxMilli(item: GradeItem): number {
  return item.kind === "mcq" ? MCQ_MILLI : TRUE_FALSE_MILLI[4];
}

/** Điểm đạt của một câu. Đúng/Sai: đếm ý trả lời đúng (bỏ trống = sai) rồi tra bảng. */
export function itemEarnedMilli(item: GradeItem, answer: ItemAnswer | undefined): number {
  if (item.kind === "mcq") return answer?.choice === item.correct ? MCQ_MILLI : 0;
  const right = item.truths.filter((truth, index) => answer?.tf?.[index] === truth).length;
  return TRUE_FALSE_MILLI[right];
}

export function isAnswered(item: GradeItem, answer: ItemAnswer | undefined): boolean {
  if (item.kind === "mcq") return typeof answer?.choice === "number";
  return (answer?.tf ?? []).some((value) => typeof value === "boolean");
}

/** Điểm thang 10 = raw / max × 10, làm tròn 0,01 nửa lên — công thức số nguyên như SQL. */
export function score10FromMilli(rawMilli: number, maxMilli: number): number {
  if (maxMilli === 0) return 0;
  return Math.floor((2000 * rawMilli + maxMilli) / (2 * maxMilli)) / 100;
}

export type AttemptScore = {
  /** Điểm từng câu (phần nghìn), theo thứ tự câu trong lượt. */
  items: number[];
  rawMilli: number;
  maxMilli: number;
  score10: number;
  /** Số câu đạt điểm tối đa (Đúng/Sai: đúng cả 4 ý). */
  correct: number;
  unanswered: number;
  total: number;
};

export function scoreAttempt(items: readonly GradeItem[], answers: readonly (ItemAnswer | undefined)[]): AttemptScore {
  const earned = items.map((item, index) => itemEarnedMilli(item, answers[index]));
  const rawMilli = earned.reduce((sum, value) => sum + value, 0);
  const maxMilli = items.reduce((sum, item) => sum + itemMaxMilli(item), 0);
  return {
    items: earned,
    rawMilli,
    maxMilli,
    score10: score10FromMilli(rawMilli, maxMilli),
    correct: items.filter((item, index) => earned[index] === itemMaxMilli(item)).length,
    unanswered: items.filter((item, index) => !isAnswered(item, answers[index])).length,
    total: items.length,
  };
}
