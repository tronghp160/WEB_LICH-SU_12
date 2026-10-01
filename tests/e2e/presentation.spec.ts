import { expect, test, type Page } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Chế độ trình chiếu cho giáo viên (GĐ4.7): slide dựng từ dữ liệu bài học viết cứng, không cần database.

const LESSON = "/bai-hoc/chien-dich-dien-bien-phu";
const DECK = `${LESSON}/trinh-chieu`;

test.describe("Trình chiếu bài học: Chiến dịch Điện Biên Phủ", () => {
  const status = (page: Page) => page.locator("p.sr-only[aria-live]");
  /** Phím đầu tiên có thể tới trước khi trang hydrate xong (chưa gắn trình nghe phím) → bấm lại tới khi có tác dụng. */
  const pressUntil = (page: Page, key: string, expected: string) =>
    expect(async () => {
      await page.keyboard.press(key);
      await expect(status(page)).toContainText(expected, { timeout: 1000 });
    }).toPass();

  test("lối vào từ bài học, thoát về bài học", async ({ page }) => {
    await page.goto(LESSON);
    await page.getByRole("link", { name: "Trình chiếu trên lớp" }).click();
    await expect(page).toHaveURL(new RegExp(`${DECK}$`));
    await expect(status(page)).toContainText("Slide 1/");
    await page.getByRole("link", { name: "Thoát trình chiếu" }).click();
    await expect(page).toHaveURL(new RegExp(`${LESSON}$`));
  });

  test("phím mũi tên, Home/End chuyển slide và ghi số slide lên URL", async ({ page }) => {
    await page.goto(DECK);
    await expect(status(page)).toContainText("Slide 1/");
    await pressUntil(page, "ArrowRight", "Mục tiêu bài học");
    await expect(page).toHaveURL(/#2$/);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    // Slide bản đồ đầu tiên: bước 1 của diễn biến.
    await expect(status(page)).toContainText("Slide 4/");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.getByText(/^Bước 1\/7/)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/#3$/);
    await page.keyboard.press("End");
    await expect(status(page)).toContainText("Kiểm tra nhanh");
    await expect(page.getByRole("link", { name: "Làm trắc nghiệm" })).toHaveAttribute("href", "/trac-nghiem/bai-hoc/chien-dich-dien-bien-phu");
    await page.keyboard.press("Home");
    await expect(page).toHaveURL(/#1$/);
  });

  test("tải lại giữ nguyên slide; thẻ ghi nhớ bấm Tiếp lần đầu hiện đáp án", async ({ page }) => {
    await page.goto(DECK);
    await pressUntil(page, "End", "Kiểm tra nhanh");
    // Thẻ ghi nhớ nằm liền nhau ngay trước slide cuối: từ thẻ cuối "Slide 24/25: Ghi nhớ 6/6" suy ra số slide thẻ đầu.
    await pressUntil(page, "ArrowLeft", "Ghi nhớ ");
    const [, lastCardSlide, cardCount] = /Slide (\d+)\/\d+: Ghi nhớ (\d+)\//.exec(await status(page).innerText()) ?? [];
    await page.goto(`${DECK}#${Number(lastCardSlide) - Number(cardCount) + 1}`);
    await page.reload();
    const firstCard = page.getByText("Ghi nhớ nhanh · Câu 1/");
    await expect(firstCard).toBeVisible();
    await expect(page.getByText("Kế hoạch Nava (1953–1954).")).toHaveCount(0);
    await page.getByRole("button", { name: "Tiếp" }).click();
    await expect(page.getByText("Kế hoạch Nava (1953–1954).")).toBeVisible();
    await expect(firstCard).toBeVisible();
    await page.getByRole("button", { name: "Tiếp" }).click();
    await expect(page.getByText("Ghi nhớ nhanh · Câu 2/")).toBeVisible();
  });

  test("slug không tồn tại trả 404", async ({ page }) => {
    const response = await page.goto("/bai-hoc/khong-ton-tai/trinh-chieu");
    expect(response?.status()).toBe(404);
  });

  for (const [width, height] of [
    [360, 740],
    [1280, 720],
  ]) {
    test(`không tràn ngang ở ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`${DECK}#4`);
      await expect(page.locator(".leaflet-container")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});
