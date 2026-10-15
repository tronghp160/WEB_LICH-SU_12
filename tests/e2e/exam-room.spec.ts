import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminApi, hasHorizontalOverflow, hasSecretKey } from "./support";

// Luyện thi GĐ3 (docs/ke-hoach-luyen-thi.md, mục 4.1–4.2): phòng thi mới + trang kết quả với một đề ĐẦY ĐỦ 24 + 4 (có câu
// Đúng/Sai dùng tư liệu) trên DB thật. Đề thử tạo bằng khóa bí mật ở trạng thái đã công bố, MIỄN PHÍ (không đổi số đề
// trong gói), xóa ở cuối cùng các lượt làm. Câu / tư liệu "ZZ KIỂM THỬ PT …", đề "zz-kiem-thu-phong-thi-…".
//
// Đáp án dựng để tính tay được: 24 câu trắc nghiệm đáp án gốc A, độ xoay = vị trí % 4 → đáp án hiển thị là A ở 6 câu;
// 4 câu Đúng/Sai có ý đúng [Đúng, Sai, Đúng, Sai]. Chọn A ở mọi câu trắc nghiệm và "Đúng" ở mọi ý → Phần I 6 × 0,25 =
// 1,5; Phần II 4 × 0,25 (2 ý đúng) = 1 → 2,5 điểm.

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const run = Date.now().toString(36);
const PREFIX = `ZZ KIỂM THỬ PT ${run}`;
const SLUG = `zz-kiem-thu-phong-thi-${run}`;
const db = adminApi();
let setId = "";

test.beforeAll(async () => {
  const { data: passage, error: passageError } = await db
    .from("exam_passages")
    .insert({ title: `${PREFIX} tư liệu`, body: "Đoạn tư liệu thử cho phòng thi: “Không có gì quý hơn độc lập, tự do.”", source_citation: "Nguồn thử E2E, tr. 1", workflow_status: "published" })
    .select("id")
    .single();
  if (passageError) throw passageError;
  const mcq = Array.from({ length: 24 }, (_, index) => ({
    kind: "mcq",
    stem: `${PREFIX} câu trắc nghiệm ${index + 1}?`,
    choices: [`Đúng ${index + 1}`, `Nhiễu một ${index + 1}`, `Nhiễu hai ${index + 1}`, `Nhiễu ba ${index + 1}`],
    correct_index: 0,
    explanation: `Lời giải câu ${index + 1}.`,
    lesson_slug: index < 12 ? "7-khang-chien-chong-phap" : "8-khang-chien-chong-my-cuu-nuoc",
    level: index < 10 ? "nhan_biet" : index < 17 ? "thong_hieu" : "van_dung",
    competency: "tim_hieu_lich_su",
    source_note: "Kiểm thử E2E",
    workflow_status: "published",
  }));
  const trueFalse = Array.from({ length: 4 }, (_, index) => ({
    kind: "true_false",
    stem: `${PREFIX} câu Đúng/Sai ${index + 1}:`,
    passage_id: index < 2 ? passage.id : null,
    statements: ["a", "b", "c", "d"].map((letter, slot) => ({ text: `${PREFIX} ý ${letter} câu ${index + 1}`, is_true: slot % 2 === 0, explanation: `Giải ý ${letter}.` })),
    explanation: "Nhận xét chung.",
    lesson_slug: "7-khang-chien-chong-phap",
    level: "van_dung",
    competency: "van_dung_kien_thuc",
    source_note: "Kiểm thử E2E",
    workflow_status: "published",
  }));
  const { data: items, error: itemError } = await db.from("exam_items").insert([...mcq, ...trueFalse]).select("id, kind, stem");
  if (itemError) throw itemError;
  const { data: set, error: setError } = await db.from("exam_sets").insert({ slug: SLUG, title: `${PREFIX} đề đầy đủ`, format: "thpt_2025", duration_min: 50, workflow_status: "published" }).select("id").single();
  if (setError) throw setError;
  setId = set.id;
  const ordered = [...items].sort((a, b) => a.stem.localeCompare(b.stem, "vi", { numeric: true }));
  const mcqItems = ordered.filter((item) => item.kind === "mcq");
  const tfItems = ordered.filter((item) => item.kind === "true_false");
  const rows = [
    ...mcqItems.map((item, index) => ({ set_id: set.id, item_id: item.id, section: 1, position: index + 1, choice_shift: index % 4 })),
    ...tfItems.map((item, index) => ({ set_id: set.id, item_id: item.id, section: 2, position: index + 1, choice_shift: 0 })),
  ];
  const { error } = await db.from("exam_set_items").insert(rows);
  if (error) throw error;
});

