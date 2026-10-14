import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider, readPaymentConfig } from "@/lib/payments/config";
import { randomToken, safeEqualHex, saltedHash, sha256Hex } from "@/lib/payments/crypto";
import { generateLicenseCode } from "@/lib/payments/license";
import type { OrderStatus } from "@/lib/payments/order-status";
import { paymentDescription, resolveOrderAmount } from "@/lib/payments/pricing";
import type { PaymentProvider, ProductKind, VerifiedPayment } from "@/lib/payments/types";
import { siteUrl } from "@/lib/site";
import type { Json } from "@/lib/database.types";

// Nghiệp vụ đơn hàng phía server (docs/ke-hoach-thanh-toan.md, mục 7). Ghi bằng khóa bí mật vì khách không có quyền
// gì trên các bảng thanh toán; mọi lần chuyển sang `paid` đi qua hàm SQL `mark_order_paid`.

type Db = ReturnType<typeof createAdminClient>;

/** Cookie xem đơn: mỗi đơn một cookie `ls12_don_<mã đơn>` chứa token; DB chỉ lưu sha256(token). */
export const ORDER_COOKIE_PREFIX = "ls12_don_";
export const ORDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const orderCookieName = (orderCode: number) => `${ORDER_COOKIE_PREFIX}${orderCode}`;

export const resultPath = (orderCode: number) => `/thanh-toan/ket-qua?don=${orderCode}`;

/** Tối đa số đơn đang chờ cho một IP trong 10 phút (chống spam tạo đơn). */
const MAX_PENDING_PER_IP = 5;

export type CreateOrderInput = {
  productSlug: string;
  requestedVnd?: number | null;
  buyerEmail?: string | null;
  displayName?: string | null;
  message?: string | null;
  showOnWall?: boolean;
  clientIp: string | null;
};

export type CreateOrderResult = { ok: true; orderCode: number; token: string; checkoutUrl: string } | { ok: false; error: string };

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const config = readPaymentConfig();
  const provider = getPaymentProvider();
  if (!config.ok || !provider) return { ok: false, error: "Web đang tạm ngưng nhận thanh toán. Em thử lại sau nhé." };

  const db = createAdminClient();
  await db.rpc("expire_stale_orders");

  const { data: product, error: productError } = await db
    .from("products")
    .select("id, slug, kind, name, price_vnd, min_vnd, max_vnd, is_active")
    .eq("slug", input.productSlug)
    .maybeSingle();
  if (productError) return { ok: false, error: "Không tải được thông tin sản phẩm. Em thử lại sau ít phút nhé." };
  if (!product) return { ok: false, error: "Không tìm thấy sản phẩm." };

  const amount = resolveOrderAmount(product, input.requestedVnd);
  if (!amount.ok) return { ok: false, error: amount.error };

  const ipHash = input.clientIp ? saltedHash(config.hashSalt, input.clientIp) : null;
  if (ipHash) {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("client_ip_hash", ipHash)
      .eq("status", "pending")
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PENDING_PER_IP) {
      return { ok: false, error: "Em đã tạo nhiều đơn chưa thanh toán. Đợi khoảng 10 phút rồi thử lại nhé." };
    }
  }

  const isDonation = product.kind === "donation";
  const token = randomToken();
  const { data: order, error: insertError } = await db
    .from("orders")
    .insert({
      product_id: product.id,
      amount_vnd: amount.amountVnd,
      provider: provider.name,
      access_token_hash: sha256Hex(token),
      client_ip_hash: ipHash,
      buyer_email: input.buyerEmail || null,
      display_name: isDonation ? input.displayName || null : null,
      message: isDonation ? input.message || null : null,
      show_on_wall: isDonation ? Boolean(input.showOnWall) : false,
    })
    .select("order_code, expires_at")
    .single();
  if (insertError || !order) return { ok: false, error: "Không tạo được đơn hàng. Em thử lại sau ít phút nhé." };

  try {
    const checkout = await provider.createCheckout({
      orderCode: order.order_code,
      amountVnd: amount.amountVnd,
      description: paymentDescription(product.kind, order.order_code),
      itemName: product.name,
      returnUrl: `${siteUrl()}${resultPath(order.order_code)}`,
      cancelUrl: `${siteUrl()}${resultPath(order.order_code)}&huy=1`,
      expiresAt: new Date(order.expires_at),
      buyerIp: input.clientIp ?? "127.0.0.1",
    });
    await db
      .from("orders")
      .update({ checkout_url: checkout.checkoutUrl, provider_ref: checkout.providerRef })
      .eq("order_code", order.order_code);
    return { ok: true, orderCode: order.order_code, token, checkoutUrl: checkout.checkoutUrl };
  } catch {
    // Cổng lỗi khi tạo link: hủy đơn để không treo "đang chờ", báo người dùng thử lại.
    await db.from("orders").update({ status: "cancelled" }).eq("order_code", order.order_code).eq("status", "pending");
    return { ok: false, error: "Cổng thanh toán đang bận. Em thử lại sau ít phút nhé." };
  }
}

