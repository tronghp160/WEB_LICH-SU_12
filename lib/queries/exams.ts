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
    .select("id, slug, title, description, duration_min, product_id, sort_order, format, difficulty, published_at")
    .eq("workflow_status", "published")
    .order("sort_order")
    .order("slug");
  if (error) throw error;
  if (data.length === 0) return [];

  // Đếm như get_exam_intro / start_exam_attempt: mọi câu đã công bố trong đề (docs/ke-hoach-luyen-thi.md, GĐ2).
  const counts = new Map<string, number>();
  const { data: rows } = await createAdminClient()
    .from("exam_set_items")
    .select("set_id, exam_items!inner(id)")
    .eq("exam_items.workflow_status", "published")
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
    format: set.format,
    difficulty: set.difficulty,
    publishedAt: set.published_at,
  }));
}

export async function getPublishedExamSet(slug: string) {
  const supabase = await createPublicClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .select("slug, title, description, duration_min, product_id, format")
    .eq("slug", slug)
    .eq("workflow_status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Số câu ĐÃ CÔNG BỐ lớp 12 theo dạng (trang giới thiệu gói — chỉ số lượng, đếm bằng khóa bí mật). */
export async function getBankCounts(): Promise<{ mcq: number; trueFalse: number }> {
  const admin = createAdminClient();
  const count = (kind: "mcq" | "true_false") =>
    admin.from("exam_items").select("id", { count: "exact", head: true }).eq("workflow_status", "published").eq("grade", 12).eq("kind", kind);
  const [mcq, trueFalse] = await Promise.all([count("mcq"), count("true_false")]);
  return { mcq: mcq.count ?? 0, trueFalse: trueFalse.count ?? 0 };
}
