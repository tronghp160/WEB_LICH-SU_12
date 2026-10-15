import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { TEST_PW, login, signedMockPaidWebhook } from "./support";

// GĐ5 (docs/ke-hoach-thanh-toan.md, mục 10): quản trị đơn hàng trên DB thật.
// Cần TEST_PW (mật khẩu chung tài khoản @test.local) và server chạy cổng giả lập (PAYMENT_PROVIDER=mock, PAYMENT_ENV=test).

test.skip(!TEST_PW, "Cần biến môi trường TEST_PW (mật khẩu chung của tài khoản @test.local)");

async function staff(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  await login(page, email);
  return { context, page };
}

/** Người mua (trình duyệt riêng): mua gói bằng cổng giả lập, kích hoạt trên máy này; trả về mã đơn + mã kích hoạt. */
async function buyAndActivate(browser: Browser): Promise<{ buyer: Page; orderCode: string; code: string }> {
  const buyer = await (await browser.newContext()).newPage();
  await buyer.goto("/luyen-thi");
  await buyer.getByRole("checkbox").check();
  await buyer.getByRole("button", { name: /Thanh toán 29\.000đ/ }).click();
  await buyer.getByRole("button", { name: /Xác nhận chuyển khoản/ }).click();
  const orderCode = (await buyer.getByTestId("order-code").textContent())?.trim() ?? "";
  const code = (await buyer.getByTestId("license-code").textContent())?.trim() ?? "";
  await buyer.getByRole("button", { name: "Kích hoạt trên máy này" }).click();
  await expect(buyer.getByText(/Đã kích hoạt gói luyện thi trên máy này/)).toBeVisible();
  return { buyer, orderCode, code };
}

