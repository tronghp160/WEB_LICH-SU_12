import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { adminApi, hasHorizontalOverflow, hasSecretKey } from "./support";

// Luyện thi GĐ5 (docs/ke-hoach-luyen-thi.md, mục 4.4, 4.6, 4.7): đề tự sinh theo ma trận, tổng quan, lộ trình ôn — trên DB
// thật. Ngân hàng thật chưa có câu Đúng/Sai nên bộ thử thêm 24 câu Đúng/Sai đã công bố (đủ 3 đề "Chỉ câu Đúng/Sai" 8 câu
// không trùng — ma trận duy nhất mở được). Mọi ý đúng theo mẫu [Đúng, Sai, Đúng, Sai]. Hai học sinh thử
// zz-kiem-thu-sinh-*@test.local: một có gói gắn tài khoản, một không. Dọn hết ở cuối.

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const run = Date.now().toString(36);
const PREFIX = `ZZ KIỂM THỬ SINH ${run}`;
const EMAIL = `zz-kiem-thu-sinh-${run}@test.local`;
const EMAIL_FREE = `zz-kiem-thu-sinh-free-${run}@test.local`;
const PASSWORD = "lichsu2026A";
const db = adminApi();
const userIds: string[] = [];
let userId = "";

function randomLicenseCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `LT12-${part()}-${part()}-${part()}`;
}

async function createLearner(email: string): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: "ZZ Đề tự sinh E2E", terms_version: "2026-10" } });
  if (error) throw error;
  userIds.push(data.user.id);
  return data.user.id;
}

test.beforeAll(async () => {
  const items = Array.from({ length: 24 }, (_, index) => ({
    kind: "true_false",
    stem: `${PREFIX} câu ${index + 1}:`,
    statements: ["a", "b", "c", "d"].map((letter, slot) => ({ text: `${PREFIX} ý ${letter} câu ${index + 1}`, is_true: slot % 2 === 0, explanation: `Giải ý ${letter}.` })),
    explanation: "Nhận xét chung.",
    lesson_slug: "7-khang-chien-chong-phap",
    level: (["nhan_biet", "thong_hieu", "van_dung"] as const)[index % 3],
    competency: "nhan_thuc_tu_duy",
    source_note: "Kiểm thử E2E",
    workflow_status: "published",
  }));
  const { error } = await db.from("exam_items").insert(items);
  if (error) throw error;

  userId = await createLearner(EMAIL);
  await createLearner(EMAIL_FREE);
  const { data: product } = await db.from("products").select("id").eq("kind", "exam_pack").eq("is_active", true).limit(1).single();
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({ product_id: product!.id, amount_vnd: 29000, provider: "mock", access_token_hash: "f".repeat(64), user_id: userId })
    .select("order_code")
    .single();
  if (orderError) throw orderError;
  const { error: paidError } = await db.rpc("mark_order_paid", { p_order_code: order.order_code, p_amount: 29000, p_provider: "mock", p_provider_ref: `zz-sinh-${run}`, p_license_code: randomLicenseCode() });
  if (paidError) throw paidError;
});

test.afterAll(async () => {
  const { data: items } = await db.from("exam_items").select("id").like("stem", `${PREFIX}%`);
  const ids = (items ?? []).map((item) => item.id);
  for (const id of userIds) {
    await db.from("exam_attempts").delete().eq("user_id", id);
    await db.from("learner_item_state").delete().eq("user_id", id);
    await db.from("licenses").delete().eq("user_id", id);
    await db.from("orders").delete().eq("user_id", id);
    await db.auth.admin.deleteUser(id);
  }
  if (ids.length > 0) {
    await db.from("exam_attempts").delete().overlaps("item_ids", ids);
    await db.from("exam_items").delete().in("id", ids);
  }
});

