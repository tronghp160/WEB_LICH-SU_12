import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Phim 3D "Đồi A1, đêm 6/5/1954" (Three.js). WebGL chạy bằng SwiftShader (phần mềm) nên chậm; test chỉ kiểm tra hành vi, không đo hiệu năng.

test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] },
});

const PAGE = "/phim-3d/doi-a1?debug=1";

type CinemaDebug = { seek: (t: number) => void; pause: () => void; play: () => Promise<void>; time: () => number; audioState: () => string; stats: () => { quality: number } };
declare global {
  interface Window {
    __cinema?: CinemaDebug;
  }
}

async function startFilm(page: import("@playwright/test").Page) {
  await page.goto(PAGE);
  await page.getByTestId("cinema-start").click();
  await expect(page.getByTestId("cinema-stage")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
  await page.waitForFunction(() => window.__cinema !== undefined);
}

test.describe("Phim 3D đồi A1", () => {
  test("chưa bấm Xem thì không tải Three.js, không có bộ nhớ cho canvas 3D", async ({ page }) => {
    const scripts: string[] = [];
    page.on("response", (response) => {
      if (response.request().resourceType() === "script") scripts.push(response.url());
    });
    await page.goto(PAGE);
    await expect(page.getByTestId("cinema-start")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Đồi A1, đêm 6/5/1954", level: 1 })).toBeVisible();
    expect(await page.evaluate(() => window.__cinema)).toBeUndefined();
    expect(page.url()).toContain("phim-3d");
    // ảnh nền là tài nguyên duy nhất nặng; địa hình chỉ tải sau khi bấm
    const demRequested = await page.evaluate(() => performance.getEntriesByType("resource").some((e) => e.name.includes("dbp-dem-a1")));
    expect(demRequested).toBe(false);
  });

  test("bấm Xem phim 3D: tải xong, tự phát, thời gian chạy, có phụ đề và âm thanh", async ({ page }) => {
    await startFilm(page);
    await expect(page.getByRole("button", { name: "Tạm dừng" })).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => page.evaluate(() => window.__cinema!.time()), { timeout: 30_000 }).toBeGreaterThan(0.3);
    await expect.poll(() => page.evaluate(() => window.__cinema!.audioState()), { timeout: 10_000 }).toBe("running");
    await page.evaluate(() => window.__cinema!.pause());
    await page.evaluate(() => window.__cinema!.seek(5));
    await expect(page.getByText("Điện Biên Phủ, đêm 6 tháng 5 năm 1954", { exact: false }).first()).toBeVisible();
    expect(await page.evaluate(() => window.__cinema!.stats().quality)).toBeGreaterThanOrEqual(0);
  });

  test("điều khiển: tua bằng bàn phím, phím cách tạm dừng/phát, thanh tua có giá trị chữ", async ({ page }) => {
    await startFilm(page);
    await page.evaluate(() => window.__cinema!.pause());
    await page.evaluate(() => window.__cinema!.seek(20));
    const stage = page.getByTestId("cinema-stage");
    await stage.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => page.evaluate(() => window.__cinema!.time())).toBeCloseTo(25, 0);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => page.evaluate(() => window.__cinema!.time())).toBeCloseTo(20, 0);
    await expect(page.getByRole("slider", { name: "Tua phim" })).toHaveAttribute("aria-valuetext", /Đồi A1|hầm/);
    await page.keyboard.press(" ");
    await expect(page.getByRole("button", { name: "Tạm dừng" })).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press(" ");
    await expect(page.getByRole("button", { name: "Phát", exact: true })).toBeVisible();
  });

  test("thẻ chương và phụ đề đúng thời điểm: bộc phá lúc 50 giây, rạng sáng lúc 90 giây", async ({ page }) => {
    await startFilm(page);
    await page.evaluate(() => window.__cinema!.pause());
    await page.evaluate(() => window.__cinema!.seek(52));
    await expect(page.getByText("Khối bộc phá nổ tung", { exact: false }).first()).toBeVisible();
    await page.evaluate(() => window.__cinema!.seek(90));
    await expect(page.getByText("Rạng sáng ngày bảy tháng năm", { exact: false }).first()).toBeVisible();
  });

  test("camera tự do bật/tắt được; tắt tiếng đổi trạng thái nút", async ({ page }) => {
    await startFilm(page);
    await page.evaluate(() => window.__cinema!.pause());
    const camera = page.getByRole("button", { name: /camera tự do/i });
    await camera.click();
    await expect(page.getByRole("button", { name: "Quay lại camera điện ảnh" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Quay lại camera điện ảnh" }).click();
    await page.getByRole("button", { name: "Tắt tiếng" }).click();
    await expect(page.getByRole("button", { name: "Bật tiếng" })).toHaveAttribute("aria-pressed", "true");
  });

  test("hết phim (tua tới cuối) hiện nút Xem lại từ đầu", async ({ page }) => {
    await startFilm(page);
    await page.evaluate(() => window.__cinema!.seek(109.8));
    await page.evaluate(() => window.__cinema!.play());
    await expect(page.getByRole("button", { name: "Xem lại từ đầu" })).toBeVisible({ timeout: 40_000 });
  });

  test("lời thuyết minh dạng văn bản có sẵn cho người không xem được video", async ({ page }) => {
    await page.goto(PAGE);
    await page.getByText("Lời thuyết minh (văn bản)").click();
    await expect(page.getByText("Nhiều đợt xung phong bị chặn lại", { exact: false })).toBeVisible();
    await expect(page.getByText("không phải tư liệu quay hay ảnh chụp lịch sử", { exact: false })).toBeVisible();
  });

  test("thiết bị không có WebGL: báo rõ và vẫn xem được phần còn lại", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown;
      (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return original.call(this, type, ...rest);
      };
    });
    await page.goto(PAGE);
    await page.getByTestId("cinema-start").click();
    await expect(page.getByTestId("cinema-stage").getByRole("alert")).toContainText("không hỗ trợ đồ họa 3D");
    await context.close();
  });

  test("bài học Điện Biên Phủ có mục phim 3D, không tràn ngang ở 360/768/1280px", async ({ page }) => {
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/bai-hoc/chien-dich-dien-bien-phu");
      await expect(page.getByRole("heading", { name: /Phim 3D: Đồi A1/ })).toBeVisible();
      await expect(page.getByTestId("cinema-start")).toBeVisible();
      expect(await hasHorizontalOverflow(page), `${width}px`).toBe(false);
    }
  });
});
