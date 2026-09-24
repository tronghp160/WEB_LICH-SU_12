import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { E2E_PREFIX, E2E_TITLE, TEST_PW, asUser, cleanupE2eData, login } from "./support";

// E5–E8 (Phase 13, mục 8.4): luồng nhân sự end-to-end trên database thật bằng các tài khoản thử @test.local.
// Chạy tuần tự vì các ca nối tiếp nhau (một sự kiện đi qua: tạo → gửi duyệt → trả sửa → sửa → công bố).
// Cần TEST_PW; thiếu thì bỏ qua. Dữ liệu thử có tiền tố "zz-kiem-thu-e2e" và được dọn ở cuối.

test.skip(!TEST_PW, "Cần biến môi trường TEST_PW (mật khẩu chung của tài khoản @test.local)");

const EVENT_TITLE = `${E2E_TITLE} Sự kiện`;
const EVENT_SLUG = `${E2E_PREFIX}-su-kien`; // slugify("ZZ KIỂM THỬ E2E Sự kiện") = "zz-kiem-thu-e2e-su-kien"
const REASON = "Mốc thời gian chưa khớp SGK trang 45, vui lòng kiểm tra lại.";

async function open(browser: import("@playwright/test").Browser, email: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  await login(page, email);
  return { context, page };
}

