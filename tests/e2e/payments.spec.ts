import { expect, test, type Page } from "@playwright/test";

// Thanh toán GĐ2 (docs/ke-hoach-thanh-toan.md, mục 12): luồng mua gói bằng CỔNG GIẢ LẬP trên DB thật.
// Cần server chạy với PAYMENT_PROVIDER=mock, PAYMENT_ENV=test (xem .env.example). Mỗi lần chạy tạo vài đơn thử
// (provider = 'mock') — không thu tiền thật.

const LICENSE = /^LT12-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/** Từ trang /luyen-thi bấm mua → tới trang ngân hàng giả lập; trả về mã đơn. */
async function startPurchase(page: Page): Promise<number> {
  await page.goto("/luyen-thi");
  await expect(page.getByText("Môi trường thử nghiệm").first()).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Thanh toán 29\.000đ/ }).click();
  await expect(page).toHaveURL(/\/thanh-toan\/gia-lap\?don=\d+&sig=[0-9a-f]{64}$/);
  await expect(page.getByTestId("mock-amount")).toHaveText("29.000đ");
  return Number(new URL(page.url()).searchParams.get("don"));
}

test.describe("Thanh toán bằng cổng giả lập", () => {
  test("phải đồng ý điều khoản trước khi tạo đơn", async ({ page }) => {
    await page.goto("/luyen-thi");
    await page.getByRole("button", { name: /Thanh toán 29\.000đ/ }).click();
    await expect(page.getByText("Em cần đồng ý điều khoản trước khi thanh toán.")).toBeVisible();
    await expect(page).toHaveURL(/\/luyen-thi$/);
  });

  test("mua gói → trả tiền → nhận mã kích hoạt; trình duyệt khác không xem được đơn", async ({ page, browser }) => {
    const orderCode = await startPurchase(page);
    const bankUrl = page.url();
    await page.getByRole("button", { name: /Xác nhận chuyển khoản/ }).click();
    await expect(page).toHaveURL(new RegExp(`/thanh-toan/ket-qua\\?don=${orderCode}$`));
    await expect(page.getByTestId("order-status")).toHaveText("Đã thanh toán");
    const code = (await page.getByTestId("license-code").textContent())?.trim() ?? "";
    expect(code).toMatch(LICENSE);

    // Tải lại trang: vẫn đúng mã cũ (không cấp mã thứ hai).
    await page.reload();
    await expect(page.getByTestId("license-code")).toHaveText(code);

    // Trình duyệt khác (không có cookie của đơn) đoán mã đơn → không thấy gì.
    const stranger = await browser.newContext();
    const other = await stranger.newPage();
    await other.goto(`/thanh-toan/ket-qua?don=${orderCode}`);
    await expect(other.getByText("Không xem được đơn hàng")).toBeVisible();
    await expect(other.getByTestId("license-code")).toHaveCount(0);
    await stranger.close();

    // Trang ngân hàng không cho trả lại đơn đã xong.
    await page.goto(bankUrl);
    await expect(page.getByText("Đơn đã xử lý xong")).toBeVisible();
  });

  test("hủy ở cổng → đơn bị hủy, không có mã", async ({ page }) => {
    await startPurchase(page);
    await page.getByRole("button", { name: "Hủy giao dịch" }).click();
    await expect(page).toHaveURL(/\/thanh-toan\/ket-qua\?don=\d+&huy=1$/);
    await expect(page.getByTestId("order-status")).toHaveText("Đã hủy");
    await expect(page.getByTestId("license-code")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Thử lại" })).toHaveAttribute("href", "/luyen-thi");
  });

  test("webhook đúng chữ ký nhưng sai số tiền → không cấp mã, đơn vẫn chờ", async ({ page }) => {
    await startPurchase(page);
    await page.getByText("Dành cho kiểm thử").click();
    await page.getByRole("button", { name: "Chuyển sai số tiền" }).click();
    await expect(page.getByTestId("order-status")).toHaveText("Đang chờ thanh toán");
    await expect(page.getByTestId("license-code")).toHaveCount(0);
  });

  test("link ngân hàng giả lập bị sửa mã đơn → từ chối", async ({ page }) => {
    const orderCode = await startPurchase(page);
    const url = new URL(page.url());
    url.searchParams.set("don", String(orderCode + 1));
    await page.goto(url.pathname + url.search);
    await expect(page.getByText("Link thanh toán không hợp lệ hoặc đã bị sửa.")).toBeVisible();
  });

  test("webhook giả mạo (sai chữ ký) → 400; cổng không bật → 404", async ({ request }) => {
    const forged = await request.post("/api/thanh-toan/webhook/mock", {
      headers: { "x-mock-signature": "0".repeat(64) },
      data: { orderCode: 100001, amount: 29000, status: "paid", transactionId: "FORGED" },
    });
    expect(forged.status()).toBe(400);
    expect(await forged.json()).toEqual({ ok: false, reason: "bad_signature" });

    const unknown = await request.post("/api/thanh-toan/webhook/payos", { data: {} });
    expect(unknown.status()).toBe(404);
  });
});
