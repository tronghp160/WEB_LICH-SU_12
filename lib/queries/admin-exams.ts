import "server-only";

import { createClient } from "@/lib/supabase/server";

// Truy vấn trang soạn đề luyện thi (nhân sự). Đọc bằng phiên nhân sự: policy staff_read_all cho thấy mọi đề, mọi câu.

export async function listExamSetsForStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .select("id, slug, title, workflow_status, duration_min, product_id, sort_order, updated_at, exam_questions(count)")
    .order("sort_order")
    .order("slug");
  if (error) throw error;
  return data.map((set) => ({
    slug: set.slug,
    title: set.title,
    status: set.workflow_status,
    durationMin: set.duration_min,
    free: set.product_id === null,
    updatedAt: set.updated_at,
    questionCount: set.exam_questions[0]?.count ?? 0,
  }));
}

export async function getExamSetForStaff(slug: string) {
  const supabase = await createClient();
  const { data: set, error } = await supabase
    .from("exam_sets")
    .select("id, slug, title, description, duration_min, sort_order, product_id, workflow_status, review_note, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!set) return null;
  const [{ data: questions, error: questionError }, { data: events, error: eventError }] = await Promise.all([
    supabase
      .from("exam_questions")
      .select("id, position, question, choices, correct_index, explanation, lesson_slug, event_id, source_note")
      .eq("set_id", set.id)
      .order("position"),
    supabase.from("historical_events").select("id, title, start_year").order("start_year").order("title"),
  ]);
  if (questionError) throw questionError;
  if (eventError) throw eventError;
  return { set, questions, events: events.map((event) => ({ id: event.id, label: `${event.start_year} · ${event.title}` })) };
}

export type ExamSetForStaff = NonNullable<Awaited<ReturnType<typeof getExamSetForStaff>>>;
export type ExamQuestionRow = ExamSetForStaff["questions"][number];
