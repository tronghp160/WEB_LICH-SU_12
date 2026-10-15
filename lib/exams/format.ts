// Cấu trúc đề luyện thi (docs/ke-hoach-luyen-thi.md, mục 1.2 và 3.11). Đề thi tốt nghiệp THPT môn Lịch sử từ năm 2025
// (Quyết định 764/QĐ-BGDĐT, chương trình 2018): Phần I — 24 câu trắc nghiệm 4 lựa chọn, 0,25 điểm/câu; Phần II — 4 câu
// Đúng/Sai, mỗi câu 4 ý, điểm theo số ý đúng; 50 phút, tối đa 10 điểm. Hàm thuần, unit test được.

export type ExamFormat = "thpt_2025" | "mini" | "chuyen_de";

export type ExamSectionSpec = {
  section: 1 | 2;
  kind: "mcq" | "true_false";
  count: number;
  /** Điểm tối đa của một câu trong phần này. */
  pointsEach: number;
};

export const THPT_2025 = {
  durationMin: 50,
  sections: [
    { section: 1, kind: "mcq", count: 24, pointsEach: 0.25 },
    { section: 2, kind: "true_false", count: 4, pointsEach: 1 },
  ],
} as const satisfies { durationMin: number; sections: readonly ExamSectionSpec[] };

/** Số ý (a, b, c, d) trong một câu Đúng/Sai. */
export const TRUE_FALSE_STATEMENTS = 4;

/** Điểm một câu Đúng/Sai theo số ý trả lời đúng (0 → 4 ý); ý bỏ trống tính là sai. */
export const TRUE_FALSE_POINTS = [0, 0.1, 0.25, 0.5, 1] as const;

export const THPT_2025_MCQ = THPT_2025.sections[0].count;
export const THPT_2025_TRUE_FALSE = THPT_2025.sections[1].count;

/** Tổng điểm tối đa của đề theo cấu trúc (24 × 0,25 + 4 × 1 = 10). */
export function maxScore(sections: readonly ExamSectionSpec[]): number {
  return sections.reduce((sum, spec) => sum + spec.count * spec.pointsEach, 0);
}

/**
 * Thời gian gợi ý (phút) cho một đề có `mcq` câu trắc nghiệm và `trueFalse` câu Đúng/Sai — chia 50 phút theo điểm của đề
 * thật: 1,25 phút / câu trắc nghiệm, 5 phút / câu Đúng/Sai. Làm tròn lên phút.
 */
export function suggestedMinutes(mcq: number, trueFalse = 0): number {
  const perPoint = THPT_2025.durationMin / maxScore(THPT_2025.sections);
  const points = mcq * THPT_2025.sections[0].pointsEach + trueFalse * THPT_2025.sections[1].pointsEach;
  return Math.ceil(points * perPoint);
}

/** "24 câu trắc nghiệm + 4 câu Đúng/Sai" — các phần của đề thật. */
export const THPT_2025_PARTS = `${THPT_2025_MCQ} câu trắc nghiệm + ${THPT_2025_TRUE_FALSE} câu Đúng/Sai`;
/** "24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút" — mô tả cấu trúc đề thật, dùng chung cho trang công khai và quản trị. */
export const THPT_2025_LABEL = `${THPT_2025_PARTS}, ${THPT_2025.durationMin} phút`;
