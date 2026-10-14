import { expect, test, type Page } from "@playwright/test";
import { adminApi, hasSecretKey } from "./support";

// Tài khoản học sinh — giai đoạn B2 (docs/ke-hoach-tai-khoan.md, mục 12, E2E (1)–(5)). Chạy trên database THẬT, cần
// migration 20261020000000_learner_accounts.sql và SUPABASE_SECRET_KEY trong .env.local (tạo / dọn tài khoản thử bằng
// Admin API). Link xác nhận / đặt lại mật khẩu lấy bằng `generateLink` (không gửi email, không cần hộp thư).
// Tài khoản thử: zz-kiem-thu-hs-*@test.local — xóa ở cuối (kể cả khi lỗi).
// Ca gửi email thật qua form đăng ký chỉ chạy khi E2E_SMTP=1 (SMTP mặc định của Supabase không gửi tới @test.local).

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const PREFIX = "zz-kiem-thu-hs-";
const PASSWORD = "lichsu2026A";
const TERMS = "2026-10";
const run = Date.now().toString(36);
let counter = 0;
const newEmail = () => `${PREFIX}${run}-${++counter}@test.local`;

async function createLearner(options: { confirmed?: boolean; name?: string } = {}): Promise<string> {
  const email = newEmail();
  const { error } = await adminApi().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: options.confirmed ?? true,
    user_metadata: { display_name: options.name ?? "ZZ Học sinh E2E", terms_version: TERMS },
  });
  if (error) throw new Error(`Không tạo được tài khoản thử: ${error.message}`);
  return email;
}

async function cleanupLearners(): Promise<void> {
  const api = adminApi();
  const { data } = await api.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email?.startsWith(PREFIX)) await api.auth.admin.deleteUser(user.id);
  }
}

async function signIn(page: Page, email: string, password: string, path = "/dang-nhap"): Promise<void> {
  await page.goto(path);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}

