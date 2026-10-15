// Soạn và kiểm duyệt đề luyện thi (docs/ke-hoach-thanh-toan.md, mục 10; docs/ke-hoach-luyen-thi.md, GĐ1) — schema form
// thông tin đề, điều kiện gửi duyệt / công bố, quyền sửa. Hàm thuần, unit test được. Quyền thật do RLS của exam_sets /
// exam_set_items / exam_items quyết định (migration 20261025000000_exam_bank.sql).

import { z } from "zod";
import { canEditContent } from "@/lib/admin/content-kinds";
import { letterCounts, sectionForKind } from "@/lib/exams/compose";
import {
  EXAM_FORMATS,
  LEVEL_MIX_SUGGESTED,
  RICH_ITEMS_PLAYABLE,
  suggestedMinutes,
  THPT_2025,
  THPT_2025_LABEL,
  THPT_2025_MCQ,
  THPT_2025_PARTS,
  THPT_2025_TRUE_FALSE,
  type ExamFormat,
} from "@/lib/exams/format";
import { EXAM_ITEM_LEVELS, examItemLevelLabels, isUsableInSubmission, type ExamItemKind, type ExamItemLevel } from "@/lib/exams/items";
import { requiredText } from "@/lib/validation/content";
import type { StaffRole, WorkflowStatus } from "@/lib/utils/labels";

export const examAdminPaths = {
  list: "/quan-tri/de-luyen-thi",
  edit: (slug: string) => `/quan-tri/de-luyen-thi/${slug}`,
};

/** Chất lượng câu hỏi (GĐ7): hàng đợi báo lỗi, thống kê lượt làm bài. */
export const examQualityPaths = {
  reports: "/quan-tri/de-luyen-thi/bao-loi",
  stats: "/quan-tri/de-luyen-thi/thong-ke",
};

/** Đề ngắn / theo chủ đề: ít hơn số câu này thì chưa cho gửi duyệt. Cấu trúc đề đầy đủ: lib/exams/format.ts. */
export const MIN_EXAM_QUESTIONS = 10;

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : (value ?? null));

export const examSetSchema = z.object({
  title: requiredText("tên đề", 160).refine((value) => value.length >= 3, "Tên đề quá ngắn (tối thiểu 3 ký tự)."),
  description: z.preprocess(blankToNull, z.string().max(500, "Mô tả quá dài (tối đa 500 ký tự).").nullable()),
  format: z.enum(EXAM_FORMATS, { error: "Vui lòng chọn loại đề." }),
  duration_min: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number({ error: "Thời gian phải là số phút." }).int("Thời gian phải là số phút nguyên.").min(5, "Tối thiểu 5 phút.").max(180, "Tối đa 180 phút."),
  ),
  difficulty: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : null),
    z.union([z.literal(1), z.literal(2), z.literal(3)], { error: "Độ khó không hợp lệ." }).nullable(),
  ),
  sort_order: z.preprocess((value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : 0), z.number().int("Thứ tự phải là số nguyên.")),
});
export type ExamSetInput = z.infer<typeof examSetSchema>;

/** Một câu trong đề, đủ thông tin để kiểm điều kiện gửi duyệt / công bố. */
export type ReadinessItem = {
  kind: ExamItemKind;
  section: number;
  /** Đáp án đúng gốc (trắc nghiệm) — null với Đúng/Sai. */
  correct_index: number | null;
  /** exam_set_items.choice_shift */
  shift: number;
  explanation: string;
  source_note: string;
  status: WorkflowStatus;
  level: ExamItemLevel;
  event_id: string | null;
  hasPassage: boolean;
};

