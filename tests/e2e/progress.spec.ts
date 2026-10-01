import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// GĐ4.4 "Hộ chiếu lịch sử" (tiến độ trong localStorage) và GĐ4.5 "Di tích gần em" (định vị giả của Playwright).
// Cần dữ liệu thật: câu hỏi trắc nghiệm và địa điểm đã công bố (supabase/seed*.sql).

const KEY = "ls12:tien-do";

test.describe("Hộ chiếu lịch sử", () => {
  test("hộ chiếu trống lúc đầu; làm xong một lượt trắc nghiệm thì được ghi lại", async ({ page }) => {
    await page.goto("/ho-chieu");
    await expect(page.getByText("Hộ chiếu của em còn trống")).toBeVisible();
    await expect(page.getByText(/^0\/\d+ con dấu$/)).toBeVisible();

    await page.goto("/trac-nghiem/tong-hop");
    // Bấm trước khi trang hydrate xong thì chưa có tác dụng → bấm lại tới khi vào câu 1.
    await expect(async () => {
      await page.getByRole("button", { name: "Bắt đầu" }).click({ timeout: 1000 });
      await expect(page.getByText("Câu 1/10")).toBeVisible({ timeout: 1000 });
    }).toPass();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("1");
      const next = page.getByRole("button", { name: /Câu tiếp theo|Xem kết quả/ });
      await next.click();
    }
    await expect(page.getByRole("heading", { name: /^Kết quả/ })).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Hộ chiếu lịch sử" })).toBeVisible();

    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), KEY);
    expect(saved.quizzes["tong-hop"]).toMatchObject({ total: 10, attempts: 1 });

    await page.goto("/ho-chieu");
    await expect(page.getByText("Hộ chiếu của em còn trống")).toHaveCount(0);
  });

  test("con dấu hiện theo điểm đã lưu, header có số dấu, xóa được tiến độ", async ({ page }) => {
    await page.addInitScript((key) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      const at = "2026-09-30T03:00:00.000Z";
      localStorage.setItem(
        key,
        JSON.stringify({
          v: 1,
          lessons: { "chien-dich-dien-bien-phu": { studiedAt: at } },
          quizzes: {
            "bai-hoc:chien-dich-dien-bien-phu": { best: 9, total: 10, attempts: 2, passedAt: at, lastAt: at },
            "tong-hop": { best: 5, total: 10, attempts: 1, lastAt: at },
          },
        }),
      );
    }, KEY);
    await page.goto("/ho-chieu");
    await expect(page.getByText(/^1\/\d+ con dấu$/)).toBeVisible();
    // Tab "Tiến độ học" (mặc định): chuyên đề đã học; tab "Con dấu": điểm từng bộ.
    await expect(page.getByText("Đã học ngày 30/9/2026")).toBeVisible();
    await page.getByRole("tab", { name: /^Con dấu/ }).click();
    await expect(page.getByText("Điểm cao nhất 9/10 · 2 lượt")).toBeVisible();
    await expect(page.getByText(/cao nhất hiện tại 5\/10/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Hộ chiếu lịch sử: 1 con dấu" })).toBeVisible();

    await page.getByRole("button", { name: "Xóa tiến độ trên máy này" }).click();
    await page.getByRole("button", { name: "Xóa hết" }).click();
    await expect(page.getByText("Hộ chiếu của em còn trống")).toBeVisible();
    await expect(page.getByRole("link", { name: "Hộ chiếu lịch sử", exact: true })).toBeVisible();
  });

  test("đọc tới cuối bài học thì được ghi là đã học", async ({ page }) => {
    await page.goto("/bai-hoc/chien-dich-dien-bien-phu");
    await page.locator("section[aria-labelledby=ghi-nho]").scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").lessons?.["chien-dich-dien-bien-phu"], KEY))
      .toBeTruthy();
  });
});

test.describe("Di tích gần em", () => {
  test("dùng vị trí: quanh Điện Biên Phủ có di tích, gần nhất trước", async ({ browser }) => {
    const context = await browser.newContext({ geolocation: { latitude: 21.39, longitude: 103.02 }, permissions: ["geolocation"] });
    const page = await context.newPage();
    await page.goto("/di-tich-gan-em");
    await page.getByRole("button", { name: "Dùng vị trí của em" }).click();
    const heading = page.getByRole("heading", { name: /Trong 50 km quanh vị trí của em có \d+ di tích/ });
    await expect(heading).toBeVisible();
    const distances = await page.locator("#ket-qua-gan-em ~ ul li span.absolute").allInnerTexts();
    const km = distances.map((text) => Number(text.replace(" km", "").replace(".", "").replace(",", ".")));
    expect(km.length).toBeGreaterThan(0);
    expect(km).toEqual([...km].sort((a, b) => a - b));
    expect(km.every((value) => value <= 50)).toBe(true);
    await context.close();
  });

  test("không cho định vị → báo lỗi, chọn tỉnh/thành vẫn dùng được", async ({ browser }) => {
    const context = await browser.newContext({ permissions: [] });
    const page = await context.newPage();
    await page.goto("/di-tich-gan-em");
    await page.getByRole("button", { name: "Dùng vị trí của em" }).click();
    const locateError = page.locator("section[aria-labelledby=chon-vi-tri] [role=alert]");
    await expect(locateError).toContainText("chọn tỉnh/thành");
    await page.getByLabel("Chọn tỉnh/thành").selectOption("Hà Nội");
    await expect(page.getByRole("heading", { name: /quanh Hà Nội/ })).toBeVisible();
    await expect(locateError).toHaveCount(0);
    // Bán kính nhỏ ở nơi chưa có di tích → vẫn gợi ý di tích gần nhất.
    await page.getByLabel("Chọn tỉnh/thành").selectOption("Cà Mau");
    await page.getByRole("button", { name: "25 km" }).click();
    await expect(page.getByRole("heading", { name: "Chưa có di tích nào trong 25 km quanh Cà Mau" })).toBeVisible();
    await expect(page.locator("#ket-qua-gan-em ~ ul > li")).not.toHaveCount(0);
    await context.close();
  });

  for (const width of [360, 1280]) {
    test(`hộ chiếu và di tích gần em không tràn ngang ở ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/ho-chieu");
      await page.getByRole("tab", { name: /^Con dấu/ }).click();
      await expect(page.getByRole("heading", { name: "Con dấu" })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.goto("/di-tich-gan-em");
      await page.getByLabel("Chọn tỉnh/thành").selectOption("Điện Biên");
      await expect(page.locator("#ket-qua-gan-em")).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});