test.describe.serial("Luồng biên tập → kiểm duyệt → công bố → khóa tài khoản", () => {
  let sourceTitle = "";
  let editorId = "";

  test.beforeAll(async () => {
    const admin = await asUser("admin@test.local");
    await cleanupE2eData(admin);
    sourceTitle = `${E2E_TITLE} nguồn`;
    const { error } = await admin.from("sources").insert({ title: sourceTitle, source_type: "book", citation: "SGK dữ liệu thử E2E" });
    if (error) throw new Error(error.message);
    editorId = (await admin.from("staff_profiles").select("id").eq("full_name", "Biên tập viên thử").single()).data?.id;
  });

  test.afterAll(async () => {
    const admin = await asUser("admin@test.local");
    await admin.from("staff_profiles").update({ account_status: "active" }).eq("id", editorId);
    await cleanupE2eData(admin);
  });

  test("E5: editor tạo sự kiện → gắn nguồn → gửi duyệt", async ({ browser }) => {
    const { context, page } = await open(browser, "editor@test.local");
    await page.goto("/quan-tri/noi-dung/su-kien/moi");

    await page.locator("#field-title").fill(EVENT_TITLE);
    await expect(page.locator("#field-slug")).toHaveValue(EVENT_SLUG);
    await page.locator("#field-topic_id").selectOption({ index: 1 });
    await page.locator("#field-date_text").fill("1954");
    await page.locator("#field-date_precision").selectOption("year");
    await page.locator("#field-start_year").fill("1954");
    await page.locator("#field-summary").fill("Tóm tắt của sự kiện thử nghiệm E2E.");
    await page.locator("#field-content").fill("Nội dung chi tiết thử nghiệm.");

    const sources = page.locator("section[aria-labelledby=lien-ket-nguon]");
    const value = await sources.locator("select option").evaluateAll(
      (options, title) => options.find((o) => o.textContent?.includes(title))?.getAttribute("value"),
      sourceTitle,
    );
    await sources.getByLabel("Chọn nguồn").selectOption(value!);
    await sources.getByRole("button", { name: "Thêm" }).click();

    await page.getByRole("button", { name: "Lưu", exact: true }).click();
    await page.waitForURL(/\/quan-tri\/noi-dung\/su-kien\/[0-9a-f-]{36}/);
    await expect(page.getByRole("status").first()).toContainText("Đã tạo bản nháp");

    // Đủ nguồn → có thể gửi duyệt; editor KHÔNG có nút công bố.
    const panel = page.locator("section[aria-labelledby=gui-duyet]");
    await expect(panel).toContainText("Đã đủ điều kiện bắt buộc");
    await expect(page.getByRole("button", { name: /Công bố/ })).toHaveCount(0);
    await panel.getByRole("button", { name: "Gửi kiểm duyệt" }).click();
    await page.waitForURL(/thong-bao=da-gui-duyet/);
    await expect(page.locator("main li", { hasText: EVENT_TITLE })).toContainText("Chờ duyệt");
    await context.close();
  });

  test("E6: reviewer xem hàng đợi → trả sửa (bắt buộc có lý do)", async ({ browser }) => {
    const { context, page } = await open(browser, "reviewer@test.local");
    await page.goto("/quan-tri/kiem-duyet");
    await expect(page.locator("main li", { hasText: EVENT_TITLE })).toBeVisible();
    await page.locator("main li", { hasText: EVENT_TITLE }).getByRole("link", { name: EVENT_TITLE }).click();
    await page.waitForURL(/\/quan-tri\/kiem-duyet\/su-kien\//);

    // Không có lý do → không hoàn tác được
    await page.getByRole("button", { name: "Yêu cầu chỉnh sửa", exact: true }).click();
    await expect(page.locator("#field-reason-error")).toContainText("lý do");
    await expect(page).toHaveURL(/\/quan-tri\/kiem-duyet\/su-kien\//);

    await page.locator("#field-reason").fill(REASON);
    await page.getByRole("button", { name: "Yêu cầu chỉnh sửa", exact: true }).click();
    await page.waitForURL(/thong-bao=da-tra-sua/);
    await context.close();
  });

  test("E7: editor sửa → gửi lại → reviewer công bố → hiện trên dòng thời gian", async ({ browser, page: publicPage }) => {
    const editor = await open(browser, "editor@test.local");
    await editor.page.goto("/quan-tri/noi-dung/su-kien?trang-thai=needs_revision");
    await expect(editor.page.locator("main li", { hasText: EVENT_TITLE })).toContainText(REASON);
    await editor.page.locator("main li", { hasText: EVENT_TITLE }).getByRole("link", { name: EVENT_TITLE }).click();
    await expect(editor.page.locator("[role=note]").first()).toContainText(REASON);
    await editor.page.locator("#field-summary").fill("Tóm tắt đã sửa theo yêu cầu kiểm duyệt.");
    await editor.page.getByRole("button", { name: "Lưu", exact: true }).click();
    await expect(editor.page.getByText("Đã lưu sự kiện.")).toBeVisible();
    await editor.page.locator("section[aria-labelledby=gui-duyet]").getByRole("button", { name: "Gửi kiểm duyệt" }).click();
    await editor.page.waitForURL(/thong-bao=da-gui-duyet/);
    await editor.context.close();

    // Trước khi công bố: khách không thấy
    expect((await publicPage.goto(`/su-kien/${EVENT_SLUG}`))?.status()).toBe(404);

    const reviewer = await open(browser, "reviewer@test.local");
    await reviewer.page.goto("/quan-tri/kiem-duyet");
    await reviewer.page.locator("main li", { hasText: EVENT_TITLE }).getByRole("link", { name: EVENT_TITLE }).click();
    await expect(reviewer.page.locator("section[aria-label^='Xem trước']")).toContainText("Tóm tắt đã sửa theo yêu cầu kiểm duyệt.");
    await reviewer.page.getByRole("button", { name: "Công bố", exact: true }).click();
    await reviewer.page.waitForURL(/thong-bao=da-cong-bo/);
    await reviewer.context.close();

    // Sau khi công bố: xuất hiện ngay ở trang chi tiết, dòng thời gian và tra cứu
    expect((await publicPage.goto(`/su-kien/${EVENT_SLUG}`))?.status()).toBe(200);
    await publicPage.goto("/dong-thoi-gian");
    await expect(publicPage.getByText(EVENT_TITLE)).toBeVisible();
    await publicPage.goto("/tra-cuu?q=zz+kiem+thu+e2e");
    await expect(publicPage.getByRole("link", { name: EVENT_TITLE })).toBeVisible();
  });

  test("E8: admin khóa editor → editor không vào được khu nội bộ", async ({ browser }) => {
    const editor = await open(browser, "editor@test.local");
    await editor.page.goto("/quan-tri/noi-dung");
    await expect(editor.page).toHaveURL(/\/quan-tri\/noi-dung$/);

    const admin = await open(browser, "admin@test.local");
    await admin.page.goto("/quan-tri/nhan-su");
    const row = admin.page.locator("main ul > li", { hasText: "Biên tập viên thử" });
    await row.getByRole("button", { name: "Khóa tài khoản" }).click();
    await expect(row.getByText("Đã khóa tài khoản.")).toBeVisible();

    // Ở lần thao tác kế tiếp, editor mất quyền
    await editor.page.goto("/quan-tri/noi-dung");
    await expect(editor.page).toHaveURL(/\/quan-tri\/tai-khoan-bi-khoa$/);
    await expect(editor.page.locator("h1")).toHaveText("Tài khoản đã bị khóa");
    await editor.page.goto("/quan-tri");
    await expect(editor.page).toHaveURL(/\/quan-tri\/tai-khoan-bi-khoa$/);

    // Đăng nhập lại bằng tài khoản đang bị khóa cũng bị từ chối
    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await freshPage.goto("/quan-tri/dang-nhap");
    await freshPage.locator("#email").fill("editor@test.local");
    await freshPage.locator("#password").fill(TEST_PW ?? "");
    await freshPage.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(freshPage.locator("p[role=alert]")).toContainText("bị khóa");
    await fresh.close();

    // Mở khóa để trả lại trạng thái
    await row.getByRole("button", { name: "Mở khóa" }).click();
    await expect(row.getByText("Đã mở khóa tài khoản.")).toBeVisible();
    await editor.context.close();
    await admin.context.close();
  });
});
