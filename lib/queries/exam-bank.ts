import "server-only";

import { foldForFingerprint, type ExamItemKind, type ExamItemLevel, type ExamStatement } from "@/lib/exams/items";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/lib/utils/labels";

// Truy vấn ngân hàng câu hỏi (nhân sự, docs/ke-hoach-luyen-thi.md, GĐ1). Đọc bằng PHIÊN nhân sự: policy staff_read_all
// cho thấy mọi câu / tư liệu; khách và học sinh không đọc được bảng nào ở đây.

export const BANK_PAGE_SIZE = 50;

export type BankFilters = {
  kind?: ExamItemKind | null;
  lesson?: string | null;
  grade?: 11 | 12 | null;
  level?: ExamItemLevel | null;
  status?: WorkflowStatus | null;
  /** true: chỉ câu có tư liệu; false: chỉ câu không có. */
  passage?: boolean | null;
  /** Tìm không dấu trong câu hỏi + lựa chọn / ý (so trên dấu vân tay đã gấp). */
  query?: string;
  page?: number;
};

export type BankListItem = {
  id: string;
  kind: ExamItemKind;
  stem: string;
  lessonSlug: string | null;
  topicTag: string | null;
  grade: number;
  level: ExamItemLevel;
  status: WorkflowStatus;
  hasPassage: boolean;
  setCount: number;
  /** Đáp án gốc (trắc nghiệm) — để xét cờ "phương án nhiễu không ai chọn". */
  correctIndex: number | null;
  updatedAt: string;
};