test.describe.serial("Tài khoản học sinh (B2)", () => {
  test.afterAll(cleanupLearners);

  test("đăng ký: kiểm tra dữ liệu — chưa tích đồng ý, mật khẩu yếu → báo lỗi, không tạo tài khoản", async ({ page }) => {
    const email = newEmail();
    await page.goto("/dang-ky");
    await page.locator("#displayName").fill("ZZ Học sinh");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("12345678");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.locator("#password-loi")).toContainText("cả chữ và số");
    await expect(page.locator("#agree-loi")).toContainText("đồng ý");
    // Email giữ lại, mật khẩu không.
    await expect(page.locator("#email")).toHaveValue(email);
    await expect(page.locator("#password")).toHaveValue("");
    const { data } = await adminApi().auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((user) => user.email === email)).toBe(false);
  });

  test("đăng ký qua form gửi email thật → trang kiểm tra email (cần E2E_SMTP=1)", async ({ page }) => {
    test.skip(process.env.E2E_SMTP !== "1", "Cần SMTP riêng (docs/ke-hoach-tai-khoan.md, mục 9.3)");
    const email = newEmail();
    await page.goto("/dang-ky");
    await page.locator("#displayName").fill("ZZ Học sinh");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(PASSWORD);
    await page.locator('input[name="agree"]').check();
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await page.waitForURL(/\/dang-ky\/kiem-tra-email/);
    await expect(page.locator("#kiem-tra-email")).toContainText(email);
  });

  test("(1) bấm link xác nhận email → vào /tai-khoan, hồ sơ học sinh được tạo; dùng lại link → báo hết hạn", async ({ page }) => {
    const email = newEmail();
    const { data, error } = await adminApi().auth.admin.generateLink({
      type: "signup",
      email,
      password: PASSWORD,
      options: { data: { display_name: "ZZ Lan Anh E2E", terms_version: TERMS } },
    });
    expect(error).toBeNull();
    const link = `/auth/confirm?token_hash=${data.properties!.hashed_token}&type=signup`;

    await page.goto(link);
    await page.waitForURL(/\/tai-khoan\?thong-bao=xac-nhan$/);
    await expect(page.locator("#tai-khoan-thong-bao")).toContainText("Đã xác nhận email");
    await expect(page.getByTestId("account-name")).toHaveText("ZZ Lan Anh E2E");
    await expect(page.getByTestId("account-email")).toHaveText(email);

    const profile = await adminApi().from("learner_profiles").select("display_name, terms_version").eq("id", data.user!.id).single();
    expect(profile.data).toEqual({ display_name: "ZZ Lan Anh E2E", terms_version: TERMS });

    await page.context().clearCookies();
    await page.goto(link);
    await page.waitForURL(/\/auth\/loi\?ly-do=/);
    await expect(page.locator("#auth-loi")).toBeVisible();
  });

  test("(2) sai mật khẩu và email chưa có tài khoản → cùng một thông báo chung", async ({ page }) => {
    const email = await createLearner();
    await signIn(page, email, "saimatkhau123");
    await expect(page.locator("#dang-nhap-loi")).toHaveText("Email hoặc mật khẩu không đúng.");
    await expect(page.locator("#password")).toHaveValue("");
    await signIn(page, newEmail(), "saimatkhau123");
    await expect(page.locator("#dang-nhap-loi")).toHaveText("Email hoặc mật khẩu không đúng.");
  });

  test("tài khoản chưa xác nhận email → nhắc xác nhận, có nút gửi lại", async ({ page }) => {
    const email = await createLearner({ confirmed: false });
    await signIn(page, email, PASSWORD);
    await expect(page.locator("#dang-nhap-loi")).toContainText("chưa xác nhận email");
    await expect(page.getByRole("button", { name: /Gửi lại email xác nhận/ })).toBeVisible();
  });

  test("(4) chưa đăng nhập mở /tai-khoan → /dang-nhap?next=… → đăng nhập → quay về đúng trang; đăng xuất", async ({ page }) => {
    const email = await createLearner({ name: "ZZ Minh E2E" });
    await page.goto("/tai-khoan?thong-bao=xac-nhan");
    await page.waitForURL(/\/dang-nhap\?next=%2Ftai-khoan%3Fthong-bao%3Dxac-nhan$/);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL(/\/tai-khoan\?thong-bao=xac-nhan$/);
    await expect(page.getByTestId("account-name")).toHaveText("ZZ Minh E2E");

    // Đã đăng nhập mà mở /dang-nhap → chuyển thẳng tới next.
    await page.goto("/dang-nhap?next=%2Fluyen-thi");
    await page.waitForURL(/\/luyen-thi$/);

    await page.goto("/tai-khoan");
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/tai-khoan");
    await page.waitForURL(/\/dang-nhap\?next=/);
  });

  test("(5) next=//evil.com và next=https://evil.com → về /tai-khoan, không rời trang", async ({ page }) => {
    const email = await createLearner();
    await signIn(page, email, PASSWORD, "/dang-nhap?next=%2F%2Fevil.com");
    await page.waitForURL(/\/tai-khoan$/);
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await signIn(page, email, PASSWORD, "/dang-nhap?next=https%3A%2F%2Fevil.com%2Fx");
    await page.waitForURL(/\/tai-khoan$/);
    expect(new URL(page.url()).hostname).toBe(new URL(test.info().project.use.baseURL ?? "http://localhost").hostname);
  });

  test("(3) quên mật khẩu → link → đặt mật khẩu mới; mật khẩu cũ hết tác dụng", async ({ page }) => {
    const email = await createLearner();

    // Form chỉ báo một thông báo chung (email lạ — không gửi thư thật).
    await page.goto("/quen-mat-khau");
    await page.locator("#email").fill(newEmail());
    await page.getByRole("button", { name: "Gửi link đặt lại mật khẩu" }).click();
    await expect(page.locator("#quen-mat-khau-da-gui")).toContainText("Nếu email này có tài khoản");

    // Không có link → không vào được trang đặt mật khẩu.
    await page.goto("/dat-lai-mat-khau");
    await expect(page.locator("#dat-lai-het-han")).toBeVisible();

    const { data, error } = await adminApi().auth.admin.generateLink({ type: "recovery", email });
    expect(error).toBeNull();
    await page.goto(`/auth/confirm?token_hash=${data.properties!.hashed_token}&type=recovery`);
    await page.waitForURL(/\/dat-lai-mat-khau$/);

    const newPassword = "lichsu2027B";
    await page.locator("#password").fill(newPassword);
    await page.locator("#confirm").fill("khongkhop2027");
    await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    await expect(page.locator("#confirm-loi")).toHaveText("Hai mật khẩu không khớp.");

    await page.locator("#password").fill(newPassword);
    await page.locator("#confirm").fill(newPassword);
    await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    await page.waitForURL(/\/tai-khoan\?thong-bao=doi-mat-khau$/);
    await expect(page.locator("#tai-khoan-thong-bao")).toContainText("Đã đặt mật khẩu mới");

    // Hết phiên khôi phục: không đổi tiếp được bằng trang đặt lại.
    await page.goto("/dat-lai-mat-khau");
    await expect(page.locator("#dat-lai-het-han")).toBeVisible();

    await page.goto("/tai-khoan");
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await signIn(page, email, PASSWORD);
    await expect(page.locator("#dang-nhap-loi")).toHaveText("Email hoặc mật khẩu không đúng.");
    await signIn(page, email, newPassword);
    await page.waitForURL(/\/tai-khoan$/);
  });
});