export type ExamReadiness = {
  /** Chặn gửi duyệt và công bố. */
  blockers: string[];
  /** Chỉ nhắc người soạn / người duyệt. */
  warnings: string[];
  /** Chỉ chặn công bố (gửi duyệt vẫn được). */
  publishBlockers: string[];
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * Kiểm tra trước khi GỬI DUYỆT / CÔNG BỐ. Đề đầy đủ (thpt_2025): đúng 24 câu trắc nghiệm ở Phần I + 4 câu Đúng/Sai ở
 * Phần II. Đề ngắn / theo chủ đề: từ 10 câu. Câu trong đề phải đã công bố hoặc đang chờ duyệt (công bố cùng đề).
 */
export function examReadiness(set: { duration_min: number; format: ExamFormat }, items: readonly ReadinessItem[]): ExamReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const publishBlockers: string[] = [];
  const mcq = items.filter((item) => item.kind === "mcq");
  const trueFalse = items.length - mcq.length;

  if (items.some((item) => item.section !== sectionForKind(item.kind))) {
    blockers.push("Có câu nằm sai phần (trắc nghiệm ở Phần I, Đúng/Sai ở Phần II).");
  }
  if (set.format === "thpt_2025") {
    if (mcq.length !== THPT_2025_MCQ || trueFalse !== THPT_2025_TRUE_FALSE) {
      blockers.push(`Đề đầy đủ cần đúng ${THPT_2025_PARTS} (hiện có ${mcq.length} câu trắc nghiệm, ${trueFalse} câu Đúng/Sai).`);
    }
    if (set.duration_min !== THPT_2025.durationMin) {
      warnings.push(`Đề thi thật làm trong ${THPT_2025.durationMin} phút; đề này đặt ${set.duration_min} phút.`);
    }
    if (items.length > 0) {
      const off = EXAM_ITEM_LEVELS.filter((level) => Math.abs(items.filter((item) => item.level === level).length / items.length - LEVEL_MIX_SUGGESTED[level]) > 0.15);
      if (off.length > 0) {
        const actual = EXAM_ITEM_LEVELS.map((level) => `${examItemLevelLabels[level]} ${percent(items.filter((item) => item.level === level).length / items.length)}`);
        const suggested = EXAM_ITEM_LEVELS.map((level) => `${examItemLevelLabels[level]} ${percent(LEVEL_MIX_SUGGESTED[level])}`);
        warnings.push(`Tỉ lệ mức độ lệch xa gợi ý (${suggested.join(" · ")}): đề này ${actual.join(" · ")}.`);
      }
    }
  } else {
    if (items.length < MIN_EXAM_QUESTIONS) {
      blockers.push(`Đề cần ít nhất ${MIN_EXAM_QUESTIONS} câu (hiện có ${items.length}).`);
    } else {
      if (set.format === "mini") {
        warnings.push(`Đề thi thật gồm ${THPT_2025_LABEL}; đề này có ${items.length} câu — nên ghi rõ "đề mẫu" trong tên hoặc mô tả.`);
      }
      const expected = suggestedMinutes(mcq.length, trueFalse);
      if (Math.abs(set.duration_min - expected) > Math.max(5, expected * 0.25)) {
        warnings.push(`Thời gian ${set.duration_min} phút chưa tương xứng với ${items.length} câu (gợi ý khoảng ${expected} phút).`);
      }
    }
  }

  if (items.some((item) => item.explanation.trim().length < 5)) blockers.push("Có câu thiếu lời giải thích.");
  if (items.some((item) => item.source_note.trim().length < 3)) blockers.push("Có câu thiếu nguồn.");
  const notReady = items.filter((item) => !isUsableInSubmission(item.status)).length;
  if (notReady > 0) {
    blockers.push(`Có ${notReady} câu đang nháp, cần chỉnh sửa hoặc đã ẩn — gửi duyệt các câu này trước (câu đang chờ duyệt được công bố cùng đề).`);
  }

  // Đáp án đúng (sau khi xoay) dồn vào một chữ cái → học sinh đoán được.
  if (mcq.length >= MIN_EXAM_QUESTIONS) {
    const counts = letterCounts(mcq.map((item) => ({ kind: item.kind, correctIndex: item.correct_index, shift: item.shift })));
    const top = Math.max(...counts);
    if (top / mcq.length > 0.4) {
      warnings.push(`Đáp án đúng dồn vào ${"ABCD"[counts.indexOf(top)]} (${top}/${mcq.length} câu) — bấm "Rải đều đáp án".`);
    }
  }
  const perEvent = new Map<string, number>();
  for (const item of items) if (item.event_id) perEvent.set(item.event_id, (perEvent.get(item.event_id) ?? 0) + 1);
  const crowded = Math.max(0, ...perEvent.values());
  if (crowded > 2) warnings.push(`Có ${crowded} câu cùng hỏi về một sự kiện — nên đa dạng hơn (tối đa 2 câu / sự kiện).`);

  if (!RICH_ITEMS_PLAYABLE && items.some((item) => item.kind === "true_false" || item.hasPassage)) {
    publishBlockers.push("Học sinh chưa làm được câu Đúng/Sai và câu có tư liệu trên web (phòng thi mới đang làm) — đề có các câu này chưa công bố được.");
  }
  return { blockers, warnings, publishBlockers };
}

/** Ai sửa được nội dung đề (tên, câu hỏi) ở trạng thái này — giống nội dung khác. */
export function canEditExam(role: StaffRole, status: WorkflowStatus): boolean {
  return canEditContent(role, status);
}

/** Biên tập viên (và quản trị viên) gửi duyệt đề / câu đang nháp hoặc cần chỉnh sửa. */
export function canSubmitExam(role: StaffRole, status: WorkflowStatus): boolean {
  return (role === "editor" || role === "system_admin") && (status === "draft" || status === "needs_revision");
}
