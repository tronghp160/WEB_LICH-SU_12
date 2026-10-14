"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readFormValues, zodErrorState, type ActionState } from "@/lib/actions/state";
import { getPaymentProvider, mockSecret } from "@/lib/payments/config";
import { activateLicense } from "@/lib/payments/licenses";
import { consumeRateLimit } from "@/lib/payments/rate-limit";
import { requestClient } from "@/lib/request-client";
import { paymentReasonMessage } from "@/lib/payments/order-status";
import {
  createOrder,
  getOrderForCheckout,
  lookupOrder,
  type LookupResult,
  ORDER_COOKIE_MAX_AGE,
  orderCookieName,
  processWebhook,
  resultPath,
  type CreateOrderInput,
} from "@/lib/payments/orders";
import { MOCK_SIGNATURE_HEADER, signMockWebhook, verifyMockCheckoutSignature } from "@/lib/payments/providers/mock";
import { siteUrl } from "@/lib/site";
import { buyPackSchema, donationSchema } from "@/lib/validation/payments";

// Thanh toán phía người mua (docs/ke-hoach-thanh-toan.md, mục 7.1). Không cần đăng nhập: quyền xem đơn = token trong
// cookie httpOnly của riêng đơn đó.

async function startCheckout(input: Omit<CreateOrderInput, "client">, values: Record<string, string>): Promise<ActionState> {
  const result = await createOrder({ ...input, client: await requestClient() });
  if (!result.ok) return { status: "error", message: result.error, values };

  (await cookies()).set(orderCookieName(result.orderCode), result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/thanh-toan",
    maxAge: ORDER_COOKIE_MAX_AGE,
  });
  // Ngoài try/catch: redirect() ném tín hiệu nội bộ của Next.js.
  redirect(result.checkoutUrl);
}

/** Mua gói luyện thi: giá lấy ở server, form chỉ gửi slug + email (không bắt buộc). */
export async function buyPackAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const values = readFormValues(formData);
  const parsed = buyPackSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);
  return startCheckout({ productSlug: parsed.data.product, buyerEmail: parsed.data.email }, values);
}

/** Ủng hộ: số tiền người dùng chọn, server kiểm khoảng cho phép theo `products`. */
export async function donateAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const values = readFormValues(formData);
  const parsed = donationSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, values);
  const { product, amount, email, displayName, message, showOnWall } = parsed.data;
  return startCheckout(
    { productSlug: product, requestedVnd: amount, buyerEmail: email, displayName, message, showOnWall },
    values,
  );
}

const MOCK_OUTCOMES = ["paid", "cancelled", "wrong_amount"] as const;

/**
 * Nút ở trang "ngân hàng giả lập": tạo webhook ĐÃ KÝ như cổng thật rồi đưa qua đúng đường xử lý của route webhook.
 * `wrong_amount` gửi số tiền lệch 1.000đ để demo việc server từ chối.
 */
export async function mockBankAction(formData: FormData): Promise<void> {
  const secret = mockSecret();
  const provider = getPaymentProvider();
  const orderCode = Number(formData.get("don"));
  const signature = String(formData.get("sig") ?? "");
  const outcome = MOCK_OUTCOMES.find((item) => item === formData.get("outcome"));
  if (!secret || !provider || !outcome || !Number.isSafeInteger(orderCode) || !verifyMockCheckoutSignature(secret, orderCode, signature)) {
    redirect("/thanh-toan/gia-lap?loi=1");
  }

  const order = await getOrderForCheckout(orderCode);
  if (!order) redirect("/thanh-toan/gia-lap?loi=1");

  const signed = signMockWebhook(secret, {
    orderCode,
    amount: outcome === "wrong_amount" ? order.amount_vnd - 1000 : order.amount_vnd,
    status: outcome === "cancelled" ? "cancelled" : "paid",
    transactionId: `MOCKTX-${orderCode}-${Date.now()}`,
  });
  await processWebhook(
    provider,
    new Request(`${siteUrl()}/api/thanh-toan/webhook/mock`, {
      method: "POST",
      headers: { "content-type": "application/json", [MOCK_SIGNATURE_HEADER]: signed.signature },
      body: signed.body,
    }),
  );
  redirect(outcome === "cancelled" ? `${resultPath(orderCode)}&huy=1` : resultPath(orderCode));
}

export type ActivateState =
  | { ok: true; code: string; productSlug: string | null; validUntil: string | null; devicesUsed: number; maxDevices: number }
  | { ok: false; message: string };

/**
 * Kích hoạt mã trên máy này. Gọi trực tiếp từ client (không qua form state) vì cần mã thiết bị trong localStorage.
 * Mã có 60 bit ngẫu nhiên nên dò mã là không khả thi; mỗi mã còn giới hạn số thiết bị ở database.
 */
export async function activateLicenseAction(code: string, deviceId: string): Promise<ActivateState> {
  if (typeof code !== "string" || typeof deviceId !== "string" || code.length > 64 || deviceId.length > 64) {
    return { ok: false, message: paymentReasonMessage("invalid_code") };
  }
  // Không đếm được (chưa chạy migration / mất kết nối) thì vẫn cho kích hoạt — mã 60 bit nên dò mã không khả thi.
  if ((await consumeRateLimit("license_activation", (await requestClient()).key)) === "limited") {
    return { ok: false, message: "Em đã thử quá nhiều lần. Đợi khoảng 15 phút rồi thử lại nhé." };
  }
  const result = await activateLicense(code, deviceId);
  if (!result.ok) {
    return { ok: false, message: result.reason === "unavailable" ? "Chưa kích hoạt được lúc này. Em thử lại sau ít phút nhé." : paymentReasonMessage(result.reason) };
  }
  return result;
}

export type LookupState = { status: "idle" | "error" | "found"; message?: string; result?: LookupResult; values?: Record<string, string> };

/** Tra cứu đơn bằng mã đơn + email (khi mất mã kích hoạt / đổi máy). Giới hạn 5 lần / 15 phút / người gửi (IP hoặc cookie định danh). */
export async function lookupOrderAction(_previous: LookupState, formData: FormData): Promise<LookupState> {
  const values = readFormValues(formData);
  const orderCode = Number((values.don ?? "").replace(/\D/g, ""));
  const email = (values.email ?? "").trim();
  if (!orderCode || !email) return { status: "error", message: "Em nhập đủ mã đơn và email đã dùng khi mua nhé.", values };
  // Không đếm được thì CHẶN: mã đơn là số tăng dần, không giới hạn được số lần thử thì không an toàn để tra cứu.
  const limit = await consumeRateLimit("order_lookup", (await requestClient()).key);
  if (limit === "limited") return { status: "error", message: "Em đã tra cứu quá nhiều lần. Đợi khoảng 15 phút rồi thử lại nhé.", values };
  if (limit === "unavailable") return { status: "error", message: "Tạm thời chưa tra cứu được. Em thử lại sau ít phút nhé.", values };
  const result = await lookupOrder(orderCode, email);
  // Cùng một thông báo cho "sai mã đơn" và "sai email" — không cho dò xem mã đơn nào tồn tại.
  if (!result) return { status: "error", message: "Không tìm thấy đơn khớp mã đơn và email này.", values };
  return { status: "found", result, values: { don: String(orderCode), email } };
}
