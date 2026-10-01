import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Nâng cấp giao diện (KE_HOACH_NANG_CAP_GIAO_DIEN.md, GĐ1–3): khung SGK (mục lục, chủ đề, bài), điều hướng mới,
// tìm kiếm nhanh, giao diện sáng/tối, hướng dẫn lần đầu.

const BAI_7 = "/bai/7-khang-chien-chong-phap";
const PROGRESS_KEY = "ls12:tien-do";

test.describe("Khung SGK: mục lục → chủ đề → bài", () => {
  test("mục lục có 6 chủ đề, 17 bài; lọc bài có chuyên đề", async ({ page }) => {
    await page.goto("/muc-luc");
    await expect(page.locator("h1")).toHaveText("Mục lục");
    const lessons = page.locator('main a[href^="/bai/"]');
    await expect(lessons).toHaveCount(17);
    await page.getByRole("button", { name: "Có chuyên đề tương tác" }).click();
    await expect(lessons).toHaveCount(3);
    await expect(page.locator(`main a[href="${BAI_7}"]`)).toBeVisible();
  });

  test("trang chủ đề liệt kê đúng các bài; bài có mục lục, bài trước / bài sau", async ({ page }) => {
    await page.goto("/muc-luc/chu-de-3");
    await expect(page.locator("h1")).toContainText("Cách mạng tháng Tám năm 1945");
    await expect(page.locator('main a[href^="/bai/"]')).toHaveCount(4);

    await page.locator(`main a[href="${BAI_7}"]`).click();
    await expect(page.locator("h1")).toHaveText("Cuộc kháng chiến chống thực dân Pháp (1945–1954)");
    await expect(page.getByRole("navigation", { name: "Mục lục Bài 7", exact: true }).getByRole("link")).toHaveCount(6);
    await expect(page.locator("#muc-3")).toContainText("Chuyên đề tương tác");

    const pager = page.getByRole("navigation", { name: "Bài trước, bài sau" });
    await pager.getByRole("link", { name: /Bài sau · Bài 8/ }).click();
    await expect(page).toHaveURL(/\/bai\/8-/);
    await page.getByRole("navigation", { name: "Bài trước, bài sau" }).getByRole("link", { name: /Bài trước · Bài 7/ }).click();
    await expect(page).toHaveURL(new RegExp(`${BAI_7}$`));
  });

  test("bài chưa có nội dung vẫn mở được khung bài (không 404); slug lạ thì 404", async ({ page }) => {
    const response = await page.goto("/bai/11-thanh-tuu-va-bai-hoc-cua-cong-cuoc-doi-moi");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Nội dung bài này đang biên soạn")).toBeVisible();
    await expect(page.getByText("Học xong bài này, em có thể")).toBeVisible();
    expect((await page.goto("/bai/khong-co-bai-nay"))?.status()).toBe(404);
    expect((await page.goto("/muc-luc/chu-de-9"))?.status()).toBe(404);
  });

  test("đọc tới mục nào thì ghi tiến độ; trang chủ hiện nút Học tiếp đúng mục", async ({ page }) => {
    await page.goto(BAI_7);
    await page.locator("#muc-3").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 50);
    await expect
      .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").sgk?.["7-khang-chien-chong-phap"]?.lastSection, PROGRESS_KEY))
      .toMatch(/^muc-/);
    const desktopNav = page.getByRole("navigation", { name: "Mục lục Bài 7", exact: true });
    await expect(desktopNav.locator('a[aria-current="location"]')).toHaveCount(1);

    await page.goto("/");
    const resume = page.getByRole("link", { name: /^Học tiếp Bài 7/ });
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(page).toHaveURL(/\/bai\/7-khang-chien-chong-phap#muc-\d$/);
  });

  test("trang sự kiện có khối 'Trong SGK' dẫn về đúng bài và mục", async ({ page }) => {
    await page.goto("/su-kien/chien-dich-dien-bien-phu");
    const placement = page.getByRole("complementary", { name: "Vị trí trong sách giáo khoa" });
    await expect(placement).toContainText("Trong SGK: Bài 7");
    await expect(placement.getByRole("link")).toHaveAttribute("href", `${BAI_7}#muc-3`);
  });

  for (const width of [360, 768, 1280]) {
    test(`mục lục, bài, khám phá không tràn ngang ở ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/muc-luc", BAI_7, "/muc-luc/chu-de-3", "/kham-pha", "/huong-dan"]) {
        await page.goto(path);
        expect(await hasHorizontalOverflow(page), `${path} ở ${width}px`).toBe(false);
      }
    });
  }
});

test.describe("Điều hướng mới", () => {
  test("menu 3 nhóm mở bằng bàn phím, Esc đóng và trả focus", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Học theo bài" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#nav-mega-panel").locator('a[href^="/bai/"]')).toHaveCount(17);
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    await page.getByRole("button", { name: "Khám phá" }).click();
    await page.locator("#nav-mega-panel").getByRole("link", { name: /Di tích gần em/ }).click();
    await expect(page).toHaveURL(/\/di-tich-gan-em$/);
  });

  test("phím / mở tìm kiếm; gõ 'bai 7' gợi ý Bài 7; Enter mở trang tra cứu", async ({ page }) => {
    await page.goto("/muc-luc");
    const input = page.locator("#search-overlay-input");
    // Phím "/" chỉ có tác dụng sau khi trang chạy JavaScript → nhấn lại tới khi lớp phủ mở.
    await expect(async () => {
      await page.keyboard.press("/");
      await expect(input).toBeFocused({ timeout: 1000 });
    }).toPass();
    await input.fill("bai 7");
    await expect(page.getByRole("dialog", { name: "Tìm kiếm" }).getByRole("link", { name: /Bài 7\./ })).toHaveAttribute("href", BAI_7);
    await input.fill("dien bien phu");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/tra-cuu\?q=dien%20bien%20phu/);
  });

  test("điện thoại: thanh tab dưới cùng dẫn tới mục lục, ôn tập, khám phá và mở tìm kiếm", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const bar = page.getByRole("navigation", { name: "Điều hướng nhanh" });
    await expect(bar).toBeVisible();
    await bar.getByRole("link", { name: "Học" }).click();
    await expect(page).toHaveURL(/\/muc-luc$/);
    await expect(bar.getByRole("link", { name: "Học" })).toHaveAttribute("aria-current", "page");
    await bar.getByRole("button", { name: "Tìm" }).click();
    await expect(page.locator("#search-overlay-input")).toBeFocused();
  });

  test("chọn giao diện Tối: lưu lại, tải lại trang không nháy về sáng", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("group", { name: "Giao diện" }).first().getByRole("button", { name: "Giao diện: Tối" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    // Script trong <head> đặt data-theme trước khi vẽ: đọc ngay khi tài liệu vừa phân tích xong, trước khi React chạy.
    await page.reload({ waitUntil: "commit" });
    await page.waitForFunction(() => document.readyState !== "loading");
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
    await page.getByRole("group", { name: "Giao diện" }).first().getByRole("button", { name: "Giao diện: Sáng" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("Hướng dẫn lần đầu", () => {
  // Trình duyệt mới hoàn toàn (không có đánh dấu "đã xem" của cấu hình chung).
  test.use({ storageState: { cookies: [], origins: [] } });

  test("hiện 3 bước, bỏ qua được và không hiện lại", async ({ page }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "Đây là mục lục SGK" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Tiếp" }).click();
    await expect(page.getByRole("dialog", { name: "Học tiếp ở đây" })).toBeVisible();
    await page.getByRole("button", { name: "Bỏ qua" }).click();
    await expect(page.getByRole("dialog", { name: /Học tiếp|mục lục SGK|Ôn tập/ })).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(1200);
    await expect(page.getByRole("dialog", { name: "Đây là mục lục SGK" })).toHaveCount(0);
  });
});
