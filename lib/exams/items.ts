// Ngân hàng câu hỏi luyện thi (docs/ke-hoach-luyen-thi.md, mục 3.2–3.3, 7.2) — schema dùng chung cho form quản trị và
// tệp JSON nhập hàng loạt, dấu vân tay chống trùng, cảnh báo cho người soạn. Hàm thuần, unit test được.
// Ràng buộc thật nằm ở database (migration 20261025000000_exam_bank.sql); đây là lớp báo lỗi sớm, tiếng Việt.

import { z } from "zod";
import { sgkLessons } from "@/lib/sgk/curriculum";
import { foldText } from "@/lib/utils/search";
import type { WorkflowStatus } from "@/lib/utils/labels";

export const EXAM_ITEM_KINDS = ["mcq", "true_false"] as const;
export type ExamItemKind = (typeof EXAM_ITEM_KINDS)[number];
export const EXAM_ITEM_LEVELS = ["nhan_biet", "thong_hieu", "van_dung"] as const;
export type ExamItemLevel = (typeof EXAM_ITEM_LEVELS)[number];
export const EXAM_COMPETENCIES = ["tim_hieu_lich_su", "nhan_thuc_tu_duy", "van_dung_kien_thuc"] as const;
export type ExamCompetency = (typeof EXAM_COMPETENCIES)[number];

export const examItemKindLabels: Record<ExamItemKind, string> = { mcq: "Trắc nghiệm", true_false: "Đúng/Sai" };
export const examItemLevelLabels: Record<ExamItemLevel, string> = { nhan_biet: "Nhận biết", thong_hieu: "Thông hiểu", van_dung: "Vận dụng" };
export const examCompetencyLabels: Record<ExamCompetency, string> = {
  tim_hieu_lich_su: "Tìm hiểu lịch sử",
  nhan_thuc_tu_duy: "Nhận thức và tư duy lịch sử",
  van_dung_kien_thuc: "Vận dụng kiến thức, kỹ năng",
};

export const CHOICE_LETTERS = ["A", "B", "C", "D"] as const;
export const STATEMENT_LETTERS = ["a", "b", "c", "d"] as const;

export const examBankPaths = {
  list: "/quan-tri/ngan-hang-cau-hoi",
  create: (kind: ExamItemKind) => `/quan-tri/ngan-hang-cau-hoi/moi?dang=${kind === "mcq" ? "trac-nghiem" : "dung-sai"}`,
  edit: (id: string) => `/quan-tri/ngan-hang-cau-hoi/${id}`,
  passages: "/quan-tri/ngan-hang-cau-hoi/tu-lieu",
  passage: (id: string) => `/quan-tri/ngan-hang-cau-hoi/tu-lieu/${id}`,
  import: "/quan-tri/ngan-hang-cau-hoi/nhap",
};

/** "trac-nghiem" / "dung-sai" trong URL → dạng câu. */
export function parseKindSegment(value: string | undefined): ExamItemKind | null {
  if (value === "trac-nghiem") return "mcq";
  if (value === "dung-sai") return "true_false";
  return null;
}

const LESSON_SLUGS = new Set(sgkLessons.map((lesson) => lesson.slug));
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (label: string, min: number, max: number) =>
  z
    .string({ error: `Vui lòng nhập ${label}.` })
    .transform((value) => value.trim())
    .pipe(z.string().min(1, `Vui lòng nhập ${label}.`).min(min, `${capitalize(label)} quá ngắn (tối thiểu ${min} ký tự).`).max(max, `${capitalize(label)} quá dài (tối đa ${max} ký tự).`));
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === undefined || value === null || (typeof value === "string" && value.trim() === "") ? null : value), schema.nullable());

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const statementSchema = z.object({
  text: text("nội dung ý", 5, 500),
  is_true: z.boolean({ error: "Chọn ý này Đúng hay Sai." }),
  explanation: text("lời giải của ý", 5, 1000),
});
export type ExamStatement = z.infer<typeof statementSchema>;