export type MarkPaidResult = {
  ok: boolean;
  already?: boolean;
  reason?: string;
  status?: OrderStatus;
  kind?: ProductKind;
  license_code?: string | null;
};

/** Gọi `mark_order_paid` với mã kích hoạt mới; trùng mã (xác suất ~0) thì sinh mã khác và gọi lại. */
async function markOrderPaid(db: Db, payment: VerifiedPayment, providerName: string): Promise<MarkPaidResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db.rpc("mark_order_paid", {
      p_order_code: payment.orderCode,
      p_amount: payment.amountVnd,
      p_provider: providerName,
      p_provider_ref: payment.providerRef,
      p_license_code: generateLicenseCode(),
    });
    if (error?.code === "23505") continue;
    if (error) throw new Error("mark_order_paid thất bại");
    return data as unknown as MarkPaidResult;
  }
  throw new Error("Không sinh được mã kích hoạt không trùng");
}

/** Cột payload là jsonb NOT NULL. */
function asPayload(value: unknown): NonNullable<Json> {
  return (value ?? {}) as NonNullable<Json>;
}

function payloadForLog(text: string): NonNullable<Json> {
  try {
    return asPayload(JSON.parse(text));
  } catch {
    return { raw: text.slice(0, 2000) };
  }
}

function orderCodeFrom(payload: Json): number | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const value = (payload as Record<string, Json | undefined>).orderCode;
    if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  }
  return null;
}

export type WebhookOutcome = { ok: boolean; reason?: string; result?: MarkPaidResult };

/**
 * Xử lý một thông báo từ cổng thanh toán. Chữ ký sai → ghi nhật ký `signature_ok=false`, không đổi gì.
 * Chữ ký đúng → ghi nhật ký rồi chuyển trạng thái (idempotent: gửi lại bao nhiêu lần cũng chỉ cấp một mã).
 * Trả `ok: true` cho mọi webhook hợp lệ đã ghi nhận (kể cả khi đơn bị từ chối vì sai tiền) để cổng thôi gửi lại.
 */
export async function processWebhook(provider: PaymentProvider, request: Request): Promise<WebhookOutcome> {
  const text = await request.text();
  const verified = await provider.verifyWebhook(
    new Request(request.url, { method: "POST", headers: request.headers, body: text }),
  );
  const db = createAdminClient();
  const payload = payloadForLog(text);

  if (!verified) {
    await db.from("payment_events").insert({
      order_code: orderCodeFrom(payload),
      provider: provider.name,
      source: "webhook",
      signature_ok: false,
      payload,
      note: "bad_signature",
    });
    return { ok: false, reason: "bad_signature" };
  }

  await db.from("payment_events").insert({
    order_code: verified.orderCode,
    provider: provider.name,
    source: "webhook",
    signature_ok: true,
    status: verified.status,
    amount_vnd: verified.amountVnd,
    provider_ref: verified.providerRef,
    payload: asPayload(verified.raw),
  });

  if (verified.status === "paid") {
    const result = await markOrderPaid(db, verified, provider.name);
    return { ok: true, result };
  }
  // Giao dịch thất bại không có nghĩa người mua bỏ đơn (có thể thử lại trên cùng link) → chỉ ghi nhật ký.
  if (verified.status === "cancelled") {
    await db.from("orders").update({ status: "cancelled" }).eq("order_code", verified.orderCode).eq("status", "pending");
  }
  return { ok: true };
}

export type ReconcileOutcome = "paid" | "cancelled" | "rejected" | "unchanged" | "unavailable";

/**
 * Hỏi lại cổng trạng thái thật của đơn và cập nhật theo (dùng khi webhook đến muộn / không tới, và ở nút "Đối soát"
 * của quản trị viên). Mọi kết quả khác "đang chờ" đều được ghi nhật ký.
 */
