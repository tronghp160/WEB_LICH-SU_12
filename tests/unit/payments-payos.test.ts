import { PayOS } from "@payos/node";
import { describe, expect, it } from "vitest";
import { createPayosProvider, mapPayosStatus, payosDescription, type PayosClient } from "@/lib/payments/providers/payos";

// Webhook kiểm bằng SDK THẬT (khóa giả, không gọi mạng); các lệnh gọi API dùng client giả để kiểm cách ánh xạ dữ liệu.

const CHECKSUM = "k".repeat(64);
const sdk = new PayOS({ clientId: "client-thu", apiKey: "api-thu", checksumKey: CHECKSUM, logLevel: "off" });

const webhookData = {
  orderCode: 100123,
  amount: 29000,
  description: "DH100123",
  accountNumber: "12345678",
  reference: "FT26286123456",
  transactionDateTime: "2026-10-13 18:25:00",
  currency: "VND",
  paymentLinkId: "124c33293c43417ab7879e14c8d9eb18",
  code: "00",
  desc: "Thành công",
  counterAccountBankId: "",
  counterAccountBankName: "",
  counterAccountName: "",
  counterAccountNumber: "",
  virtualAccountName: "",
  virtualAccountNumber: "",
};

async function signed(data: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  const signature = await sdk.crypto.createSignatureFromObj(data, CHECKSUM);
  return { code: "00", desc: "success", success: true, data, signature, ...overrides };
}

const asRequest = (body: unknown) =>
  new Request("http://localhost/api/thanh-toan/webhook/payos", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

const provider = createPayosProvider(sdk as unknown as PayosClient);

describe("payOS: nội dung chuyển khoản và trạng thái", () => {
  it("nội dung ≤ 9 ký tự (giới hạn của tài khoản không liên kết)", () => {
    expect(payosDescription(100123)).toBe("DH100123");
    expect(payosDescription(9999999)).toBe("DH9999999");
    expect(payosDescription(123456789012).length).toBeLessThanOrEqual(9);
  });

  it("ánh xạ trạng thái link", () => {
    expect(mapPayosStatus("PAID")).toBe("paid");
    expect(mapPayosStatus("CANCELLED")).toBe("cancelled");
    expect(mapPayosStatus("EXPIRED")).toBe("cancelled");
    expect(mapPayosStatus("FAILED")).toBe("failed");
    expect(mapPayosStatus("PENDING")).toBe("pending");
    expect(mapPayosStatus("UNDERPAID")).toBe("pending");
    expect(mapPayosStatus("PROCESSING")).toBe("pending");
  });
});

describe("payOS: webhook (chữ ký thật của SDK)", () => {
  it("chữ ký đúng → đã thanh toán, mã giao dịch là reference của ngân hàng", async () => {
    const result = await provider.verifyWebhook(asRequest(await signed(webhookData)));
    expect(result).toMatchObject({ orderCode: 100123, amountVnd: 29000, status: "paid", providerRef: "FT26286123456" });
  });

  it("sửa số tiền sau khi ký → từ chối", async () => {
    const body = await signed(webhookData);
    expect(await provider.verifyWebhook(asRequest({ ...body, data: { ...webhookData, amount: 1000 } }))).toBeNull();
  });

  it("ký bằng khóa khác / thiếu chữ ký / JSON hỏng → từ chối", async () => {
    const other = new PayOS({ clientId: "a", apiKey: "b", checksumKey: "z".repeat(64), logLevel: "off" });
    const forged = { code: "00", desc: "success", success: true, data: webhookData, signature: await other.crypto.createSignatureFromObj(webhookData, "z".repeat(64)) };
    expect(await provider.verifyWebhook(asRequest(forged))).toBeNull();
    expect(await provider.verifyWebhook(asRequest({ code: "00", success: true, data: webhookData }))).toBeNull();
    expect(await provider.verifyWebhook(asRequest("{hỏng"))).toBeNull();
  });

  it("chữ ký đúng nhưng mã kết quả khác 00 → thất bại (không cấp quyền, không hủy đơn)", async () => {
    const failed = { ...webhookData, code: "01", desc: "Giao dịch lỗi" };
    const result = await provider.verifyWebhook(asRequest(await signed(failed, { success: false, code: "01" })));
    expect(result?.status).toBe("failed");
  });

  it("phản hồi: 200 khi nhận, 400 khi từ chối", () => {
    expect(provider.webhookResponse(true).status).toBe(200);
    expect(provider.webhookResponse(false, "bad_signature").status).toBe(400);
  });
});

describe("payOS: tạo link và đối soát (client giả)", () => {
  function fakeClient(status: string, overrides: Partial<{ amountPaid: number; transactions: { reference: string; amount: number }[] }> = {}) {
    const calls: unknown[] = [];
    const client: PayosClient = {
      paymentRequests: {
        async create(data) {
          calls.push(data);
          return { checkoutUrl: "https://pay.payos.vn/web/abc", paymentLinkId: "link-1" };
        },
        async get(orderCode) {
          return { id: "link-1", orderCode, amount: 29000, amountPaid: overrides.amountPaid ?? 29000, status, transactions: overrides.transactions ?? [{ reference: "FT1", amount: 29000 }] };
        },
        async cancel() {
          return null;
        },
      },
      webhooks: { verify: async (body) => body.data },
    };
    return { client, calls };
  }

  it("tạo link: số tiền do server tính, nội dung ngắn, hết hạn tính bằng GIÂY", async () => {
    const { client, calls } = fakeClient("PENDING");
    const expiresAt = new Date("2026-10-13T10:15:00Z");
    const result = await createPayosProvider(client).createCheckout({
      orderCode: 100123,
      amountVnd: 29000,
      description: "LT12 DH100123",
      itemName: "Gói Luyện thi",
      returnUrl: "https://web/thanh-toan/ket-qua?don=100123",
      cancelUrl: "https://web/thanh-toan/ket-qua?don=100123&huy=1",
      expiresAt,
      buyerIp: "1.2.3.4",
    });
    expect(result).toEqual({ checkoutUrl: "https://pay.payos.vn/web/abc", providerRef: "link-1" });
    expect(calls[0]).toMatchObject({ orderCode: 100123, amount: 29000, description: "DH100123", expiredAt: 1791886500 });
  });

  it("đối soát: PAID → đã trả theo số tiền thực nhận; CANCELLED → hủy; PENDING / UNDERPAID → chờ", async () => {
    expect(await createPayosProvider(fakeClient("PAID", { amountPaid: 29000 }).client).getStatus(100123)).toMatchObject({
      status: "paid",
      amountVnd: 29000,
      providerRef: "FT1",
    });
    expect(await createPayosProvider(fakeClient("CANCELLED").client).getStatus(100123)).toMatchObject({ status: "cancelled" });
    expect(await createPayosProvider(fakeClient("PENDING").client).getStatus(100123)).toEqual({ status: "pending" });
    expect(await createPayosProvider(fakeClient("UNDERPAID", { amountPaid: 10000 }).client).getStatus(100123)).toEqual({ status: "pending" });
  });
});
