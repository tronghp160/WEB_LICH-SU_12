import { deflateSync, crc32 } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { hasHorizontalOverflow } from "./support";

// Bản đồ 3D "như phim" (MapLibre + Three.js). WebGL chạy bằng SwiftShader nên chậm: test kiểm tra hành vi, không đo hiệu năng.
// Ô địa hình và ảnh vệ tinh được thay bằng ảnh tạo tại chỗ (địa hình phẳng 480 m, nền xanh) để test không phụ thuộc mạng.

test.use({
  launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] },
});

const PAGE = "/ban-do-3d/dien-bien-phu?debug=1";
const LESSON = "/bai-hoc/chien-dich-dien-bien-phu";

type MapFilmDebug = {
  goToScene: (index: number) => void;
  seek: (t: number) => void;
  play: () => Promise<void>;
  pause: () => void;
  scene: () => number;
  time: () => number;
  isFree: () => boolean;
  strongpoints: () => { id: string; status: string }[];
  stats: () => { zoom: number; pitch: number; pieces: number; quality: number };
  audioState: () => string;
};
declare global {
  interface Window {
    __mapfilm?: MapFilmDebug;
  }
}

/** PNG RGB đồng màu kích thước 256×256 (tự mã hóa, không cần thư viện). */
function solidPng(r: number, g: number, b: number): Buffer {
  const size = 256;
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) row.set([r, g, b], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// Terrarium: độ cao = R·256 + G + B/256 − 32768 → 480 m
const FLAT_DEM = solidPng(129, 224, 0);
const GREEN = solidPng(70, 96, 58);

async function offlineTiles(page: Page) {
  await page.route("https://s3.amazonaws.com/elevation-tiles-prod/**", (route) => route.fulfill({ body: FLAT_DEM, contentType: "image/png" }));
  await page.route("https://server.arcgisonline.com/**", (route) => route.fulfill({ body: GREEN, contentType: "image/png" }));
}

async function start(page: Page, url = PAGE) {
  await offlineTiles(page);
  await page.goto(url);
  await page.getByTestId("mapfilm-start").click();
  await expect(page.getByTestId("mapfilm-stage")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
  await page.waitForFunction(() => window.__mapfilm !== undefined);
}

test.describe("Bản đồ 3D Điện Biên Phủ", () => {
  test("bài học mặc định là bản đồ 2D, chưa tải MapLibre; bấm 3D thì bản đồ 3D tự chạy", async ({ page }) => {
    await offlineTiles(page);
    const scripts: string[] = [];
    page.on("request", (request) => scripts.push(request.url()));
    await page.goto(LESSON);
    await expect(page.getByTestId("map-mode-2d")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".leaflet-container").first()).toBeVisible({ timeout: 30_000 });
    expect(scripts.some((url) => url.includes("maplibre") || url.includes("elevation-tiles"))).toBe(false);

    await page.getByTestId("map-mode-3d").click();
    await expect(page.getByTestId("mapfilm-stage")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
    await expect(page.getByTestId("mapfilm-scene").first()).toHaveAttribute("aria-current", "step");
    await expect(page.getByRole("link", { name: /Mở trang riêng để trình chiếu/ })).toHaveAttribute("href", "/ban-do-3d/dien-bien-phu");
  });

  test("bấm giai đoạn: đổi cảnh, có phụ đề; tới lúc chiếm Him Lam thì cứ điểm đổi trạng thái", async ({ page }) => {
    await start(page);
    await page.evaluate(() => window.__mapfilm!.pause());
    await page.getByTestId("mapfilm-scene").nth(3).click();
    await expect(page.getByTestId("mapfilm-scene").nth(3)).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("mapfilm-stage")).toHaveAttribute("data-scene", "3");
    await page.evaluate(() => {
      window.__mapfilm!.pause();
      window.__mapfilm!.seek(4);
    });
    await expect(page.getByText("pháo binh ta bắn dồn dập", { exact: false }).first()).toBeVisible();
    const before = await page.evaluate(() => window.__mapfilm!.strongpoints().find((s) => s.id === "himLam")?.status);
    expect(before).not.toBe("captured");
    await page.evaluate(() => window.__mapfilm!.seek(16));
    await expect.poll(() => page.evaluate(() => window.__mapfilm!.strongpoints().find((s) => s.id === "himLam")?.status)).toBe("captured");
    await expect.poll(() => page.evaluate(() => window.__mapfilm!.stats().pieces)).toBeGreaterThan(5);
  });

  test("hết giai đoạn thì dừng chờ, nút Giai đoạn tiếp chuyển sang cảnh sau", async ({ page }) => {
    await start(page);
    await page.evaluate(() => {
      window.__mapfilm!.seek(35.2);
    });
    await expect(page.getByTestId("mapfilm-next")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("mapfilm-next").click();
    await expect.poll(() => page.evaluate(() => window.__mapfilm!.scene())).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__mapfilm!.time()), { timeout: 30_000 }).toBeGreaterThan(0.2);
  });

  test("kéo bản đồ → camera tự do; nút Về góc máy phim đưa camera phim trở lại; đổi nền vệ tinh/cổ điển", async ({ page }) => {
    await start(page);
    await page.evaluate(() => window.__mapfilm!.pause());
    const box = (await page.getByTestId("mapfilm-stage").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId("mapfilm-recenter")).toBeVisible();
    expect(await page.evaluate(() => window.__mapfilm!.isFree())).toBe(true);
    await page.getByTestId("mapfilm-recenter").click();
    await expect(page.getByTestId("mapfilm-recenter")).toBeHidden();

    const basemap = page.getByTestId("mapfilm-basemap");
    await expect(basemap).toHaveAccessibleName("Đổi sang nền bản đồ cổ điển");
    await basemap.click();
    await expect(basemap).toHaveAccessibleName("Đổi sang nền ảnh vệ tinh");
  });

  test("bàn phím: N sang giai đoạn sau, P về giai đoạn trước, phím cách tạm dừng/phát", async ({ page }) => {
    await start(page);
    await page.getByTestId("mapfilm-toggle").focus();
    await page.keyboard.press("n");
    await expect.poll(() => page.evaluate(() => window.__mapfilm!.scene())).toBe(1);
    await page.keyboard.press("p");
    await expect.poll(() => page.evaluate(() => window.__mapfilm!.scene())).toBe(0);
    await page.evaluate(() => window.__mapfilm!.pause());
    await expect(page.getByRole("button", { name: "Phát", exact: true })).toBeVisible();
  });

  test("giảm chuyển động: camera đứng ở góc máy cuối của cảnh, không bay", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await start(page);
    await page.evaluate(() => {
      window.__mapfilm!.pause();
      window.__mapfilm!.seek(3);
    });
    // cảnh 1 kết thúc ở mức phóng 6,1 (toàn cảnh Đông Dương)
    await expect.poll(() => page.evaluate(() => window.__mapfilm!.stats().zoom)).toBeCloseTo(6.1, 1);
  });

  test("thiết bị không có WebGL: báo rõ, trong bài học có nút về bản đồ 2D", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext as (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown;
      (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
        return original.call(this, type, ...rest);
      };
    });
    await page.goto(LESSON);
    await page.getByTestId("map-mode-3d").click();
    const stage = page.getByTestId("mapfilm-stage");
    await expect(stage.getByRole("alert")).toContainText("không hỗ trợ đồ họa 3D");
    await stage.getByRole("button", { name: "Về bản đồ 2D" }).click();
    await expect(page.getByTestId("map-mode-2d")).toHaveAttribute("aria-pressed", "true");
    await context.close();
  });

  test("lời thuyết minh dạng văn bản và ghi nguồn có sẵn; không tràn ngang ở 360/768/1280px", async ({ page }) => {
    await offlineTiles(page);
    await page.goto(PAGE);
    await page.getByText("Lời thuyết minh (văn bản)").click();
    await expect(page.getByText("Bộ đội kéo pháo bằng tay qua núi cao", { exact: false })).toBeVisible();
    await expect(page.getByText("Natural Earth", { exact: false }).first()).toBeVisible();
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await hasHorizontalOverflow(page), `tràn ngang ở ${width}px`).toBe(false);
    }
    await page.setViewportSize({ width: 360, height: 780 });
    await page.getByTestId("mapfilm-start").click();
    await expect(page.getByTestId("mapfilm-stage")).toHaveAttribute("data-phase", "ready", { timeout: 60_000 });
    expect(await hasHorizontalOverflow(page), "tràn ngang ở 360px khi đang chạy").toBe(false);
  });
});
