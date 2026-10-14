// Máy trạng thái đơn hàng (docs/ke-hoach-thanh-toan.md, mục 7.4) — hàm thuần, unit test được.
// Phản chiếu đúng các chuyển trạng thái mà hàm SQL `mark_order_paid` / `expire_stale_orders` / thao tác quản trị cho
// phép (migration 20261015000000_payments.sql). Đây là lớp kiểm tra sớm và ẩn/hiện nút — quyền thật do database quyết.

export const ORDER_STATUSES = ["pending", "paid", "cancelled", "expired", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Các trạng thái kế tiếp hợp lệ của từng trạng thái. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled", "expired"],
  // Người dùng có thể trả tiền đúng lúc link vừa hết hạn: tiền đã vào thì phải cấp quyền, không được "nuốt" tiền.
  expired: ["paid"],
  // Hoàn tiền thực hiện ngoài hệ thống (ở cổng/ngân hàng); quản trị viên chỉ GHI NHẬN, kèm thu hồi mã.
  paid: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Trạng thái không còn đổi được nữa. */
export function isFinalStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

export function parseOrderStatus(value: string): OrderStatus | null {
  return ORDER_STATUSES.find((status) => status === value) ?? null;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Đang chờ thanh toán",
  paid: "Đã thanh toán",
  cancelled: "Đã hủy",
  expired: "Hết hạn",
  refunded: "Đã hoàn tiền",
};

/** Thông báo cho người mua (mục 16.3). */
export const orderStatusMessages: Record<OrderStatus, string> = {
  pending: "Đang chờ xác nhận thanh toán…",
  paid: "Thanh toán thành công. Cảm ơn em!",
  cancelled: "Em đã hủy thanh toán. Chưa có khoản tiền nào bị trừ.",
  expired: "Phiên thanh toán đã hết hạn. Em hãy tạo đơn mới.",
  refunded: "Đơn hàng đã được hoàn tiền.",
};

/** Lý do từ chối trả về từ các hàm SQL (`reason` trong jsonb) → thông báo tiếng Việt. */
export const PAYMENT_REASONS = [
  "not_found",
  "amount_mismatch",
  "invalid_status",
  "invalid_code",
  "revoked",
  "expired",
  "device_limit",
  "not_activated",
] as const;
export type PaymentReason = (typeof PAYMENT_REASONS)[number];

export const paymentReasonMessages: Record<PaymentReason, string> = {
  not_found: "Không tìm thấy đơn hàng hoặc mã.",
  amount_mismatch: "Số tiền nhận được không khớp đơn hàng. Quản trị viên sẽ kiểm tra và liên hệ em.",
  invalid_status: "Đơn hàng không ở trạng thái có thể xử lý.",
  invalid_code: "Mã kích hoạt không đúng. Em kiểm tra lại từng ký tự nhé.",
  revoked: "Mã kích hoạt này đã bị thu hồi.",
  expired: "Mã kích hoạt đã hết hạn sử dụng.",
  device_limit: "Mã này đã dùng trên 3 thiết bị. Hãy liên hệ để được gỡ thiết bị cũ.",
  not_activated: "Máy này chưa kích hoạt gói luyện thi.",
};

export function paymentReasonMessage(reason: string | null | undefined): string {
  const known = PAYMENT_REASONS.find((item) => item === reason);
  return known ? paymentReasonMessages[known] : "Có lỗi xảy ra, em thử lại sau ít phút nhé.";
}
