// Phân tích một lượt đã chấm cho trang kết quả (docs/ke-hoach-luyen-thi.md, mục 4.2). Dữ liệu `breakdown` do SQL tính sẵn
// lúc nộp (mục 7.5 — không tính lại mỗi lần mở); ở đây chỉ đổi sang nhãn tiếng Việt, sắp xếp, lọc. Hàm thuần.

import type { AttemptQuestion, ScoreGroup } from "@/lib/exams/attempt";
import { EXAM_ITEM_LEVELS, examItemKindLabels, examItemLevelLabels } from "@/lib/exams/items";
import { answerState } from "@/lib/exams/room";
import type { ItemAnswer } from "@/lib/exams/scoring";
import { sgkLessons, sgkPaths } from "@/lib/sgk/curriculum";

export type Row = { key: string; label: string; earned: number; max: number; n: number; href?: string };

const lessonBySlug = new Map(sgkLessons.map((lesson) => [lesson.slug, lesson]));

/** Theo bài SGK; câu không gắn bài gom thành "Khác (lớp 11, liên môn…)". */
export function lessonRows(lessons: Record<string, ScoreGroup>): Row[] {
  return Object.entries(lessons).map(([slug, group]) => {
    const lesson = lessonBySlug.get(slug);
    return lesson
      ? { key: slug, label: `Bài ${lesson.number}. ${lesson.shortTitle}`, href: sgkPaths.lesson(slug), ...group }
      : { key: slug, label: "Khác (lớp 11, liên môn…)", ...group };
  });
}

export function levelRows(levels: Record<string, ScoreGroup>): Row[] {
  return EXAM_ITEM_LEVELS.filter((level) => levels[level]).map((level) => ({ key: level, label: examItemLevelLabels[level], ...levels[level] }));
}

/** Theo dạng: Trắc nghiệm, Đúng/Sai, và nhóm chồng "Có tư liệu" (câu tư liệu thuộc một trong hai dạng trên). */
export function kindRows(kinds: Record<string, ScoreGroup>): Row[] {
  const rows: Row[] = [];
  if (kinds.mcq) rows.push({ key: "mcq", label: examItemKindLabels.mcq, ...kinds.mcq });
  if (kinds.true_false) rows.push({ key: "true_false", label: examItemKindLabels.true_false, ...kinds.true_false });
  if (kinds.passage) rows.push({ key: "passage", label: "Có tư liệu", ...kinds.passage });
  return rows;
}

/** Bài yếu nhất (tỉ lệ điểm thấp nhất, chưa đạt tối đa) — gợi ý "Ôn bài yếu nhất". */
export function weakestLesson(lessons: Record<string, ScoreGroup>): Row | null {
  const candidates = lessonRows(lessons).filter((row) => row.href && row.max > 0 && row.earned < row.max);
  if (candidates.length === 0) return null;
  return candidates.reduce((worst, row) => (row.earned / row.max < worst.earned / worst.max ? row : worst));
}

export type SolutionFilter = "tat-ca" | "sai" | "bo-trong" | "danh-dau";

export const solutionFilterLabels: Record<SolutionFilter, string> = { "tat-ca": "Tất cả", sai: "Sai", "bo-trong": "Bỏ trống", "danh-dau": "Đã đánh dấu" };

/** Câu có thuộc bộ lọc không. "Sai": có làm nhưng chưa đạt điểm tối đa (Đúng/Sai sai một vài ý cũng tính). */
export function matchesFilter(filter: SolutionFilter, question: AttemptQuestion, answer: ItemAnswer | undefined): boolean {
  const full = question.kind === "mcq" ? 250 : 1000;
  const blank = answerState(question, answer) === "empty";
  switch (filter) {
    case "tat-ca":
      return true;
    case "sai":
      return !blank && (question.earnedMilli ?? 0) < full;
    case "bo-trong":
      return blank;
    case "danh-dau":
      return answer?.flagged === true;
  }
}

/** Điểm (thang thật) của một phần: phần nghìn → điểm. */
export const points = (milli: number) => milli / 1000;