test.describe.serial("Quản trị đơn hàng", () => {
  test("biên tập viên không vào được trang Đơn hàng", async ({ browser }) => {
    const { context, page } = await staff(browser, "editor@test.local");
    await page.goto("/quan-tri/don-hang");
    await expect(page).toHaveURL(/khong-co-quyen/);
    await context.close();
  });

  test("thu hồi mã → máy người mua bị khóa đề; mở lại → làm được; gỡ thiết bị; ghi nhận hoàn tiền", async ({ browser }) => {
    const { buyer, orderCode, code } = await buyAndActivate(browser);
    const { context, page } = await staff(browser, "admin@test.local");

    await page.goto(`/quan-tri/don-hang?q=${orderCode}`);
    await expect(page.getByTestId("order-list")).toContainText(`#${orderCode}`);
    await page.getByRole("link", { name: new RegExp(`#${orderCode}`) }).click();
    await expect(page.getByRole("heading", { name: `Đơn #${orderCode}` })).toBeVisible();
    await expect(page.getByText(code)).toBeVisible();
    await expect(page.getByTestId("event-log")).toContainText("Webhook");

    await page.getByRole("button", { name: "Thu hồi mã" }).click();
    await expect(page.getByText("Đã thu hồi mã kích hoạt.")).toBeVisible();
    await buyer.goto("/luyen-thi/de-2");
    await expect(buyer.getByText(/đã bị thu hồi/)).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Mở lại mã" }).click();
    await expect(page.getByText("Đã mở lại mã kích hoạt.")).toBeVisible();
    await buyer.reload();
    await expect(buyer.getByRole("button", { name: "Bắt đầu làm bài" })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Gỡ thiết bị" }).click();
    await expect(page.getByText(/Đã gỡ thiết bị/)).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Ghi nhận đã hoàn tiền" }).click();
    await expect(page.getByText(/Đã ghi nhận hoàn tiền/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("Đã hoàn tiền").first()).toBeVisible();
    await expect(page.getByTestId("event-log")).toContainText("Ghi nhận hoàn tiền");
    await context.close();
  });

  test("tiền về sau khi đơn đã hủy → quản trị viên xác nhận → cấp mã, người mua thấy mã", async ({ browser, request }) => {
    const buyer = await (await browser.newContext()).newPage();
    await buyer.goto("/luyen-thi");
    await buyer.getByRole("checkbox").check();
    await buyer.getByRole("button", { name: /Thanh toán 29\.000đ/ }).click();
    await buyer.getByRole("button", { name: "Hủy giao dịch" }).click();
    await expect(buyer).toHaveURL(/\/thanh-toan\/ket-qua\?don=\d+&huy=1$/);
    const orderCode = Number(new URL(buyer.url()).searchParams.get("don"));
    await expect(buyer.getByTestId("order-status")).toHaveText("Đã hủy");

    // Cổng báo tiền về muộn (chữ ký đúng): đơn vẫn hủy, chỉ ghi nhật ký.
    const webhook = signedMockPaidWebhook(orderCode, 29000);
    const response = await request.post("/api/thanh-toan/webhook/mock", { headers: webhook.headers, data: webhook.body });
    expect(response.ok()).toBe(true);

    const { context, page } = await staff(browser, "admin@test.local");
    await page.goto(`/quan-tri/don-hang/${orderCode}`);
    await expect(page.getByText("Tiền về sau khi đơn đã hủy — cần xử lý tay")).toBeVisible();
    await page.getByRole("button", { name: "Xác nhận đã nhận tiền và cấp mã" }).click();
    await expect(page.getByText(/Đã xác nhận tiền về và cấp mã LT12-/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("Đã thanh toán").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Xác nhận đã nhận tiền và cấp mã" })).toHaveCount(0);
    await expect(page.getByTestId("event-log")).toContainText("Quản trị viên xác nhận tiền về muộn");

    // Người mua (cookie của đơn) mở lại trang kết quả → thấy mã kích hoạt.
    await buyer.goto(`/thanh-toan/ket-qua?don=${orderCode}`);
    await expect(buyer.getByTestId("license-code")).toHaveText(/^LT12-/);
    await context.close();
  });

  test("duyệt lời nhắn ủng hộ → hiện trên Bức tường cảm ơn; gỡ → biến mất", async ({ browser }) => {
    const message = `ZZ KIỂM THỬ cảm ơn ${Date.now()}`;
    const donor = await (await browser.newContext()).newPage();
    await donor.goto("/ung-ho");
    await donor.getByRole("button", { name: "10.000đ", exact: true }).click();
    await donor.getByLabel("Lời nhắn (không bắt buộc)").fill(message);
    await donor.getByLabel(/Hiện tên và lời nhắn trên Bức tường cảm ơn/).check();
    await donor.getByLabel(/Em hiểu đây là khoản ủng hộ tự nguyện/).check();
    await donor.getByRole("button", { name: "Ủng hộ 10.000đ" }).click();
    await donor.getByRole("button", { name: /Xác nhận chuyển khoản/ }).click();
    const orderCode = (await donor.getByTestId("order-code").textContent())?.trim() ?? "";

    const { context, page } = await staff(browser, "admin@test.local");
    await page.goto(`/quan-tri/don-hang/${orderCode}`);
    await expect(page.getByText(message)).toBeVisible();
    await page.getByRole("button", { name: "Duyệt lời nhắn" }).click();
    await expect(page.getByText(/Đã duyệt/)).toBeVisible();
    await donor.goto("/ung-ho");
    await expect(donor.getByTestId("donation-wall")).toContainText(message);
    await expect(donor.getByTestId("donation-wall")).not.toContainText("10.000");

    await page.reload();
    await page.getByRole("button", { name: "Gỡ khỏi bức tường" }).click();
    await expect(page.getByText(/Đã gỡ lời nhắn/)).toBeVisible();
    await donor.reload();
    await expect(donor.getByText(message)).toHaveCount(0);
    await context.close();
  });
});

// Soạn và kiểm duyệt đề luyện thi: tests/e2e/exam-bank.spec.ts (đề ghép từ ngân hàng câu hỏi — docs/ke-hoach-luyen-thi.md, GĐ1).
