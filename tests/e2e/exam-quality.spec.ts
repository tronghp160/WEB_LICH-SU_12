import { randomBytes, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { adminApi, hasSecretKey } from "./support";

// Luyện thi GĐ7 (docs/ke-hoach-luyen-thi.md, mục 3.8, 3.9, 4.10): học sinh báo lỗi câu → hàng đợi quản trị → quản trị viên
// sửa đáp án → chấm lại → học sinh thấy điểm mới + ghi chú; thống kê câu, tổng quan quản trị — trên DB thật.
// Dữ liệu thử: 2 câu trắc nghiệm + 1 đề miễn phí đã công bố (đáp án gốc A, "lỡ" sai — đúng ra là B) và một quản trị viên
// tạm zz-kiem-thu-cl-*@test.local với MẬT KHẨU NGẪU NHIÊN sinh lúc chạy (không lưu ở đâu). Dọn hết ở cuối.

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const run = Date.now().toString(36);
const PREFIX = `ZZ KIỂM THỬ CL ${run}`;
const SLUG = `zz-kiem-thu-chat-luong-${run}`;
const ADMIN_EMAIL = `zz-kiem-thu-cl-${run}@test.local`;
const ADMIN_PASSWORD = `Zz${randomBytes(12).toString("base64url")}9`;
const DEVICE = randomUUID();
const db = adminApi();
let adminId = "";
let setId = "";
const itemIds: string[] = [];
let attemptId = "";

test.beforeAll(async () => {
  const items = [1, 2].map((index) => ({
    kind: "mcq",
    stem: `${PREFIX} câu ${index}?`,
    choices: [`Phương án A ${index}`, `Phương án B ${index}`, `Phương án C ${index}`, `Phương án D ${index}`],
    correct_index: 0,
    explanation: `Lời giải câu ${index}.`,
    lesson_slug: "7-khang-chien-chong-phap",
    level: "nhan_biet",
    competency: "tim_hieu_lich_su",
    source_note: "Kiểm thử E2E",
    workflow_status: "published",
  }));
  const { data: inserted, error } = await db.from("exam_items").insert(items).select("id, stem").order("stem");
  if (error) throw error;
  itemIds.push(...inserted.map((item) => item.id));
  const { data: set, error: setError } = await db
    .from("exam_sets")
    .insert({ slug: SLUG, title: `${PREFIX} đề`, format: "mini", duration_min: 15, workflow_status: "published", published_at: new Date().toISOString(), sort_order: 999 })
    .select("id")
    .single();
  if (setError) throw setError;
  setId = set.id;
  const { error: linkError } = await db.from("exam_set_items").insert(itemIds.map((id, index) => ({ set_id: setId, item_id: id, section: 1, position: index + 1, choice_shift: 0 })));
  if (linkError) throw linkError;

  const { data: user, error: userError } = await db.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
  if (userError) throw userError;
  adminId = user.user.id;
  const { error: staffError } = await db.from("staff_profiles").insert({ id: adminId, full_name: "ZZ Quản trị E2E", role: "system_admin", account_status: "active" });
  if (staffError) throw staffError;
});

test.afterAll(async () => {
  if (setId) {
    await db.from("exam_attempts").delete().eq("set_id", setId);
    await db.from("exam_set_items").delete().eq("set_id", setId);
    await db.from("exam_sets").delete().eq("id", setId);
  }
  if (itemIds.length > 0) {
    await db.from("exam_attempts").delete().overlaps("item_ids", itemIds);
    await db.from("exam_items").delete().in("id", itemIds);
  }
  if (adminId) {
    await db.from("staff_profiles").delete().eq("id", adminId);
    await db.auth.admin.deleteUser(adminId);
  }
});

const headers = { "x-device-id": DEVICE };

/** Trình duyệt dùng đúng mã thiết bị của lượt (kết quả chỉ chủ lượt xem được). */
async function useDevice(page: Page) {
  await page.addInitScript((id) => window.localStorage.setItem("ls12:thiet-bi", id), DEVICE);
}

async function adminLogin(page: Page) {
  await page.goto("/quan-tri/dang-nhap");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(/\/quan-tri$/);
}

test.describe.serial("Báo lỗi câu hỏi → chấm lại (GĐ7)", () => {
  test("API: chỉ báo được câu của lượt đã nộp, của chính mình; thân sai → 400", async ({ request }) => {
    const started = await (await request.post(`/api/luyen-thi/${SLUG}/bat-dau`, { headers })).json();
    attemptId = started.attempt.id;
    const report = (data: Record<string, unknown>, extra = headers) => request.post("/api/luyen-thi/bao-loi", { headers: extra, data });
    // Chưa nộp → chưa thấy đáp án → không báo được.
    expect((await report({ attempt_id: attemptId, item_id: itemIds[0], reason: "sai_dap_an" })).status()).toBe(404);

    const answers = { [itemIds[0]]: { choice: 1 }, [itemIds[1]]: { choice: 0 } };
    const submitted = await (await request.post(`/api/luyen-thi/luot/${attemptId}/nop`, { headers, data: { answers } })).json();
    expect(submitted.attempt.score10).toBe(5);

    expect((await report({ attempt_id: attemptId, item_id: itemIds[0], reason: "linh-tinh" })).status()).toBe(400);
    expect((await report({ attempt_id: attemptId, item_id: itemIds[0], reason: "khac", note: "x".repeat(501) })).status()).toBe(400);
    expect((await report({ attempt_id: attemptId, item_id: itemIds[0], reason: "sai_dap_an" }, { "x-device-id": randomUUID() })).status()).toBe(404);
    expect((await report({ attempt_id: attemptId, item_id: itemIds[1], reason: "loi_chinh_ta", note: "  Thiếu dấu chấm.  " })).status()).toBe(200);
    const { data: rows } = await db.from("exam_item_reports").select("note, status, device_hash").eq("item_id", itemIds[1]);
    expect(rows).toHaveLength(1);
    expect(rows![0].note).toBe("Thiếu dấu chấm.");
    expect(rows![0].device_hash).not.toBe(DEVICE); // chỉ lưu bản băm có muối
  });

  test("học sinh báo lỗi câu 1 ngay trên trang kết quả", async ({ page }) => {
    await useDevice(page);
    await page.goto(`/luyen-thi/ket-qua/${attemptId}`);
    await expect(page.getByTestId("exam-score")).toHaveText("5 điểm");
    await page.getByRole("button", { name: "Báo lỗi câu 1" }).click();
    const dialog = page.getByRole("dialog", { name: "Báo lỗi câu 1" });
    await dialog.getByLabel("Đáp án chưa đúng").check();
    await dialog.getByLabel("Ghi chú (không bắt buộc)").fill("Theo SGK Bài 7 thì đáp án là B.");
    await dialog.getByRole("button", { name: "Gửi báo lỗi" }).click();
    await expect(dialog.getByRole("status")).toContainText("Đã gửi");
    await dialog.getByRole("button", { name: "Đóng" }).click();
    await expect(page.getByText("Đã gửi báo lỗi — cảm ơn em!")).toBeVisible();
  });

  test("quản trị viên: hàng đợi báo lỗi → sửa đáp án → chấm lại → đánh dấu đã sửa; thống kê hiện số liệu", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/quan-tri/de-luyen-thi/bao-loi");
    const group = page.getByTestId("report-groups").getByRole("listitem").filter({ hasText: `${PREFIX} câu 1?` }).first();
    await expect(group).toContainText("Đáp án chưa đúng");
    await expect(group).toContainText("Theo SGK Bài 7 thì đáp án là B.");

    // Sửa đáp án câu 1 thành B (như quản trị viên sửa trong form), rồi chấm lại ở trang câu.
    await db.from("exam_items").update({ correct_index: 1 }).eq("id", itemIds[0]);
    await page.goto(`/quan-tri/ngan-hang-cau-hoi/${itemIds[0]}`);
    const quality = page.getByTestId("item-quality");
    await expect(quality.getByTestId("item-stats")).toContainText("1 lượt");
    await expect(quality.getByTestId("item-reports")).toContainText("Đáp án chưa đúng");
    page.once("dialog", (dialog) => void dialog.accept());
    await quality.getByRole("button", { name: "Chấm lại các lượt đã nộp" }).click();
    await expect(quality).toContainText("Đã chấm lại: 1 / 1 lượt đổi điểm");
    await quality.getByRole("button", { name: "Đã sửa xong" }).click();
    await expect(quality).toContainText("Báo lỗi của học sinh (0 đang mở / 1)");
    await expect(quality.getByTestId("item-reports")).toContainText("Đã sửa");
    const { data: log } = await db.from("exam_regrade_log").select("old_score10, new_score10, actor").eq("attempt_id", attemptId);
    expect(log).toEqual([{ old_score10: 5, new_score10: 10, actor: adminId }]);

    await page.goto("/quan-tri/de-luyen-thi/thong-ke?ngay=7");
    await expect(page.getByTestId("admin-overview")).toBeVisible();
    await page.goto("/quan-tri/ngan-hang-cau-hoi?q=" + encodeURIComponent(`${PREFIX} câu 1`));
    await expect(page.getByText(/Đạt 100% \(1 lượt\)/)).toBeVisible();
  });

  test("học sinh thấy điểm mới và ghi chú đã chấm lại", async ({ page }) => {
    await useDevice(page);
    await page.goto(`/luyen-thi/ket-qua/${attemptId}`);
    await expect(page.getByTestId("exam-score")).toHaveText("10 điểm");
    await expect(page.getByTestId("regraded-note")).toHaveText("Điểm đã được cập nhật do sửa đáp án câu 1.");
    await expect(page.getByTestId("solutions")).toContainText("Đã chấm lại do sửa đáp án");
  });
});
