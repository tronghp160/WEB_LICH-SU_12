import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Tái hiện trận Bạch Đằng năm 938 (kịch bản viết cứng, không cần đăng nhập hay database).

test.describe("Tái hiện trận Bạch Đằng năm 938", () => {
  test("lối vào từ trang chủ, có đủ 6 bước và bản đồ", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/tai-hien/bach-dang-938"]').click();
    await expect(page).toHaveURL(/\/tai-hien\/bach-dang-938$/);
    await expect(page.locator("h1")).toHaveText("Trận Bạch Đằng năm 938");
    await expect(page.getByRole("note")).toContainText("mô phỏng minh họa");
    await expect(page.getByRole("navigation", { name: "Các bước diễn biến" }).locator("button")).toHaveCount(6);
    await expect(page.locator(".leaflet-container")).toBeVisible();
    // 3 thuyền giặc + 2 thuyền nhẹ + 2 nhóm mai phục (bước đầu quân ta còn ẩn/mờ nhưng marker vẫn có trong DOM)
    await expect(page.locator(".leaflet-marker-icon .battle-unit")).toHaveCount(7);
  });

  test("chuyển bước: cọc xuất hiện ở bước 2, chìm ở bước 6 thuyền giặc chuyển sang trạng thái chìm", async ({ page }) => {
    await page.goto("/tai-hien/bach-dang-938");
    const steps = page.getByRole("navigation", { name: "Các bước diễn biến" }).locator("button");
    await expect(steps.first()).toHaveAttribute("aria-current", "step");
    await expect(page.locator("path.battle-stake")).toHaveCount(0);

    await steps.nth(1).click();
    await expect(page.locator("path.battle-stake")).toHaveCount(9);
    await expect(page.getByText("Chuẩn bị: cắm cọc ngầm, bố trí mai phục").first()).toBeVisible();

    await steps.nth(5).click();
    await expect(steps.nth(5)).toHaveAttribute("aria-current", "step");
    await expect(page.locator(".leaflet-marker-icon .battle-unit--sunk")).toHaveCount(3, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Bước sau" })).toBeDisabled();
  });

  test("nút Phát tự chạy tới bước cuối rồi chuyển thành Phát lại; Tạm dừng dừng lại", async ({ page }) => {
    await page.goto("/tai-hien/bach-dang-938");
    const steps = page.getByRole("navigation", { name: "Các bước diễn biến" }).locator("button");

    await page.getByRole("button", { name: "Phát", exact: true }).click();
    await expect(page.getByRole("button", { name: "Tạm dừng" })).toBeVisible();
    await expect(steps.nth(1)).toHaveAttribute("aria-current", "step", { timeout: 15_000 });
    await page.getByRole("button", { name: "Tạm dừng" }).click();
    await expect(page.getByRole("button", { name: "Phát", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Phát", exact: true }).click();
    await expect(page.getByRole("button", { name: "Phát lại" })).toBeVisible({ timeout: 60_000 });
    await expect(steps.nth(5)).toHaveAttribute("aria-current", "step");
  });

  test("giảm chuyển động: nhảy thẳng tới bước đích, không cần chờ hoạt hình", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/tai-hien/bach-dang-938");
    await page.getByRole("navigation", { name: "Các bước diễn biến" }).locator("button").nth(5).click();
    // Không phải chờ ~2 giây chuyển động: thuyền giặc chìm ngay
    await expect(page.locator(".leaflet-marker-icon .battle-unit--sunk")).toHaveCount(3, { timeout: 1500 });
    await context.close();
  });

  for (const width of [360, 768, 1280]) {
    test(`không tràn ngang ở ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/tai-hien/bach-dang-938");
      await expect(page.locator(".leaflet-container")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});