export async function listExamItems(filters: BankFilters): Promise<{ items: BankListItem[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  let request = supabase
    .from("exam_items")
    .select("id, kind, stem, lesson_slug, topic_tag, grade, level, workflow_status, passage_id, correct_index, updated_at, exam_set_items(count)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * BANK_PAGE_SIZE, page * BANK_PAGE_SIZE - 1);
  if (filters.kind) request = request.eq("kind", filters.kind);
  if (filters.lesson) request = request.eq("lesson_slug", filters.lesson);
  if (filters.grade) request = request.eq("grade", filters.grade);
  if (filters.level) request = request.eq("level", filters.level);
  if (filters.status) request = request.eq("workflow_status", filters.status);
  if (filters.passage === true) request = request.not("passage_id", "is", null);
  if (filters.passage === false) request = request.is("passage_id", null);
  const folded = filters.query ? foldForFingerprint(filters.query) : "";
  if (folded) request = request.ilike("fingerprint", `%${folded}%`);

  const { data, error, count } = await request;
  if (error) throw error;
  return {
    total: count ?? 0,
    items: data.map((item) => ({
      id: item.id,
      kind: item.kind,
      stem: item.stem,
      lessonSlug: item.lesson_slug,
      topicTag: item.topic_tag,
      grade: item.grade,
      level: item.level,
      status: item.workflow_status,
      hasPassage: item.passage_id !== null,
      setCount: item.exam_set_items[0]?.count ?? 0,
      correctIndex: item.correct_index,
      updatedAt: item.updated_at,
    })),
  };
}

export async function countItemsByStatus(): Promise<Record<WorkflowStatus, number>> {
  const supabase = await createClient();
  const statuses: WorkflowStatus[] = ["draft", "pending_review", "needs_revision", "published", "hidden"];
  const counts = await Promise.all(
    statuses.map((status) => supabase.from("exam_items").select("id", { count: "exact", head: true }).eq("workflow_status", status)),
  );
  return Object.fromEntries(statuses.map((status, index) => [status, counts[index].count ?? 0])) as Record<WorkflowStatus, number>;
}

/** Sự kiện (để gắn câu) và tư liệu (để chọn cho câu) — dùng cho form câu hỏi. */
export async function getItemFormOptions() {
  const supabase = await createClient();
  const [{ data: events, error: eventError }, { data: passages, error: passageError }] = await Promise.all([
    supabase.from("historical_events").select("id, title, start_year").order("start_year").order("title"),
    supabase.from("exam_passages").select("id, title, workflow_status").neq("workflow_status", "hidden").order("updated_at", { ascending: false }).limit(500),
  ]);
  if (eventError) throw eventError;
  if (passageError) throw passageError;
  return {
    events: events.map((event) => ({ id: event.id, label: `${event.start_year} · ${event.title}` })),
    passages: passages.map((passage) => ({ id: passage.id, label: passage.title, status: passage.workflow_status })),
  };
}

export type ExamItemDetail = {
  id: string;
  kind: ExamItemKind;
  stem: string;
  passage: { id: string; title: string; body: string; source_citation: string; workflow_status: WorkflowStatus } | null;
  choices: string[] | null;
  correct_index: number | null;
  statements: ExamStatement[] | null;
  explanation: string;
  grade: number;
  lesson_slug: string | null;
  topic_tag: string | null;
  level: ExamItemLevel;
  competency: string;
  event_id: string | null;
  source_note: string;
  workflow_status: WorkflowStatus;
  review_note: string | null;
  updated_at: string;
  sets: { slug: string; title: string; workflow_status: WorkflowStatus }[];
};

export async function getExamItem(id: string): Promise<ExamItemDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_items")
    .select(
      "id, kind, stem, choices, correct_index, statements, explanation, grade, lesson_slug, topic_tag, level, competency, event_id, source_note, workflow_status, review_note, updated_at, exam_passages(id, title, body, source_citation, workflow_status), exam_set_items(exam_sets(slug, title, workflow_status))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { exam_passages: passage, exam_set_items: links, ...item } = data;
  return {
    ...item,
    statements: (item.statements as ExamStatement[] | null) ?? null,
    passage,
    sets: links.flatMap((link) => (link.exam_sets ? [link.exam_sets] : [])),
  };
}

/** Câu hỏi cùng bài (hoặc cùng chủ đề lớp 11; không gắn gì thì cả ngân hàng) — để tìm câu gần trùng. */
export async function getStemsNear(item: { lesson_slug: string | null; topic_tag: string | null }): Promise<{ id: string; stem: string }[]> {
  const supabase = await createClient();
  let request = supabase.from("exam_items").select("id, stem").limit(2000);
  if (item.lesson_slug) request = request.eq("lesson_slug", item.lesson_slug);
  else if (item.topic_tag) request = request.eq("topic_tag", item.topic_tag);
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

// ----- Tư liệu -----

export type PassageListItem = { id: string; title: string; lessonSlug: string | null; status: WorkflowStatus; itemCount: number; updatedAt: string };

export async function listPassages(filters: { status?: WorkflowStatus | null; query?: string }): Promise<PassageListItem[]> {
  const supabase = await createClient();
  let request = supabase
    .from("exam_passages")
    .select("id, title, lesson_slug, workflow_status, updated_at, exam_items(count)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (filters.status) request = request.eq("workflow_status", filters.status);
  if (filters.query) request = request.ilike("title", `%${filters.query.replace(/[%_\\]/g, "")}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data.map((passage) => ({
    id: passage.id,
    title: passage.title,
    lessonSlug: passage.lesson_slug,
    status: passage.workflow_status,
    itemCount: passage.exam_items[0]?.count ?? 0,
    updatedAt: passage.updated_at,
  }));
}

export async function getPassage(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_passages")
    .select("id, title, body, source_citation, lesson_slug, workflow_status, review_note, updated_at, exam_items(id, kind, stem, workflow_status)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ----- Nhập hàng loạt -----

export async function getImportContext() {
  const supabase = await createClient();
  const [{ data: items, error: itemError }, { data: events, error: eventError }] = await Promise.all([
    supabase.from("exam_items").select("fingerprint").limit(20000),
    supabase.from("historical_events").select("id, slug"),
  ]);
  if (itemError) throw itemError;
  if (eventError) throw eventError;
  return {
    existingFingerprints: new Set(items.map((item) => item.fingerprint)),
    eventIds: new Map(events.map((event) => [event.slug, event.id])),
  };
}
