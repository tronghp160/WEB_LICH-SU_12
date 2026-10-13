// Cổng payOS (docs/ke-hoach-thanh-toan.md, mục 4) — chuyển khoản VietQR qua SDK chính thức @payos/node 2.x.
// Đã đối chiếu SDK (node_modules/@payos/node) và tài liệu https://payos.vn/docs/api/:
//   • paymentRequests.create() tự ký yêu cầu bằng checksum key và kiểm chữ ký phản hồi.
//   • webhooks.verify() NÉM LỖI khi chữ ký sai → ta bắt lại và trả null (không bao giờ ném ra route handler).
//   • description: tài khoản ngân hàng không liên kết qua payOS chỉ nhận 9 ký tự → dùng "DH<mã đơn>".
//   • expiredAt: Unix timestamp (Int32) → tính bằng GIÂY.
//   • Webhook chỉ gửi khi có tiền vào; hủy / hết hạn biết được qua đối soát (paymentRequests.get).
// Client được truyền vào (`PayosClient`) để unit test được mà không cần tài khoản thật.

import type { CheckoutInput, CheckoutResult, PaymentProvider, VerifiedPayment } from "@/lib/payments/types";

/** Phần SDK mà ta dùng — khớp kiểu của `PayOS` trong @payos/node 2.x. */
export type PayosClient = {
  paymentRequests: {
    create(data: {
      orderCode: number;
      amount: number;
      description: string;
      cancelUrl: string;
      returnUrl: string;
      items?: { name: string; quantity: number; price: number }[];
      buyerEmail?: string;
      expiredAt?: number;
    }): Promise<{ checkoutUrl: string; paymentLinkId: string }>;
    get(orderCode: number): Promise<{
      id: string;
      orderCode: number;
      amount: number;
      amountPaid: number;
      status: string;
      transactions: { reference: string; amount: number }[];
    }>;
    cancel(orderCode: number, cancellationReason?: string): Promise<unknown>;
  };
  webhooks: {
    verify(webhook: { code: string; desc: string; success: boolean; data: PayosWebhookData; signature: string }): Promise<PayosWebhookData>;
  };
};

export type PayosWebhookData = {
  orderCode: number;
  amount: number;
  description: string;
  reference: string;
  paymentLinkId: string;
  code: string;
  desc: string;
  [key: string]: unknown;
};

/** Tối đa 9 ký tự (tài khoản không liên kết qua payOS). Mã đơn bắt đầu từ 100001 → "DH100001" (8 ký tự). */
export const PAYOS_DESCRIPTION_MAX = 9;

export function payosDescription(orderCode: number): string {
  const text = `DH${orderCode}`;
  return text.length <= PAYOS_DESCRIPTION_MAX ? text : String(orderCode).slice(-PAYOS_DESCRIPTION_MAX);
}

/** Trạng thái link payOS → trạng thái của ta. UNDERPAID (trả thiếu) / PROCESSING vẫn coi là chờ: quản trị viên xử lý tay. */
export function mapPayosStatus(status: string): "paid" | "cancelled" | "failed" | "pending" {
  switch (status) {
    case "PAID":
      return "paid";
    case "CANCELLED":
    case "EXPIRED":
      return "cancelled";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function createPayosProvider(client: PayosClient): PaymentProvider {
  return {
    name: "payos",

    async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
      const link = await client.paymentRequests.create({
        orderCode: input.orderCode,
        amount: input.amountVnd,
        description: payosDescription(input.orderCode),
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        items: [{ name: input.itemName.slice(0, 100), quantity: 1, price: input.amountVnd }],
        expiredAt: Math.floor(input.expiresAt.getTime() / 1000),
      });
      return { checkoutUrl: link.checkoutUrl, providerRef: link.paymentLinkId };
    },

    async verifyWebhook(request: Request): Promise<VerifiedPayment | null> {
      try {
        const body: unknown = JSON.parse(await request.text());
        if (!isRecord(body) || !isRecord(body.data) || typeof body.signature !== "string") return null;
        // Kiểm chữ ký TRƯỚC khi tin bất kỳ trường nào (SDK ném lỗi nếu sai).
        const data = await client.webhooks.verify(body as Parameters<PayosClient["webhooks"]["verify"]>[0]);
        if (!Number.isSafeInteger(data.orderCode) || !Number.isSafeInteger(data.amount)) return null;
        const success = body.success === true && body.code === "00" && data.code === "00";
        return {
          orderCode: data.orderCode,
          amountVnd: data.amount,
          status: success ? "paid" : "failed",
          providerRef: String(data.reference || data.paymentLinkId || `PAYOS-${data.orderCode}`).slice(0, 100),
          raw: body,
        };
      } catch {
        return null;
      }
    },

    async getStatus(orderCode: number): Promise<VerifiedPayment | { status: "pending" }> {
      const link = await client.paymentRequests.get(orderCode);
      const status = mapPayosStatus(link.status);
      if (status === "pending") return { status: "pending" };
      return {
        orderCode: link.orderCode,
        amountVnd: status === "paid" ? link.amountPaid : link.amount,
        status,
        providerRef: link.transactions[0]?.reference || link.id,
        raw: link,
      };
    },

    async cancel(orderCode: number, reason: string): Promise<void> {
      await client.paymentRequests.cancel(orderCode, reason);
    },

    // payOS chỉ cần mã 2xx; chữ ký sai trả 400 (payOS thật không bao giờ gửi chữ ký sai).
    webhookResponse(ok: boolean, reason?: string): Response {
      return Response.json({ success: ok, ...(reason ? { reason } : {}) }, { status: ok ? 200 : 400 });
    },
  };
}
