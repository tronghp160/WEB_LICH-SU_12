import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Mô hình 3D dựng bằng mã (Three.js) — nay chỉ còn ở trang riêng /mo-hinh-3d/[id]; bài học dùng "ảnh thật có chiều sâu" (photo3d.spec.ts). WebGL chạy bằng SwiftShader (phần mềm) nên chậm; test chỉ kiểm tra hành vi.

test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
});
test.setTimeout(240_000);

const LESSON = "/bai-hoc/chien-dich-dien-bien-phu";

type ModelDebug = { stats: () => { triangles: number; drawCalls: number }; runAction: (id: string) => void };
declare global {
  interface Window {
    __model3d?: ModelDebug;
  }
}

test.describe("Mô hình 3D (trang riêng)", () => {
  test("trang riêng của mô hình: nút Mô phỏng vụ nổ hoạt động, có chú thích và ghi chú minh họa", async ({ page }) => {
    await page.goto("/mo-hinh-3d/duong-ham-a1?debug=1");
    await expect(page.getByRole("heading", { name: "Đường hầm và hố bộc phá đồi A1", level: 1 })).toBeVisible();
    await page.getByTestId("model-start").click();
    const stage = page.getByTestId("model-stage");
    await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 90_000 });
    await page.waitForFunction(() => window.__model3d !== undefined);
    const before = await page.evaluate(() => window.__model3d!.stats().triangles);
    await page.getByTestId("model-action-boom").click();
    await expect.poll(() => page.evaluate(() => window.__model3d!.stats().triangles), { timeout: 30_000 }).not.toBe(before);
    await page.getByRole("button", { name: /Buồng khối bộc phá/ }).last().click();
    await expect(page.getByTestId("model-hotspot-text")).toContainText("gần một tấn");
    await expect(page.getByText("Mặt cắt minh họa, không theo tỉ lệ", { exact: false })).toBeVisible();
  });

  test("id mô hình lạ trả 404", async ({ page }) => {
    const response = await page.goto("/mo-hinh-3d/khong-co-mo-hinh-nay");
    expect(response?.status()).toBe(404);
  });

  test("thiết bị không có WebGL: báo rõ, phần mô tả và chú thích vẫn đọc được", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown;
      (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return original.call(this, type, ...rest);
      };
    });
    await page.goto("/mo-hinh-3d/luu-phao-105");
    await page.getByTestId("model-start").click();
    await expect(page.getByTestId("model-stage").getByRole("alert")).toContainText("không hỗ trợ đồ họa 3D");
    await page.getByRole("button", { name: /Bánh xe/ }).last().click();
    await expect(page.getByTestId("model-hotspot-text")).toContainText("bánh xe");
    await context.close();
  });

  test("bài học không tràn ngang ở 360/768/1280px", async ({ page }) => {
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(LESSON);
      expect(await hasHorizontalOverflow(page), `tràn ngang ở ${width}px`).toBe(false);
    }
  });
});
