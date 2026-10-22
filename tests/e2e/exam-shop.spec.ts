import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { adminApi, hasSecretKey } from "./support";

// Luyện thi GĐ8 (docs/ke-hoach-luyen-thi.md, mục 4.8, 4.9, 5): trang bán hàng dựng từ dữ liệu thật, người có gói được
// chuyển sang Tổng quan, kỹ năng làm bài, sổ tay ôn thi, bản in đề + nhập đáp án giấy — trên DB thật. Học sinh thử
// zz-kiem-thu-shop-*@test.local có gói gắn tài khoản. Dọn hết ở cuối.

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const run = Date.now().toString(36);
const EMAIL = `zz-kiem-thu-shop-${run}@test.local`;
const PASSWORD = "lichsu2026A";
const db = adminApi();
let userId = "";
const paperAttempts: string[] = [];

function randomLicenseCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `LT12-${part()}-${part()}-${part()}`;
}

test.beforeAll(async () => {
  const { data: user, error } = await db.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { display_name: "ZZ Shop E2E", terms_version: "2026-10" } });
  if (error) throw error;
  userId = user.user.id;
  const { data: product } = await db.from("products").select("id").eq("kind", "exam_pack").eq("is_active", true).limit(1).single();
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({ product_id: product!.id, amount_vnd: 29000, provider: "mock", access_token_hash: "d".repeat(64), user_id: userId })
    .select("order_code")
    .single();
  if (orderError) throw orderError;
  const { error: paidError } = await db.rpc("mark_order_paid", { p_order_code: order.order_code, p_amount: 29000, p_provider: "mock", p_provider_ref: `zz-shop-${run}`, p_license_code: randomLicenseCode() });
  if (paidError) throw paidError;
});

test.afterAll(async () => {
  if (paperAttempts.length) await db.from("exam_attempts").delete().in("id", paperAttempts);
  if (userId) {
    await db.from("exam_attempts").delete().eq("user_id", userId);
    await db.from("licenses").delete().eq("user_id", userId);
    await db.from("orders").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
  }
});

