import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { readPaymentConfig } from "@/lib/payments/config";
import { saltedHash } from "@/lib/payments/crypto";
import { normalizeLicenseCode } from "@/lib/payments/license";

// Kích hoạt mã (docs/ke-hoach-thanh-toan.md, mục 7.1). Lấy đề / lượt làm bài: lib/exams/attempts-server.ts. Mã thiết bị (UUID ngẫu nhiên trong
// localStorage) chỉ được gửi xuống DB dưới dạng băm có muối. Hàm SQL chỉ service_role gọi được → dùng khóa bí mật.

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mã thiết bị (UUID trong localStorage) → băm có muối; sai dạng hoặc thiếu cấu hình → null. */
export function deviceHash(deviceId: string): string | null {
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
