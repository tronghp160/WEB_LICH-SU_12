import { expect, test, type Page } from "@playwright/test";
import { TEST_PW, asUser, deleteAuthUserByEmail, hasSecretKey, login } from "./support";

// UC13 — tạo tài khoản nhân sự (Phase 12/13): admin tạo editor mới qua giao diện, người đó đăng nhập và có đúng quyền.
// Cần TEST_PW và SUPABASE_SECRET_KEY trong .env.local (khóa chỉ dùng phía server của ứng dụng và để dọn tài khoản thử ở đây).
// Tài khoản thử `editor.moi.e2e@test.local` được xóa ở cuối (kể cả khi lỗi).

test.skip(!TEST_PW, "Cần biến môi trường TEST_PW");
test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const NEW_EMAIL = "editor.moi.e2e@test.local";
const NEW_NAME = "ZZ Biên tập viên mới E2E";

/**
 * Mở trang nhân sự. Danh sách email lấy qua Auth Admin API; khi mạng rớt thoáng qua ("fetch failed") trang khóa form và
 * hiện cảnh báo (đúng thiết kế) → tải lại vài lần trước khi coi là lỗi thật.
 */
async function openStaffPage(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto("/quan-tri/nhan-su");
    if ((await page.locator("form fieldset[disabled]").count()) === 0) return;
  }
}

