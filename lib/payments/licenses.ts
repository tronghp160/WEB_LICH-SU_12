import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { readPaymentConfig } from "@/lib/payments/config";
import { saltedHash } from "@/lib/payments/crypto";
import { normalizeLicenseCode } from "@/lib/payments/license";
import { parseExamPayload, type ExamPayload } from "@/lib/exams/exam";

// Kích hoạt mã và lấy đề luyện thi (docs/ke-hoach-thanh-toan.md, mục 7.1–7.2). Mã thiết bị (UUID ngẫu nhiên trong
// localStorage) chỉ được gửi xuống DB dưới dạng băm có muối. Hàm SQL chỉ service_role gọi được → dùng khóa bí mật.

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deviceHash(deviceId: string): string | null {
  const config = readPaymentConfig();
  if (!config.ok || !DEVICE_ID.test(deviceId)) return null;
  return saltedHash(config.hashSalt, deviceId.toLowerCase());
}

export type ActivationResult =
  | { ok: true; code: string; productSlug: string | null; validUntil: string | null; devicesUsed: number; maxDevices: number }
  | { ok: false; reason: string };

export async function activateLicense(rawCode: string, deviceId: string): Promise<ActivationResult> {
  const code = normalizeLicenseCode(rawCode);
  if (!code) return { ok: false, reason: "invalid_code" };
  const hash = deviceHash(deviceId);
  if (!hash) return { ok: false, reason: "unavailable" };

  const { data, error } = await createAdminClient().rpc("activate_license", { p_code: code, p_device_hash: hash });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return { ok: false, reason: "unavailable" };
  const result = data as Record<string, unknown>;
  if (result.ok !== true) return { ok: false, reason: typeof result.reason === "string" ? result.reason : "unavailable" };
  return {
    ok: true,
    code,
    productSlug: typeof result.product_slug === "string" ? result.product_slug : null,
    validUntil: typeof result.valid_until === "string" ? result.valid_until : null,
    devicesUsed: Number(result.devices_used) || 1,
    maxDevices: Number(result.max_devices) || 3,
  };
}

/** Đề được mở bằng gì: miễn phí, gói gắn với tài khoản đang đăng nhập, hay mã + thiết bị. */
export type ExamAccess = "free" | "account" | "code";

export type ExamFetchResult = { ok: true; exam: ExamPayload; access: ExamAccess } | { ok: false; reason: string };

/**
 * Câu hỏi của một đề: đề miễn phí trả luôn; đề trả phí mở khi tài khoản `userId` (id từ phiên đã xác minh) có gói còn
 * hiệu lực — không tính lượt thiết bị — hoặc khi có mã còn hiệu lực và máy đã kích hoạt (docs/ke-hoach-tai-khoan.md, 7.2).
 */
export async function fetchExam(slug: string, rawCode: string | null, deviceId: string | null, userId: string | null = null): Promise<ExamFetchResult> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return { ok: false, reason: "not_found" };
  const code = rawCode ? normalizeLicenseCode(rawCode) : null;
  const hash = deviceId ? deviceHash(deviceId) : null;

  const { data, error } = await createAdminClient().rpc("get_exam_set", {
    p_slug: slug,
    p_code: code ?? "",
    p_device_hash: hash ?? "",
    p_user_id: userId ?? undefined,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return { ok: false, reason: "unavailable" };
  const result = data as Record<string, unknown>;
  if (result.ok !== true) return { ok: false, reason: typeof result.reason === "string" ? result.reason : "unavailable" };
  const exam = parseExamPayload(result);
  const access: ExamAccess = result.access === "account" || result.access === "code" ? result.access : "free";
  return exam ? { ok: true, exam, access } : { ok: false, reason: "unavailable" };
}
