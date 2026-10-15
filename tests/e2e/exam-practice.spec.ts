import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { adminApi, hasSecretKey } from "./support";

// Luyện thi GĐ4 (docs/ke-hoach-luyen-thi.md, mục 4.3, 4.5): luyện tập chấm từng câu, hạn mức miễn phí, sổ câu sai + ôn
// ngắt quãng, làm lại câu sai — trên DB thật. Câu thử (12 câu trắc nghiệm đã công bố) thuộc "bài" riêng
// `zz-kiem-thu-luyen-tap-…` (không có trong khung SGK) để lọc theo bài chỉ ra đúng câu thử. Học sinh thử
// zz-kiem-thu-lt-*@test.local có gói gắn tài khoản. Dọn hết ở cuối.

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const run = Date.now().toString(36);
const LESSON = `zz-kiem-thu-luyen-tap-${run}`;
const PREFIX = `ZZ KIỂM THỬ LT ${run}`;
const EMAIL = `zz-kiem-thu-lt-${run}@test.local`;
const PASSWORD = "lichsu2026A";
const db = adminApi();

/** Mã kích hoạt ngẫu nhiên đúng định dạng (lib/payments/license.ts — bỏ I, O, 0, 1). */
function randomLicenseCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `LT12-${part()}-${part()}-${part()}`;
}
let userId = "";
let productId = "";

test.beforeAll(async () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    kind: "mcq",
    stem: `${PREFIX} câu ${index + 1}?`,
    choices: [`Đúng ${index + 1}`, `Sai một ${index + 1}`, `Sai hai ${index + 1}`, `Sai ba ${index + 1}`],
    correct_index: 0,
    explanation: `Lời giải câu ${index + 1}.`,
    lesson_slug: LESSON,
    level: "nhan_biet",
    competency: "tim_hieu_lich_su",
    source_note: "Kiểm thử E2E",
    workflow_status: "published",
  }));
  const { error } = await db.from("exam_items").insert(items);
  if (error) throw error;
  const { data: user, error: userError } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "ZZ Luyện tập E2E", terms_version: "2026-10" },
  });
  if (userError) throw userError;
  userId = user.user.id;
  // Gói gắn tài khoản: đơn đã thanh toán của chính học sinh (như mua khi đăng nhập).
  const { data: product } = await db.from("products").select("id").eq("kind", "exam_pack").eq("is_active", true).limit(1).single();
  productId = product!.id;
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({ product_id: productId, amount_vnd: 29000, provider: "mock", access_token_hash: "e".repeat(64), user_id: userId })
    .select("order_code")
    .single();
  if (orderError) throw orderError;
  const { error: paidError } = await db.rpc("mark_order_paid", { p_order_code: order.order_code, p_amount: 29000, p_provider: "mock", p_provider_ref: `zz-${run}`, p_license_code: randomLicenseCode() });
  if (paidError) throw paidError;
});

test.afterAll(async () => {
  const { data: items } = await db.from("exam_items").select("id").like("stem", `${PREFIX}%`);
  const ids = (items ?? []).map((item) => item.id);
  if (userId) {
    await db.from("exam_attempts").delete().eq("user_id", userId);
    await db.from("licenses").delete().eq("user_id", userId);
    await db.from("orders").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
  }
  if (ids.length > 0) {
    await db.from("exam_attempts").delete().overlaps("item_ids", ids);
    await db.from("exam_items").delete().in("id", ids);
  }
});

/** Đáp án ĐANG HIỂN THỊ của mỗi câu trong lượt (lựa chọn đã xoay ngẫu nhiên) — đọc bằng khóa bí mật. */
async function displayedCorrect(attemptId: string): Promise<Map<string, number>> {
  const { data: attempt } = await db.from("exam_attempts").select("item_ids, choice_shifts").eq("id", attemptId).single();
  const { data: items } = await db.from("exam_items").select("id, correct_index").in("id", attempt!.item_ids);
  const byId = new Map(items!.map((item) => [item.id, item.correct_index as number]));
  return new Map(attempt!.item_ids.map((id: string, index: number) => [id, (byId.get(id)! + attempt!.choice_shifts[index]) % 4]));
}

async function startPractice(request: APIRequestContext, device: string, data: Record<string, unknown>) {
  const response = await request.post("/api/luyen-thi/luyen-tap", { headers: { "x-device-id": device }, data });
  return { status: response.status(), body: await response.json() };
}

async function login(page: Page) {
  await page.goto("/dang-nhap?next=%2Fluyen-thi%2Fso-cau-sai");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(/\/luyen-thi\/so-cau-sai|\/dang-ky\/hoan-tat/);
  if (page.url().includes("/dang-ky/hoan-tat")) {
    await page.locator('input[name="agree"]').check();
    await page.getByRole("button", { name: "Hoàn tất" }).click();
    await page.waitForURL(/\/luyen-thi\/so-cau-sai/);
  }
}

