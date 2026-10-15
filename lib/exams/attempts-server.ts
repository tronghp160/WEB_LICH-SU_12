import "server-only";

import type { Json } from "@/lib/database.types";
import { ATTEMPT_BODY_LIMIT, ATTEMPT_STATUS_BY_REASON, answersBodySchema, type AnswersBody, type PracticeOptions } from "@/lib/exams/attempt";
import type { Blueprint } from "@/lib/exams/blueprint";
import { DEVICE_HEADER, LICENSE_HEADER } from "@/lib/exams/exam";
import type { GeneratedExam, PoolItem } from "@/lib/exams/generate";
import { normalizeLicenseCode } from "@/lib/payments/license";
import { deviceHash } from "@/lib/payments/licenses";
import { consumeRateLimit, type RateLimitBucket } from "@/lib/payments/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Lượt làm bài luyện thi phía server (docs/ke-hoach-luyen-thi.md, GĐ2). Người gọi xác định bằng tài khoản (user id từ
// token đã xác minh — getClaims) và / hoặc mã thiết bị (header, băm có muối). Hàm SQL chỉ service_role gọi được → khóa bí
// mật; hàm SQL tự kiểm chủ lượt. Mã kích hoạt / thiết bị đi trong header, không nằm trong URL.

export const NO_STORE = { "Cache-Control": "private, no-store" };

export type Caller = { userId: string | null; deviceHash: string | null; code: string | null };

export async function readCaller(request: Request): Promise<Caller> {
  const { data } = await (await createClient()).auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const device = request.headers.get(DEVICE_HEADER);
  const rawCode = request.headers.get(LICENSE_HEADER);
  return { userId, deviceHash: device ? deviceHash(device) : null, code: rawCode ? normalizeLicenseCode(rawCode) : null };
}

/** Trả JSON của hàm SQL; `ok: false` → mã HTTP theo lý do. */
export function attemptResponse(result: unknown): Response {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503, headers: NO_STORE });
  }
  const body = result as Record<string, unknown>;
  if (body.ok !== true) {
    const reason = typeof body.reason === "string" ? body.reason : "unavailable";
    return Response.json({ ok: false, reason }, { status: ATTEMPT_STATUS_BY_REASON[reason] ?? 503, headers: NO_STORE });
  }
  return Response.json(body, { headers: NO_STORE });
}

export const failure = (reason: string) => attemptResponse({ ok: false, reason });

/** Giới hạn tần suất. Không đếm được (mất kết nối, thiếu cấu hình) → CHO QUA: làm bài không được hỏng vì bộ đếm. */
export async function rateLimited(bucket: RateLimitBucket, key: string): Promise<boolean> {
  return (await consumeRateLimit(bucket, key)) === "limited";
}

