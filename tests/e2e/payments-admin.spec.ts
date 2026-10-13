import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { TEST_PW, asUser, login } from "./support";

// GĐ5 (docs/ke-hoach-thanh-toan.md, mục 10): quản trị đơn hàng và soạn / kiểm duyệt đề luyện thi trên DB thật.
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

test.describe.serial("Soạn và kiểm duyệt đề luyện thi", () => {
  let slug = "";

  test.afterAll(async () => {
    // Dọn đề thử nếu ca nào đó dừng giữa chừng (quản trị viên xóa được mọi trạng thái).
    if (!slug) return;
    const admin = await asUser("admin@test.local");
    await admin.from("exam_sets").delete().eq("slug", slug);
  });

  test("biên tập viên tạo đề, thêm câu hỏi; dưới 10 câu thì chưa gửi duyệt được", async ({ browser }) => {
    const { context, page } = await staff(browser, "editor@test.local");
    await page.goto("/quan-tri/de-luyen-thi");
    await page.getByRole("button", { name: "Tạo đề mới" }).click();
    await expect(page).toHaveURL(/\/quan-tri\/de-luyen-thi\/de-\d+$/);
    slug = page.url().split("/").pop() ?? "";

    await page.locator("#field-title").fill("ZZ KIỂM THỬ E2E đề");
    await page.locator("#field-duration_min").fill("15");
    await page.getByRole("button", { name: "Lưu thông tin đề" }).click();
    await expect(page.getByText("Đã lưu thông tin đề.")).toBeVisible();

    const add = page.locator("form").filter({ has: page.getByRole("heading", { name: "Thêm câu hỏi" }) });
    await add.getByLabel("Câu hỏi").fill("ZZ Câu hỏi thử về năm 1945?");
    for (const [index, text] of ["Đáp án đúng", "Sai một", "Sai hai", "Sai ba"].entries()) {
      await add.getByLabel(`Đáp án ${"ABCD"[index]}`, { exact: true }).fill(text);
    }
    await add.getByLabel("Đáp án B là đáp án đúng").check();
    await add.getByLabel("Lời giải thích (hiện sau khi nộp bài)").fill("Giải thích thử cho câu hỏi.");
    await add.getByLabel("Nguồn").fill("SGK Lịch sử 12, Bài 6");
    await add.getByRole("button", { name: "Thêm câu hỏi" }).click();
    await expect(page.getByText("Đã thêm câu hỏi.")).toBeVisible();
    await expect(page.getByText("Câu 1 · đáp án đúng B")).toBeVisible();

    await expect(page.getByText("Đề cần ít nhất 10 câu (hiện có 1).")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gửi duyệt" })).toBeDisabled();
    await context.close();
  });

  test("đủ 10 câu → gửi duyệt → kiểm duyệt viên trả về kèm lý do → biên tập viên thấy lý do và xóa đề nháp", async ({ browser }) => {
    expect(slug).not.toBe("");
    const editorApi = await asUser("editor@test.local");
    const { data: set } = await editorApi.from("exam_sets").select("id").eq("slug", slug).single();
    const rows = Array.from({ length: 9 }, (_, index) => ({
      set_id: set!.id,
      position: index + 2,
      question: `ZZ Câu hỏi thử số ${index + 2}?`,
      choices: ["Một", "Hai", "Ba", "Bốn"],
      correct_index: index % 4,
      explanation: "Giải thích thử.",
      source_note: "SGK Lịch sử 12",
    }));
    const { error } = await editorApi.from("exam_questions").insert(rows);
    expect(error).toBeNull();

    const editor = await staff(browser, "editor@test.local");
    await editor.page.goto(`/quan-tri/de-luyen-thi/${slug}`);
    await editor.page.getByRole("button", { name: "Gửi duyệt" }).click();
    await expect(editor.page.getByText("Đã gửi đề cho kiểm duyệt viên.")).toBeVisible();

    const reviewer = await staff(browser, "reviewer@test.local");
    await reviewer.page.goto(`/quan-tri/de-luyen-thi/${slug}`);
    await reviewer.page.getByLabel("Lý do yêu cầu chỉnh sửa (bắt buộc khi trả về)").fill("Câu 3 chưa ghi rõ nguồn trang SGK.");
    await reviewer.page.getByRole("button", { name: "Yêu cầu chỉnh sửa" }).click();
    await expect(reviewer.page.getByText("Đã cập nhật trạng thái đề.")).toBeVisible();
    await reviewer.context.close();

    await editor.page.reload();
    await expect(editor.page.getByText("Câu 3 chưa ghi rõ nguồn trang SGK.")).toBeVisible();
    await editor.page.getByRole("button", { name: "Xóa đề nháp" }).click();
    await expect(editor.page).toHaveURL(/\/quan-tri\/de-luyen-thi$/);
    await expect(editor.page.getByText("ZZ KIỂM THỬ E2E đề")).toHaveCount(0);
    slug = "";
    await editor.context.close();
  });
});
