import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Nâng cấp giao diện GĐ4–5 (KE_HOACH_NANG_CAP_GIAO_DIEN.md): chuyên đề chia chương, chú giải nổi trên bản đồ, ôn tập
// theo Bài SGK, chuyển tiến độ sang máy khác, dòng thời gian thu gọn, lọc bản đồ theo bài.

const DBP = "/bai-hoc/chien-dich-dien-bien-phu";
const KEY = "ls12:tien-do";

test.describe("Chuyên đề tương tác chia chương", () => {
  test("điện thoại: mỗi lần một chương; Chương tiếp mở chương 2 và bản đồ hiện đúng", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(DBP);
    const bar = page.getByRole("navigation", { name: /Các chương của/ });
    await expect(bar).toContainText("Chương 1/7");
    await expect(page.locator('[data-chapter="dien-bien"]')).toBeHidden();
    await page.locator('[data-chapter="mo-dau"]').getByRole("button", { name: /Chương tiếp/ }).click();
    await expect(bar).toContainText("Chương 2/7");
    await expect(page.locator('[data-chapter="dien-bien"] .leaflet-container')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-chapter="mo-dau"]')).toBeHidden();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test("điện thoại: mở bằng neo #dien-bien thì vào thẳng chương bản đồ", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${DBP}#dien-bien`);
    await expect(page.getByRole("navigation", { name: /Các chương của/ })).toContainText("Chương 2/7");
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 20_000 });
  });

  test("máy tính: mọi chương cùng hiện, mục lục chương bên trái", async ({ page }) => {
    await page.goto(DBP);
    for (const id of ["mo-dau", "dien-bien", "ket-qua", "nhan-vat", "tu-lieu", "on-tap", "nguon"]) {
      await expect(page.locator(`[data-chapter="${id}"]`)).toBeVisible();
    }
    await expect(page.getByRole("navigation", { name: "Mục lục chuyên đề Chiến dịch Điện Biên Phủ", exact: true }).getByRole("link")).toHaveCount(7);
  });

  test("chú giải nổi trên bản đồ: mở, đóng bằng Esc; ghi chú biên soạn chỉ hiện với ?bien-tap=1", async ({ page }) => {
    await page.goto(DBP);
    const legendButton = page.getByRole("button", { name: "Chú giải" });
    await legendButton.click();
    const legend = page.getByRole("region", { name: "Chú giải ký hiệu trên bản đồ" });
    await expect(legend).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(legend).toHaveCount(0);

    await expect(page.getByText("Ghi chú biên soạn")).toHaveCount(0);
    await page.goto(`${DBP}?bien-tap=1`);
    await expect(page.getByText("Ghi chú biên soạn")).toBeVisible();
  });
});

test.describe("Ôn tập theo Bài SGK", () => {
  test("làm 10 câu Bài 7: lưu kết quả theo bài, có gợi ý ôn lại dẫn về mục SGK", async ({ page }) => {
    await page.goto("/trac-nghiem/bai/7-khang-chien-chong-phap");
    await expect(page.locator("h1")).toHaveText("Trắc nghiệm Bài 7");
    await expect(async () => {
      await page.getByRole("button", { name: "Bắt đầu" }).click({ timeout: 1000 });
      await expect(page.getByText("Câu 1/10")).toBeVisible({ timeout: 1000 });
    }).toPass();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("1");
      await page.getByRole("button", { name: /Câu tiếp theo|Xem kết quả/ }).click();
    }
    await expect(page.getByRole("heading", { name: /^Kết quả/ })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), KEY);
    expect(saved.quizzes["bai:7-khang-chien-chong-phap"]).toMatchObject({ total: 10, attempts: 1 });
    // Chọn đáp án đầu tiên cho mọi câu gần như chắc chắn có câu sai → có mục SGK cần đọc lại.
    const sections = page.getByRole("list", { name: "Mục cần đọc lại trong SGK" });
    if ((await sections.count()) > 0) await expect(sections.getByRole("link").first()).toHaveAttribute("href", /^\/bai\/\d+-.*#muc-\d$/);
  });

  test("trang Ôn tập: bảng theo 17 bài, thẻ ghi nhớ lật được", async ({ page }) => {
    await page.goto("/trac-nghiem");
    await expect(page.locator("h1")).toHaveText("Ôn tập");
    await expect(page.locator("table tbody tr")).toHaveCount(17);
    await page.getByRole("link", { name: /Thẻ ghi nhớ/ }).first().click();
    await expect(page).toHaveURL(/\/trac-nghiem\/the-ghi-nho$/);
    const card = page.locator("button.flip-card").first();
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Tiến độ học tập", () => {
  test("tạo mã tiến độ, xóa, dán lại mã thì tiến độ được gộp trở lại", async ({ page }) => {
    await page.addInitScript((key) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      const at = "2026-10-01T03:00:00.000Z";
      localStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          lessons: {},
          quizzes: { "bai:7-khang-chien-chong-phap": { best: 8, total: 10, attempts: 1, passedAt: at, lastAt: at } },
          sgk: { "7-khang-chien-chong-phap": { sections: { "muc-1": at, "muc-2": at }, lastSection: "muc-2", lastAt: at } },
        }),
      );
    }, KEY);
    await page.goto("/ho-chieu");
    await expect(page.getByRole("progressbar", { name: "Bài 7: đã đọc" })).toHaveAttribute("aria-valuenow", "50");
    await page.getByRole("button", { name: "Tạo mã tiến độ" }).click();
    const code = await page.locator("#ma-tien-do").inputValue();
    expect(code).toMatch(/^LS12-/);

    await page.getByRole("button", { name: "Xóa tiến độ trên máy này" }).click();
    await page.getByRole("button", { name: "Xóa hết" }).click();
    await expect(page.getByRole("progressbar", { name: "Bài 7: đã đọc" })).toHaveAttribute("aria-valuenow", "0");

    await page.locator("#nhap-ma-tien-do").fill(code);
    await page.getByRole("button", { name: "Gộp vào máy này" }).click();
    await expect(page.getByText("Đã gộp tiến độ từ máy kia vào máy này.")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Bài 7: đã đọc" })).toHaveAttribute("aria-valuenow", "50");

    await page.locator("#nhap-ma-tien-do").fill("LS12-khong-hop-le");
    await page.getByRole("button", { name: "Gộp vào máy này" }).click();
    await expect(page.getByText(/Mã không đúng/)).toBeVisible();
  });
});

