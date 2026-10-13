import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { readPaymentConfig } from "@/lib/payments/config";
import { saltedHash } from "@/lib/payments/crypto";

// Giới hạn số lần thử theo IP (migration 20261016000000_payment_rate_limits.sql). IP chỉ gửi xuống DB dưới dạng băm có
// muối. Khi không đếm được (chưa chạy migration, mất kết nối) trả "unavailable"; nơi gọi quyết định CHO QUA (kích hoạt mã — tính năng
// đang chạy không được hỏng) hay CHẶN (tra cứu đơn — lộ mã kích hoạt nếu bị dò).

export const RATE_LIMITS = {
  /** Tra cứu đơn bằng email + mã đơn: 5 lần / 15 phút / IP. */
  order_lookup: { windowSeconds: 15 * 60, max: 5 },
  /** Kích hoạt mã: 20 lần / 15 phút / IP (người dùng thật hiếm khi quá 2–3 lần). */
  license_activation: { windowSeconds: 15 * 60, max: 20 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/** "allowed": còn hạn mức · "limited": đã vượt · "unavailable": không đếm được (nơi gọi quyết định cho qua hay chặn). */
export type RateLimitResult = "allowed" | "limited" | "unavailable";

export async function consumeRateLimit(bucket: RateLimitBucket, clientIp: string | null): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[bucket];
  const config = readPaymentConfig();
  if (!config.ok) return "unavailable";
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_key_hash: saltedHash(config.hashSalt, `ip:${clientIp ?? "khong-ro"}`),
    p_window_seconds: rule.windowSeconds,
    p_max: rule.max,
  });
  if (error || typeof data !== "boolean") return "unavailable";
  return data ? "allowed" : "limited";
}
