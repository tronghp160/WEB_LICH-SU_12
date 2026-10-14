// Chụp ảnh các trang tài khoản học sinh (B7) vào docs/screenshots/tai-khoan-*.png. Cần bản production chạy ở :3200
// (node node_modules/next/dist/bin/next start -p 3200) và SUPABASE_SECRET_KEY trong .env.local. Chạy từ thư mục dự án:
//   node scripts/chup-anh-tai-khoan.mjs
// Tạo một tài khoản thử zz-kiem-thu-anh-*@test.local, có một con dấu trong tiến độ, rồi xóa ở cuối.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();

const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const BASE = "http://localhost:3200";
const OUT = path.join(root, "docs", "screenshots");
const email = `zz-kiem-thu-anh-${Date.now().toString(36)}@test.local`;
const password = "Lichsu2026Anh";

try {
  const { data, error } = await service.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: "Nguyễn Minh An", terms_version: "2026-10" },
  });
  if (error) throw error;
  const browser = await chromium.launch({ channel: "msedge" });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(`${BASE}/dang-nhap`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(OUT, "tai-khoan-dang-nhap.png") });

    await page.evaluate(() => {
      const time = "2026-10-14T08:00:00.000Z";
      localStorage.setItem("ls12:da-xem-huong-dan", "1");
      localStorage.setItem("ls12:tien-do", JSON.stringify({ v: 1, lessons: {}, sgk: {}, quizzes: { "tong-hop": { best: 9, total: 10, attempts: 1, passedAt: time, lastAt: time } } }));
    });
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL(/\/tai-khoan$/);
    await page.locator("#school").fill("THPT Chu Văn An");
    await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
    await page.locator("#ho-so-da-luu").waitFor();
    await page.goto(`${BASE}/tai-khoan`);
    await page.waitForLoadState("networkidle");
    await page.locator("#dong-bo-thong-bao").waitFor().catch(() => {});
    await page.getByRole("button", { name: /^Tài khoản:/ }).click();
    await page.screenshot({ path: path.join(OUT, "tai-khoan-ho-so-menu.png"), fullPage: true });
    await page.keyboard.press("Escape");

    await page.goto(`${BASE}/tai-khoan/bao-mat`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(OUT, "tai-khoan-bao-mat.png"), fullPage: true });

    await page.goto(`${BASE}/tai-khoan/don-hang`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(OUT, "tai-khoan-goi-don-hang.png"), fullPage: true });

    await page.goto(`${BASE}/ho-chieu`);
    await page.getByTestId("ho-chieu-dong-bo").waitFor();
    await page.getByTestId("ho-chieu-dong-bo").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "tai-khoan-ho-chieu-dong-bo.png") });

    await page.goto(`${BASE}/tai-khoan`);
    await page.locator("main").getByRole("button", { name: "Đăng xuất" }).click();
    await page.getByRole("dialog", { name: "Đăng xuất?" }).waitFor();
    await page.screenshot({ path: path.join(OUT, "tai-khoan-dang-xuat-may-chung.png") });

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", storageState: await context.storageState() });
    const phone = await mobile.newPage();
    await phone.goto(`${BASE}/tai-khoan/bao-mat`);
    await phone.waitForLoadState("networkidle");
    await phone.getByRole("button", { name: "Mở menu" }).click();
    await phone.evaluate(() => { const nav = document.getElementById("mobile-nav"); if (nav) nav.scrollTop = nav.scrollHeight; });
    await phone.waitForTimeout(300);
    await phone.screenshot({ path: path.join(OUT, "tai-khoan-dien-thoai-menu.png") });
    console.log("Đã chụp 7 ảnh.");
  } finally {
    await browser.close();
    await service.auth.admin.deleteUser(data.user.id);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
