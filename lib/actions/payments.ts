"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { readFormValues, zodErrorState, type ActionState } from "@/lib/actions/state";
import { getPaymentProvider, mockSecret } from "@/lib/payments/config";
import { activateLicense } from "@/lib/payments/licenses";
import { paymentReasonMessage } from "@/lib/payments/order-status";
import {
  createOrder,
  getOrderForCheckout,
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

async function clientIp(): Promise<string | null> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip")?.trim() || null;
}

async function startCheckout(input: Omit<CreateOrderInput, "clientIp">, values: Record<string, string>): Promise<ActionState> {
  const result = await createOrder({ ...input, clientIp: await clientIp() });
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
  const result = await activateLicense(code, deviceId);
  if (!result.ok) {
    return { ok: false, message: result.reason === "unavailable" ? "Chưa kích hoạt được lúc này. Em thử lại sau ít phút nhé." : paymentReasonMessage(result.reason) };
  }
  return result;
}
