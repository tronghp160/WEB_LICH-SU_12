// Cổng thanh toán GIẢ LẬP (docs/ke-hoach-thanh-toan.md, mục 4 và 8.1) — để phát triển, chạy E2E và demo không cần
// mạng. Hoạt động giống cổng thật: trang "ngân hàng giả lập" (/thanh-toan/gia-lap) gửi webhook có chữ ký HMAC-SHA256;
// server chỉ tin webhook có chữ ký đúng. Chỉ bật được khi PAYMENT_ENV=test (xem lib/payments/config.ts).

import { hmacSha256Hex, safeEqualHex } from "@/lib/payments/crypto";
import type { CheckoutInput, CheckoutResult, PaymentProvider, VerifiedPayment } from "@/lib/payments/types";

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";
export const MOCK_CHECKOUT_PATH = "/thanh-toan/gia-lap";

/** Nội dung webhook của cổng giả lập. */
export type MockWebhookBody = {
  orderCode: number;
  amount: number;
  status: "paid" | "cancelled";
  transactionId: string;
};

/** Chữ ký của link trang ngân hàng giả lập — chỉ link do server cấp mới mở được trang trả tiền. */
export function mockCheckoutSignature(secret: string, orderCode: number): string {
  return hmacSha256Hex(secret, `checkout:${orderCode}`);
}

export function verifyMockCheckoutSignature(secret: string, orderCode: number, signature: string): boolean {
  return safeEqualHex(mockCheckoutSignature(secret, orderCode), signature);
}

/** Tạo webhook đã ký như cổng thật sẽ gửi (dùng ở trang ngân hàng giả lập và trong test). */
export function signMockWebhook(secret: string, body: MockWebhookBody): { body: string; signature: string } {
  const text = JSON.stringify(body);
  return { body: text, signature: hmacSha256Hex(secret, text) };
}

function parseBody(value: unknown): MockWebhookBody | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const { orderCode, amount, status, transactionId } = body;
  if (!Number.isSafeInteger(orderCode) || (orderCode as number) <= 0) return null;
  if (!Number.isSafeInteger(amount) || (amount as number) <= 0) return null;
  if (status !== "paid" && status !== "cancelled") return null;
  if (typeof transactionId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(transactionId)) return null;
  return { orderCode: orderCode as number, amount: amount as number, status, transactionId };
}

export function createMockProvider(secret: string): PaymentProvider {
  return {
    name: "mock",

    async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
      const params = new URLSearchParams({
        don: String(input.orderCode),
        sig: mockCheckoutSignature(secret, input.orderCode),
      });
      return { checkoutUrl: `${MOCK_CHECKOUT_PATH}?${params}`, providerRef: `MOCK-${input.orderCode}` };
    },

    async verifyWebhook(request: Request): Promise<VerifiedPayment | null> {
      try {
        const text = await request.text();
        const signature = request.headers.get(MOCK_SIGNATURE_HEADER) ?? "";
        // Kiểm chữ ký TRƯỚC khi đọc dữ liệu.
        if (!safeEqualHex(hmacSha256Hex(secret, text), signature.toLowerCase())) return null;
        const body = parseBody(JSON.parse(text));
        if (!body) return null;
        return { orderCode: body.orderCode, amountVnd: body.amount, status: body.status, providerRef: body.transactionId, raw: body };
      } catch {
        return null;
      }
    },

    // Ngân hàng giả lập báo kết quả ngay bằng webhook nên không có gì để đối soát thêm.
    async getStatus(): Promise<{ status: "pending" }> {
      return { status: "pending" };
    },

    webhookResponse(ok: boolean, reason?: string): Response {
      return Response.json({ ok, ...(reason ? { reason } : {}) }, { status: ok ? 200 : 400 });
    },
  };
}