test.describe("Luyện tập — API (GĐ4)", () => {
  test("kiểm tra từng câu: chỉ câu đó lộ đáp án; câu đã kiểm tra bị khóa; chưa có gói → câu thứ 11 trong ngày bị chặn", async ({ request }) => {
    const device = randomUUID();
    const { status, body } = await startPractice(request, device, { mode: "practice", lessons: [LESSON], count: 20 });
    expect(status).toBe(200);
    expect(body.questions).toHaveLength(12);
    expect(JSON.stringify(body)).not.toMatch(/"(correct_index|explanation)"/);
    const correct = await displayedCorrect(body.attempt.id);
    const ids: string[] = body.questions.map((question: { item_id: string }) => question.item_id);

    const url = `/api/luyen-thi/luot/${body.attempt.id}/kiem-tra`;
    const first = await (await request.post(url, { headers: { "x-device-id": device }, data: { item_id: ids[0], answer: { choice: correct.get(ids[0]) } } })).json();
    expect(first.earned_milli).toBe(250);
    const revealed = first.questions.filter((question: Record<string, unknown>) => "explanation" in question);
    expect(revealed.map((question: { item_id: string }) => question.item_id)).toEqual([ids[0]]);
    // Đổi ý sau khi đã kiểm tra → không đổi được.
    const again = await (await request.post(url, { headers: { "x-device-id": device }, data: { item_id: ids[0], answer: { choice: (correct.get(ids[0])! + 1) % 4 } } })).json();
    expect(again.already).toBe(true);

    for (let index = 1; index < 10; index++) {
      const response = await request.post(url, { headers: { "x-device-id": device }, data: { item_id: ids[index], answer: { choice: 0 } } });
      expect(response.status()).toBe(200);
    }
    const blocked = await request.post(url, { headers: { "x-device-id": device }, data: { item_id: ids[10], answer: { choice: 0 } } });
    expect(blocked.status()).toBe(429);
    expect(await blocked.json()).toEqual({ ok: false, reason: "quota" });
    // Máy khác không kiểm tra được câu của lượt này.
    expect((await request.post(url, { headers: { "x-device-id": randomUUID() }, data: { item_id: ids[11], answer: { choice: 0 } } })).status()).toBe(404);
  });

  test("ôn đến hạn: chưa đăng nhập → 401; làm lại câu sai của lượt người khác → 404", async ({ request }) => {
    expect((await startPractice(request, randomUUID(), { mode: "review" })).status).toBe(401);
    const owner = randomUUID();
    const { body } = await startPractice(request, owner, { mode: "practice", lessons: [LESSON], count: 10 });
    await request.post(`/api/luyen-thi/luot/${body.attempt.id}/kiem-tra`, { headers: { "x-device-id": owner }, data: { item_id: body.questions[0].item_id, answer: { choice: 9 } } });
    await request.post(`/api/luyen-thi/luot/${body.attempt.id}/nop`, { headers: { "x-device-id": owner }, data: { answers: {} } });
    expect((await startPractice(request, randomUUID(), { mode: "retry", from_attempt: body.attempt.id })).status).toBe(404);
  });
});

