import "server-only";

import { createMockProvider } from "@/lib/payments/providers/mock";
import { PROVIDER_NAMES, type PaymentProvider, type ProviderName } from "@/lib/payments/types";

// Cấu hình thanh toán đọc từ biến môi trường (docs/ke-hoach-thanh-toan.md, mục 16.1). Mọi khóa chỉ ở server.
//   PAYMENT_PROVIDER = payos | vnpay | mock
//   PAYMENT_ENV      = test | live      (test: hiện nhãn "Môi trường thử nghiệm"; cổng giả lập CHỈ chạy khi test)
//   MOCK_PAYMENT_SECRET, PAYMENT_HASH_SALT — chuỗi ngẫu nhiên dài (≥ 32 ký tự)

const MIN_SECRET_LENGTH = 32;

export type PaymentConfig =
  | { ok: true; provider: ProviderName; env: "test" | "live"; hashSalt: string }
  | { ok: false; reason: string };

export function readPaymentConfig(): PaymentConfig {
  const provider = (process.env.PAYMENT_PROVIDER ?? "").trim() as ProviderName;
  if (!PROVIDER_NAMES.includes(provider)) {
    return { ok: false, reason: "Chưa cấu hình PAYMENT_PROVIDER (payos | vnpay | mock)." };
  }
  const env = process.env.PAYMENT_ENV?.trim() === "live" ? "live" : "test";
  const hashSalt = process.env.PAYMENT_HASH_SALT ?? "";
  if (hashSalt.length < MIN_SECRET_LENGTH) {
    return { ok: false, reason: `PAYMENT_HASH_SALT phải dài ít nhất ${MIN_SECRET_LENGTH} ký tự.` };
  }
  if (provider === "mock") {
    // Cổng giả lập ai cũng "trả tiền" được → tuyệt đối không cho chạy ở chế độ thật.
    if (process.env.PAYMENT_ENV?.trim() !== "test") {
      return { ok: false, reason: "Cổng giả lập chỉ chạy khi PAYMENT_ENV=test." };
    }
    if ((process.env.MOCK_PAYMENT_SECRET ?? "").length < MIN_SECRET_LENGTH) {
      return { ok: false, reason: `MOCK_PAYMENT_SECRET phải dài ít nhất ${MIN_SECRET_LENGTH} ký tự.` };
    }
  } else {
    return { ok: false, reason: `Cổng "${provider}" chưa được cài đặt (giai đoạn sau).` };
  }
  return { ok: true, provider, env, hashSalt };
}

/** Cổng thanh toán đang bật, hoặc null nếu cấu hình thiếu/sai (giao diện báo "tạm ngưng nhận thanh toán"). */
export function getPaymentProvider(): PaymentProvider | null {
  const config = readPaymentConfig();
  if (!config.ok) return null;
  return createMockProvider(process.env.MOCK_PAYMENT_SECRET!);
}

/** Bí mật của cổng giả lập (trang ngân hàng giả lập cần để ký webhook), hoặc null nếu không ở chế độ giả lập. */
export function mockSecret(): string | null {
  const config = readPaymentConfig();
  return config.ok && config.provider === "mock" ? process.env.MOCK_PAYMENT_SECRET! : null;
}