/**
 * Một câu hỏi đã chuẩn hóa (dạng cột database). Form quản trị và tệp JSON đều đổi về dạng này rồi mới kiểm.
 * Đáp án đúng của câu trắc nghiệm viết ở vị trí bất kỳ; khi ghép đề, `choice_shift` xoay để rải đều A/B/C/D.
 */
export const examItemSchema = z
  .object({
    kind: z.enum(EXAM_ITEM_KINDS, { error: "Dạng câu không hợp lệ." }),
    stem: text("câu hỏi", 5, 800),
    passage_id: optional(z.string().regex(UUID_PATTERN, "Đoạn tư liệu không hợp lệ.")),
    choices: optional(z.array(text("lựa chọn", 1, 300))),
    correct_index: optional(z.number().int().min(0).max(3)),
    statements: optional(z.array(statementSchema)),
    explanation: text("lời giải", 5, 2000),
    grade: z.preprocess((value) => value ?? 12, z.union([z.literal(11), z.literal(12)], { error: "Lớp phải là 11 hoặc 12." })),
    lesson_slug: optional(z.string()),
    topic_tag: optional(text("chủ đề", 2, 60)),
    level: z.enum(EXAM_ITEM_LEVELS, { error: "Vui lòng chọn mức độ." }),
    competency: z.enum(EXAM_COMPETENCIES, { error: "Vui lòng chọn năng lực." }),
    event_id: optional(z.string().regex(UUID_PATTERN, "Sự kiện không hợp lệ.")),
    source_note: text("nguồn", 3, 500),
  })
  .superRefine((item, ctx) => {
    if (item.kind === "mcq") {
      if (!item.choices || item.choices.length !== 4) ctx.addIssue({ code: "custom", path: ["choices"], message: "Câu trắc nghiệm cần đúng 4 lựa chọn." });
      else {
        const seen = new Map<string, number>();
        item.choices.forEach((choice, index) => {
          const key = choice.toLowerCase();
          if (seen.has(key)) ctx.addIssue({ code: "custom", path: [`choice_${index}`], message: "Lựa chọn này trùng với một lựa chọn khác." });
          seen.set(key, index);
        });
      }
      if (item.correct_index === null) ctx.addIssue({ code: "custom", path: ["correct_index"], message: "Vui lòng chọn đáp án đúng." });
    } else {
      if (!item.statements || item.statements.length !== 4) ctx.addIssue({ code: "custom", path: ["statements"], message: "Câu Đúng/Sai cần đúng 4 ý." });
    }
    if (item.grade === 12 && item.lesson_slug && !LESSON_SLUGS.has(item.lesson_slug)) {
      ctx.addIssue({ code: "custom", path: ["lesson_slug"], message: "Bài SGK không hợp lệ." });
    }
    if (item.grade === 11 && item.lesson_slug) {
      ctx.addIssue({ code: "custom", path: ["lesson_slug"], message: "Câu lớp 11 dùng ô Chủ đề, không gắn bài SGK lớp 12." });
    }
    if (item.lesson_slug && !SLUG_PATTERN.test(item.lesson_slug)) ctx.addIssue({ code: "custom", path: ["lesson_slug"], message: "Bài SGK không hợp lệ." });
  })
  // Chỉ giữ phần của đúng dạng câu (cột của dạng kia để null — ràng buộc exam_items_shape_check).
  .transform((item) => ({
    ...item,
    choices: item.kind === "mcq" ? item.choices : null,
    correct_index: item.kind === "mcq" ? item.correct_index : null,
    statements: item.kind === "true_false" ? item.statements : null,
  }));
export type ExamItemInput = z.infer<typeof examItemSchema>;

export const passageSchema = z.object({
  title: text("tên tư liệu", 3, 160),
  body: text("đoạn tư liệu", 30, 2000),
  source_citation: text("trích dẫn nguồn", 5, 500),
  lesson_slug: optional(z.string().refine((value) => LESSON_SLUGS.has(value), "Bài SGK không hợp lệ.")),
});
export type PassageInput = z.infer<typeof passageSchema>;