test.describe.serial("Luyện tập + sổ câu sai — giao diện (GĐ4)", () => {
  test("khách: luyện tập chấm ngay từng câu, kết thúc → tổng kết; sổ câu sai mời đăng nhập", async ({ page }) => {
    await page.goto("/luyen-thi/luyen-tap");
    await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
    await expect(page.getByTestId("practice-room")).toBeVisible();
    await page.getByRole("list", { name: /Các đáp án|Các ý Đúng\/Sai/ }).getByRole("button").first().click();
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Chính xác!|Chưa đúng/ })).toBeVisible();
    await expect(page.getByTestId("practice-room")).toContainText(/Đáp án đúng|(em (đúng|chọn sai|bỏ trống))/);
    await expect(page.getByTestId("practice-progress")).toHaveText(/Đã kiểm tra 1/);
    await page.getByRole("button", { name: "Kết thúc, xem tổng kết" }).click();
    await expect(page).toHaveURL(/\/luyen-thi\/ket-qua\//);
    await expect(page.getByRole("heading", { name: "Kết quả: Luyện tập" })).toBeVisible();
    await expect(page.getByText("Điểm tính trên 1 câu em đã kiểm tra.")).toBeVisible();

    await page.goto("/luyen-thi/so-cau-sai");
    await expect(page.getByText("Đăng nhập để lưu sổ câu sai")).toBeVisible();
  });

  test("tài khoản: làm sai 3 câu → sổ có 3 câu ôn ngày mai; tới hạn → Ôn ngay, ôn đúng → hộp 2, hạn sau 3 ngày", async ({ page }) => {
    await login(page);
    await expect(page.getByTestId("notebook-summary")).toContainText("Sổ có 0 câu");

    const device = await page.evaluate(() => localStorage.getItem("ls12:thiet-bi") ?? "");
    const { body } = await (async () => {
      const response = await page.request.post("/api/luyen-thi/luyen-tap", { headers: { "x-device-id": device }, data: { mode: "practice", lessons: [LESSON], count: 10 } });
      return { body: await response.json() };
    })();
    const correct = await displayedCorrect(body.attempt.id);
    const wrongIds: string[] = body.questions.slice(0, 3).map((question: { item_id: string }) => question.item_id);
    for (const id of wrongIds) {
      const response = await page.request.post(`/api/luyen-thi/luot/${body.attempt.id}/kiem-tra`, { headers: { "x-device-id": device }, data: { item_id: id, answer: { choice: (correct.get(id)! + 1) % 4 } } });
      expect(response.status()).toBe(200);
    }

    await page.reload();
    await expect(page.getByTestId("notebook-summary")).toContainText("Sổ có 3 câu · 0 câu đến hạn");
    await page.getByRole("link", { name: "Tất cả câu sai (3)" }).click();
    await expect(page.getByTestId("notebook-items").getByRole("listitem")).toHaveCount(3);
    await expect(page.getByTestId("notebook-items")).toContainText("Ôn ngày mai");

    // Giả lập sang ngày hôm sau: đưa hạn ôn về quá khứ.
    await db.from("learner_item_state").update({ due_at: new Date(Date.now() - 60_000).toISOString() }).eq("user_id", userId).in("item_id", wrongIds);
    await page.goto("/luyen-thi/so-cau-sai");
    await expect(page.getByTestId("notebook-summary")).toContainText("3 câu đến hạn");
    await page.getByRole("link", { name: "Ôn ngay (3 câu)" }).click();
    await expect(page.getByRole("heading", { name: "Ôn câu đến hạn", level: 1 })).toBeVisible();
    await expect(page.getByTestId("practice-room")).toContainText("Câu 1/3");

    const { data: review } = await db.from("exam_attempts").select("id").eq("user_id", userId).eq("mode", "review").eq("status", "in_progress").single();
    const reviewCorrect = await displayedCorrect(review!.id);
    const { data: reviewAttempt } = await db.from("exam_attempts").select("item_ids").eq("id", review!.id).single();
    for (let index = 0; index < 3; index++) {
      const answer = reviewCorrect.get(reviewAttempt!.item_ids[index])!;
      await page.getByRole("list", { name: "Các đáp án" }).getByRole("button").nth(answer).click();
      await page.getByRole("button", { name: "Kiểm tra" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Chính xác!" })).toBeVisible();
      if (index < 2) await page.getByRole("button", { name: "Câu tiếp" }).click();
    }

    const { data: states } = await db.from("learner_item_state").select("box, due_at, in_notebook").eq("user_id", userId).in("item_id", wrongIds);
    expect(states).toHaveLength(3);
    for (const state of states!) {
      expect(state).toMatchObject({ box: 2, in_notebook: true });
      const days = (Date.parse(state.due_at!) - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(2);
      expect(days).toBeLessThanOrEqual(3);
    }
    await page.getByRole("button", { name: "Kết thúc, xem tổng kết" }).click();
    await expect(page.getByRole("heading", { name: "Kết quả: Ôn câu đến hạn" })).toBeVisible();
    await expect(page.getByTestId("exam-score")).toHaveText("10 điểm");
  });

  test("làm lại câu sai từ trang kết quả bài thi", async ({ page, request }) => {
    const device = randomUUID();
    await page.addInitScript((id) => localStorage.setItem("ls12:thiet-bi", id), device);
    const start = await (await request.post("/api/luyen-thi/de-1/bat-dau", { headers: { "x-device-id": device } })).json();
    await request.post(`/api/luyen-thi/luot/${start.attempt.id}/nop`, { headers: { "x-device-id": device }, data: { answers: {} } });
    await page.goto(`/luyen-thi/ket-qua/${start.attempt.id}`);
    await page.getByRole("link", { name: /^Làm lại các câu sai \(10\)$/ }).click();
    await expect(page.getByRole("heading", { name: "Làm lại câu sai", level: 1 })).toBeVisible();
    await expect(page.getByTestId("practice-room")).toContainText("Câu 1/10");
  });
});
