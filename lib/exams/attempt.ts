// Lượt làm bài luyện thi (docs/ke-hoach-luyen-thi.md, mục 3.6, 3.10 — GĐ2): đường dẫn API, schema thân request, đọc
// kết quả các hàm SQL start_exam_attempt / submit_exam_attempt / get_attempt_result / get_exam_intro thành kiểu an toàn.
// Dùng được ở cả client và server (không import server-only).

import { z } from "zod";
import type { ItemAnswer } from "@/lib/exams/scoring";

export const attemptPaths = {
  intro: (slug: string) => `/api/luyen-thi/${slug}`,
  start: (slug: string) => `/api/luyen-thi/${slug}/bat-dau`,
  attempt: (id: string) => `/api/luyen-thi/luot/${id}`,
  submit: (id: string) => `/api/luyen-thi/luot/${id}/nop`,
};

/** Thân request tối đa (lưu / nộp bài) — đề 28 câu với đủ dữ liệu chỉ vài KB. */
export const ATTEMPT_BODY_LIMIT = 32 * 1024;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isAttemptId = (value: string) => UUID.test(value);

const itemAnswerSchema = z.strictObject({
  choice: z.number().int().min(0).max(3).nullable().optional(),
  tf: z.array(z.boolean().nullable()).length(4).optional(),
  flagged: z.boolean().optional(),
  ms: z.number().int().min(0).max(86_400_000).optional(),
});

/** Thân PATCH (lưu) và POST nộp bài: { answers: { "<item_id>": {...} } } — mỗi câu gửi đủ object của câu đó. */
export const answersBodySchema = z.object({
  answers: z
    .record(z.string().regex(UUID, "Mã câu không hợp lệ."), itemAnswerSchema)
    .refine((answers) => Object.keys(answers).length <= 200, "Quá nhiều câu.")
    .default({}),
});
export type AnswersBody = z.infer<typeof answersBodySchema>;

// ---------------------------------------------------------------------------------------------------------------
// Đọc kết quả SQL (snake_case) → kiểu dùng ở giao diện (camelCase)
// ---------------------------------------------------------------------------------------------------------------

const nullish = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => value ?? null);

const questionSchema = z.object({
  n: z.number().int(),
  item_id: z.string(),
  section: z.number().int(),
  kind: z.enum(["mcq", "true_false"]),
  stem: z.string(),
  choices: nullish(z.array(z.string()).length(4)),
  statements: nullish(z.array(z.string()).length(4)),
  passage: nullish(z.object({ body: z.string(), source_citation: z.string() })),
  correct_index: nullish(z.number().int().min(0).max(3)),
  truths: nullish(z.array(z.boolean()).length(4)),
  statement_explanations: nullish(z.array(z.string())),
  explanation: nullish(z.string()),
  level: nullish(z.string()),
  lesson_slug: nullish(z.string()),
  event_slug: nullish(z.string()),
  event_title: nullish(z.string()),
  earned_milli: nullish(z.number().int()),
});

const breakdownSchema = z.looseObject({
  items: z.array(z.number().int()),
  correct: z.number().int(),
  unanswered: z.number().int(),
  total: z.number().int(),
  raw_milli: z.number().int(),
  max_milli: z.number().int(),
});

const viewSchema = z.object({
  access: z.enum(["free", "account", "code"]).optional(),
  attempt: z.object({
    id: z.string(),
    status: z.enum(["in_progress", "submitted", "abandoned"]),
    started_at: z.string(),
    deadline_at: nullish(z.string()),
    submitted_at: nullish(z.string()),
    server_now: z.string(),
    score10: nullish(z.number()),
    breakdown: nullish(breakdownSchema),
  }),
  set: nullish(z.object({ slug: z.string(), title: z.string(), duration_min: z.number(), format: z.string(), free: z.boolean() })),
  answers: z.record(z.string(), z.unknown()).default({}),
  questions: z.array(questionSchema),
});

export type AttemptQuestion = {
  n: number;
  itemId: string;
  section: number;
  kind: "mcq" | "true_false";
  stem: string;
  choices: string[] | null;
  statements: string[] | null;
  passage: { body: string; sourceCitation: string } | null;
  /** Chỉ có sau khi nộp bài. */
  correctIndex: number | null;
  truths: boolean[] | null;
  statementExplanations: string[] | null;
  explanation: string | null;
  lessonSlug: string | null;
  eventSlug: string | null;
  eventTitle: string | null;
  earnedMilli: number | null;
};