/** Đọc thân { answers } ≤ 32 KB; sai → null. Thân rỗng → không có câu trả lời. */
export async function readAnswersBody(request: Request): Promise<AnswersBody | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > ATTEMPT_BODY_LIMIT) return null;
  const text = await request.text();
  if (text.length > ATTEMPT_BODY_LIMIT) return null;
  if (text.trim() === "") return { answers: {} };
  try {
    const parsed = answersBodySchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const rpc = () => createAdminClient();

export async function getExamIntro(slug: string, caller: Caller) {
  return rpc().rpc("get_exam_intro", { p_slug: slug, p_code: caller.code ?? "", p_device_hash: caller.deviceHash ?? "", p_user_id: caller.userId });
}

export async function startExamAttempt(slug: string, caller: Caller) {
  return rpc().rpc("start_exam_attempt", {
    p_slug: slug,
    p_code: caller.code ?? "",
    p_device_hash: caller.deviceHash ?? "",
    p_user_id: caller.userId,
    p_mode: "exam",
  });
}

export async function saveAttemptAnswers(id: string, caller: Caller, body: AnswersBody) {
  return rpc().rpc("save_attempt_answers", { p_attempt_id: id, p_user_id: caller.userId, p_device_hash: caller.deviceHash ?? "", p_answers: body.answers as Json });
}

export async function submitExamAttempt(id: string, caller: Caller, body: AnswersBody) {
  return rpc().rpc("submit_exam_attempt", { p_attempt_id: id, p_user_id: caller.userId, p_device_hash: caller.deviceHash ?? "", p_answers: body.answers as Json });
}

/** Đủ ngần này lượt nộp của một đề mới tính thứ hạng (mục 4.2). */
export const PERCENTILE_MIN_ATTEMPTS = 30;

/**
 * "Em cao hơn N% lượt làm đề này": so điểm lượt (đã nộp, chế độ thi) với mọi lượt đã nộp của cùng đề. Gọi SAU khi
 * get_attempt_result đã xác nhận người gọi là chủ lượt. Chưa đủ 30 lượt hoặc lỗi → null.
 */
export async function attemptPercentile(id: string): Promise<number | null> {
  const db = rpc();
  const { data: mine } = await db.from("exam_attempts").select("set_id, score10, mode").eq("id", id).maybeSingle();
  if (!mine?.set_id || mine.score10 === null || mine.mode !== "exam") return null;
  const base = () => db.from("exam_attempts").select("id", { count: "exact", head: true }).eq("set_id", mine.set_id!).eq("status", "submitted").eq("mode", "exam");
  const [{ count: total, error }, { count: lower }] = await Promise.all([base(), base().lt("score10", mine.score10)]);
  if (error || total === null || total < PERCENTILE_MIN_ATTEMPTS) return null;
  return Math.round(((lower ?? 0) / total) * 100);
}

export async function getAttemptResult(id: string, caller: Caller) {
  return rpc().rpc("get_attempt_result", { p_attempt_id: id, p_user_id: caller.userId, p_device_hash: caller.deviceHash ?? "" });
}

// ----- Luyện tập, sổ câu sai (GĐ4, migration 20261027000000_exam_practice.sql) -----

export async function startPracticeAttempt(caller: Caller, options: PracticeOptions) {
  return rpc().rpc("start_practice_attempt", { p_user_id: caller.userId, p_code: caller.code ?? "", p_device_hash: caller.deviceHash ?? "", p_options: options as Json });
}

export async function checkAttemptItem(id: string, caller: Caller, itemId: string, answer: Json) {
  return rpc().rpc("check_attempt_item", { p_attempt_id: id, p_user_id: caller.userId, p_device_hash: caller.deviceHash ?? "", p_item_id: itemId, p_answer: answer });
}

/** Đọc thân JSON ≤ 32 KB theo schema; sai → null. */
export async function readJsonBody<T>(request: Request, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }): Promise<T | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > ATTEMPT_BODY_LIMIT) return null;
  const text = await request.text();
  if (text.length > ATTEMPT_BODY_LIMIT) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(text || "{}"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type NotebookItem = { itemId: string; kind: "mcq" | "true_false"; stem: string; lessonSlug: string | null; box: number; dueAt: string; wrongCount: number };

/** Sổ câu sai của tài khoản `userId` (id từ phiên đã xác minh). Lỗi → null. Không có đáp án. */
export async function getNotebook(userId: string): Promise<{ total: number; due: number; items: NotebookItem[] } | null> {
  const { data, error } = await rpc().rpc("get_notebook", { p_user_id: userId });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
  const body = data as { total?: number; due?: number; items?: Record<string, unknown>[] };
  return {
    total: Number(body.total) || 0,
    due: Number(body.due) || 0,
    items: (body.items ?? []).map((item) => ({
      itemId: String(item.item_id),
      kind: item.kind === "true_false" ? "true_false" : "mcq",
      stem: String(item.stem),
      lessonSlug: typeof item.lesson_slug === "string" ? item.lesson_slug : null,
      box: Number(item.box) || 1,
      dueAt: String(item.due_at),
      wrongCount: Number(item.wrong_count) || 0,
    })),
  };
}

/** Tài khoản có gói luyện thi còn hiệu lực không (để trang sổ câu sai mời mua / cho ôn). */
export async function hasAccountPack(userId: string): Promise<boolean> {
  const { data } = await rpc()
    .from("licenses")
    .select("id, valid_until, products!inner(kind)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("products.kind", "exam_pack");
  return (data ?? []).some((license) => !license.valid_until || Date.parse(license.valid_until) >= Date.now());
}

// ----- Đề tự sinh theo ma trận (GĐ5, migration 20261028000000_exam_generated.sql) -----

/** Câu làm trong ngần này ngày được tránh khi sinh đề mới (mục 4.4). */
export const RECENT_DAYS = 14;

/**
 * Thông tin phân loại các câu ĐÃ CÔNG BỐ lớp 12 để sinh đề — chỉ id, dạng, bài, mức độ, tư liệu, sự kiện, đáp án gốc (để
 * rải đáp án), KHÔNG có nội dung câu hỏi. Đọc bằng khóa bí mật vì bảng exam_items không mở cho học sinh (có đáp án); kết
 * quả chỉ dùng trên server, không trả ra trình duyệt. (Lệch mục 7.5 của kế hoạch — ghi ở docs/ke-hoach-luyen-thi.md.)
 */
export async function loadGeneratorPool(): Promise<PoolItem[] | null> {
  const { data, error } = await rpc()
    .from("exam_items")
    .select("id, kind, lesson_slug, level, passage_id, event_id, correct_index")
    .eq("workflow_status", "published")
    .eq("grade", 12)
    .limit(5000);
  if (error || !data) return null;
  return data.map((item) => ({
    id: item.id,
    kind: item.kind,
    lessonSlug: item.lesson_slug,
    level: item.level,
    passageId: item.passage_id,
    eventId: item.event_id,
    correctIndex: item.correct_index,
  }));
}

/** Câu người gọi đã gặp trong RECENT_DAYS ngày (mọi lượt của tài khoản, hoặc của thiết bị khi chưa đăng nhập). */
export async function recentItemIds(caller: Caller): Promise<Set<string>> {
  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
  let query = rpc().from("exam_attempts").select("item_ids").gte("started_at", since).limit(200);
  if (caller.userId) query = query.eq("user_id", caller.userId);
  else if (caller.deviceHash) query = query.eq("device_hash", caller.deviceHash).is("user_id", null);
  else return new Set();
  const { data } = await query;
  return new Set((data ?? []).flatMap((row) => row.item_ids));
}

export async function getGeneratedIntro(blueprint: string, caller: Caller) {
  return rpc().rpc("get_generated_intro", { p_user_id: caller.userId, p_code: caller.code ?? "", p_device_hash: caller.deviceHash ?? "", p_blueprint: blueprint });
}

export async function startGeneratedAttempt(blueprint: Blueprint, caller: Caller, exam: GeneratedExam) {
  return rpc().rpc("start_generated_attempt", {
    p_user_id: caller.userId,
    p_code: caller.code ?? "",
    p_device_hash: caller.deviceHash ?? "",
    p_blueprint: blueprint.id,
    p_item_ids: exam.items.map((item) => item.itemId),
    p_sections: exam.items.map((item) => item.section),
    p_shifts: exam.items.map((item) => item.shift),
    p_duration_min: blueprint.durationMin,
  });
}
