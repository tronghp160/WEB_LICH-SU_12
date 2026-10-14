import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import type { ExamSetCard } from "@/components/exams/ExamSetList";

// Danh sách đề luyện thi đã công bố (anon + RLS). Khách không đọc được bảng câu hỏi nên số câu mỗi đề đếm bằng khóa
// bí mật — chỉ lấy SỐ LƯỢNG của đề đã công bố, không lấy nội dung.

export async function getPublishedExamSets(): Promise<ExamSetCard[]> {
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .select("id, slug, title, description, duration_min, product_id, sort_order")
    .eq("workflow_status", "published")
    .order("sort_order")
    .order("slug");
  if (error) throw error;
  if (data.length === 0) return [];

  const counts = new Map<string, number>();
  const { data: rows } = await createAdminClient()
    .from("exam_questions")
    .select("set_id")
    .in(
      "set_id",
      data.map((set) => set.id),
    );
  for (const row of rows ?? []) counts.set(row.set_id, (counts.get(row.set_id) ?? 0) + 1);

  return data.map((set) => ({
    slug: set.slug,
    title: set.title,
    description: set.description,
    durationMin: set.duration_min,
    questionCount: counts.get(set.id) ?? null,
    free: set.product_id === null,
  }));
}

export async function getPublishedExamSet(slug: string) {
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .select("slug, title, description, duration_min, product_id")
    .eq("slug", slug)
    .eq("workflow_status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}