export type AttemptView = {
  access: "free" | "account" | "code" | null;
  id: string;
  status: "in_progress" | "submitted" | "abandoned";
  deadlineAt: string | null;
  /** Giờ server lúc trả lời — để đồng hồ máy học sinh lệch giờ vẫn đếm đúng. */
  serverNow: string;
  score10: number | null;
  correct: number | null;
  unanswered: number | null;
  total: number;
  answers: Record<string, ItemAnswer>;
  questions: AttemptQuestion[];
};

/** Câu trả lời đã lưu từ server: bỏ phần sai kiểu (server đã làm sạch, đây chỉ là lớp an toàn). */
function readAnswers(raw: Record<string, unknown>): Record<string, ItemAnswer> {
  const answers: Record<string, ItemAnswer> = {};
  for (const [itemId, value] of Object.entries(raw)) {
    const parsed = itemAnswerSchema.safeParse(value);
    if (parsed.success) answers[itemId] = parsed.data;
  }
  return answers;
}

/** Kết quả start / submit / get của một lượt (đã `ok: true`) → AttemptView; sai dạng → null. */
export function parseAttemptView(value: unknown): AttemptView | null {
  const parsed = viewSchema.safeParse(value);
  if (!parsed.success) return null;
  const { attempt, questions, answers, access } = parsed.data;
  return {
    access: access ?? null,
    id: attempt.id,
    status: attempt.status,
    deadlineAt: attempt.deadline_at,
    serverNow: attempt.server_now,
    score10: attempt.score10,
    correct: attempt.breakdown?.correct ?? null,
    unanswered: attempt.breakdown?.unanswered ?? null,
    total: questions.length,
    answers: readAnswers(answers),
    questions: questions
      .map((question) => ({
        n: question.n,
        itemId: question.item_id,
        section: question.section,
        kind: question.kind,
        stem: question.stem,
        choices: question.choices,
        statements: question.statements,
        passage: question.passage ? { body: question.passage.body, sourceCitation: question.passage.source_citation } : null,
        correctIndex: question.correct_index,
        truths: question.truths,
        statementExplanations: question.statement_explanations,
        explanation: question.explanation,
        lessonSlug: question.lesson_slug,
        eventSlug: question.event_slug,
        eventTitle: question.event_title,
        earnedMilli: question.earned_milli,
      }))
      .sort((a, b) => a.n - b.n),
  };
}

export type ExamIntro = {
  access: "free" | "account" | "code";
  questionCount: number;
  /** Lượt đang làm dở trên máy / tài khoản này (chưa hết giờ). */
  inProgress: { id: string; remainingSeconds: number | null } | null;
};

const introSchema = z.object({
  access: z.enum(["free", "account", "code"]),
  question_count: z.number().int(),
  in_progress: nullish(z.object({ id: z.string(), deadline_at: nullish(z.string()), server_now: z.string() })),
});

export function parseExamIntro(value: unknown): ExamIntro | null {
  const parsed = introSchema.safeParse(value);
  if (!parsed.success) return null;
  const open = parsed.data.in_progress;
  return {
    access: parsed.data.access,
    questionCount: parsed.data.question_count,
    inProgress: open
      ? { id: open.id, remainingSeconds: open.deadline_at ? Math.max(0, Math.round((Date.parse(open.deadline_at) - Date.parse(open.server_now)) / 1000)) : null }
      : null,
  };
}

/** Lý do từ chối của các hàm lượt làm bài → mã HTTP. */
export const ATTEMPT_STATUS_BY_REASON: Record<string, number> = {
  not_found: 404,
  invalid_code: 403,
  not_activated: 403,
  revoked: 403,
  expired: 403,
  no_device: 400,
  unsupported_mode: 400,
  empty: 409,
  submitted: 409,
  time_up: 409,
  abandoned: 409,
  rate_limited: 429,
};

/** Hạn nộp theo đồng hồ MÁY NÀY: dịch hạn của server theo độ lệch giữa giờ server và giờ máy lúc nhận trả lời. */
export function localDeadline(deadlineAt: string | null, serverNow: string, receivedAt: number): number | null {
  if (!deadlineAt) return null;
  return receivedAt + (Date.parse(deadlineAt) - Date.parse(serverNow));
}
