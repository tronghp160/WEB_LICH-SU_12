import { expect, test } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// "Ảnh thật có chiều sâu" trong bài học Điện Biên Phủ (thay cho mô hình 3D dựng bằng mã, 30/9/2026).
// WebGL chạy bằng SwiftShader (phần mềm) nên chậm; test chỉ kiểm tra hành vi.

test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
});
test.setTimeout(180_000);

const LESSON = "/bai-hoc/chien-dich-dien-bien-phu";

test.describe("Ảnh thật 3D trong bài học Điện Biên Phủ", () => {
  test("ba mục có ảnh 3D; ban đầu là ảnh tĩnh, chưa dựng WebGL; không còn mô hình dựng bằng mã", async ({ page }) => {
    await page.goto(LESSON);
    await expect(page.getByTestId("model-stage")).toHaveCount(0);
    // Mục đầu của cả ba thư viện là mô hình 360°: chỉ ảnh xem trước, chưa tải trình xem Sketchfab.
    for (const section of ["ket-qua", "hien-vat", "ngay-nay"]) {
      const stage = page.locator(`section[aria-labelledby="${section}"]`).getByTestId("scan-stage");
      await expect(stage.getByTestId("scan-start")).toBeVisible();
      await expect(stage.getByTestId("scan-iframe")).toHaveCount(0);
    }
    const artifacts = page.locator('section[aria-labelledby="hien-vat"]');
    await expect(artifacts.getByTestId("photo3d-tab")).toHaveCount(8);
    await expect(artifacts.getByTestId("photo3d-tab").filter({ hasText: "360°" })).toHaveCount(3);
    await expect(page.locator('section[aria-labelledby="ngay-nay"]').getByTestId("photo3d-tab")).toHaveCount(6);
    // Lựu pháo có cả hai cách xem; chuyển sang ảnh thật thì thấy ảnh tĩnh và điểm chú thích đọc được ngay cả khi chưa bật 3D.
    await artifacts.getByTestId("exhibit-mode-photo").click();
    await expect(artifacts.getByTestId("photo3d-stage")).toHaveAttribute("data-phase", "idle");
    await artifacts.getByRole("list", { name: /Các chi tiết/ }).getByRole("button", { name: /Nòng pháo/ }).click();
    await expect(artifacts.getByTestId("photo3d-text")).toContainText("105 mm");
  });

  test("mô hình 360°: bấm Xoay 360° mới chèn trình xem Sketchfab đúng mô hình, có ghi công tác giả", async ({ page }) => {
    await page.goto(LESSON);
    const artifacts = page.locator('section[aria-labelledby="hien-vat"]');
    await artifacts.getByRole("tab", { name: /Mũ nan của Anh hùng Trần Can/ }).click();
    await expect(artifacts.getByText(/tải khoảng 24 MB/)).toBeVisible();
    await artifacts.getByTestId("scan-start").click();
    await expect(artifacts.getByTestId("scan-iframe")).toHaveAttribute("src", /sketchfab\.com\/models\/2e78e5054efb4b0e83914848226c529a\/embed\?.*dnt=1/);
    await expect(artifacts.getByRole("link", { name: "SEAP VR" })).toHaveAttribute("href", "https://sketchfab.com/seapvisualization");
    // Đổi sang mô hình khác không tự tải (tránh tải hàng chục MB ngoài ý muốn).
    await artifacts.getByRole("tab", { name: /Dép cao su/ }).click();
    await expect(artifacts.getByTestId("scan-iframe")).toHaveCount(0);
    await expect(artifacts.getByTestId("scan-start")).toBeVisible();
  });

  test("bấm Xem ảnh 3D: dựng WebGL, rê chuột để nghiêng, đổi thẻ thì ảnh mới tự dựng", async ({ page }) => {
    await page.goto(LESSON);
    const artifacts = page.locator('section[aria-labelledby="hien-vat"]');
    await artifacts.getByRole("tab", { name: "Pháo cao xạ 37 mm" }).click();
    const stage = artifacts.getByTestId("photo3d-stage");
    await stage.scrollIntoViewIfNeeded();
    await artifacts.getByTestId("photo3d-start").click();
    await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
    await expect(artifacts.getByTestId("photo3d-canvas")).toBeVisible();

    const marker = artifacts.getByTestId("photo3d-hotspot").first();
    const box = (await stage.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.05, box.y + box.height / 2);
    await page.waitForTimeout(1200);
    const left = await marker.boundingBox();
    await page.mouse.move(box.x + box.width * 0.95, box.y + box.height / 2);
    await page.waitForTimeout(1200);
    const right = await marker.boundingBox();
    // Điểm chú thích đi theo lớp sâu của nó khi ảnh nghiêng.
    expect(Math.abs(right!.x - left!.x)).toBeGreaterThan(2);

    await artifacts.getByRole("tab", { name: "Xe đạp thồ" }).click();
    await expect(artifacts.getByTestId("photo3d-stage")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
    await expect(artifacts.getByTestId("photo3d-hotspot")).toHaveCount(4);
    await page.keyboard.press("Escape");
    await artifacts.getByRole("button", { name: "Phóng to" }).click();
    await expect(artifacts.getByText(/phóng 1\.5×/)).toBeVisible();
    await artifacts.getByRole("button", { name: "Về góc nhìn ban đầu" }).click();
    await expect(artifacts.getByText(/phóng 1\.5×/)).toHaveCount(0);
  });

  test("thẻ chọn đổi bằng phím mũi tên", async ({ page }) => {
    await page.goto(LESSON);
    const artifacts = page.locator('section[aria-labelledby="hien-vat"]');
    await artifacts.getByRole("tab", { name: /Lựu pháo 105 mm/ }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(artifacts.getByRole("tab", { name: /Mũ nan/ })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(artifacts.getByRole("tab", { name: /Lựu pháo 105 mm/ })).toHaveAttribute("aria-selected", "true");
  });

  test("không có WebGL: báo rõ, ảnh thật và chú thích vẫn dùng được", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown;
      (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type.includes("webgl")) return null;
        return original.call(this, type, ...rest);
      };
    });
    await page.goto(LESSON);
    const artifacts = page.locator('section[aria-labelledby="hien-vat"]');
    await artifacts.getByRole("tab", { name: "Pháo cao xạ 37 mm" }).click();
    await artifacts.getByTestId("photo3d-start").click();
    await expect(artifacts.getByRole("alert")).toContainText("không hiển thị được ảnh 3D");
    await expect(artifacts.getByTestId("photo3d-stage").locator("img")).toBeVisible();
    await context.close();
  });

  for (const width of [360, 1280]) {
    test(`không tràn ngang ở ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(LESSON);
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});