test.describe.serial("UC13: admin tạo tài khoản editor mới", () => {
  let newPassword = "";

  test.beforeAll(async () => {
    await deleteAuthUserByEmail(NEW_EMAIL);
  });

  test.afterAll(async () => {
    await deleteAuthUserByEmail(NEW_EMAIL);
  });

  test("danh sách hiện email và form tạo tài khoản đã mở khóa", async ({ page }) => {
    await login(page, "admin@test.local");
    await openStaffPage(page);
    await expect(page.locator("main ul > li", { hasText: "Biên tập viên thử" })).toContainText("editor@test.local");
    await expect(page.getByText("Chưa cấu hình SUPABASE_SECRET_KEY")).toHaveCount(0);
    await expect(page.locator("form fieldset[disabled]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tạo tài khoản" })).toBeEnabled();
  });

  test("kiểm tra dữ liệu: lỗi tiếng Việt cho từng trường, mật khẩu yếu bị từ chối", async ({ page }) => {
    await login(page, "admin@test.local");
    await openStaffPage(page);

    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.locator("#field-full_name-error")).toHaveText("Vui lòng nhập họ tên.");
    await expect(page.locator("#field-email-error")).toHaveText("Vui lòng nhập email.");
    await expect(page.locator("#field-role-error")).toHaveText("Vui lòng chọn vai trò.");
    await expect(page.locator("#field-password-error")).toContainText("Mật khẩu");

    await page.locator("#field-full_name").fill(NEW_NAME);
    await page.locator("#field-email").fill(NEW_EMAIL);
    await page.locator("#field-role").selectOption("editor");
    await page.locator("#field-password").fill("abc12");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.locator("#field-password-error")).toHaveText("Mật khẩu tối thiểu 8 ký tự.");

    await page.locator("#field-password").fill("chuchuchuchu");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.locator("#field-password-error")).toHaveText("Mật khẩu phải gồm cả chữ và số.");
    // Lỗi không xóa dữ liệu đã nhập (trừ mật khẩu)
    await expect(page.locator("#field-email")).toHaveValue(NEW_EMAIL);
    await expect(page.locator("#field-role")).toHaveValue("editor");

    // Không tạo gì cả
    const admin = await asUser("admin@test.local");
    const { data } = await admin.from("staff_profiles").select("id").eq("full_name", NEW_NAME);
    expect(data).toHaveLength(0);
  });

  test("email đã có tài khoản bị từ chối, không tạo hồ sơ thừa", async ({ page }) => {
    const admin = await asUser("admin@test.local");
    const before = (await admin.from("staff_profiles").select("id")).data!.length;

    await login(page, "admin@test.local");
    await openStaffPage(page);
    await page.locator("#field-full_name").fill(NEW_NAME);
    await page.locator("#field-email").fill("editor@test.local");
    await page.locator("#field-role").selectOption("editor");
    await page.locator("#field-password").fill("Matkhau12345");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.locator("#field-email-error")).toHaveText("Email này đã có tài khoản.");

    expect((await admin.from("staff_profiles").select("id")).data).toHaveLength(before);
  });

  test("tạo editor mới: thành công, hiện trong danh sách, hồ sơ đúng vai trò", async ({ page }) => {
    await login(page, "admin@test.local");
    await openStaffPage(page);
    await page.locator("#field-full_name").fill(NEW_NAME);
    await page.locator("#field-email").fill(NEW_EMAIL);
    await page.locator("#field-role").selectOption("editor");
    // Mật khẩu do nút "Ngẫu nhiên" sinh ra phải đạt luật mật khẩu của server
    await page.getByRole("button", { name: "Tạo mật khẩu ngẫu nhiên" }).click();
    newPassword = await page.locator("#field-password").inputValue();
    expect(newPassword).toMatch(/^[A-Za-z0-9]{12}$/);

    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByRole("status").filter({ hasText: NEW_EMAIL })).toContainText("Đã tạo tài khoản");

    // Mật khẩu tạm còn trong ô nhập để admin sao chép (chủ ý); thông báo thì KHÔNG chứa mật khẩu, và server không trả lại nó.
    await expect(page.locator("#field-password")).toHaveValue(newPassword);
    await expect(page.getByRole("status").filter({ hasText: NEW_EMAIL })).not.toContainText(newPassword);
    await expect(page.getByRole("status").filter({ hasText: NEW_EMAIL })).toContainText("sao chép mật khẩu tạm");

    await openStaffPage(page);
    const row = page.locator("main ul > li", { hasText: NEW_NAME });
    await expect(row).toContainText(NEW_EMAIL);
    await expect(row).toContainText("Hoạt động");
    await expect(row.locator("select")).toHaveValue("editor");

    const admin = await asUser("admin@test.local");
    const { data } = await admin.from("staff_profiles").select("role, account_status").eq("full_name", NEW_NAME).single();
    expect(data).toEqual({ role: "editor", account_status: "active" });
  });

  test("người mới đăng nhập được (không cần xác nhận email) và chỉ có quyền của editor", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/quan-tri/dang-nhap");
    await page.locator("#email").fill(NEW_EMAIL);
    await page.locator("#password").fill(newPassword);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL(/\/quan-tri$/);
    await expect(page.locator("h1")).toContainText(`Xin chào, ${NEW_NAME}`);
    await expect(page.getByRole("navigation", { name: "Menu khu vực nội bộ" }).locator("a")).toHaveText(["Tổng quan", "Nội dung", "Bài SGK"]);

    await page.goto("/quan-tri/noi-dung");
    await expect(page).toHaveURL(/\/quan-tri\/noi-dung$/);
    for (const forbidden of ["kiem-duyet", "nhan-su", "van-hanh"]) {
      await page.goto(`/quan-tri/${forbidden}`);
      await expect(page).toHaveURL(/\/quan-tri\/khong-co-quyen$/);
    }
    await context.close();
  });

  test("quyền ở database: người mới không tự nâng quyền, không công bố được", async () => {
    const api = await asUser(NEW_EMAIL, newPassword).catch(() => null);
    expect(api).not.toBeNull();
    const promote = await api!.from("staff_profiles").update({ role: "system_admin" }).eq("full_name", NEW_NAME).select("id");
    expect(promote.data ?? []).toHaveLength(0);
    const others = await api!.from("staff_profiles").select("id");
    expect(others.data).toHaveLength(1); // chỉ thấy hồ sơ của chính mình
  });

  test("admin khóa tài khoản mới → người đó mất quyền ngay ở lần thao tác kế", async ({ browser }) => {
    const user = await browser.newContext();
    const userPage = await user.newPage();
    await userPage.goto("/quan-tri/dang-nhap");
    await userPage.locator("#email").fill(NEW_EMAIL);
    await userPage.locator("#password").fill(newPassword);
    await userPage.getByRole("button", { name: "Đăng nhập" }).click();
    await userPage.waitForURL(/\/quan-tri$/);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    adminPage.on("dialog", (dialog) => void dialog.accept());
    await login(adminPage, "admin@test.local");
    await openStaffPage(adminPage);
    const row = adminPage.locator("main ul > li", { hasText: NEW_NAME });
    await row.getByRole("button", { name: "Khóa tài khoản" }).click();
    await expect(row.getByText("Đã khóa tài khoản.")).toBeVisible();

    await userPage.goto("/quan-tri/noi-dung");
    await expect(userPage).toHaveURL(/\/quan-tri\/tai-khoan-bi-khoa$/);
    await user.close();
    await adminContext.close();
  });
});