/** FormData (đã đọc thành chuỗi) của form câu hỏi → đối tượng đưa vào examItemSchema. */
export function itemFromForm(values: Record<string, string>): unknown {
  const kind = values.kind;
  return {
    kind,
    stem: values.stem,
    passage_id: values.passage_id,
    choices: kind === "mcq" ? [0, 1, 2, 3].map((index) => values[`choice_${index}`] ?? "") : null,
    correct_index: kind === "mcq" && /^[0-3]$/.test(values.correct_index ?? "") ? Number(values.correct_index) : null,
    statements:
      kind === "true_false"
        ? [0, 1, 2, 3].map((index) => ({
            text: values[`statement_${index}`] ?? "",
            is_true: values[`statement_${index}_true`] === "true" ? true : values[`statement_${index}_true`] === "false" ? false : undefined,
            explanation: values[`statement_${index}_explanation`] ?? "",
          }))
        : null,
    explanation: values.explanation,
    grade: Number(values.grade || 12),
    lesson_slug: values.lesson_slug,
    topic_tag: values.topic_tag,
    level: values.level,
    competency: values.competency,
    event_id: values.event_id,
    source_note: values.source_note,
  };
}

/**
 * Lỗi zod của câu hỏi → khóa trường form: statements.2.text → statement_2, statements.2.is_true → statement_2_true,
 * choices.1 → choice_1.
 */
export function itemErrorField(path: readonly PropertyKey[]): string {
  const [head, index, sub] = path.map(String);
  if (head === "choices" && index !== undefined) return `choice_${index}`;
  if (head === "statements" && index !== undefined) {
    if (sub === "is_true") return `statement_${index}_true`;
    if (sub === "explanation") return `statement_${index}_explanation`;
    return `statement_${index}`;
  }
  return head ?? "_";
}

// ---------------------------------------------------------------------------------------------------------------
// Dấu vân tay (giống hàm SQL public.exam_item_fingerprint) và câu gần trùng
// ---------------------------------------------------------------------------------------------------------------

/** "Điện Biên Phủ (1954)!" → "dienbienphu1954" — như public.exam_fold. */
export function foldForFingerprint(value: string): string {
  return foldText(value.normalize("NFC")).replace(/[^a-z0-9]+/g, "");
}

export function itemFingerprint(item: { kind: ExamItemKind; stem: string; choices?: readonly string[] | null; statements?: readonly { text: string }[] | null }): string {
  const parts = item.kind === "mcq" ? (item.choices ?? []) : (item.statements ?? []).map((statement) => statement.text);
  const folded = parts.map(foldForFingerprint).sort();
  return [foldForFingerprint(item.stem), folded.join("|")].join("|");
}

function bigrams(value: string): Map<string, number> {
  const grams = new Map<string, number>();
  for (let index = 0; index < value.length - 1; index++) {
    const gram = value.slice(index, index + 2);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

/** Độ giống nhau 0–1 của hai câu hỏi (hệ số Dice trên cặp ký tự của chuỗi đã gấp). */
export function stemSimilarity(a: string, b: string): number {
  const left = foldForFingerprint(a);
  const right = foldForFingerprint(b);
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const leftGrams = bigrams(left);
  let overlap = 0;
  for (const [gram, count] of bigrams(right)) overlap += Math.min(count, leftGrams.get(gram) ?? 0);
  return (2 * overlap) / (left.length - 1 + right.length - 1);
}

/** Ngưỡng "gần trùng": câu hỏi giống ≥ 85% (đổi vài chữ, thêm dấu câu). */
export const NEAR_DUPLICATE_THRESHOLD = 0.85;

export function findNearDuplicates<T extends { id: string; stem: string }>(stem: string, candidates: readonly T[], excludeId?: string): T[] {
  return candidates
    .filter((candidate) => candidate.id !== excludeId)
    .map((candidate) => ({ candidate, score: stemSimilarity(stem, candidate.stem) }))
    .filter(({ score }) => score >= NEAR_DUPLICATE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ candidate }) => candidate);
}

