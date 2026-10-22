// Lượt làm bài luyện thi (docs/ke-hoach-luyen-thi.md, mục 3.6, 3.10 — GĐ2): đường dẫn API, schema thân request, đọc
// kết quả các hàm SQL start_exam_attempt / submit_exam_attempt / get_attempt_result / get_exam_intro thành kiểu an toàn.
// Dùng được ở cả client và server (không import server-only).

import { z } from "zod";
import { TRAP_KINDS, type TrapKind } from "@/lib/exams/items";
import type { ItemAnswer } from "@/lib/exams/scoring";

export const attemptPaths = {
  /** Bắt đầu lượt luyện tập / ôn / làm lại câu sai (GĐ4). */
  practice: "/api/luyen-thi/luyen-tap",
  check: (id: string) => `/api/luyen-thi/luot/${id}/kiem-tra`,
  /** Báo lỗi một câu đã thấy đáp án (GĐ7). */
  report: "/api/luyen-thi/bao-loi",
  intro: (slug: string) => `/api/luyen-thi/${slug}`,
  start: (slug: string) => `/api/luyen-thi/${slug}/bat-dau`,
  /** Tạo / mở lại lượt in đề (chế độ paper, GĐ8). */
  paper: (slug: string) => `/api/luyen-thi/${slug}/ban-in`,
  /** Đề tự sinh theo ma trận (GĐ5): GET = trang trước khi làm, POST = sinh đề và bắt đầu. */
  generated: (blueprint: string) => `/api/luyen-thi/de-ngau-nhien?ma-tran=${encodeURIComponent(blueprint)}`,
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

// Vị trí kiến thức + kiểu bẫy (migration 20261101000000_exam_item_explain.sql). Kiểu bẫy lạ → bỏ, không làm hỏng cả lượt.
const refShape = {
  lesson_slug: nullish(z.string()),
  section_id: nullish(z.string()),
  ref: nullish(z.string()),
  trap: nullish(z.enum(TRAP_KINDS).catch(null as never)),
};
const refSchema = z.object(refShape);

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
  statement_refs: nullish(z.array(refSchema).length(4)),
  choice_notes: nullish(z.array(z.object({ note: z.string(), ...refShape })).length(4)),
  explanation: nullish(z.string()),
  remember: nullish(z.string()),
  level: nullish(z.string()),
  lesson_slug: nullish(z.string()),
  section_id: nullish(z.string()),
  topic_tag: nullish(z.string()),
  event_slug: nullish(z.string()),
  event_title: nullish(z.string()),
  earned_milli: nullish(z.number().int()),
  checked: nullish(z.boolean()),
});

const groupSchema = z.record(z.string(), z.object({ earned: z.number(), max: z.number(), n: z.number().int() }));

const breakdownSchema = z.looseObject({
  items: z.array(z.number().int()),
  sections: groupSchema.optional(),
  lessons: groupSchema.optional(),
  levels: groupSchema.optional(),
  kinds: groupSchema.optional(),
  correct: z.number().int(),
  unanswered: z.number().int(),
  total: z.number().int(),
  raw_milli: z.number().int(),
  max_milli: z.number().int(),
});

