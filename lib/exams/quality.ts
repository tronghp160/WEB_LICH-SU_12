// Chất lượng câu hỏi (docs/ke-hoach-luyen-thi.md, mục 3.8, 3.9, 4.10 — GĐ7): lý do báo lỗi, đọc thống kê câu
// (hàm SQL exam_item_stats), cờ cảnh báo, đọc tổng quan quản trị. Dùng được ở client và server.

import { z } from "zod";

export const REPORT_REASONS = ["sai_dap_an", "sai_kien_thuc", "khong_ro_nghia", "loi_chinh_ta", "khac"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const reportReasonLabels: Record<ReportReason, string> = {
  sai_dap_an: "Đáp án chưa đúng",
  sai_kien_thuc: "Sai kiến thức lịch sử",
  khong_ro_nghia: "Câu hỏi / lựa chọn không rõ nghĩa",
  loi_chinh_ta: "Lỗi chính tả, trình bày",
  khac: "Lý do khác",
};
export const REPORT_NOTE_MAX = 500;

export const reportBodySchema = z.object({
  attempt_id: z.guid(),
  item_id: z.guid(),
  reason: z.enum(REPORT_REASONS),
  note: z.string().max(REPORT_NOTE_MAX, `Ghi chú tối đa ${REPORT_NOTE_MAX} ký tự.`).optional().default(""),
});
export type ReportBody = z.infer<typeof reportBodySchema>;

export const REPORT_STATUSES = ["open", "fixed", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const reportStatusLabels: Record<ReportStatus, string> = { open: "Đang mở", fixed: "Đã sửa", rejected: "Không phải lỗi" };

/** Thống kê chỉ đáng tin khi câu có ít nhất ngần này lượt thi đã nộp (mục 3.9). */
export const STATS_MIN_ATTEMPTS = 30;

export type ItemStats = {
  n: number;
  /** Tỉ lệ điểm đạt trung bình 0–1. */
  p: number;
  /** Độ phân hóa: nhóm 27% điểm cao nhất − 27% thấp nhất (−1 … 1). */
  disc: number;
  /** Số lượt chọn từng phương án theo thứ tự GỐC (trắc nghiệm). */
  choices: number[] | null;
  blank: number;
  /** Tỉ lệ đúng từng ý (Đúng/Sai). */
  statements: number[] | null;
};

const statsSchema = z.object({
  n: z.number(),
  p: z.coerce.number(),
  disc: z.coerce.number(),
  choices: z.array(z.number()).length(4).nullish(),
  blank: z.number().nullish(),
  statements: z.array(z.coerce.number()).nullish(),
});

/** Kết quả exam_item_stats → Map theo id câu; phần sai dạng bị bỏ. */
export function parseItemStats(value: unknown): Map<string, ItemStats> {
  const result = new Map<string, ItemStats>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [id, raw] of Object.entries(value)) {
    const parsed = statsSchema.safeParse(raw);
    if (parsed.success) result.set(id, { ...parsed.data, choices: parsed.data.choices ?? null, blank: parsed.data.blank ?? 0, statements: parsed.data.statements ?? null });
  }
  return result;
}

export type StatsFlag = "qua-de" | "qua-kho" | "phan-hoa-am" | "nhieu-vo-dung";
export const statsFlagLabels: Record<StatsFlag, string> = {
  "qua-de": "Quá dễ (> 95% đúng)",
  "qua-kho": "Quá khó (< 20% đúng)",
  "phan-hoa-am": "Phân hóa âm (học sinh giỏi làm sai nhiều hơn)",
  "nhieu-vo-dung": "Có phương án nhiễu không ai chọn",
};

/** Cờ cảnh báo của một câu — chỉ khi đủ STATS_MIN_ATTEMPTS lượt. `correctIndex`: đáp án gốc (để bỏ qua khi xét nhiễu). */
export function statsFlags(stats: ItemStats | undefined, correctIndex: number | null): StatsFlag[] {
  if (!stats || stats.n < STATS_MIN_ATTEMPTS) return [];
  const flags: StatsFlag[] = [];
  if (stats.p > 0.95) flags.push("qua-de");
  if (stats.p < 0.2) flags.push("qua-kho");
  if (stats.disc < 0) flags.push("phan-hoa-am");
  if (stats.choices && correctIndex !== null && stats.choices.some((count, index) => index !== correctIndex && count === 0)) flags.push("nhieu-vo-dung");
  return flags;
}

export type AdminOverview = {
  days: { day: string; exam: number; practice: number; submitted: number }[];
  active7: number;
  activePeriod: number;
  accountsPeriod: number;
  /** Số lượt thi đã nộp theo điểm: cột i = [i, i+1) (cột 9 gồm cả 10). */
  scores: number[];
  submittedExams: number;
  reportsOpen: number;
};

const overviewSchema = z.object({
  days: z.array(z.object({ day: z.string(), exam: z.number(), practice: z.number(), submitted: z.number() })),
  active_7: z.number(),
  active_period: z.number(),
  accounts_period: z.number(),
  scores: z.array(z.number()).length(10),
  submitted_exams: z.number(),
  reports_open: z.number(),
});

export function parseAdminOverview(value: unknown): AdminOverview | null {
  const parsed = overviewSchema.safeParse(value);
  if (!parsed.success) return null;
  const data = parsed.data;
  return {
    days: data.days,
    active7: data.active_7,
    activePeriod: data.active_period,
    accountsPeriod: data.accounts_period,
    scores: data.scores,
    submittedExams: data.submitted_exams,
    reportsOpen: data.reports_open,
  };
}

/** Số thứ tự (1-based) các câu đã được chấm lại trong lượt — để ghi chú trên trang kết quả. */
export function regradedNumbers(questions: readonly { itemId: string }[], regradedItems: readonly string[]): number[] {
  const set = new Set(regradedItems);
  return questions.flatMap((question, index) => (set.has(question.itemId) ? [index + 1] : []));
}