// ---------------------------------------------------------------------------------------------------------------
// Cảnh báo cho người soạn (không chặn) — theo docs/huong-dan-soan-cau-hoi.md
// ---------------------------------------------------------------------------------------------------------------

const ALL_OF_ABOVE = /(tất cả|cả [abcd] và [abcd]|các (ý|đáp án|phương án) trên)/i;

export function itemWarnings(item: Pick<ExamItemInput, "kind" | "choices" | "correct_index" | "statements">): string[] {
  const warnings: string[] = [];
  if (item.kind === "true_false" && item.statements?.length === 4) {
    const truths = item.statements.filter((statement) => statement.is_true).length;
    if (truths === 0 || truths === 4) warnings.push(`Cả 4 ý đều ${truths === 4 ? "Đúng" : "Sai"} — nên có cả ý đúng lẫn ý sai.`);
  }
  if (item.kind === "mcq" && item.choices?.length === 4 && item.correct_index !== null) {
    if (item.choices.some((choice) => ALL_OF_ABOVE.test(choice))) warnings.push("Có lựa chọn kiểu “Tất cả các ý trên” / “Cả A và B” — nên tránh.");
    const correct = item.choices[item.correct_index].length;
    const others = item.choices.filter((_, index) => index !== item.correct_index);
    const average = others.reduce((sum, choice) => sum + choice.length, 0) / others.length;
    if (correct >= 20 && correct > average * 1.8) warnings.push("Đáp án đúng dài hơn hẳn các lựa chọn nhiễu — học sinh dễ đoán.");
  }
  return warnings;
}

// ---------------------------------------------------------------------------------------------------------------
// Tệp JSON nhập hàng loạt (mục 7.2)
// ---------------------------------------------------------------------------------------------------------------

export const IMPORT_MAX_ITEMS = 300;
export const IMPORT_MAX_PASSAGES = 100;

const importPassageSchema = z.object({
  key: z.string({ error: "Thiếu key." }).regex(SLUG_PATTERN, "key chỉ gồm chữ thường không dấu, số và gạch nối."),
  title: z.string(),
  body: z.string(),
  source_citation: z.string(),
  lesson_slug: z.string().nullish(),
});

const importItemSchema = z.looseObject({
  kind: z.string(),
  passage: z.string().nullish(),
  event: z.string().nullish(),
  correct: z.number().nullish(),
});

const importFileSchema = z.object({
  passages: z.array(importPassageSchema).max(IMPORT_MAX_PASSAGES, `Tối đa ${IMPORT_MAX_PASSAGES} đoạn tư liệu mỗi tệp.`).default([]),
  items: z.array(importItemSchema).min(1, "Tệp chưa có câu hỏi nào.").max(IMPORT_MAX_ITEMS, `Tối đa ${IMPORT_MAX_ITEMS} câu mỗi tệp — chia nhỏ tệp.`),
});

export type ImportRow = {
  /** Thứ tự trong tệp, tính từ 1. */
  index: number;
  kind: ExamItemKind | null;
  stem: string;
  errors: string[];
  warnings: string[];
};

export type ImportPlan = {
  /** Lỗi cả tệp (JSON sai, quá nhiều câu…) — có lỗi này thì không có dòng nào. */
  fileErrors: string[];
  passages: { key: string; input: PassageInput | null; errors: string[] }[];
  rows: ImportRow[];
  /** Câu hợp lệ, sẵn sàng ghi (khi KHÔNG có lỗi nào ở cả tệp). `passage_key` / `event_slug` đổi sang id khi ghi. */
  items: (ExamItemInput & { passage_key: string | null; event_slug: string | null })[];
};

export type ImportContext = {
  /** Dấu vân tay của các câu đã có trong ngân hàng → để báo trùng. */
  existingFingerprints: ReadonlySet<string>;
  /** Slug sự kiện có trong database. */
  eventSlugs: ReadonlySet<string>;
};

