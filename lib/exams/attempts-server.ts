import "server-only";

import type { Json } from "@/lib/database.types";
import { ATTEMPT_BODY_LIMIT, ATTEMPT_STATUS_BY_REASON, answersBodySchema, type AnswersBody } from "@/lib/exams/attempt";
import { DEVICE_HEADER, LICENSE_HEADER } from "@/lib/exams/exam";
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

export async function getAttemptResult(id: string, caller: Caller) {
  return rpc().rpc("get_attempt_result", { p_attempt_id: id, p_user_id: caller.userId, p_device_hash: caller.deviceHash ?? "" });
}
