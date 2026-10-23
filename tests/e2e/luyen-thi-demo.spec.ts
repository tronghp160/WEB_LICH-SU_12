import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminApi, hasHorizontalOverflow, hasSecretKey } from "./support";

// Demo luyện thi GĐ-D5 (docs/ke-hoach-demo-luyen-thi.md, mục 8): chạy trên dữ liệu demo THẬT — cần đã chạy
// seed-ngan-hang.sql → seed-de-3.sql → seed-demo-luyen-thi.sql (đề de-3 đã công bố). Chưa có thì bỏ qua cả tệp.
// Không tạo câu / đề thử; chỉ tạo lượt làm bài và xóa các lượt đó ở cuối. Đề 3 thuộc gói (seed-de-3-tra-phi.sql) → làm
// đề bằng học sinh thử zz-kiem-thu-demo-*@test.local có gói gắn tài khoản; dọn hết ở cuối.

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const run = Date.now().toString(36);
const EMAIL = `zz-kiem-thu-demo-${run}@test.local`;
const PASSWORD = "lichsu2026A";
const db = adminApi();
const attemptIds = new Set<string>();
const LEAK = /"(choice_notes|statement_refs|section_id|remember|correct_index|truths)"|Vì sao sai/;
let userId = "";

function randomLicenseCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `LT12-${part()}-${part()}-${part()}`;
}

test.beforeAll(async () => {
  const { data } = await db.from("exam_sets").select("workflow_status").eq("slug", "de-3").maybeSingle();
  test.skip(data?.workflow_status !== "published", "Đề de-3 chưa công bố — chạy seed demo (GĐ-D4) trước");

  const { data: created, error } = await db.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { display_name: "ZZ Demo E2E", terms_version: "2026-10" } });
  if (error) throw error;
  userId = created.user.id;
  const { data: product } = await db.from("products").select("id").eq("kind", "exam_pack").eq("is_active", true).limit(1).single();
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({ product_id: product!.id, amount_vnd: 29000, provider: "mock", access_token_hash: "f".repeat(64), user_id: userId })
    .select("order_code")
    .single();
  if (orderError) throw orderError;
  const { error: paidError } = await db.rpc("mark_order_paid", { p_order_code: order.order_code, p_amount: 29000, p_provider: "mock", p_provider_ref: `zz-demo-${run}`, p_license_code: randomLicenseCode() });
  if (paidError) throw paidError;
});