const TODO_PATTERN = /\b(TODO|FIXME)\b/i;

/** Kiểm cả tệp JSON (chạy thử): KHÔNG ghi gì. Ghi chỉ khi `fileErrors`, mọi `errors` đều rỗng. */
export function planImport(raw: string, context: ImportContext): ImportPlan {
  const plan: ImportPlan = { fileErrors: [], passages: [], rows: [], items: [] };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    plan.fileErrors.push("Tệp không phải JSON hợp lệ.");
    return plan;
  }
  const file = importFileSchema.safeParse(json);
  if (!file.success) {
    plan.fileErrors.push(...file.error.issues.map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message)));
    return plan;
  }

  const passageKeys = new Set<string>();
  for (const passage of file.data.passages) {
    const parsed = passageSchema.safeParse(passage);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    if (passageKeys.has(passage.key)) errors.push(`key "${passage.key}" bị trùng trong tệp.`);
    passageKeys.add(passage.key);
    plan.passages.push({ key: passage.key, input: parsed.success ? parsed.data : null, errors });
  }

  const seen = new Map<string, number>();
  file.data.items.forEach((rawItem, position) => {
    const index = position + 1;
    const row: ImportRow = { index, kind: null, stem: typeof rawItem.stem === "string" ? rawItem.stem : "", errors: [], warnings: [] };
    plan.rows.push(row);
    if (TODO_PATTERN.test(JSON.stringify(rawItem))) row.errors.push("Còn ghi chú TODO / FIXME.");

    const passageKey = rawItem.passage ?? null;
    if (passageKey !== null && !passageKeys.has(passageKey)) row.errors.push(`Không có đoạn tư liệu key "${passageKey}" trong tệp.`);
    const eventSlug = rawItem.event ?? null;
    if (eventSlug !== null && !context.eventSlugs.has(eventSlug)) row.errors.push(`Không có sự kiện "${eventSlug}".`);

    const parsed = examItemSchema.safeParse({ ...rawItem, correct_index: rawItem.correct ?? null, passage_id: null, event_id: null });
    if (!parsed.success) {
      row.errors.push(...parsed.error.issues.map((issue) => issueMessage(issue)));
      return;
    }
    row.kind = parsed.data.kind;
    row.warnings.push(...itemWarnings(parsed.data));
    const fingerprint = itemFingerprint(parsed.data);
    if (context.existingFingerprints.has(fingerprint)) row.errors.push("Trùng với một câu đã có trong ngân hàng.");
    const duplicateOf = seen.get(fingerprint);
    if (duplicateOf !== undefined) row.errors.push(`Trùng với câu ${duplicateOf} trong tệp.`);
    seen.set(fingerprint, index);
    if (row.errors.length > 0) return;
    plan.items.push({ ...parsed.data, passage_key: passageKey, event_slug: eventSlug });
  });
  return plan;
}

function issueMessage(issue: z.core.$ZodIssue): string {
  const field = itemErrorField(issue.path);
  const label: Record<string, string> = { kind: "dạng", level: "mức độ", competency: "năng lực", grade: "lớp" };
  return label[field] && !issue.message.startsWith("Vui lòng") ? `${label[field]}: ${issue.message}` : issue.message;
}

export function importHasErrors(plan: ImportPlan): boolean {
  return plan.fileErrors.length > 0 || plan.passages.some((passage) => passage.errors.length > 0) || plan.rows.some((row) => row.errors.length > 0);
}

// ---------------------------------------------------------------------------------------------------------------
// Quyền thao tác (giống nội dung khác; quyền thật do RLS)
// ---------------------------------------------------------------------------------------------------------------

/** Câu đang ở trạng thái này có được đưa vào một đề sắp gửi duyệt không. */
export function isUsableInSubmission(status: WorkflowStatus): boolean {
  return status === "published" || status === "pending_review";
}