async function login(page: Page, email: string, next: string) {
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  await page.locator("#email").fill(email);
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

const API = "/api/luyen-thi/de-ngau-nhien";

test.describe("Đề tự sinh — API (GĐ5)", () => {
  test("ma trận lạ → 404; chưa có gói → 403 pack_required (không sinh đề, không có câu hỏi)", async ({ request }) => {
    const headers = { "x-device-id": randomUUID() };
    expect((await request.get(`${API}?ma-tran=khong-co`, { headers })).status()).toBe(404);
    const intro = await request.get(`${API}?ma-tran=tf_only`, { headers });
    expect(intro.status()).toBe(403);
    expect(await intro.json()).toEqual({ ok: false, reason: "pack_required" });
    const start = await request.post(`${API}?ma-tran=tf_only`, { headers });
    expect(start.status()).toBe(403);
    expect(await start.json()).toEqual({ ok: false, reason: "pack_required" });
  });
});

test.describe.serial("Đề tự sinh, tổng quan, lộ trình — giao diện (GĐ5)", () => {
  test("danh sách: ghi rõ không phải ma trận của Bộ; chỉ hiện ma trận đủ 3 đề không trùng", async ({ page }) => {
    await page.goto("/luyen-thi/de-ngau-nhien");
    await expect(page.getByTestId("blueprint-disclaimer")).toContainText("không phải ma trận chính thức của Bộ GD&ĐT");
    await expect(page.getByTestId("blueprint-tf_only")).toBeVisible();
    // Ma trận đầy đủ chỉ hiện khi ngân hàng đã công bố đủ câu cho 3 đề không trùng — từ khi nạp dữ liệu demo (GĐ-D4) là đủ.
    // Hiện thì trang ma trận phải mở được (khách thấy lời mời mua gói, không lỗi).
    if ((await page.getByTestId("blueprint-thpt_2025").count()) > 0) {
      await page.goto("/luyen-thi/de-ngau-nhien/thpt_2025");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText("Đề tự sinh thuộc Gói luyện thi")).toBeVisible();
    }
    await page.goto("/luyen-thi");
    await expect(page.getByTestId("generated-link")).toBeVisible();
  });

  test("khách / tài khoản chưa có gói: tổng quan và lộ trình mời đăng nhập / mời mua gói", async ({ page }) => {
    await page.goto("/luyen-thi/tong-quan");
    await expect(page.getByText("Đăng nhập để xem tổng quan")).toBeVisible();
    await page.goto("/luyen-thi/lo-trinh");
    await expect(page.getByText("Đăng nhập để lập lộ trình")).toBeVisible();
    await page.goto("/luyen-thi/de-ngau-nhien/tf_only");
    await expect(page.getByText("Đề tự sinh thuộc Gói luyện thi")).toBeVisible();

    await login(page, EMAIL_FREE, "/luyen-thi/tong-quan");
    await expect(page.getByText("Tổng quan thuộc Gói luyện thi")).toBeVisible();
    await page.goto("/luyen-thi/lo-trinh");
    await expect(page.getByText("Lộ trình ôn thuộc Gói luyện thi")).toBeVisible();
  });

  test("có gói: làm đề tự sinh 8 câu Đúng/Sai → kết quả; đề thứ hai không lặp câu vừa làm", async ({ page }) => {
    await login(page, EMAIL, "/luyen-thi/de-ngau-nhien/tf_only");
    await expect(page.getByText("Mỗi lần bắt đầu là một đề mới")).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
    const room = page.getByTestId("exam-room");
    await expect(room).toContainText("Câu 1/8");

    const { data: first } = await db.from("exam_attempts").select("id, item_ids, sections, blueprint, deadline_at, started_at").eq("user_id", userId).single();
    expect(first!.blueprint).toBe("tf_only");
    expect(first!.item_ids).toHaveLength(8);
    expect(first!.sections).toEqual(Array(8).fill(2));
    // 8 câu Đúng/Sai ≈ 40 phút.
    expect(Math.round((Date.parse(first!.deadline_at!) - Date.parse(first!.started_at)) / 60_000)).toBe(40);
    // Ngân hàng thật có câu Đúng/Sai đã công bố (dữ liệu demo GĐ-D4) → đề có thể lấy cả câu thật, không chỉ câu thử.
    const { data: picked } = await db.from("exam_items").select("kind, statements, workflow_status").in("id", first!.item_ids);
    for (const item of picked!) expect(item).toMatchObject({ kind: "true_false", workflow_status: "published" });
    // Chọn “Đúng” ở mọi ý: điểm mỗi câu theo số ý đúng (0 / 0,1 / 0,25 / 0,5 / 1), thang 10 trên tối đa 8 điểm.
    const milli = [0, 100, 250, 500, 1000];
    const raw = picked!.reduce((sum, item) => sum + milli[(item.statements as { is_true: boolean }[]).filter((statement) => statement.is_true).length], 0);
    const expected = `${Number(((raw / 8000) * 10).toFixed(2))}`.replace(".", ",");

    for (let index = 0; index < 8; index++) {
      for (const letter of ["a", "b", "c", "d"]) await page.getByRole("group", { name: `Ý ${letter})` }).getByRole("button", { name: "Đúng" }).click();
      if (index < 7) await page.getByRole("button", { name: "Câu sau" }).click();
    }
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await page.getByRole("dialog", { name: "Nộp bài?" }).getByRole("button", { name: "Nộp bài" }).click();
    await expect(page).toHaveURL(/\/luyen-thi\/ket-qua\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("exam-score")).toHaveText(`${expected} điểm`);
    await expect(page.getByRole("heading", { name: "Kết quả: Đề tự sinh — Chỉ câu Đúng/Sai" })).toBeVisible();
    await page.getByRole("link", { name: "Làm đề mới cùng dạng" }).click();
    await expect(page).toHaveURL(/\/luyen-thi\/de-ngau-nhien\/tf_only$/);

    // Đề mới tránh 8 câu vừa làm (còn 16 câu chưa làm trong 14 ngày).
    const device = await page.evaluate(() => localStorage.getItem("ls12:thiet-bi") ?? "");
    const second = await page.request.post(`${API}?ma-tran=tf_only`, { headers: { "x-device-id": device } });
    expect(second.status()).toBe(200);
    const body = await second.json();
    expect(body.attempt.blueprint).toBe("tf_only");
    // Ghi chú chỉ để thông tin (với câu thật nhiều bài có thể có “Một số bài thiếu câu…”).
    expect(Array.isArray(body.notes)).toBe(true);
    const secondIds: string[] = body.questions.map((question: { item_id: string }) => question.item_id);
    expect(secondIds).toHaveLength(8);
    expect(secondIds.filter((id) => first!.item_ids.includes(id))).toEqual([]);
    // Chưa nộp thì không lộ đáp án.
    expect(JSON.stringify(body)).not.toMatch(/"(is_true|explanation)"/);
    for (const question of body.questions) expect(question.truths ?? null).toBeNull();
    // Bắt đầu lại cùng ma trận khi đang dở → trả đúng lượt đó.
    const resumed = await (await page.request.post(`${API}?ma-tran=tf_only`, { headers: { "x-device-id": device } })).json();
    expect(resumed.attempt.id).toBe(body.attempt.id);
  });

  test("có gói: tổng quan (bản đồ 17 bài, chuỗi ngày, lịch sử, mục tiêu) và lộ trình theo mục tiêu", async ({ page }) => {
    await login(page, EMAIL, "/luyen-thi/tong-quan");
    await expect(page.getByTestId("mastery-map").getByRole("listitem")).toHaveCount(17);
    await expect(page.getByTestId("mastery-map").locator('[data-level="chua-du"]')).toHaveCount(17);
    await expect(page.getByTestId("mastery-map")).toContainText("Bài 7");
    await expect(page.getByTestId("streak")).toContainText("1");
    await expect(page.getByTestId("predicted-score")).toContainText("Làm ít nhất 2 đề đầy đủ");
    await expect(page.getByTestId("countdown")).toHaveCount(0);
    await expect(page.getByTestId("attempt-history")).toContainText("Đề tự sinh — Chỉ câu Đúng/Sai");
    await expect(page.getByTestId("next-steps")).toContainText("Làm tiếp bài đang dở");

    await page.getByTestId("goal-select").selectOption("8");
    await page.getByRole("button", { name: "Lưu" }).click();
    await expect(page.getByText("Đã lưu mục tiêu điểm.")).toBeVisible();
    const { data: profile } = await db.from("learner_profiles").select("exam_goal").eq("id", userId).single();
    expect(Number(profile!.exam_goal)).toBe(8);

    await page.goto("/luyen-thi/lo-trinh");
    const form = page.getByTestId("plan-form");
    await expect(form.locator('select[name="goal"]')).toHaveValue("8");
    await form.locator('select[name="perWeek"]').selectOption("3");
    await form.getByRole("button", { name: "Lập lộ trình" }).click();
    await expect(page.getByText("Đã lập lộ trình.")).toBeVisible();
    await expect(page.getByTestId("plan-progress")).toContainText("Đã xong 0/24 buổi · đang ở tuần 1/8");
    await expect(page.getByTestId("plan-week-1").getByRole("listitem")).toHaveCount(3);
    await expect(page.getByTestId("plan-week-1")).toContainText("Làm một đề đầy đủ bấm giờ");
    await expect(page.getByTestId("plan-week-1")).toContainText("Ôn câu đến hạn");
    const { data: saved } = await db.from("learner_profiles").select("exam_goal, study_plan").eq("id", userId).single();
    expect(Number(saved!.exam_goal)).toBe(8);
    expect((saved!.study_plan as { version: number; weeks: unknown[] }).weeks).toHaveLength(8);

    // Điện thoại 360 px: không tràn ngang; chụp ảnh cho tài liệu.
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.screenshot({ path: "docs/screenshots/luyen-thi-lo-trinh-360.png", fullPage: true });
    await page.goto("/luyen-thi/tong-quan");
    await expect(page.getByTestId("mastery-map")).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: "docs/screenshots/luyen-thi-tong-quan-1280.png", fullPage: true });
  });
});
