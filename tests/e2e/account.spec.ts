import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { adminApi, asUser, hasHorizontalOverflow, hasSecretKey } from "./support";

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

/** Đăng xuất từ trang Tài khoản: nút mở hộp thoại (mục 6.5) → xác nhận → về trang chủ. */
async function signOut(page: Page, options: { shared?: boolean } = {}): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Đăng xuất?" });
  // Bấm trước khi hydrate thì nút chưa có onClick → thử lại tới khi hộp thoại mở.
  await expect(async () => {
    await page.locator("main").getByRole("button", { name: "Đăng xuất" }).click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  if (options.shared) await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL((url) => url.pathname === "/");
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
    await signOut(page);
    await page.goto("/tai-khoan");
    await page.waitForURL(/\/dang-nhap\?next=/);
  });

  test("(5) next=//evil.com và next=https://evil.com → về /tai-khoan, không rời trang", async ({ page }) => {
    const email = await createLearner();
    await signIn(page, email, PASSWORD, "/dang-nhap?next=%2F%2Fevil.com");
    await page.waitForURL(/\/tai-khoan$/);
    await signOut(page);
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
    await signOut(page);
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

// Trang tài khoản + Bảo mật — giai đoạn B4 (docs/ke-hoach-tai-khoan.md, mục 4.4, 6.5, 10, 12: E2E (6), (10)).
async function userIdOf(email: string): Promise<string> {
  const { data } = await adminApi().auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error(`Không thấy tài khoản ${email}`);
  return user.id;
}

/** Đăng nhập bằng API (không qua giao diện) — để kiểm mật khẩu cũ / mới còn tác dụng hay không. */
async function canSignIn(email: string, password: string): Promise<boolean> {
  try {
    await asUser(email, password);
    return true;
  } catch {
    return false;
  }
}

test.describe.serial("Tài khoản và Bảo mật (B4)", () => {
  test.afterAll(cleanupLearners);

  test("(6) học sinh mở /quan-tri → về /tai-khoan kèm thông báo; trang 'bị khóa' cũng vậy", async ({ page }) => {
    const email = await createLearner();
    await signIn(page, email, PASSWORD);
    await page.waitForURL(/\/tai-khoan$/);

    await page.goto("/quan-tri");
    await page.waitForURL(/\/tai-khoan\?thong-bao=khu-noi-bo$/);
    await expect(page.locator("#tai-khoan-thong-bao")).toContainText("chỉ dành cho nhân sự");
    await page.goto("/quan-tri/bai-sgk");
    await page.waitForURL(/\/tai-khoan\?thong-bao=khu-noi-bo$/);
    await page.goto("/quan-tri/tai-khoan-bi-khoa");
    await page.waitForURL(/\/tai-khoan\?thong-bao=khu-noi-bo$/);
  });

  test("Header: khách thấy 'Đăng nhập'; đăng nhập rồi thấy menu tài khoản; đăng xuất máy dùng chung xóa dữ liệu trên máy", async ({ page }) => {
    const email = await createLearner({ name: "ZZ Header E2E" });
    await page.goto("/bai-hoc");
    const header = page.locator("header").first();
    await expect(header.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/dang-nhap?next=%2Fbai-hoc");

    await signIn(page, email, PASSWORD, "/dang-nhap?next=%2Fbai-hoc");
    await page.waitForURL(/\/bai-hoc$/);
    const trigger = header.getByRole("button", { name: "Tài khoản: ZZ Header E2E" });
    await expect(trigger).toBeVisible();
    await expect(header.getByRole("link", { name: "Đăng nhập" })).toHaveCount(0);

    // Dữ liệu trên máy: tiến độ + mã kích hoạt.
    await page.evaluate(() => {
      localStorage.setItem("ls12:tien-do", JSON.stringify({ v: 1, lessons: {}, quizzes: {}, sgk: {} }));
      localStorage.setItem("ls12:ban-quyen", JSON.stringify({ code: "ZZ" }));
    });

    await trigger.click();
    const menu = page.locator("#account-menu");
    await expect(menu.getByRole("link", { name: "Tài khoản của em" })).toHaveAttribute("href", "/tai-khoan");
    await expect(menu.getByRole("link", { name: "Bảo mật" })).toHaveAttribute("href", "/tai-khoan/bao-mat");
    await expect(menu.getByRole("link", { name: "Khu quản trị" })).toHaveCount(0);
    await menu.getByRole("button", { name: "Đăng xuất" }).click();

    const dialog = page.getByRole("dialog", { name: "Đăng xuất?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Ở lại" }).click();
    await expect(dialog).toBeHidden();

    await trigger.click();
    await menu.getByRole("button", { name: "Đăng xuất" }).click();
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Đăng xuất" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(header.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
    expect(await page.evaluate(() => [localStorage.getItem("ls12:tien-do"), localStorage.getItem("ls12:ban-quyen")])).toEqual([null, null]);
    await page.goto("/tai-khoan");
    await page.waitForURL(/\/dang-nhap\?next=/);
  });

  test("hồ sơ: sửa tên + trường → lưu vào DB, Header cập nhật tên", async ({ page }) => {
    const email = await createLearner({ name: "ZZ Hồ Sơ E2E" });
    await signIn(page, email, PASSWORD);
    await page.waitForURL(/\/tai-khoan$/);

    await page.locator("#displayName").fill(" ");
    await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
    await expect(page.locator("#displayName-loi")).toContainText("tên hiển thị");

    await page.locator("#displayName").fill("ZZ  Hồ Sơ   Mới");
    await page.locator("#school").fill("THPT ZZ Kiểm Thử");
    await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
    await expect(page.locator("#ho-so-da-luu")).toBeVisible();
    await expect(page.locator("header").first().getByRole("button", { name: "Tài khoản: ZZ Hồ Sơ Mới" })).toBeVisible();

    const { data } = await adminApi().from("learner_profiles").select("display_name, school").eq("id", await userIdOf(email)).single();
    expect(data).toEqual({ display_name: "ZZ Hồ Sơ Mới", school: "THPT ZZ Kiểm Thử" });
  });

  test("đổi mật khẩu: sai mật khẩu hiện tại → báo lỗi; đúng → đổi, máy khác bị đăng xuất, mật khẩu cũ hết tác dụng", async ({ page, browser }) => {
    const email = await createLearner();
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, email, PASSWORD);
    await otherPage.waitForURL(/\/tai-khoan$/);

    await signIn(page, email, PASSWORD, "/dang-nhap?next=%2Ftai-khoan%2Fbao-mat");
    await page.waitForURL(/\/tai-khoan\/bao-mat$/);
    await expect(page.getByTestId("phuong-thuc-mat-khau")).toHaveText("Đang dùng");
    await expect(page.getByTestId("phuong-thuc-google")).toContainText("Chưa liên kết");

    const newPassword = "lichsu2028C";
    await page.locator("#current").fill("saimatkhau1");
    await page.locator("#password").fill(newPassword);
    await page.locator("#confirm").fill(newPassword);
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
    await expect(page.locator("#current-loi")).toHaveText("Mật khẩu hiện tại không đúng.");

    await page.locator("#current").fill(PASSWORD);
    await page.locator("#password").fill(newPassword);
    await page.locator("#confirm").fill(newPassword);
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
    await expect(page.locator("#mat-khau-da-luu")).toContainText("Đã đổi mật khẩu");

    // Máy này vẫn đăng nhập; máy kia bị đăng xuất.
    await page.goto("/tai-khoan");
    await expect(page.getByTestId("account-email")).toHaveText(email);
    await otherPage.goto("/tai-khoan");
    // Máy kia còn JWT chưa hết hạn → proxy cho qua; requireLearner (getUser) mới chặn → /dang-nhap.
    await otherPage.waitForURL((url) => url.pathname === "/dang-nhap");
    await other.close();

    expect(await canSignIn(email, PASSWORD)).toBe(false);
    expect(await canSignIn(email, newPassword)).toBe(true);
  });

  test("tải dữ liệu của em: JSON đính kèm gồm email, hồ sơ; chưa đăng nhập → về trang đăng nhập", async ({ page }) => {
    const email = await createLearner({ name: "ZZ Dữ Liệu E2E" });
    const anonymous = await page.request.get("/tai-khoan/du-lieu", { maxRedirects: 0 });
    expect(anonymous.status()).toBe(307);
    expect(anonymous.headers().location).toContain("/dang-nhap?next=%2Ftai-khoan%2Fdu-lieu");

    await signIn(page, email, PASSWORD);
    await page.waitForURL(/\/tai-khoan$/);
    const response = await page.request.get("/tai-khoan/du-lieu");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toMatch(/^attachment; filename="lich-su-12-du-lieu-\d{4}-\d{2}-\d{2}\.json"$/);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.json();
    expect(body.tai_khoan.email).toBe(email);
    expect(body.tai_khoan.dang_nhap_bang).toEqual(["email + mật khẩu"]);
    expect(body.ho_so.display_name).toBe("ZZ Dữ Liệu E2E");
    expect(body.don_hang).toEqual([]);
    expect(JSON.stringify(body)).not.toMatch(/access_token|client_ip/);
  });

  test("đăng xuất mọi thiết bị → mọi phiên bị thu hồi", async ({ page, browser }) => {
    const email = await createLearner();
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, email, PASSWORD);
    await otherPage.waitForURL(/\/tai-khoan$/);

    await signIn(page, email, PASSWORD, "/dang-nhap?next=%2Ftai-khoan%2Fbao-mat");
    await page.waitForURL(/\/tai-khoan\/bao-mat$/);
    await page.getByRole("button", { name: "Đăng xuất mọi thiết bị" }).click();
    await page.waitForURL(/\/dang-nhap\?thong-bao=dang-xuat-moi-may$/);
    await expect(page.locator("#dang-nhap-thong-bao")).toContainText("mọi thiết bị");

    await page.goto("/tai-khoan");
    await page.waitForURL(/\/dang-nhap\?next=/);
    await otherPage.goto("/tai-khoan");
    // Máy kia còn JWT chưa hết hạn → proxy cho qua; requireLearner (getUser) mới chặn → /dang-nhap.
    await otherPage.waitForURL((url) => url.pathname === "/dang-nhap");
    await other.close();
  });

  test("trợ năng (sáng + tối) /tai-khoan, /tai-khoan/bao-mat, menu tài khoản mở; điện thoại không tràn ngang", async ({ page }) => {
    const email = await createLearner({ name: "ZZ Trợ Năng E2E" });
    await signIn(page, email, PASSWORD);
    await page.waitForURL(/\/tai-khoan$/);

    const check = async () => {
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const blocking = results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`);
      expect(blocking, blocking.join("\n")).toEqual([]);
    };
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of ["/tai-khoan", "/tai-khoan/bao-mat"]) {
        await page.goto(path);
        await check();
      }
    }
    await page.locator("header").first().getByRole("button", { name: "Tài khoản: ZZ Trợ Năng E2E" }).click();
    await check();

    await page.setViewportSize({ width: 360, height: 780 });
    for (const path of ["/tai-khoan", "/tai-khoan/bao-mat"]) {
      await page.goto(path);
      expect(await hasHorizontalOverflow(page), path).toBe(false);
    }
    await page.getByRole("button", { name: "Mở menu" }).click();
    const mobileNav = page.locator("#mobile-nav");
    await expect(mobileNav.getByText("ZZ Trợ Năng E2E")).toBeVisible();
    await mobileNav.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page.getByRole("dialog", { name: "Đăng xuất?" })).toBeVisible();
  });

  test("(10) xóa tài khoản: gõ sai email → báo lỗi; đúng → xóa hẳn, không đăng nhập lại được", async ({ page }) => {
    const email = await createLearner();
    await signIn(page, email, PASSWORD, "/dang-nhap?next=%2Ftai-khoan%2Fbao-mat");
    await page.waitForURL(/\/tai-khoan\/bao-mat$/);
    const userId = await userIdOf(email);

    await page.locator("#confirmEmail").fill("khac@test.local");
    await page.getByRole("button", { name: "Xóa vĩnh viễn tài khoản" }).click();
    await expect(page.locator("#confirmEmail-loi")).toHaveText("Email chưa khớp với email của tài khoản.");

    await page.locator("#confirmEmail").fill(email.toUpperCase());
    await page.getByRole("button", { name: "Xóa vĩnh viễn tài khoản" }).click();
    await page.waitForURL(/\/dang-nhap\?thong-bao=da-xoa-tai-khoan$/);
    await expect(page.locator("#dang-nhap-thong-bao")).toContainText("Đã xóa tài khoản");

    const { data: user } = await adminApi().auth.admin.getUserById(userId);
    expect(user.user).toBeNull();
    const { data: profile } = await adminApi().from("learner_profiles").select("id").eq("id", userId).maybeSingle();
    expect(profile).toBeNull();
    expect(await canSignIn(email, PASSWORD)).toBe(false);
    await page.goto("/tai-khoan");
    await page.waitForURL(/\/dang-nhap\?next=/);
  });
});
