import "server-only";

import { foldForFingerprint, type ChoiceNote, type ExamItemKind, type ExamItemLevel, type ExamStatement } from "@/lib/exams/items";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowStatus } from "@/lib/utils/labels";

// Truy vấn trang soạn đề luyện thi (nhân sự). Đọc bằng phiên nhân sự: policy staff_read_all cho thấy mọi đề, mọi câu.

export async function listExamSetsForStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .select("id, slug, title, workflow_status, duration_min, format, product_id, sort_order, updated_at, exam_set_items(count)")
    .order("sort_order")
    .order("slug");
  if (error) throw error;
  return data.map((set) => ({
    slug: set.slug,
    title: set.title,
    status: set.workflow_status,
    durationMin: set.duration_min,
    format: set.format,
    free: set.product_id === null,
    updatedAt: set.updated_at,
    questionCount: set.exam_set_items[0]?.count ?? 0,
  }));
}

export type SetItemView = {
  itemId: string;
  section: number;
  position: number;
  shift: number;
  kind: ExamItemKind;
  stem: string;
  choices: string[] | null;
  correctIndex: number | null;
  statements: ExamStatement[] | null;
  /** Lời giải từng lựa chọn theo thứ tự GỐC (trang ghép đề xoay cùng choices). */
  choiceNotes: ChoiceNote[] | null;
  explanation: string;
  remember: string | null;
  level: ExamItemLevel;
  lessonSlug: string | null;
  sectionId: string | null;
  status: WorkflowStatus;
  passage: { title: string; body: string; source_citation: string } | null;
};

export async function getExamSetForStaff(slug: string) {
  const supabase = await createClient();
  const { data: set, error } = await supabase
    .from("exam_sets")
    .select("id, slug, title, description, duration_min, format, difficulty, sort_order, product_id, workflow_status, review_note, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!set) return null;
  const { data: rows, error: itemError } = await supabase
    .from("exam_set_items")
    .select(
      "item_id, section, position, choice_shift, exam_items(kind, stem, choices, correct_index, statements, choice_notes, explanation, remember, level, lesson_slug, section_id, workflow_status, event_id, source_note, exam_passages(title, body, source_citation))",
    )
    .eq("set_id", set.id)
    .order("section")
    .order("position");
  if (itemError) throw itemError;
  const items: (SetItemView & { eventId: string | null; sourceNote: string })[] = rows.flatMap((row) => {
    const item = row.exam_items;
    if (!item) return [];
    return [
      {
        itemId: row.item_id,
        section: row.section,
        position: row.position,
        shift: row.choice_shift,
        kind: item.kind,
        stem: item.stem,
        choices: item.choices,
        correctIndex: item.correct_index,
        statements: (item.statements as ExamStatement[] | null) ?? null,
        choiceNotes: (item.choice_notes as ChoiceNote[] | null) ?? null,
        explanation: item.explanation,
        remember: item.remember,
        level: item.level,
        lessonSlug: item.lesson_slug,
        sectionId: item.section_id,
        status: item.workflow_status,
        passage: item.exam_passages,
        eventId: item.event_id,
        sourceNote: item.source_note,
      },
    ];
  });
  return { set, items };
}

export type ExamSetForStaff = NonNullable<Awaited<ReturnType<typeof getExamSetForStaff>>>;

export type PickerFilters = { query?: string; kind?: ExamItemKind | null; lesson?: string | null; level?: ExamItemLevel | null };

/** Câu trong ngân hàng để thêm vào đề (trừ câu đã có trong đề và câu bị ẩn), mới sửa trước, tối đa 30. */
export async function searchBankForSet(setId: string, filters: PickerFilters) {
  const supabase = await createClient();
  const { data: inSet } = await supabase.from("exam_set_items").select("item_id").eq("set_id", setId);
  let request = supabase
    .from("exam_items")
    .select("id, kind, stem, lesson_slug, level, workflow_status, passage_id")
    .neq("workflow_status", "hidden")
    .order("updated_at", { ascending: false })
    .limit(30);
  const excluded = (inSet ?? []).map((row) => row.item_id);
  if (excluded.length > 0) request = request.not("id", "in", `(${excluded.join(",")})`);
  if (filters.kind) request = request.eq("kind", filters.kind);
  if (filters.lesson) request = request.eq("lesson_slug", filters.lesson);
  if (filters.level) request = request.eq("level", filters.level);
  const folded = filters.query ? foldForFingerprint(filters.query) : "";
  if (folded) request = request.ilike("fingerprint", `%${folded}%`);
  const { data, error } = await request;
  if (error) throw error;
  return data.map((item) => ({
    id: item.id,
    kind: item.kind,
    stem: item.stem,
    lessonSlug: item.lesson_slug,
    level: item.level,
    status: item.workflow_status,
    hasPassage: item.passage_id !== null,
  }));
}
