import "server-only";

import type { ScoreGroup } from "@/lib/exams/attempt";
import { getBlueprint } from "@/lib/exams/blueprint";
import { examPaths } from "@/lib/exams/exam";
import type { AttemptSummary } from "@/lib/exams/next-step";
import { parseStudyPlan, type StudyPlan } from "@/lib/exams/study-plan";
import { createClient } from "@/lib/supabase/server";

// Dữ liệu trang Tổng quan / Lộ trình (GĐ5). Đọc bằng PHIÊN CỦA HỌC SINH: RLS own_select của exam_attempts và
// learner_profiles chỉ trả hàng của chính người đó — không cần khóa bí mật. Đề đã công bố đọc qua policy public_read_published.

/** Số lượt gần nhất đọc để tính tổng quan (đủ cho chuỗi ngày, bản đồ thành thạo; trang vẫn nhẹ). */
const ATTEMPT_LIMIT = 300;

function lessonGroups(breakdown: unknown): Record<string, ScoreGroup> {
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) return {};
  const lessons = (breakdown as { lessons?: unknown }).lessons;
  if (!lessons || typeof lessons !== "object" || Array.isArray(lessons)) return {};
  const result: Record<string, ScoreGroup> = {};
  for (const [slug, value] of Object.entries(lessons)) {
    const group = value as Partial<ScoreGroup> | null;
    if (group && typeof group.earned === "number" && typeof group.max === "number" && typeof group.n === "number") result[slug] = { earned: group.earned, max: group.max, n: group.n };
  }
  return result;
}

export type LearnerOverview = { userId: string; attempts: AttemptSummary[]; examGoal: number | null; studyPlan: StudyPlan | null };

/** null = chưa đăng nhập. Lỗi đọc → ném lỗi (trang hiện thông báo). */
export async function loadLearnerOverview(): Promise<LearnerOverview | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) return null;

  const [attemptsResult, profileResult] = await Promise.all([
    supabase
      .from("exam_attempts")
      .select("id, set_id, blueprint, mode, status, score10, started_at, submitted_at, deadline_at, breakdown")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(ATTEMPT_LIMIT),
    supabase.from("learner_profiles").select("exam_goal, study_plan").eq("id", userId).maybeSingle(),
  ]);
  if (attemptsResult.error) throw attemptsResult.error;
  if (profileResult.error) throw profileResult.error;
  const rows = attemptsResult.data;

  const setIds = [...new Set(rows.map((row) => row.set_id).filter((id): id is string => Boolean(id)))];
  const sets = new Map<string, { slug: string; title: string; format: string }>();
  if (setIds.length > 0) {
    const { data } = await supabase.from("exam_sets").select("id, slug, title, format").in("id", setIds);
    for (const set of data ?? []) sets.set(set.id, set);
  }

  const now = Date.now();
  const attempts = rows.map((row): AttemptSummary => {
    const set = row.set_id ? sets.get(row.set_id) : undefined;
    const blueprint = row.blueprint ? getBlueprint(row.blueprint) : null;
    const open = row.status === "in_progress" && (!row.deadline_at || Date.parse(row.deadline_at) > now);
    const kind = row.mode === "practice" ? "practice" : row.mode === "review" ? "review" : set?.format === "thpt_2025" || row.blueprint === "thpt_2025" ? "full" : "exam";
    return {
      id: row.id,
      kind,
      title: set?.title ?? (blueprint ? `Đề tự sinh — ${blueprint.label}` : row.mode === "review" ? "Ôn câu đến hạn" : row.mode === "practice" ? "Luyện tập theo bài" : "Đề luyện thi"),
      status: row.status,
      score10: row.score10,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      lessons: lessonGroups(row.breakdown),
      resumeHref: open && row.mode === "exam" ? (set ? examPaths.set(set.slug) : blueprint ? examPaths.generated(blueprint.id) : null) : null,
    };
  });

  return { userId, attempts, examGoal: profileResult.data?.exam_goal ?? null, studyPlan: parseStudyPlan(profileResult.data?.study_plan) };
}
