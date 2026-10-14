import "server-only";

import type { OrderStatus } from "@/lib/payments/order-status";
import type { ProductKind } from "@/lib/payments/types";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";

// Đơn hàng và gói luyện thi của tài khoản (docs/ke-hoach-tai-khoan.md, mục 7.2–7.3). Bảng orders / licenses ĐÓNG với
// authenticated (có cột nhạy cảm: access_token_hash, client_ip_hash) → đọc bằng khóa bí mật, lọc theo user id mà nơi gọi
// lấy từ phiên ĐÃ XÁC MINH (requireLearner / getUser), không bao giờ từ tham số URL hay form. Chỉ chọn cột an toàn.

export type AccountOrder = {
  orderCode: number;
  createdAt: string;
  paidAt: string | null;
  status: OrderStatus;
  amountVnd: number;
  productName: string;
  productKind: ProductKind;
  /** Mã kích hoạt — chỉ khi đơn đã thanh toán. */
  licenseCode: string | null;
  licenseActive: boolean;
};

export type AccountLicense = {
  code: string;
  productName: string;
  productSlug: string;
  status: string;
  validUntil: string | null;
  /** Mã đến từ đơn đặt khi đăng nhập (true) hay được thêm vào sau bằng "Thêm mã" (false). */
  fromAccountOrder: boolean;
};

export async function getAccountOrders(userId: string): Promise<AccountOrder[]> {
  if (!isAdminClientConfigured()) return [];
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("order_code, created_at, paid_at, status, amount_vnd, products(name, kind), licenses(code, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Không tải được đơn hàng: ${error.message}`);
  return data.map((order) => ({
    orderCode: order.order_code,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    status: order.status,
    amountVnd: order.amount_vnd,
    productName: order.products.name,
    productKind: order.products.kind,
    licenseCode: order.status === "paid" ? (order.licenses?.code ?? null) : null,
    licenseActive: order.licenses?.status === "active",
  }));
}

/** Mọi mã kích hoạt đang gắn với tài khoản (mua khi đăng nhập + mã thêm vào sau). */
export async function getAccountLicenses(userId: string): Promise<AccountLicense[]> {
  if (!isAdminClientConfigured()) return [];
  const { data, error } = await createAdminClient()
    .from("licenses")
    .select("code, status, valid_until, created_at, products(name, slug), orders(user_id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Không tải được gói luyện thi: ${error.message}`);
  return data.map((license) => ({
    code: license.code,
    productName: license.products.name,
    productSlug: license.products.slug,
    status: license.status,
    validUntil: license.valid_until,
    fromAccountOrder: license.orders?.user_id === userId,
  }));
}

/** Gói còn dùng được (đang hoạt động, chưa hết hạn). */
export function usableLicenses(licenses: readonly AccountLicense[], now: Date = new Date()): AccountLicense[] {
  return licenses.filter((license) => license.status === "active" && (!license.validUntil || new Date(license.validUntil) >= now));
}