async function login(page: Page, next: string) {
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/dang-nhap"));
  if (page.url().includes("/dang-ky/hoan-tat")) {
    await page.locator('input[name="agree"]').check();
    await page.getByRole("button", { name: "Hoàn tất" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/dang-ky"));
  }
}

test.describe("Trang bán hàng (GĐ8)", () => {
  test("khách: số liệu khớp DB, làm thử đề miễn phí, xem trước, hỏi đáp; không hứa điều chưa có", async ({ page }) => {
    const count = async (kind: string) =>
      (await db.from("exam_items").select("id", { count: "exact", head: true }).eq("workflow_status", "published").eq("grade", 12).eq("kind", kind)).count ?? 0;
    const [mcq, tf] = await Promise.all([count("mcq"), count("true_false")]);
    await page.goto("/luyen-thi");
    const benefits = page.getByTestId("pack-benefits");
    if (mcq + tf > 0) await expect(benefits).toContainText(`Ngân hàng ${mcq + tf} câu hỏi đã kiểm duyệt`);
    if (tf === 0) await expect(benefits).not.toContainText("câu Đúng/Sai");
    await expect(page.getByTestId("free-trial")).toHaveAttribute("href", /\/luyen-thi\/de-1$/);
    await expect(page.getByRole("img", { name: /Phòng thi/ })).toBeVisible();
    await expect(page.getByTestId("faq").locator("details")).toHaveCount(6);
    await page.getByText("Một gói dùng được trên mấy máy?").click();
    await expect(page.getByTestId("faq")).toContainText(/tối đa \d thiết bị/);
    await expect(page.getByText(/40 câu/)).toHaveCount(0);
  });

  test("người có gói gắn tài khoản vào /luyen-thi → chuyển sang Tổng quan; ?gioi-thieu=1 vẫn xem được", async ({ page }) => {
    await login(page, "/luyen-thi/tong-quan");
    await page.goto("/luyen-thi");
    await expect(page).toHaveURL(/\/luyen-thi\/tong-quan$/);
    await page.getByRole("link", { name: "Trang giới thiệu gói" }).click();
    await expect(page).toHaveURL(/gioi-thieu=1/);
    await expect(page.getByTestId("pack-benefits")).toBeVisible();
  });
});

test.describe("Kỹ năng, sổ tay (GĐ8)", () => {
  test("kỹ năng Đúng/Sai: bảng điểm đúng cấu trúc, lời giải ẩn tới khi mở", async ({ page }) => {
    await page.goto("/luyen-thi/ky-nang/dung-sai");
    await expect(page.getByTestId("bang-diem-dung-sai")).toContainText("0,1");
    await expect(page.getByTestId("bang-diem-dung-sai")).toContainText("0,25");
    const example = page.getByTestId("vi-du-ds-1");
    await expect(example.getByText("Bẫy đánh tráo tên gọi")).toBeHidden();
    await example.getByText("Xem đáp án và lời giải").click();
    await expect(example.getByText(/Bẫy đánh tráo tên gọi/)).toBeVisible();
    await page.goto("/luyen-thi/ky-nang/doc-tu-lieu");
    await expect(page.getByTestId("vi-du-tl-1")).toContainText("Tất cả mọi người đều sinh ra có quyền bình đẳng");
  });

  test("sổ tay: bài xem thử ai cũng xem; bài khác khách thấy lời mời, API chặn; có gói thì xem được", async ({ page, request }) => {
    await page.goto("/luyen-thi/so-tay/6-cach-mang-thang-tam-nam-1945");
    await expect(page.getByTestId("handbook")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mốc thời gian" })).toBeVisible();
    await page.goto("/luyen-thi/so-tay/8-khang-chien-chong-my-cuu-nuoc");
    await expect(page.getByText("Sổ tay ôn thi thuộc Gói luyện thi")).toBeVisible();
    await expect(page.getByTestId("handbook")).toHaveCount(0);
    const blocked = await request.get("/api/luyen-thi/so-tay/8-khang-chien-chong-my-cuu-nuoc", { headers: { "x-device-id": randomUUID() } });
    expect(blocked.status()).toBe(403);

    await login(page, "/luyen-thi/so-tay/8-khang-chien-chong-my-cuu-nuoc");
    await expect(page.getByTestId("handbook")).toBeVisible();
    await expect(page.getByRole("button", { name: "In sổ tay" })).toBeVisible();
  });
});

test.describe("Bản in + nhập đáp án giấy (GĐ8)", () => {
  test("in đề miễn phí: có phiếu trả lời, KHÔNG có đáp án / lời giải; nhập đáp án → chấm như bài online", async ({ page }) => {
    await page.goto("/luyen-thi/de-1");
    await page.getByTestId("print-link").click();
    await expect(page).toHaveURL(/\/luyen-thi\/de-1\/in$/);
    const print = page.getByTestId("paper-print");
    await expect(print.getByTestId("answer-sheet")).toBeVisible();
    const text = (await print.textContent()) ?? "";
    const { data: set } = await db.from("exam_sets").select("id").eq("slug", "de-1").single();
    const { data: links } = await db.from("exam_set_items").select("exam_items(explanation)").eq("set_id", set!.id);
    for (const link of links ?? []) {
      const explanation = (link.exam_items as unknown as { explanation: string } | null)?.explanation;
      if (explanation) expect(text).not.toContain(explanation);
    }
    expect(text).not.toMatch(/Đáp án:/);

    await page.getByRole("link", { name: "Nhập đáp án đã làm" }).click();
    await expect(page.getByTestId("paper-entry")).toBeVisible();
    const attemptId = new URL(page.url()).searchParams.get("luot")!;
    paperAttempts.push(attemptId);
    await page.getByRole("group", { name: "Câu 1", exact: true }).getByRole("button", { name: "A" }).click();
    await page.getByRole("group", { name: "Câu 2", exact: true }).getByRole("button", { name: "B" }).click();
    await expect(page.getByTestId("paper-entry")).toContainText("Đã nhập 2/10 câu");
    await page.getByRole("button", { name: "Chấm điểm" }).click();
    await expect(page).toHaveURL(new RegExp(`/luyen-thi/ket-qua/${attemptId}$`));
    await expect(page.getByTestId("exam-score")).toBeVisible();
    const { data: attempt } = await db.from("exam_attempts").select("mode, status, deadline_at").eq("id", attemptId).single();
    expect(attempt).toEqual({ mode: "paper", status: "submitted", deadline_at: null });
  });

  test("đề trong gói: chưa có mã → không in được; API máy khác không mở được lượt in", async ({ page, request }) => {
    await page.goto("/luyen-thi/de-2/in");
    await expect(page.getByText(/thuộc Gói luyện thi/)).toBeVisible();
    await expect(page.getByTestId("paper-print")).toHaveCount(0);
    const owner = { "x-device-id": randomUUID() };
    const started = await (await request.post("/api/luyen-thi/de-1/ban-in", { headers: owner })).json();
    paperAttempts.push(started.attempt.id);
    expect(started.attempt.mode).toBe("paper");
    expect(JSON.stringify(started)).not.toMatch(/"(correct_index|explanation)"/);
    expect((await request.get(`/api/luyen-thi/luot/${started.attempt.id}`, { headers: { "x-device-id": randomUUID() } })).status()).toBe(404);
  });
});
