import { defineConfig } from "@playwright/test";

// Kiểm thử E2E (Phase 13, mục 8.4). Chạy: `npm run build` rồi `npm run test:e2e`.
// Mặc định dùng Microsoft Edge đã cài sẵn (không cần tải trình duyệt của Playwright); đổi bằng E2E_CHANNEL=chrome hoặc
// bỏ channel để dùng Chromium của Playwright (`npx playwright install chromium`).
// Bộ staff.spec.ts cần TEST_PW (mật khẩu chung của tài khoản @test.local) và tự bỏ qua nếu thiếu.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
  use: {
    baseURL,
    channel: process.env.E2E_CHANNEL ?? "msedge",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Không có E2E_BASE_URL → tự khởi động bản production đã build (npm run build) ở cổng 3100; đang chạy sẵn thì dùng lại.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx next start -p 3100", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
