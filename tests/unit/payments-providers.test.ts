import { describe, expect, it } from "vitest";
import { hmacSha256Hex, safeEqualHex, saltedHash, sha256Hex } from "@/lib/payments/crypto";
import {
  MOCK_SIGNATURE_HEADER,
  createMockProvider,
  mockCheckoutSignature,
  signMockWebhook,
  verifyMockCheckoutSignature,
  type MockWebhookBody,
} from "@/lib/payments/providers/mock";
import { buyPackSchema, donationSchema } from "@/lib/validation/payments";

const SECRET = "s".repeat(64);
const provider = createMockProvider(SECRET);
const body: MockWebhookBody = { orderCode: 100123, amount: 29000, status: "paid", transactionId: "MOCKTX-100123-1" };

function webhook(text: string, signature: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature !== null) headers[MOCK_SIGNATURE_HEADER] = signature;
  return new Request("http://localhost/api/thanh-toan/webhook/mock", { method: "POST", headers, body: text });
}

describe("băm và so sánh chữ ký", () => {
  it("sha256 / HMAC cho kết quả chuẩn", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hmacSha256Hex("key", "The quick brown fox jumps over the lazy dog")).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("so sánh hex an toàn: khác độ dài / không phải hex / rỗng đều là sai", () => {
    expect(safeEqualHex("ab12", "ab12")).toBe(true);
    expect(safeEqualHex("ab12", "AB12")).toBe(true);
    expect(safeEqualHex("ab12", "ab13")).toBe(false);
    expect(safeEqualHex("ab12", "ab1")).toBe(false);
    expect(safeEqualHex("zz", "zz")).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
  });

  it("băm có muối: cùng giá trị khác muối thì khác kết quả", () => {
    expect(saltedHash("a", "1.2.3.4")).not.toBe(saltedHash("b", "1.2.3.4"));
    expect(saltedHash("a", "1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("cổng giả lập", () => {
  it("link thanh toán có chữ ký; sửa mã đơn thì chữ ký không còn đúng", async () => {
    const { checkoutUrl } = await provider.createCheckout({
      orderCode: 100123,
      amountVnd: 29000,
      description: "LT12 DH100123",
      itemName: "Gói",
      returnUrl: "http://localhost/thanh-toan/ket-qua?don=100123",
      cancelUrl: "http://localhost/thanh-toan/ket-qua?don=100123&huy=1",
      expiresAt: new Date(),
      buyerIp: "127.0.0.1",
    });
    const url = new URL(checkoutUrl, "http://localhost");
    expect(url.pathname).toBe("/thanh-toan/gia-lap");
    const sig = url.searchParams.get("sig")!;
    expect(verifyMockCheckoutSignature(SECRET, 100123, sig)).toBe(true);
    expect(verifyMockCheckoutSignature(SECRET, 100124, sig)).toBe(false);
    expect(verifyMockCheckoutSignature("k".repeat(64), 100123, sig)).toBe(false);
    expect(mockCheckoutSignature(SECRET, 100123)).toBe(sig);
  });

  it("webhook có chữ ký đúng → dữ liệu đã xác thực", async () => {
    const signed = signMockWebhook(SECRET, body);
    const result = await provider.verifyWebhook(webhook(signed.body, signed.signature));
    expect(result).toEqual({ orderCode: 100123, amountVnd: 29000, status: "paid", providerRef: "MOCKTX-100123-1", raw: body });
  });

  it("sửa số tiền trong nội dung (giữ chữ ký cũ) → từ chối", async () => {
    const signed = signMockWebhook(SECRET, body);
    const tampered = signed.body.replace("29000", "1000");
    expect(await provider.verifyWebhook(webhook(tampered, signed.signature))).toBeNull();
  });

  it("thiếu chữ ký / ký bằng khóa khác / JSON hỏng / dữ liệu sai kiểu → từ chối", async () => {
    const signed = signMockWebhook(SECRET, body);
    expect(await provider.verifyWebhook(webhook(signed.body, null))).toBeNull();
    const other = signMockWebhook("k".repeat(64), body);
    expect(await provider.verifyWebhook(webhook(other.body, other.signature))).toBeNull();
    expect(await provider.verifyWebhook(webhook("{hỏng", hmacSha256Hex(SECRET, "{hỏng")))).toBeNull();
    const badShape = JSON.stringify({ ...body, amount: "29000" });
    expect(await provider.verifyWebhook(webhook(badShape, hmacSha256Hex(SECRET, badShape)))).toBeNull();
    const badStatus = JSON.stringify({ ...body, status: "refunded" });
    expect(await provider.verifyWebhook(webhook(badStatus, hmacSha256Hex(SECRET, badStatus)))).toBeNull();
  });

  it("phản hồi webhook: 200 khi nhận, 400 khi từ chối", async () => {
    expect(provider.webhookResponse(true).status).toBe(200);
    const rejected = provider.webhookResponse(false, "bad_signature");
    expect(rejected.status).toBe(400);
    expect(await rejected.json()).toEqual({ ok: false, reason: "bad_signature" });
  });
});

describe("form mua gói / ủng hộ", () => {
  it("mua gói: bắt buộc đồng ý điều khoản; email trống được, sai định dạng thì báo lỗi", () => {
    expect(buyPackSchema.safeParse({ product: "goi-luyen-thi-2027", email: "", agree: "on" }).success).toBe(true);
    expect(buyPackSchema.safeParse({ product: "goi-luyen-thi-2027", email: " em@vidu.com ", agree: "on" }).data?.email).toBe("em@vidu.com");
    expect(buyPackSchema.safeParse({ product: "goi-luyen-thi-2027", email: "", agree: undefined }).success).toBe(false);
    expect(buyPackSchema.safeParse({ product: "goi-luyen-thi-2027", email: "khong-phai-email", agree: "on" }).success).toBe(false);
    expect(buyPackSchema.safeParse({ product: "Gói", email: "", agree: "on" }).success).toBe(false);
  });

  it("ủng hộ: đọc số tiền kiểu Việt Nam; lời nhắn tối đa 200 ký tự; mặc định không hiện trên bức tường", () => {
    const ok = donationSchema.safeParse({ product: "ung-ho", amount: "50.000", email: "", displayName: "", message: "", agree: "on" });
    expect(ok.data).toEqual({ product: "ung-ho", amount: 50000, email: null, displayName: null, message: null, showOnWall: false, agree: true });
    expect(donationSchema.safeParse({ product: "ung-ho", amount: "năm chục", agree: "on" }).success).toBe(false);
    expect(donationSchema.safeParse({ product: "ung-ho", amount: "20000", message: "x".repeat(201), agree: "on" }).success).toBe(false);
  });
});
