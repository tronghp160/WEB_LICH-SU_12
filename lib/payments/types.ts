// Kiểu dùng chung cho chức năng thanh toán (docs/ke-hoach-thanh-toan.md, mục 5.3).
// Mọi cổng thanh toán (payOS, VNPAY, cổng giả lập) cài đặt chung interface `PaymentProvider` → đổi cổng không ảnh
// hưởng phần còn lại.

export const PROVIDER_NAMES = ["payos", "vnpay", "mock"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

/** Khớp enum `public.product_kind`. */
export type ProductKind = "exam_pack" | "donation";

export type CheckoutInput = {
  /** Số đơn duy nhất (bigint trong DB, luôn < 2^53). */
  orderCode: number;
  /** Số nguyên VND, do server tính từ bảng `products` — không bao giờ lấy từ trình duyệt. */
  amountVnd: number;
  /** ≤ 25 ký tự, không dấu (xem `paymentDescription`). */
  description: string;
  itemName: string;
  returnUrl: string;
  cancelUrl: string;
  expiresAt: Date;
  /** VNPAY bắt buộc. */
  buyerIp: string;
};

export type CheckoutResult = { checkoutUrl: string; providerRef: string | null };

/** Kết quả đã XÁC THỰC chữ ký — chỉ hàm verify của cổng mới tạo ra kiểu này. */
export type VerifiedPayment = {
  orderCode: number;
  amountVnd: number;
  status: "paid" | "cancelled" | "failed";
  /** Mã giao dịch phía cổng. */
  providerRef: string;
  /** Dữ liệu gốc, lưu vào `payment_events.payload`. */
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: ProviderName;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Trả null nếu chữ ký sai / dữ liệu hỏng. KHÔNG được ném lỗi ra ngoài route handler. */
  verifyWebhook(request: Request): Promise<VerifiedPayment | null>;
  /** Hỏi lại cổng trạng thái thật của đơn (đối soát). */
  getStatus(orderCode: number): Promise<VerifiedPayment | { status: "pending" }>;
  cancel?(orderCode: number, reason: string): Promise<void>;
  /** Phản hồi webhook đúng định dạng cổng mong đợi (VNPAY cần JSON RspCode). */
  webhookResponse(ok: boolean, reason?: string): Response;
}
