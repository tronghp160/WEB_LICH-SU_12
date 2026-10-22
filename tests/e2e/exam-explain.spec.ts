import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminApi, hasSecretKey } from "./support";

// Demo luyện thi GĐ-D1 (docs/ke-hoach-demo-luyen-thi.md, mục 4.4–4.7): lời giải "sai ở đâu – bài nào – mục nào" trên DB
// thật (cần migration 20261101000000_exam_item_explain.sql). Đề mini thử tạo bằng khóa bí mật, MIỄN PHÍ, đã công bố; xóa
// hết ở cuối. Câu "ZZ KIỂM THỬ LG …", đề "zz-kiem-thu-loi-giai-…".
//
// Câu 1 (trắc nghiệm, độ xoay 2): đáp án gốc D "Điện Biên Phủ 1954" hiện ở vị trí B. Học sinh chọn A — hiện là lựa chọn gốc
// C "Hòa Bình" → lời giải "Vì sao sai" phải là của Hòa Bình (kiểm phép xoay choice_notes). Câu 2 (Đúng/Sai): chọn "Đúng"
// ở mọi ý → sai ý b (bẫy "Nhầm khái niệm") và ý d.

test.skip(!hasSecretKey(), "Cần SUPABASE_SECRET_KEY trong .env.local");

const run = Date.now().toString(36);
const PREFIX = `ZZ KIỂM THỬ LG ${run}`;
const SLUG = `zz-kiem-thu-loi-giai-${run}`;
const db = adminApi();
let setId = "";

const LEAK = /"(choice_notes|statement_refs|section_id|remember|correct_index|truths)"|choiceNotes|statementRefs|Vì sao sai/;

test.beforeAll(async () => {
  const { data: items, error } = await db
    .from("exam_items")
    .insert([
      {
        kind: "mcq",
        stem: `${PREFIX} 1. Chiến dịch nào đập tan hoàn toàn kế hoạch Na-va?`,
        choices: ["Biên giới 1950", "Việt Bắc 1947", "Hòa Bình 1951–1952", "Điện Biên Phủ 1954"],
        correct_index: 3,
        choice_notes: [
          { note: "Chiến dịch Biên giới (1950) diễn ra trước kế hoạch Na-va.", section_id: "muc-2", trap: "thoi_gian" },
          { note: "Việt Bắc (1947) làm phá sản chiến lược đánh nhanh thắng nhanh.", section_id: "muc-2", trap: "thoi_gian" },
          { note: "Chiến dịch Hòa Bình diễn ra trước khi có kế hoạch Na-va.", section_id: "muc-3", trap: "thoi_gian" },
          { note: "Điện Biên Phủ đập tan hoàn toàn kế hoạch Na-va.", section_id: "muc-3" },
        ],
        explanation: "Phân biệt phá sản bước đầu và phá sản hoàn toàn.",
        remember: "Điện Biên Phủ (13-3 → 7-5-1954) đập tan hoàn toàn kế hoạch Na-va.",
        lesson_slug: "7-khang-chien-chong-phap",
        section_id: "muc-3",
        level: "thong_hieu",
        competency: "nhan_thuc_tu_duy",
        source_note: "Kiểm thử E2E",
        workflow_status: "published",
      },
      {
        kind: "true_false",
        stem: `${PREFIX} 2. Đọc thông tin về Hiệp định Giơ-ne-vơ:`,
        statements: [
          { text: `${PREFIX} ý a: kí sau Điện Biên Phủ`, is_true: true, explanation: "Đúng thứ tự thời gian.", section_id: "muc-3" },
          { text: `${PREFIX} ý b: vĩ tuyến 17 là biên giới quốc gia`, is_true: false, explanation: "Chỉ là giới tuyến quân sự tạm thời.", section_id: "muc-3", trap: "khai_niem" },
          { text: `${PREFIX} ý c: tôn trọng quyền dân tộc cơ bản`, is_true: true, explanation: "Đúng theo hiệp định." },
          { text: `${PREFIX} ý d: hoàn thành cách mạng cả nước`, is_true: false, explanation: "Chỉ miền Bắc được giải phóng.", lesson_slug: "8-khang-chien-chong-my-cuu-nuoc", section_id: "muc-1", trap: "tuyet_doi" },
        ],
        explanation: "Nhận xét chung.",
        lesson_slug: "7-khang-chien-chong-phap",
        section_id: "muc-3",
        level: "van_dung",
        competency: "nhan_thuc_tu_duy",
        source_note: "Kiểm thử E2E",
        workflow_status: "published",
      },
    ])
    .select("id, kind");
  if (error) throw error;
  const { data: set, error: setError } = await db.from("exam_sets").insert({ slug: SLUG, title: `${PREFIX} đề`, format: "mini", duration_min: 15, workflow_status: "published" }).select("id").single();
  if (setError) throw setError;
  setId = set.id;
  const mcq = items.find((item) => item.kind === "mcq")!;
  const tf = items.find((item) => item.kind === "true_false")!;
  const { error: linkError } = await db.from("exam_set_items").insert([
    { set_id: set.id, item_id: mcq.id, section: 1, position: 1, choice_shift: 2 },
    { set_id: set.id, item_id: tf.id, section: 2, position: 1, choice_shift: 0 },
  ]);
  if (linkError) throw linkError;
});