// Đăng nhập Google — giai đoạn B3 (mục 6.1). Google chặn trình duyệt tự động; ở đây giả lập "người vào lần đầu chưa đồng
// ý điều khoản" bằng tài khoản có user_metadata kiểu Google (full_name, picture) mà KHÔNG có terms_version.
test.describe.serial("Đăng nhập Google — phần kiểm tự động được (B3)", () => {
  test.afterAll(cleanupLearners);

  test("chưa đồng ý điều khoản → /dang-ky/hoan-tat (tên gợi ý từ Google) → tích đồng ý → hồ sơ có ảnh, về /tai-khoan", async ({ page }) => {
    const email = newEmail();
    const picture = "https://lh3.googleusercontent.com/a/zz-kiem-thu=s96-c";
    const { data: created, error } = await adminApi().auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "ZZ Google E2E", picture },
    });
    expect(error).toBeNull();

    await signIn(page, email, PASSWORD);
    await page.waitForURL(/\/dang-ky\/hoan-tat$/);
    await expect(page.locator("#displayName")).toHaveValue("ZZ Google E2E");

    // Chưa tích đồng ý → báo lỗi, chưa tạo hồ sơ; các trang tài khoản vẫn đưa về đây.
    await page.getByRole("button", { name: "Hoàn tất" }).click();
    await expect(page.locator("#agree-loi")).toContainText("đồng ý");
    await page.goto("/tai-khoan");
    await page.waitForURL(/\/dang-ky\/hoan-tat$/);

    await page.locator("#displayName").fill("ZZ Google Đã Sửa");
    await page.locator('input[name="agree"]').check();
    await page.getByRole("button", { name: "Hoàn tất" }).click();
    await page.waitForURL(/\/tai-khoan$/);
    await expect(page.getByTestId("account-name")).toHaveText("ZZ Google Đã Sửa");

    const { data: profile } = await adminApi()
      .from("learner_profiles")
      .select("display_name, avatar_url, terms_version")
      .eq("id", created.user!.id)
      .single();
    expect(profile).toEqual({ display_name: "ZZ Google Đã Sửa", avatar_url: picture, terms_version: TERMS });

    // Đã có hồ sơ → mở lại trang hoàn tất thì đi thẳng tới `next`.
    await page.goto("/dang-ky/hoan-tat?next=%2Fho-chieu");
    await page.waitForURL(/\/ho-chieu$/);
  });

  test("hoàn tất đăng ký khi chưa đăng nhập → về /dang-nhap", async ({ page }) => {
    await page.goto("/dang-ky/hoan-tat?next=%2Fluyen-thi");
    await page.waitForURL(/\/dang-nhap\?next=%2Fluyen-thi$/);
  });

  test("/auth/callback: bấm Hủy ở Google, thiếu code, code giả → trang lỗi tiếng Việt", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied&error_description=denied");
    await page.waitForURL(/\/auth\/loi\?ly-do=google-huy$/);
    await expect(page.locator("#auth-loi")).toContainText("hủy");

    await page.goto("/auth/callback");
    await page.waitForURL(/\/auth\/loi\?ly-do=google-loi$/);

    // Không có code_verifier trong cookie (chưa từng bấm nút Google trên trình duyệt này).
    await page.goto("/auth/callback?code=zz-khong-ton-tai&next=%2F%2Fevil.com");
    await page.waitForURL(/\/auth\/loi\?ly-do=google-het-han$/);
    await expect(page.locator("#auth-loi")).toContainText("trình duyệt");
  });
});
