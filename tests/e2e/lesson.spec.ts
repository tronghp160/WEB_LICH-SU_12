import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Bài học tương tác Chiến dịch Điện Biên Phủ (dữ liệu viết cứng; lối vào từ trang sự kiện cần sự kiện đã công bố trong database).

const LESSON = "/bai-hoc/chien-dich-dien-bien-phu";

test.describe("Chuyên đề tương tác: Chiến dịch Điện Biên Phủ", () => {
  test("lối vào từ trang chi tiết sự kiện và từ trang chủ", async ({ page }) => {
    await page.goto("/su-kien/chien-dich-dien-bien-phu");
    await page.getByRole("link", { name: /Xem chuyên đề tương tác/ }).click();
    await expect(page).toHaveURL(new RegExp(`${LESSON}$`));
    await expect(page.locator("h1")).toHaveText("Chiến dịch Điện Biên Phủ");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /chuyên đề tương tác/ })).toBeVisible();
    await page.locator(`a[href="${LESSON}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${LESSON}$`));
  });

  test("sự kiện không có bài học thì không có nút", async ({ page }) => {
    await page.goto("/su-kien/hiep-dinh-geneve-ve-dong-duong");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /Xem chuyên đề tương tác/ })).toHaveCount(0);
  });

  test("bản đồ 7 bước: cứ điểm đổi trạng thái theo từng đợt", async ({ page }) => {
    await page.goto(LESSON);
    const steps = page.getByRole("navigation", { name: "Các bước diễn biến" }).locator("button");
    await expect(steps).toHaveCount(7);
    await expect(page.locator(".leaflet-container")).toBeVisible();
    const captured = page.locator(".leaflet-marker-icon .battle-sp--captured");

    await steps.nth(1).click();
    await expect(page.locator(".leaflet-marker-icon .battle-sp--held")).toHaveCount(10, { timeout: 10_000 });
    await steps.nth(3).click();
    await expect(captured).toHaveCount(3, { timeout: 10_000 });
    await expect(page.getByText("Phan Đình Giót lấp lỗ châu mai")).toBeVisible();
    await steps.nth(4).click();
    await expect(captured).toHaveCount(6, { timeout: 10_000 });
    await expect(page.locator(".leaflet-marker-icon .battle-sp--attacked")).toHaveCount(2);
    await steps.nth(5).click();
    await expect(captured).toHaveCount(10, { timeout: 10_000 });
    await expect(page.locator("path.battle-arrow")).toHaveCount(3);
  });

  test("video chỉ tải iframe sau khi bấm Phát", async ({ page }) => {
    await page.goto(LESSON);
    await expect(page.locator("iframe")).toHaveCount(0);
    const play = page.getByRole("button", { name: /^Phát video: Điện Biên Phủ 1954/ });
    await play.scrollIntoViewIfNeeded();
    await play.click();
    const frame = page.locator('iframe[src*="youtube-nocookie.com/embed/qvE5Zd9kHPY"]');
    await expect(frame).toHaveCount(1);
    await expect(page.locator("iframe")).toHaveCount(1);
  });

  test("thẻ ghi nhớ lật được bằng chuột và bàn phím", async ({ page }) => {
    await page.goto(LESSON);
    const card = page.locator("section[aria-labelledby=ghi-nho] button.flip-card").first();
    await expect(card).toContainText("Kế hoạch quân sự nào");
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(card.getByText("Kế hoạch Nava (1953–1954).")).toBeVisible();
    await card.press("Enter");
    await expect(card).toHaveAttribute("aria-pressed", "false");
  });

  test("giảm chuyển động: số liệu hiện ngay số cuối, bước bản đồ đổi ngay", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(LESSON);
    await expect(page.getByRole("list", { name: "Số liệu chính" })).toContainText("16.200");
    await page.getByRole("navigation", { name: "Các bước diễn biến" }).locator("button").nth(5).click();
    await expect(page.locator(".leaflet-marker-icon .battle-sp--captured")).toHaveCount(10, { timeout: 1500 });
    await context.close();
  });

  test("slug bài học không tồn tại trả 404", async ({ page }) => {
    const response = await page.goto("/bai-hoc/khong-ton-tai");
    expect(response?.status()).toBe(404);
  });

  for (const width of [360, 768, 1280]) {
    test(`không tràn ngang ở ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // Dưới 1024px chuyên đề hiện từng chương: mở thẳng chương bản đồ bằng neo.
      await page.goto(`${LESSON}#dien-bien`);
      await expect(page.locator(".leaflet-container")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe("Chuyên đề tương tác: Cách mạng tháng Tám năm 1945", () => {
  const CMT8 = "/bai-hoc/cach-mang-thang-tam-1945";

  test("lối vào từ trang sự kiện Tổng khởi nghĩa ở Hà Nội và Tuyên ngôn Độc lập", async ({ page }) => {
    for (const event of ["tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi", "tuyen-ngon-doc-lap"]) {
      await page.goto(`/su-kien/${event}`);
      await page.getByRole("link", { name: /Xem chuyên đề tương tác/ }).click();
      await expect(page).toHaveURL(new RegExp(`${CMT8}$`));
      await expect(page.locator("h1")).toHaveText("Cách mạng tháng Tám năm 1945");
    }
  });

  test("bản đồ 7 bước: địa phương giành chính quyền theo đúng thứ tự ngày", async ({ page }) => {
    await page.goto(CMT8);
    const steps = page.getByRole("navigation", { name: "Các bước diễn biến" }).locator("button");
    await expect(steps).toHaveCount(7);
    const captured = page.locator(".leaflet-marker-icon .battle-sp--captured");

    await steps.nth(2).click();
    await expect(captured).toHaveCount(4, { timeout: 10_000 });
    await expect(page.locator(".leaflet-marker-icon .battle-sp--attacked")).toHaveCount(1);
    await steps.nth(3).click();
    await expect(captured).toHaveCount(5, { timeout: 10_000 });
    await steps.nth(5).click();
    await expect(captured).toHaveCount(10, { timeout: 10_000 });
    await expect(page.getByText("\"Làm dân một nước tự do\"")).toBeVisible();
  });

  test("trắc nghiệm bài học và trình chiếu mở được", async ({ page }) => {
    await page.goto("/trac-nghiem/bai-hoc/cach-mang-thang-tam-1945");
    await expect(page.locator("h1")).toHaveText("Trắc nghiệm: Cách mạng tháng Tám năm 1945");
    await expect(page.getByRole("button", { name: "Bắt đầu" })).toBeVisible();
    const response = await page.goto(`${CMT8}/trinh-chieu`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("p.sr-only[aria-live]")).toContainText("Slide 1/");
  });
});
