// Soạn và kiểm duyệt đề luyện thi (docs/ke-hoach-thanh-toan.md, mục 10) — schema form, điều kiện gửi duyệt, quyền sửa.
// Hàm thuần, unit test được. Quyền thật do RLS của exam_sets / exam_questions quyết định (migration 20261015000000).

import { z } from "zod";
import { canEditContent } from "@/lib/admin/content-kinds";
import { suggestedMinutes, THPT_2025_LABEL } from "@/lib/exams/format";
import { sgkLessons } from "@/lib/sgk/curriculum";
import { requiredText } from "@/lib/validation/content";
import type { StaffRole, WorkflowStatus } from "@/lib/utils/labels";

export const examAdminPaths = {
  list: "/quan-tri/de-luyen-thi",
  edit: (slug: string) => `/quan-tri/de-luyen-thi/${slug}`,
};

/** Ít hơn số câu này thì chưa cho gửi duyệt (đề mẫu tối thiểu). Cấu trúc đề đầy đủ: lib/exams/format.ts. */
export const MIN_EXAM_QUESTIONS = 10;

export const EXAM_CHOICE_FIELDS = ["choice_0", "choice_1", "choice_2", "choice_3"] as const;

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : (value ?? null));
const LESSON_SLUGS = new Set(sgkLessons.map((lesson) => lesson.slug));

export const examSetSchema = z.object({
  title: requiredText("tên đề", 160).refine((value) => value.length >= 3, "Tên đề quá ngắn (tối thiểu 3 ký tự)."),
  description: z.preprocess(blankToNull, z.string().max(500, "Mô tả quá dài (tối đa 500 ký tự).").nullable()),
  duration_min: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number({ error: "Thời gian phải là số phút." }).int("Thời gian phải là số phút nguyên.").min(5, "Tối thiểu 5 phút.").max(180, "Tối đa 180 phút."),
  ),
  sort_order: z.preprocess((value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : 0), z.number().int("Thứ tự phải là số nguyên.")),
});
export type ExamSetInput = z.infer<typeof examSetSchema>;

export const examQuestionSchema = z
  .object({
    question: requiredText("câu hỏi", 600),
    choice_0: requiredText("đáp án A", 300),
    choice_1: requiredText("đáp án B", 300),
    choice_2: requiredText("đáp án C", 300),
    choice_3: requiredText("đáp án D", 300),
    correct_index: z.enum(["0", "1", "2", "3"], { error: "Vui lòng chọn đáp án đúng." }),
    explanation: requiredText("lời giải thích", 1500),
    source_note: requiredText("nguồn", 500),
    lesson_slug: z.preprocess(blankToNull, z.string().nullable()),
    event_id: z.preprocess(blankToNull, z.string().uuid("Sự kiện không hợp lệ.").nullable()),
  })
  .superRefine((value, ctx) => {
    if (value.question.length < 5) ctx.addIssue({ code: "custom", path: ["question"], message: "Câu hỏi quá ngắn (tối thiểu 5 ký tự)." });
    if (value.explanation.length < 5) ctx.addIssue({ code: "custom", path: ["explanation"], message: "Lời giải thích quá ngắn (tối thiểu 5 ký tự)." });
    if (value.source_note.length < 3) ctx.addIssue({ code: "custom", path: ["source_note"], message: "Ghi rõ nguồn (ví dụ: SGK Lịch sử 12, Bài 7)." });
    if (value.lesson_slug && !LESSON_SLUGS.has(value.lesson_slug)) ctx.addIssue({ code: "custom", path: ["lesson_slug"], message: "Bài SGK không hợp lệ." });
    const seen = new Set<string>();
    for (const field of EXAM_CHOICE_FIELDS) {
      const key = value[field].toLowerCase();
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: [field], message: "Đáp án này trùng với một đáp án khác." });
      seen.add(key);
    }
  });
export type ExamQuestionInput = z.infer<typeof examQuestionSchema>;

export function examQuestionColumns(input: ExamQuestionInput) {
  return {
    question: input.question,
    choices: EXAM_CHOICE_FIELDS.map((field) => input[field]),
    correct_index: Number(input.correct_index),
    explanation: input.explanation,
    source_note: input.source_note,
    lesson_slug: input.lesson_slug,
    event_id: input.event_id,
  };
}

export type ReadinessQuestion = { position: number; correct_index: number; explanation: string; source_note: string };

export type ExamReadiness = { blockers: string[]; warnings: string[] };

/**
 * Kiểm tra trước khi GỬI DUYỆT / CÔNG BỐ: blockers chặn hẳn, warnings chỉ nhắc người duyệt.
 * Đề đầy đủ là 24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút (lib/exams/format.ts). Trang quản trị hiện mới soạn được câu
 * trắc nghiệm (dạng Đúng/Sai có từ GĐ1, docs/ke-hoach-luyen-thi.md) nên mọi đề đều là đề mẫu — gửi duyệt được, miễn từ 10 câu.
 */
export function examReadiness(set: { duration_min: number }, questions: readonly ReadinessQuestion[]): ExamReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (questions.length < MIN_EXAM_QUESTIONS) {
    blockers.push(`Đề cần ít nhất ${MIN_EXAM_QUESTIONS} câu (hiện có ${questions.length}).`);
  } else {
    warnings.push(`Đề thi thật gồm ${THPT_2025_LABEL}; đề này có ${questions.length} câu trắc nghiệm — nên ghi rõ "đề mẫu" trong tên hoặc mô tả.`);
  }
  if (questions.some((question) => question.explanation.trim().length < 5)) blockers.push("Có câu thiếu lời giải thích.");
  if (questions.some((question) => question.source_note.trim().length < 3)) blockers.push("Có câu thiếu nguồn.");

  if (questions.length >= MIN_EXAM_QUESTIONS) {
    const expected = suggestedMinutes(questions.length);
    if (Math.abs(set.duration_min - expected) > Math.max(5, expected * 0.25)) {
      warnings.push(`Thời gian ${set.duration_min} phút chưa tương xứng với ${questions.length} câu (gợi ý khoảng ${expected} phút).`);
    }
    // Đáp án đúng dồn vào một chữ cái → học sinh đoán được.
    const counts = [0, 0, 0, 0];
    for (const question of questions) counts[question.correct_index] += 1;
    const top = Math.max(...counts);
    if (top / questions.length > 0.4) {
      warnings.push(`Đáp án đúng dồn vào ${"ABCD"[counts.indexOf(top)]} (${top}/${questions.length} câu) — nên rải đều A/B/C/D.`);
    }
  }
  return { blockers, warnings };
}

/** Ai sửa được nội dung đề (tên, câu hỏi) ở trạng thái này — giống nội dung khác. */
export function canEditExam(role: StaffRole, status: WorkflowStatus): boolean {
  return canEditContent(role, status);
}

/** Biên tập viên (và quản trị viên) gửi duyệt đề đang nháp / cần chỉnh sửa. */
export function canSubmitExam(role: StaffRole, status: WorkflowStatus): boolean {
  return (role === "editor" || role === "system_admin") && (status === "draft" || status === "needs_revision");
}