export async function reconcileOrder(orderCode: number, source: "reconcile" | "admin", note?: string): Promise<ReconcileOutcome> {
  const provider = getPaymentProvider();
  if (!provider) return "unavailable";
  const db = createAdminClient();
  const status = await provider.getStatus(orderCode).catch(() => null);
  if (!status) return "unavailable";
  if (status.status === "pending") return "unchanged";
  await db.from("payment_events").insert({
    order_code: orderCode,
    provider: provider.name,
    source,
    signature_ok: true,
    status: status.status,
    amount_vnd: status.amountVnd,
    provider_ref: status.providerRef,
    payload: asPayload(status.raw),
    note: note ?? null,
  });
  if (status.status === "paid") {
    const result = await markOrderPaid(db, status, provider.name);
    return result.ok ? "paid" : "rejected";
  }
  if (status.status === "failed") return "unchanged";
  await db.from("orders").update({ status: "cancelled" }).eq("order_code", orderCode).eq("status", "pending");
  return "cancelled";
}

export type OrderView = {
  orderCode: number;
  status: OrderStatus;
  amountVnd: number;
  productKind: ProductKind;
  productName: string;
  productSlug: string;
  licenseCode: string | null;
  licenseActive: boolean;
  checkoutUrl: string | null;
  expiresAt: string;
  paidAt: string | null;
  showOnWall: boolean;
  wallApproved: boolean;
};

async function loadOrder(db: Db, orderCode: number) {
  const { data } = await db
    .from("orders")
    .select(
      "order_code, status, amount_vnd, access_token_hash, checkout_url, expires_at, paid_at, show_on_wall, wall_approved, products(slug, kind, name), licenses(code, status)",
    )
    .eq("order_code", orderCode)
    .maybeSingle();
  return data;
}

/**
 * Đơn hàng cho người mua xem — CHỈ khi token trong cookie khớp (không ai đoán `?don=100123` mà lấy được mã của người
 * khác). Đơn còn chờ thì hỏi lại cổng (đối soát) phòng khi webhook đến muộn hoặc không tới được (chạy localhost).
 */
export async function getOrderForBuyer(orderCode: number, token: string | undefined): Promise<OrderView | null> {
  if (!token || !Number.isSafeInteger(orderCode)) return null;
  const db = createAdminClient();
  let order = await loadOrder(db, orderCode);
  if (!order || !safeEqualHex(order.access_token_hash, sha256Hex(token))) return null;

  if (order.status === "pending" || order.status === "expired") {
    const outcome = await reconcileOrder(orderCode, "reconcile");
    if (outcome !== "unchanged") order = (await loadOrder(db, orderCode)) ?? order;
  }

  const product = order.products;
  const license = order.licenses;
  return {
    orderCode: order.order_code,
    status: order.status,
    amountVnd: order.amount_vnd,
    productKind: product.kind,
    productName: product.name,
    productSlug: product.slug,
    licenseCode: license?.code ?? null,
    licenseActive: license?.status === "active",
    checkoutUrl: order.status === "pending" ? order.checkout_url : null,
    expiresAt: order.expires_at,
    paidAt: order.paid_at,
    showOnWall: order.show_on_wall,
    wallApproved: order.wall_approved,
  };
}

/** Số tiền và trạng thái đơn — cho trang ngân hàng giả lập (đã kiểm chữ ký link trước khi gọi). */
export async function getOrderForCheckout(orderCode: number) {
  const db = createAdminClient();
  const { data } = await db
    .from("orders")
    .select("order_code, status, amount_vnd, expires_at, products(kind, name)")
    .eq("order_code", orderCode)
    .maybeSingle();
  return data;
}

export type LookupResult = {
  orderCode: number;
  status: OrderStatus;
  productName: string;
  productKind: ProductKind;
  amountVnd: number;
  paidAt: string | null;
  licenseCode: string | null;
  licenseActive: boolean;
};

/**
 * Tra cứu đơn khi người mua mất cookie (đổi máy, xóa dữ liệu trình duyệt): cần ĐÚNG CẢ mã đơn lẫn email đã nhập lúc mua.
 * Gọi sau khi đã qua giới hạn số lần thử (lib/payments/rate-limit.ts) vì mã đơn là số tăng dần, dễ đoán.
 */
export async function lookupOrder(orderCode: number, email: string): Promise<LookupResult | null> {
  if (!Number.isSafeInteger(orderCode) || !email) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("orders")
    .select("order_code, status, amount_vnd, paid_at, buyer_email, products(name, kind), licenses(code, status)")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (!data?.buyer_email || data.buyer_email.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
  return {
    orderCode: data.order_code,
    status: data.status,
    productName: data.products.name,
    productKind: data.products.kind,
    amountVnd: data.amount_vnd,
    paidAt: data.paid_at,
    licenseCode: data.status === "paid" ? (data.licenses?.code ?? null) : null,
    licenseActive: data.licenses?.status === "active",
  };
}
