import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Trợ năng tự động (KE_HOACH_NANG_CAP_GIAO_DIEN.md, mục 10.2): axe-core trên các trang chính, giao diện sáng và tối.
// Không chấp nhận lỗi mức "serious" hoặc "critical". Bỏ qua phần nền bản đồ (ô ảnh OpenStreetMap do Leaflet vẽ).

const PAGES = ["/", "/muc-luc", "/muc-luc/chu-de-3", "/bai/7-khang-chien-chong-phap", "/bai-hoc/chien-dich-dien-bien-phu", "/trac-nghiem", "/ho-chieu", "/dong-thoi-gian", "/kham-pha", "/huong-dan"];

for (const theme of ["light", "dark"] as const) {
  test.describe(`Trợ năng (${theme === "light" ? "sáng" : "tối"})`, () => {
    test.use({ colorScheme: theme });

    for (const path of PAGES) {
      test(`${path} không có lỗi serious/critical`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page }).exclude(".leaflet-tile-pane").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        const blocking = results.violations
          .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
          .map((violation) => `${violation.id}: ${violation.help} — ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`);
        expect(blocking, blocking.join("\n")).toEqual([]);
      });
    }
  });
}
