"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { hasAccountPack } from "@/lib/exams/attempts-server";
import { daysUntilExam, EXAM_DATE } from "@/lib/exams/config";
import { examPaths } from "@/lib/exams/exam";
import { lessonMastery } from "@/lib/exams/next-step";
import { loadLearnerOverview } from "@/lib/exams/overview-server";
import { buildStudyPlan, PLAN_GOALS, PLAN_PER_WEEK } from "@/lib/exams/study-plan";
import { createClient } from "@/lib/supabase/server";

// Mục tiêu điểm và lộ trình ôn (docs/ke-hoach-luyen-thi.md, mục 4.6, 4.7 — GĐ5). Ghi vào learner_profiles của CHÍNH người
// đang đăng nhập bằng phiên của họ (RLS own_update) — user id lấy từ phiên đã xác minh, không nhận từ form. Thuộc gói:
// kiểm lại gói ở đây, không chỉ dựa vào trang.

const goalSchema = z.coerce.number().min(1).max(10).multipleOf(0.5);
const planSchema = z.object({
  goal: z.coerce.number().refine((value) => (PLAN_GOALS as readonly number[]).includes(value)),
  perWeek: z.coerce.number().refine((value) => (PLAN_PER_WEEK as readonly number[]).includes(value)),
});

async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  return { supabase, userId };
}

export async function saveExamGoalAction(formData: FormData): Promise<void> {
  const { supabase, userId } = await currentUser();
  if (!userId) redirect(examPaths.overview);
  const goal = goalSchema.safeParse(formData.get("goal"));
  if (!goal.success || !(await hasAccountPack(userId))) redirect(`${examPaths.overview}?loi=muc-tieu`);
  const { data, error } = await supabase.from("learner_profiles").update({ exam_goal: goal.data }).eq("id", userId).select("id");
  redirect(error || !data?.length ? `${examPaths.overview}?loi=muc-tieu` : `${examPaths.overview}?da-luu=muc-tieu`);
}

export async function buildStudyPlanAction(formData: FormData): Promise<void> {
  const { supabase, userId } = await currentUser();
  if (!userId) redirect(examPaths.plan);
  const parsed = planSchema.safeParse({ goal: formData.get("goal"), perWeek: formData.get("perWeek") });
  if (!parsed.success || !(await hasAccountPack(userId))) redirect(`${examPaths.plan}?loi=1`);
  const overview = await loadLearnerOverview().catch(() => null);
  if (!overview) redirect(`${examPaths.plan}?loi=1`);
  const plan = buildStudyPlan({ goal: parsed.data.goal, perWeek: parsed.data.perWeek, mastery: lessonMastery(overview.attempts), daysToExam: daysUntilExam(EXAM_DATE) });
  // Lập lộ trình cũng đặt mục tiêu điểm (9 = "9+") — tổng quan dùng chung.
  const { data, error } = await supabase
    .from("learner_profiles")
    .update({ exam_goal: parsed.data.goal, study_plan: plan as unknown as Json })
    .eq("id", userId)
    .select("id");
  redirect(error || !data?.length ? `${examPaths.plan}?loi=1` : `${examPaths.plan}?da-luu=1`);
}
