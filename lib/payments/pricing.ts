// Tính tiền đơn hàng (docs/ke-hoach-thanh-toan.md, mục 5.2 và 3.2) — hàm thuần, unit test được.
// Nguyên tắc: số tiền LUÔN do server quyết định từ dòng `products`; form chỉ gửi slug sản phẩm (và số tiền ủng hộ, được
// kiểm tra khoảng ở đây). Không bao giờ tin số tiền từ trình duyệt.

import type { ProductKind } from "@/lib/payments/types";

/** Các cột của `products` cần để tính tiền. */
export type PricedProduct = {
  kind: ProductKind;
  price_vnd: number | null;
  min_vnd: number | null;
  max_vnd: number | null;
  is_active: boolean;
};

/** Mức chọn nhanh ở form ủng hộ. */
export const DONATION_PRESETS = [10_000, 20_000, 50_000] as const;

export type AmountResult = { ok: true; amountVnd: number } | { ok: false; error: string };

/**
 * Số tiền của đơn: gói luyện thi lấy đúng giá trong DB (bỏ qua mọi số tiền gửi lên);
 * ủng hộ lấy số người dùng chọn nhưng phải là số nguyên trong [min_vnd, max_vnd].
 */
export function resolveOrderAmount(product: PricedProduct, requestedVnd?: number | null): AmountResult {
  if (!product.is_active) return { ok: false, error: "Sản phẩm này hiện không bán." };

  if (product.kind === "exam_pack") {
    if (product.price_vnd === null || !Number.isSafeInteger(product.price_vnd) || product.price_vnd <= 0) {
      return { ok: false, error: "Sản phẩm chưa được cấu hình giá." };
    }
    return { ok: true, amountVnd: product.price_vnd };
  }

  const min = product.min_vnd;
  const max = product.max_vnd;
  if (min === null || max === null) return { ok: false, error: "Sản phẩm chưa được cấu hình khoảng tiền." };
  if (requestedVnd === null || requestedVnd === undefined || !Number.isFinite(requestedVnd)) {
    return { ok: false, error: "Em hãy chọn hoặc nhập số tiền ủng hộ." };
  }
  if (!Number.isInteger(requestedVnd)) return { ok: false, error: "Số tiền phải là số nguyên (đơn vị đồng)." };
  if (requestedVnd < min || requestedVnd > max) {
    return { ok: false, error: `Số tiền ủng hộ từ ${formatVnd(min)} đến ${formatVnd(max)}.` };
  }
  return { ok: true, amountVnd: requestedVnd };
}

/** Đọc số tiền người dùng gõ ("50.000", "50 000đ", "50000") → số nguyên, hoặc null nếu không đọc được. */
export function parseVndInput(input: string): number | null {
  const digits = input.replace(/[\s.,_]/g, "").replace(/(đ|d|vnd|vnđ)$/i, "");
  if (!/^\d{1,10}$/.test(digits)) return null;
  return Number(digits);
}

/** 29000 → "29.000đ" (định dạng Việt Nam, không phụ thuộc ICU của máy chạy). */
export function formatVnd(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const digits = String(Math.abs(Math.trunc(amount)));
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

/** Độ dài tối đa của nội dung chuyển khoản — payOS giới hạn rất ngắn, giữ ≤ 25 cho chắc (mục 4). */
export const DESCRIPTION_MAX_LENGTH = 25;

/** Nội dung chuyển khoản: ngắn, chỉ chữ không dấu + số, ví dụ "LT12 DH100123" / "UH12 DH100123". */
export function paymentDescription(kind: ProductKind, orderCode: number): string {
  const prefix = kind === "exam_pack" ? "LT12" : "UH12";
  return `${prefix} DH${orderCode}`.slice(0, DESCRIPTION_MAX_LENGTH);
}

/** Mức hiển thị trên Bức tường cảm ơn — không bao giờ lộ số tiền chính xác (khớp view `donation_wall`). */
export function donationTier(amountVnd: number): string {
  if (amountVnd < 50_000) return "Ủng hộ";
  if (amountVnd < 200_000) return "Ủng hộ nhiệt tình";
  return "Nhà hảo tâm";
}
