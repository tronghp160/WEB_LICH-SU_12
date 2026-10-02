import { expect, test, type Page } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// E1–E4 và E9 (Phase 13, mục 8.4): các luồng công khai + chạy lại E1–E3 ở 360 / 768 / 1280px.
// Dữ liệu dựa trên bộ dữ liệu mẫu đợt 1 (supabase/seed.sql): 10 sự kiện đã công bố.

const SCREENSHOTS = "docs/screenshots";

/** E1: Trang chủ → Bài 7 trong mục lục SGK → sự kiện → nhân vật → quay lại. */
async function flowE1(page: Page) {
  await page.goto("/");
  await page.locator('a[href="/bai/7-khang-chien-chong-phap"]').first().click();
  await expect(page).toHaveURL(/\/bai\/7-khang-chien-chong-phap$/);
  await expect(page.locator("h1")).toContainText("kháng chiến chống thực dân Pháp");

  await page.getByRole("link", { name: "Chiến dịch Điện Biên Phủ", exact: true }).first().click();
  await expect(page).toHaveURL(/\/su-kien\/chien-dich-dien-bien-phu$/);
  await expect(page.locator("h1")).toHaveText("Chiến dịch Điện Biên Phủ");

  await page.locator('aside a[href^="/nhan-vat/"]').first().click();
  await expect(page).toHaveURL(/\/nhan-vat\//);
  const figureName = await page.locator("h1").innerText();
  expect(figureName.length).toBeGreaterThan(2);

  await page.goBack();
  await expect(page).toHaveURL(/\/su-kien\/chien-dich-dien-bien-phu$/);
  await page.locator('aside a[href^="/dia-diem/"]').first().click();
  await expect(page).toHaveURL(/\/dia-diem\//);
  await page.goBack();
  await expect(page.locator("h1")).toHaveText("Chiến dịch Điện Biên Phủ");
}

/** E2: Timeline → lọc chủ đề → mở sự kiện → "Xem trên bản đồ". */
async function flowE2(page: Page) {
  await page.goto("/dong-thoi-gian");
  await expect(page.locator("ol[aria-label^='Dòng thời gian']")).toBeVisible();
  const total = await page.locator("ol[aria-label^='Dòng thời gian'] li li").count();
  expect(total).toBeGreaterThanOrEqual(10);

  await page.getByRole("button", { name: /kháng chiến chống Mỹ/i }).click();
  await expect(page).toHaveURL(/chu-de=khang-chien-chong-my/);
  const filtered = await page.locator("ol[aria-label^='Dòng thời gian'] li li").count();
  expect(filtered).toBeGreaterThan(0);
  expect(filtered).toBeLessThan(total);

  await page.getByRole("link", { name: /^Xem trên bản đồ/ }).first().click();
  await expect(page).toHaveURL(/\/ban-do\?su-kien=/);
  await expect(page.locator(".leaflet-popup")).toBeVisible({ timeout: 20_000 });
}

/** E3: Bản đồ → bấm marker → popup → sự kiện. */
async function flowE3(page: Page) {
  await page.goto("/ban-do");
  const marker = page.locator(".leaflet-marker-icon[title='Điện Biên Phủ']");
  await expect(marker).toBeVisible({ timeout: 20_000 });
  await marker.click({ force: true });
  const popup = page.locator(".leaflet-popup");
  await expect(popup).toBeVisible();
  await expect(popup).toContainText("Điện Biên Phủ");
  await popup.getByRole("link", { name: "Chiến dịch Điện Biên Phủ" }).click();
  await expect(page).toHaveURL(/\/su-kien\/chien-dich-dien-bien-phu$/);
}

test.describe("Luồng công khai (viewport 1280px)", () => {
  test("E1: trang chủ → bài SGK → sự kiện → nhân vật → quay lại", async ({ page }) => {
    await flowE1(page);
  });

  test("E2: dòng thời gian → lọc chủ đề → mở bản đồ từ sự kiện", async ({ page }) => {
    await flowE2(page);
  });

  test("E3: bản đồ → marker → popup → sự kiện", async ({ page }) => {
    await flowE3(page);
  });

  test("E4: tìm không dấu 'dien bien phu' ra kết quả có dấu", async ({ page }) => {
    await page.goto("/tra-cuu");
    await page.locator("#search-input").fill("dien bien phu");
    await expect(page).toHaveURL(/q=dien%20bien%20phu/);
    await expect(page.getByRole("link", { name: "Chiến dịch Điện Biên Phủ" })).toBeVisible();
    await expect(page.locator("mark").first()).toBeVisible();

    await page.locator("#search-input").fill("Điện Biên Phủ");
    await expect(page.getByRole("link", { name: "Chiến dịch Điện Biên Phủ" })).toBeVisible();
  });

  test("E4b: ký tự đặc biệt không gây lỗi", async ({ page }) => {
    await page.goto("/tra-cuu");
    for (const query of ["%", "_", "'", "\"; drop table x;--", "<script>alert(1)</script>", "(((", ".*"]) {
      await page.locator("#search-input").fill(query);
      await page.locator("#search-input").press("Enter");
      await expect(page.locator("p[aria-live=polite]")).toContainText("Tìm thấy 0 kết quả");
    }
  });

  test("Nội dung không tồn tại trả 404 tiếng Việt, vẫn có header/footer", async ({ page }) => {
    const response = await page.goto("/su-kien/khong-ton-tai");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Không tìm thấy trang");
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });
});

for (const { width, height } of [
  { width: 360, height: 800 },
  { width: 768, height: 900 },
  { width: 1280, height: 900 },
]) {
  test.describe(`E9: responsive ${width}px`, () => {
    test.use({ viewport: { width, height } });

    test(`E1 ở ${width}px, không tràn ngang`, async ({ page }) => {
      await flowE1(page);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test(`E2 ở ${width}px, không tràn ngang`, async ({ page }) => {
      await flowE2(page);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test(`E3 ở ${width}px, không tràn ngang`, async ({ page }) => {
      await flowE3(page);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test(`ảnh chụp timeline, bản đồ, chi tiết ở ${width}px (cho báo cáo)`, async ({ page }) => {
      await page.goto("/dong-thoi-gian");
      await expect(page.locator("ol[aria-label^='Dòng thời gian']")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `${SCREENSHOTS}/phase13-timeline-${width}.png` });

      await page.goto("/ban-do");
      await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(1000); // chờ tile bản đồ
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `${SCREENSHOTS}/phase13-ban-do-${width}.png` });

      await page.goto("/su-kien/chien-dich-dien-bien-phu");
      await expect(page.locator("h1")).toBeVisible();
      await page.waitForTimeout(1000);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.screenshot({ path: `${SCREENSHOTS}/phase13-chi-tiet-${width}.png`, fullPage: true });
    });
  });
}
