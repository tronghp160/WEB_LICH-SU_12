import "server-only";

import { PayOS } from "@payos/node";
import { createMockProvider } from "@/lib/payments/providers/mock";
import { createPayosProvider } from "@/lib/payments/providers/payos";
import { PROVIDER_NAMES, type PaymentProvider, type ProviderName } from "@/lib/payments/types";

// Cấu hình thanh toán đọc từ biến môi trường (docs/ke-hoach-thanh-toan.md, mục 16.1). Mọi khóa chỉ ở server.
//   PAYMENT_PROVIDER = payos | vnpay | mock
//   PAYMENT_ENV      = test | live      (test: hiện nhãn "Môi trường thử nghiệm"; cổng giả lập CHỈ chạy khi test)
//   PAYMENT_HASH_SALT — chuỗi ngẫu nhiên dài (≥ 32 ký tự)
//   mock:  MOCK_PAYMENT_SECRET (≥ 32 ký tự)
//   payos: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY (my.payos.vn → Kênh thanh toán)

const MIN_SECRET_LENGTH = 32;
const PAYOS_KEYS = ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"] as const;

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
  switch (provider) {
    case "mock":
      // Cổng giả lập ai cũng "trả tiền" được → tuyệt đối không cho chạy ở chế độ thật.
      if (process.env.PAYMENT_ENV?.trim() !== "test") {
        return { ok: false, reason: "Cổng giả lập chỉ chạy khi PAYMENT_ENV=test." };
      }
      if ((process.env.MOCK_PAYMENT_SECRET ?? "").length < MIN_SECRET_LENGTH) {
        return { ok: false, reason: `MOCK_PAYMENT_SECRET phải dài ít nhất ${MIN_SECRET_LENGTH} ký tự.` };
      }
      break;
    case "payos": {
      const missing = PAYOS_KEYS.filter((key) => !process.env[key]?.trim());
      if (missing.length > 0) return { ok: false, reason: `Thiếu ${missing.join(", ")} cho cổng payOS.` };
      break;
    }
    default:
      return { ok: false, reason: `Cổng "${provider}" chưa được cài đặt.` };
  }
  return { ok: true, provider, env, hashSalt };
}

/** Cổng thanh toán đang bật, hoặc null nếu cấu hình thiếu/sai (giao diện báo "tạm ngưng nhận thanh toán"). */
export function getPaymentProvider(): PaymentProvider | null {
  const config = readPaymentConfig();
  if (!config.ok) return null;
  if (config.provider === "payos") {
    return createPayosProvider(
      new PayOS({
        clientId: process.env.PAYOS_CLIENT_ID!.trim(),
        apiKey: process.env.PAYOS_API_KEY!.trim(),
        checksumKey: process.env.PAYOS_CHECKSUM_KEY!.trim(),
        // Server action chờ link thanh toán: không để người mua đợi quá lâu khi cổng chậm.
        timeout: 15_000,
        maxRetries: 1,
        logLevel: "off",
      }),
    );
  }
  return createMockProvider(process.env.MOCK_PAYMENT_SECRET!);
}

/** Bí mật của cổng giả lập (trang ngân hàng giả lập cần để ký webhook), hoặc null nếu không ở chế độ giả lập. */
export function mockSecret(): string | null {
  const config = readPaymentConfig();
  return config.ok && config.provider === "mock" ? process.env.MOCK_PAYMENT_SECRET! : null;
}