test.afterAll(async () => {
  if (setId) {
    await db.from("exam_attempts").delete().eq("set_id", setId);
    await db.from("exam_sets").delete().eq("id", setId);
  }
  await db.from("exam_items").delete().like("stem", `${PREFIX}%`);
  await db.from("exam_passages").delete().like("title", `${PREFIX}%`);
});

const room = (page: Page) => page.getByTestId("exam-room");
const sheet = (page: Page) => page.getByRole("navigation", { name: "Chuyển nhanh tới câu" });

async function startExam(page: Page) {
  await page.goto(`/luyen-thi/${SLUG}`);
  await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
}

test.describe.serial("Phòng thi đề đầy đủ 24 + 4 (GĐ3)", () => {
  test("làm hết bằng chuột: tư liệu chia đôi, đánh dấu câu, hộp thoại nộp → trang kết quả đúng điểm từng phần, lọc lời giải", async ({ page }) => {
    await startExam(page);
    await expect(page.getByText("Câu 1/28")).toBeVisible();
    // Thời gian xem câu chỉ ghi khi ≥ 1 giây — đọc câu 1 thật lâu để có cột "câu lâu nhất".
    await page.waitForTimeout(1_500);
    for (let index = 0; index < 28; index++) {
      if (index < 24) {
        await room(page).getByRole("list", { name: "Các đáp án" }).getByRole("button").first().click();
      } else {
        if (index < 26) await expect(page.getByTestId("passage")).toContainText("Không có gì quý hơn độc lập");
        for (const letter of ["a", "b", "c", "d"]) await page.getByRole("group", { name: `Ý ${letter})` }).getByRole("button", { name: "Đúng" }).click();
      }
      if (index === 2) await page.getByRole("button", { name: "Đánh dấu xem lại" }).click();
      if (index < 27) await page.getByRole("button", { name: "Câu sau" }).click();
    }
    await expect(sheet(page).getByRole("button", { name: "Câu 3 (đã làm, đã đánh dấu)" })).toBeVisible();
    await expect(sheet(page).getByRole("button", { name: /\(đã làm/ })).toHaveCount(28);

    await page.getByRole("button", { name: "Nộp bài" }).click();
    const dialog = page.getByRole("dialog", { name: "Nộp bài?" });
    await expect(dialog).toContainText("Đã làm 28/28 câu.");
    await expect(dialog).toContainText("1 câu đang đánh dấu xem lại.");
    await dialog.getByRole("button", { name: "Nộp bài" }).click();

    await expect(page).toHaveURL(/\/luyen-thi\/ket-qua\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId("exam-score")).toHaveText("2,5 điểm");
    await expect(page.getByTestId("part-1")).toHaveText("1,5 / 6 điểm");
    await expect(page.getByTestId("part-2")).toHaveText("1 / 4 điểm");
    await expect(page.getByRole("figure").filter({ hasText: "Theo bài" })).toContainText("Bài 7");
    await expect(page.getByRole("img", { name: /Câu lâu nhất/ })).toBeVisible();

    const filters = page.getByRole("group", { name: "Lọc câu" });
    await expect(filters.getByRole("button", { name: "Sai (22)" })).toBeVisible();
    await filters.getByRole("button", { name: "Đã đánh dấu (1)" }).click();
    await expect(page.getByTestId("solutions").getByRole("listitem").filter({ hasText: "Em đã đánh dấu" })).toHaveCount(1);
    await filters.getByRole("button", { name: "Sai (22)" }).click();
    await expect(page.getByTestId("solutions").locator(":scope > li")).toHaveCount(22);
    await expect(page.getByTestId("solutions")).toContainText("(em chọn sai)");
  });

  test("bằng phím tắt + tải lại trang giữa chừng → làm tiếp đúng câu, đúng câu trả lời, đồng hồ không đặt lại", async ({ page }) => {
    await startExam(page);
    await page.keyboard.press("2");
    await expect(room(page).getByRole("list", { name: "Các đáp án" }).getByRole("button").nth(1)).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("Câu 2/28")).toBeVisible();
    await page.keyboard.press("d");
    await page.keyboard.press("f");
    await expect(page.getByRole("button", { name: "Đã đánh dấu", exact: true })).toBeVisible();
    await sheet(page).getByRole("button", { name: /^Câu 25 / }).click();
    for (const key of ["q", "r", "t", "i"]) await page.keyboard.press(key);
    const group = (letter: string) => page.getByRole("group", { name: `Ý ${letter})` });
    await expect(group("a").getByRole("button", { name: "Đúng" })).toHaveAttribute("aria-pressed", "true");
    await expect(group("b").getByRole("button", { name: "Sai" })).toHaveAttribute("aria-pressed", "true");
    await expect(group("c").getByRole("button", { name: "Đúng" })).toHaveAttribute("aria-pressed", "true");
    await expect(group("d").getByRole("button", { name: "Sai" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Phím tắt" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("save-status")).toContainText("Đã lưu lúc", { timeout: 10_000 });

    await page.reload();
    await expect(page.getByTestId("exam-in-progress")).toBeVisible();
    await page.getByRole("button", { name: "Làm tiếp" }).click();
    await expect(page.getByText("Câu 25/28")).toBeVisible();
    await expect(group("b").getByRole("button", { name: "Sai" })).toHaveAttribute("aria-pressed", "true");
    await expect(sheet(page).getByRole("button", { name: "Câu 2 (đã làm, đã đánh dấu)" })).toBeVisible();
    await expect(page.getByRole("timer")).not.toHaveAccessibleName(/50:00/);
  });

  test("bắt đầu lại: nộp lượt dở rồi mở lượt mới; hết giờ thì tự nộp và báo trên trang kết quả", async ({ page }) => {
    // Mỗi ca là một trình duyệt mới (thiết bị mới): mở một lượt, chọn một câu, rồi quay lại trang đề.
    await startExam(page);
    const first = await page.evaluate((slug) => JSON.parse(localStorage.getItem("ls12:luot-dang-lam") ?? "{}")[slug]?.id as string, SLUG);
    await room(page).getByRole("list", { name: "Các đáp án" }).getByRole("button").first().click();
    await page.reload();
    await page.getByRole("button", { name: "Bắt đầu lại" }).click();
    await page.getByRole("dialog", { name: "Bắt đầu lại?" }).getByRole("button", { name: "Nộp bài cũ và bắt đầu lại" }).click();
    await expect(page.getByText("Câu 1/28")).toBeVisible();
    const id = await page.evaluate((slug) => JSON.parse(localStorage.getItem("ls12:luot-dang-lam") ?? "{}")[slug]?.id as string, SLUG);
    expect(id).toBeTruthy();
    expect(id).not.toBe(first);
    const { data: old } = await db.from("exam_attempts").select("status").eq("id", first).single();
    expect(old?.status).toBe("submitted");

    // Rút hạn nộp của lượt mới còn 6 giây (giả lập hết giờ), tải lại để đồng hồ theo hạn mới.
    await db.from("exam_attempts").update({ deadline_at: new Date(Date.now() + 6_000).toISOString() }).eq("id", id);
    await page.reload();
    await page.getByRole("button", { name: "Làm tiếp" }).click();
    await expect(page).toHaveURL(new RegExp(`/luyen-thi/ket-qua/${id}\\?het-gio=1$`), { timeout: 20_000 });
    await expect(page.getByText("Hết giờ — bài đã được tự nộp.")).toBeVisible();
    await expect(page.getByTestId("exam-score")).toHaveText("0 điểm");
    const { data: timed } = await db.from("exam_attempts").select("status").eq("id", id).single();
    expect(timed?.status).toBe("submitted");
  });

  test("360 / 768 / 1280 px không tràn ngang; chụp ảnh phòng thi và trang kết quả; trợ năng", async ({ page }) => {
    for (const [width, name] of [[360, "360"], [768, "768"], [1280, "1280"]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/luyen-thi/${SLUG}`);
      // Lần đầu: "Bắt đầu làm bài"; các cỡ màn hình sau: lượt đang dở → "Làm tiếp".
      await page.getByRole("button", { name: /^(Làm tiếp|Bắt đầu làm bài)$/ }).click();
      await expect(page.getByRole("timer")).toBeVisible();
      await sheet(page).or(page.getByRole("button", { name: /Phiếu trả lời/ })).first().waitFor();
      if (width < 1024) {
        await page.getByRole("button", { name: /Phiếu trả lời/ }).click();
        await sheet(page).getByRole("button", { name: /^Câu 26 / }).click();
      } else {
        await sheet(page).getByRole("button", { name: /^Câu 26 / }).click();
      }
      await expect(page.getByTestId("passage")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `docs/screenshots/luyen-thi-phong-thi-${name}.png` });
    }
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => violation.id)).toEqual([]);

    await page.getByRole("button", { name: "Nộp bài" }).click();
    await page.getByRole("dialog", { name: "Nộp bài?" }).getByRole("button", { name: "Nộp bài" }).click();
    await expect(page.getByTestId("exam-score")).toBeVisible();
    await page.screenshot({ path: "docs/screenshots/luyen-thi-ket-qua-1280.png", fullPage: true });
    const resultScan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(resultScan.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => violation.id)).toEqual([]);
    await page.setViewportSize({ width: 360, height: 900 });
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});