const viewSchema = z.object({
  access: z.enum(["free", "account", "code"]).optional(),
  pack: z.boolean().optional(),
  attempt: z.object({
    id: z.string(),
    status: z.enum(["in_progress", "submitted", "abandoned"]),
    mode: z.enum(["exam", "practice", "review", "paper"]).default("exam"),
    started_at: z.string(),
    deadline_at: nullish(z.string()),
    submitted_at: nullish(z.string()),
    server_now: z.string(),
    score10: nullish(z.number()),
    breakdown: nullish(breakdownSchema),
    blueprint: nullish(z.string()),
    regraded_items: nullish(z.array(z.string())),
  }),
  set: nullish(z.object({ slug: z.string(), title: z.string(), duration_min: z.number(), format: z.string(), free: z.boolean() })),
  answers: z.record(z.string(), z.unknown()).default({}),
  questions: z.array(questionSchema),
  percentile: z.number().min(0).max(100).optional(),
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
  /** Vị trí kiến thức + kiểu bẫy của từng ý (theo thứ tự ý). */
  statementRefs: AttemptRef[] | null;
  /** Lời giải từng lựa chọn THEO THỨ TỰ HỌC SINH THẤY (server đã xoay như choices). */
  choiceNotes: (AttemptRef & { note: string })[] | null;
  explanation: string | null;
  remember: string | null;
  lessonSlug: string | null;
  /** Mục SGK chứa kiến thức chính (muc-N). */
  sectionId: string | null;
  /** Chủ đề (câu lớp 11 / liên môn). */
  topicTag: string | null;
  eventSlug: string | null;
  eventTitle: string | null;
  earnedMilli: number | null;
  /** Câu đã "Kiểm tra" trong lượt luyện tập (đã khóa, đã có đáp án). */
  checked: boolean;
};

/** Vị trí kiến thức của một lựa chọn / ý (bài trống = cùng bài của câu) và kiểu bẫy (chỉ ở lựa chọn / ý sai). */
export type AttemptRef = { lessonSlug: string | null; sectionId: string | null; ref: string | null; trap: TrapKind | null };

const toRef = (value: z.infer<typeof refSchema>): AttemptRef => ({ lessonSlug: value.lesson_slug, sectionId: value.section_id, ref: value.ref, trap: value.trap });

/** Điểm đạt / tối đa (phần nghìn) và số câu của một nhóm (phần, bài, mức độ, dạng). */
export type ScoreGroup = { earned: number; max: number; n: number };

export type AttemptView = {
  access: "free" | "account" | "code" | null;
  id: string;
  status: "in_progress" | "submitted" | "abandoned";
  mode: "exam" | "practice" | "review" | "paper";
  /** Lượt luyện tập: người học có gói (không giới hạn câu kiểm tra mỗi ngày). */
  pack: boolean | null;
  set: { slug: string; title: string; durationMin: number; format: string; free: boolean } | null;
  /** Ma trận của lượt đề tự sinh (thpt_2025, quick_15, …) — null với đề có sẵn / luyện tập. */
  blueprint: string | null;
  /** Câu đã được chấm lại sau khi sửa đáp án (GĐ7) — trang kết quả ghi chú. */
  regradedItems: string[];
  startedAt: string;
  submittedAt: string | null;
  /** Phân tích sau khi chấm (null khi chưa nộp). */
  groups: { sections: Record<string, ScoreGroup>; lessons: Record<string, ScoreGroup>; levels: Record<string, ScoreGroup>; kinds: Record<string, ScoreGroup> } | null;
  /** Thứ hạng so với các lượt nộp khác của đề (chỉ khi đủ 30 lượt) — route tính thêm. */
  percentile: number | null;
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
  const { attempt, questions, answers, access, set, percentile, pack } = parsed.data;
  const breakdown = attempt.breakdown;
  return {
    access: access ?? null,
    id: attempt.id,
    status: attempt.status,
    mode: attempt.mode,
    pack: pack ?? null,
    set: set ? { slug: set.slug, title: set.title, durationMin: set.duration_min, format: set.format, free: set.free } : null,
    blueprint: attempt.blueprint,
    regradedItems: attempt.regraded_items ?? [],
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    groups: breakdown
      ? { sections: breakdown.sections ?? {}, lessons: breakdown.lessons ?? {}, levels: breakdown.levels ?? {}, kinds: breakdown.kinds ?? {} }
      : null,
    percentile: percentile ?? null,
    deadlineAt: attempt.deadline_at,
    serverNow: attempt.server_now,
    score10: attempt.score10,
    correct: attempt.breakdown?.correct ?? null,
    unanswered: attempt.breakdown?.unanswered ?? null,
    // Số câu được chấm: lượt thi = mọi câu; lượt luyện tập = câu đã kiểm tra (chưa nộp: số câu của lượt).
    total: breakdown?.total ?? questions.length,
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
        statementRefs: question.statement_refs?.map(toRef) ?? null,
        choiceNotes: question.choice_notes?.map((note) => ({ note: note.note, ...toRef(note) })) ?? null,
        explanation: question.explanation,
        remember: question.remember,
        lessonSlug: question.lesson_slug,
        sectionId: question.section_id,
        topicTag: question.topic_tag,
        eventSlug: question.event_slug,
        eventTitle: question.event_title,
        earnedMilli: question.earned_milli,
        checked: question.checked === true,
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
  quota: 429,
  login_required: 401,
  pack_required: 403,
  not_practice: 409,
  invalid_items: 409,
  invalid: 400,
  not_enough_items: 409,
};

/** Tùy chọn bắt đầu lượt luyện tập (thân POST /api/luyen-thi/luyen-tap) — hàm SQL start_practice_attempt. */
export const practiceOptionsSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("practice"),
    lessons: z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)).max(30).default([]),
    kinds: z.array(z.enum(["mcq", "true_false"])).max(2).default([]),
    levels: z.array(z.enum(["nhan_biet", "thong_hieu", "van_dung"])).max(3).default([]),
    passage: z.boolean().nullable().default(null),
    count: z.union([z.literal(10), z.literal(20), z.literal(30)]).default(10),
    only_new: z.boolean().default(false),
    prefer_wrong: z.boolean().default(false),
  }),
  z.object({ mode: z.literal("review") }),
  z.object({ mode: z.literal("retry"), from_attempt: z.string().regex(UUID) }),
]);
export type PracticeOptions = z.infer<typeof practiceOptionsSchema>;

/** Thân POST …/kiem-tra: một câu và câu trả lời của câu đó. */
export const checkBodySchema = z.object({ item_id: z.string().regex(UUID), answer: itemAnswerSchema });

/** Hạn nộp theo đồng hồ MÁY NÀY: dịch hạn của server theo độ lệch giữa giờ server và giờ máy lúc nhận trả lời. */
export function localDeadline(deadlineAt: string | null, serverNow: string, receivedAt: number): number | null {
  if (!deadlineAt) return null;
  return receivedAt + (Date.parse(deadlineAt) - Date.parse(serverNow));
}