test.afterAll(async () => {
  if (attemptIds.size > 0) await db.from("exam_attempts").delete().in("id", [...attemptIds]);
  if (userId) {
    await db.from("exam_attempts").delete().eq("user_id", userId);
    await db.from("learner_item_state").delete().eq("user_id", userId);
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
  const target = new RegExp(next.replace(/[/?]/g, "\\$&"));
  await page.waitForURL((url) => target.test(url.pathname) || url.pathname.startsWith("/dang-ky/hoan-tat"));
  if (page.url().includes("/dang-ky/hoan-tat")) {
    await page.locator('input[name="agree"]').check();
    await page.getByRole("button", { name: "Hoàn tất" }).click();
    await page.waitForURL((url) => target.test(url.pathname));
  }
}

/** Ghi lại id lượt làm bài từ phản hồi API (để dọn), và nội dung phản hồi trước khi nộp (để quét lộ đáp án). */
function watch(page: Page, bodies: string[] = []) {
  page.on("response", async (response) => {
    if (!response.url().includes("/api/luyen-thi/")) return;
    const text = await response.text().catch(() => "");
    const id = /"attempt":\{[^}]*?"id":"([0-9a-f-]{36})"/.exec(text)?.[1];
    if (id) attemptIds.add(id);
    if (!/\/(nop|kiem-tra)$/.test(new URL(response.url()).pathname)) bodies.push(text);
  });
  return bodies;
}

test.describe("Demo luyện thi — dữ liệu Bài 6 – 8 và đề số 3", () => {
  test("luyện tập Bài 7 × Trắc nghiệm × Vận dụng × có tư liệu: có khung tư liệu; trả lời sai → Vì sao sai, kiểu bẫy, liên kết tới đúng mục", async ({ page }) => {
    const bodies = watch(page);
    await page.goto("/luyen-thi/luyen-tap");
    await page.getByLabel("Bài 7. Kháng chiến chống thực dân Pháp").check();
    await page.getByLabel("Trắc nghiệm", { exact: true }).check();
    await page.getByLabel("Vận dụng", { exact: true }).check();
    await page.getByLabel("Chỉ câu có tư liệu").check();
    await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
    const room = page.getByTestId("practice-room");
    await expect(room).toBeVisible();
    await expect(room).toContainText(/Câu 1\/\d+/);
    await expect(room.locator("figure figcaption").filter({ hasText: /^Nguồn:/ })).toBeVisible();
    for (const body of bodies) expect(body).not.toMatch(LEAK);

    // Chọn lựa chọn đầu tiên cho tới khi gặp một câu sai (tối đa 6 câu — Bài 7 có 6 câu Vận dụng dùng tư liệu).
    let wrong = false;
    for (let index = 0; index < 6 && !wrong; index++) {
      await room.getByRole("list", { name: "Các đáp án" }).getByRole("button").first().click();
      await page.getByRole("button", { name: "Kiểm tra" }).click();
      const status = page.getByRole("status").filter({ hasText: /Chính xác!|Chưa đúng/ });
      await expect(status).toBeVisible();
      wrong = /Chưa đúng/.test((await status.textContent()) ?? "");
      if (!wrong) await page.getByRole("button", { name: "Câu tiếp" }).click();
    }
    expect(wrong, "Không gặp câu sai nào khi chọn lựa chọn A ở mọi câu").toBe(true);
    const block = room.getByTestId("wrong-choice");
    await expect(block).toContainText("Vì sao sai:");
    await expect(block.getByTestId("trap-badge")).toBeVisible();
    await expect(room.getByTestId("remember")).toBeVisible();
    const link = block.getByTestId("knowledge-link");
    await expect(link).toHaveAttribute("href", /^\/bai\/\d+-[a-z0-9-]+#muc-\d+$/);
    await page.screenshot({ path: "docs/screenshots/demo-luyen-tap.png", fullPage: true });

    const href = (await link.getAttribute("href"))!;
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.locator(href.slice(href.indexOf("#")))).toBeInViewport();
  });

  test("đề số 3 thuộc gói: khách chưa có gói không bắt đầu được, không thấy câu hỏi", async ({ page }) => {
    await page.goto("/luyen-thi/de-3");
    await expect(page.getByText("Đề này thuộc Gói luyện thi.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bắt đầu làm bài" })).toHaveCount(0);
    await page.goto("/luyen-thi/de-3/in");
    await expect(page.getByText(/thuộc Gói luyện thi/)).toBeVisible();
    await expect(page.getByTestId("paper-print")).toHaveCount(0);
  });

  test("đề số 3: 24 + 4 câu, 50 phút, không lộ đáp án trước khi nộp; nộp → thang 10, hai phần, Kiến thức cần ôn lại", async ({ page }) => {
    const bodies = watch(page);
    await login(page, "/luyen-thi/de-3");
    await page.goto("/luyen-thi/de-3");
    expect(await page.content()).not.toMatch(LEAK);
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByRole("timer")).toHaveAccessibleName(/(50|49):\d\d/);
    await expect(page.getByText("Câu 1/28")).toBeVisible();
    const sheet = page.getByRole("navigation", { name: "Chuyển nhanh tới câu" });
    await sheet.or(page.getByRole("button", { name: /Phiếu trả lời/ })).first().waitFor();
    expect(await page.content()).not.toMatch(LEAK);
    for (const body of bodies) expect(body).not.toMatch(LEAK);
    await page.screenshot({ path: "docs/screenshots/demo-de-3-phong-thi.png" });

    // Câu 7: dùng chung tư liệu với câu 8 (Điện Biên Phủ).
    for (let index = 0; index < 6; index++) await page.getByRole("button", { name: "Câu sau" }).click();
    await expect(page.getByTestId("passage")).toContainText("Điện Biên Phủ");
    await page.getByRole("list", { name: "Các đáp án" }).getByRole("button").first().click();

    await page.getByRole("button", { name: "Nộp bài" }).click();
    const dialog = page.getByRole("dialog", { name: "Nộp bài?" });
    await expect(dialog).toContainText("Đã làm 1/28 câu.");
    await dialog.getByRole("button", { name: "Nộp bài" }).click();
    await expect(page).toHaveURL(/\/luyen-thi\/ket-qua\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("exam-score")).toHaveText(/^(0|0,25) điểm$/);
    await expect(page.getByTestId("part-1")).toHaveText(/\/ 6 điểm$/);
    await expect(page.getByTestId("part-2")).toHaveText(/\/ 4 điểm$/);
    const hints = page.getByTestId("review-hints");
    await expect(hints).toBeVisible();
    await expect(hints.getByRole("listitem")).toHaveCount(5);
    await expect(page.getByTestId("solutions").getByTestId("solution-item")).toHaveCount(28);
    await expect(page.getByTestId("solutions")).toContainText("Lớp 11");

    const axe = await new AxeBuilder({ page }).include("[data-testid=solutions]").include("[data-testid=review-hints]").analyze();
    expect(axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
    for (const [width, name] of [[360, "360"], [768, "768"], [1280, "1280"]] as const) {
      await page.setViewportSize({ width, height: 900 });
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `docs/screenshots/demo-de-3-ket-qua-${name}.png` });
    }
  });

  test("bản in đề số 3: đủ hai phần, phiếu trả lời, không có lời giải", async ({ page }) => {
    watch(page);
    await login(page, "/luyen-thi/de-3/in");
    await page.goto("/luyen-thi/de-3/in");
    const print = page.getByTestId("paper-print");
    await expect(print).toContainText("28 câu");
    await expect(print.getByRole("heading", { name: /Phần I\./ })).toBeVisible();
    await expect(print.getByRole("heading", { name: /Phần II\./ })).toBeVisible();
    await expect(print.getByTestId("answer-sheet")).toBeVisible();
    const text = (await print.textContent()) ?? "";
    expect(text).not.toMatch(/Vì sao sai|Ghi nhớ:|Đáp án:/);
  });

  test("trang luyện thi: đề 3 hiện là đề đầy đủ (thuộc gói); câu chữ không còn “đang được biên soạn” cho đề đầy đủ", async ({ page }) => {
    await page.goto("/luyen-thi");
    await expect(page.getByRole("link", { name: /Đề luyện thi số 3/ }).first()).toBeVisible();
    await expect(page.getByTestId("exam-format-note")).toContainText(/Hiện có \d+ đề đầy đủ/);
  });
});
