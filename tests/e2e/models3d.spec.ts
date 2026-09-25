import { expect, test, type Page } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Mô hình 3D trong bài học (Three.js dựng bằng mã). WebGL chạy bằng SwiftShader (phần mềm) nên chậm; test chỉ kiểm tra hành vi.

test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
});
test.setTimeout(240_000);

const LESSON = "/bai-hoc/chien-dich-dien-bien-phu";
const SECTIONS = ["ket-qua", "nhan-vat", "hien-vat", "ngay-nay"] as const;

type ModelDebug = { stats: () => { triangles: number; drawCalls: number }; runAction: (id: string) => void };
declare global {
  interface Window {
    __model3d?: ModelDebug;
  }
}

const stageIn = (page: Page, section: string) => page.locator(`section[aria-labelledby="${section}"]`).getByTestId("model-stage").first();

async function startIn(page: Page, section: string) {
  const stage = stageIn(page, section);
  await stage.scrollIntoViewIfNeeded();
  await stage.getByTestId("model-start").click();
  await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 90_000 });
  return stage;
}

test.describe("Mô hình 3D trong bài học Điện Biên Phủ", () => {
  test("cả bốn mục đều có khung 3D, chưa tải gì cho tới khi bấm Xem", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));
    await page.goto(LESSON);
    for (const section of SECTIONS) {
      const stage = stageIn(page, section);
      await expect(stage).toHaveAttribute("data-phase", "idle");
      await expect(stage.getByTestId("model-start")).toBeVisible();
    }
    expect(requested.some((url) => url.includes("dbp-valley-dem")), "địa hình sa bàn chỉ tải khi bấm").toBe(false);
    expect(await page.evaluate(() => document.querySelectorAll('[data-testid="model-stage"][data-phase="ready"]').length)).toBe(0);
    await expect(page.getByRole("heading", { name: "Nhìn tận mắt những gì làm nên chiến thắng" })).toBeVisible();
    await expect(page.getByText("Tượng bán thân 3D (cách điệu)")).toBeVisible();
    await expect(page.getByText("Dựng lại di tích bằng 3D")).toBeVisible();
    await expect(page.getByText("Xem những con số trên sa bàn 3D")).toBeVisible();
  });

  test("hiện vật: bấm Xem, mô hình chạy, chú thích đọc được, đổi mô hình tự chạy tiếp", async ({ page }) => {
    await page.goto(LESSON);
    const stage = await startIn(page, "hien-vat");
    await expect(stage).toHaveAttribute("data-model", "luu-phao-105");
    expect(await stage.getByTestId("model-hotspot").count()).toBe(5);
    const section = page.locator('section[aria-labelledby="hien-vat"]');
    await section.getByRole("button", { name: /Nòng pháo/ }).last().click();
    await expect(section.getByTestId("model-hotspot-text")).toContainText("105 mm");
    await expect(section.getByRole("button", { name: /Nòng pháo/ }).last()).toHaveAttribute("aria-pressed", "true");
    // đổi sang xe đạp thồ: tự dựng ngay vì người xem đã chọn xem
    await section.getByRole("tab", { name: "Xe đạp thồ" }).click();
    await expect(stageIn(page, "hien-vat")).toHaveAttribute("data-model", "xe-dap-tho");
    await expect(stageIn(page, "hien-vat")).toHaveAttribute("data-phase", "ready", { timeout: 90_000 });
    const stats = await page.evaluate(() => (window as unknown as { __model3d?: unknown }).__model3d);
    expect(stats).toBeUndefined(); // chế độ gỡ lỗi chỉ bật khi có ?debug=1
  });

  test("bàn phím: mũi tên đổi thẻ trong danh sách mô hình", async ({ page }) => {
    await page.goto(LESSON);
    const section = page.locator('section[aria-labelledby="hien-vat"]');
    await section.getByRole("tab", { name: "Lựu pháo 105 mm" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(section.getByRole("tab", { name: "Xe đạp thồ" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(section.getByRole("tab", { name: "Lựu pháo 105 mm" })).toHaveAttribute("aria-selected", "true");
  });

  test("mở quá 3 khung cùng lúc thì khung cũ nhất về trạng thái chờ (giữ số ngữ cảnh WebGL)", async ({ page }) => {
    await page.goto(LESSON);
    for (const section of SECTIONS) await startIn(page, section);
    await expect(stageIn(page, "ket-qua")).toHaveAttribute("data-phase", "idle", { timeout: 20_000 });
    for (const section of SECTIONS.slice(1)) await expect(stageIn(page, section)).toHaveAttribute("data-phase", "ready");
  });

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

  test("không tràn ngang ở 360/768/1280px", async ({ page }) => {
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(LESSON);
      expect(await hasHorizontalOverflow(page), `tràn ngang ở ${width}px`).toBe(false);
    }
    await page.setViewportSize({ width: 360, height: 780 });
    const stage = await startIn(page, "nhan-vat");
    expect(await hasHorizontalOverflow(page), "tràn ngang khi đang xem 3D ở 360px").toBe(false);
    const box = await stage.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(360);
  });
});