test.afterAll(async () => {
  if (setId) {
    await db.from("exam_attempts").delete().eq("set_id", setId);
    await db.from("exam_sets").delete().eq("id", setId);
  }
  await db.from("exam_items").delete().like("stem", `${PREFIX}%`);
});

test("trước khi nộp không lộ lời giải; nộp → Vì sao sai (đúng lựa chọn sau khi xoay), bẫy, liên kết tới đúng mục, ghi nhớ, kiến thức cần ôn", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/api/luyen-thi/") || response.url().includes("/nop")) return;
    bodies.push(await response.text().catch(() => ""));
  });

  await page.goto(`/luyen-thi/${SLUG}`);
  expect(await page.content()).not.toMatch(LEAK);
  await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  const room = page.getByTestId("exam-room");
  await expect(room.getByRole("list", { name: "Các đáp án" }).getByRole("button").nth(1)).toContainText("Điện Biên Phủ 1954");
  await room.getByRole("list", { name: "Các đáp án" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Câu sau" }).click();
  for (const letter of ["a", "b", "c", "d"]) await page.getByRole("group", { name: `Ý ${letter})` }).getByRole("button", { name: "Đúng" }).click();
  expect(await page.content()).not.toMatch(LEAK);
  expect(bodies.length).toBeGreaterThan(0);
  for (const body of bodies) expect(body).not.toMatch(LEAK);

  await page.getByRole("button", { name: "Nộp bài" }).click();
  await page.getByRole("dialog", { name: "Nộp bài?" }).getByRole("button", { name: "Nộp bài" }).click();
  await expect(page).toHaveURL(/\/luyen-thi\/ket-qua\/[0-9a-f-]{36}$/);

  const solutions = page.getByTestId("solutions");
  const wrong = solutions.getByTestId("wrong-choice");
  await expect(wrong).toContainText("em chọn A. Hòa Bình 1951–1952");
  await expect(wrong).toContainText("Vì sao sai: Chiến dịch Hòa Bình diễn ra trước khi có kế hoạch Na-va.");
  await expect(wrong.getByTestId("trap-badge")).toHaveText("Đánh tráo thời gian");
  await expect(solutions).toContainText("Đáp án đúng: B. Điện Biên Phủ 1954");
  await expect(solutions.getByTestId("remember")).toContainText("đập tan hoàn toàn kế hoạch Na-va");
  await expect(solutions.getByRole("link", { name: "Bài học tương tác: Chiến dịch Điện Biên Phủ" })).toHaveAttribute("href", "/bai-hoc/chien-dich-dien-bien-phu");

  // Đúng/Sai: ý b sai có nhãn bẫy, ý d dẫn sang Bài 8.
  const tfItem = solutions.getByTestId("solution-item").nth(1);
  await expect(tfItem.getByTestId("trap-badge")).toHaveText(["Nhầm khái niệm", "Tuyệt đối hóa (duy nhất, hoàn toàn…)"]);
  await expect(tfItem.getByRole("link", { name: "Bài 8 › Mục 1. Giai đoạn 1954–1965" })).toHaveAttribute("href", "/bai/8-khang-chien-chong-my-cuu-nuoc#muc-1");

  // Giải thích cả 4 phương án (gập sẵn).
  const details = solutions.getByText("Xem giải thích cả 4 phương án");
  await details.click();
  await expect(solutions.locator("details")).toContainText("Việt Bắc (1947) làm phá sản");

  const hints = page.getByTestId("review-hints");
  await expect(hints).toContainText("Bài 7 › Mục 3. Giai đoạn 1951–1954 và chiến dịch Điện Biên Phủ — sai 2/2 câu");
  await expect(hints.getByRole("link", { name: "Luyện 10 câu bài này" })).toHaveAttribute("href", "/luyen-thi/luyen-tap?bai=7-khang-chien-chong-phap");

  const axe = await new AxeBuilder({ page }).include("[data-testid=solutions]").include("[data-testid=review-hints]").analyze();
  expect(axe.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await page.screenshot({ path: "docs/screenshots/demo-loi-giai.png", fullPage: true });

  // Liên kết "Kiến thức này ở" mở đúng mục của trang Bài.
  await wrong.getByTestId("knowledge-link").click();
  await expect(page).toHaveURL(/\/bai\/7-khang-chien-chong-phap#muc-3$/);
  await expect(page.locator("#muc-3")).toBeInViewport();
});