test.describe("Khám phá", () => {
  test("dòng thời gian: nhãn Bài N trên thẻ; chế độ thu gọn mỗi sự kiện một dòng", async ({ page }) => {
    await page.goto("/dong-thoi-gian");
    const timeline = page.locator("ol[aria-label^='Dòng thời gian']");
    await expect(timeline.getByRole("link", { name: "Bài 7", exact: true }).first()).toHaveAttribute("href", /^\/bai\/7-/);
    await page.getByRole("button", { name: "Thu gọn" }).click();
    await expect(page.getByRole("button", { name: "Thu gọn" })).toHaveAttribute("aria-pressed", "true");
    await expect(timeline.getByRole("link", { name: "Chiến dịch Điện Biên Phủ", exact: true })).toBeVisible();
  });

  test("bản đồ: lọc theo Bài 9 ghi lên URL và chỉ còn địa điểm của bài; nút Gần em", async ({ page }) => {
    await page.goto("/ban-do");
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible({ timeout: 20_000 });
    const listHeading = page.getByRole("heading", { name: /^Địa điểm \(\d+\)$/ });
    const total = Number((await listHeading.innerText()).match(/\d+/)![0]);
    await page.locator("#map-lesson-filter").selectOption("9-bao-ve-to-quoc-tu-sau-thang-4-1975");
    await expect(page).toHaveURL(/bai=9-bao-ve-to-quoc-tu-sau-thang-4-1975/);
    await expect.poll(async () => Number((await listHeading.innerText()).match(/\d+/)![0])).toBeLessThan(total);
    await expect(page.getByRole("link", { name: "Gần em", exact: true })).toHaveAttribute("href", "/di-tich-gan-em");
  });

  test("phòng tư liệu 3D: thẻ ghi dung lượng và loại (quét thật / minh họa)", async ({ page }) => {
    await page.goto("/kham-pha#tu-lieu-3d");
    const gallery = page.locator("#tu-lieu-3d");
    await expect(gallery.getByText(/~\d+ MB/).first()).toBeVisible();
    await expect(gallery.getByText("Quét thật · 360°").first()).toBeVisible();
    await expect(gallery.getByText("Minh họa", { exact: true })).toBeVisible();
  });

  test("tìm nhanh: kết quả nhóm theo loại (bài, sự kiện, địa điểm)", async ({ page }) => {
    await page.goto("/kham-pha");
    // Phím "/" chỉ có tác dụng sau khi trang chạy JavaScript → nhấn lại tới khi lớp phủ mở.
    await expect(async () => {
      await page.keyboard.press("/");
      await expect(page.locator("#search-overlay-input")).toBeFocused({ timeout: 1000 });
    }).toPass();
    await page.locator("#search-overlay-input").fill("dien bien");
    const dialog = page.getByRole("dialog", { name: "Tìm kiếm" });
    await expect(dialog.getByRole("heading", { name: "Bài trong SGK" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Sự kiện" })).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("link", { name: /Chiến dịch Điện Biên Phủ/ })).toHaveAttribute("href", "/su-kien/chien-dich-dien-bien-phu");
  });
});
