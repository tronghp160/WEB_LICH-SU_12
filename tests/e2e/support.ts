import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/** Mật khẩu chung của các tài khoản thử @test.local — truyền qua biến môi trường, KHÔNG nằm trong repo. */
export const TEST_PW = process.env.TEST_PW;

/** Tiền tố dữ liệu thử của bộ E2E (để dọn chính xác, không đụng dữ liệu thật). */
export const E2E_PREFIX = "zz-kiem-thu-e2e";
export const E2E_TITLE = "ZZ KIỂM THỬ E2E";

function readEnv(): Record<string, string> {
  const file = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of file.split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index > 0 && !line.startsWith("#")) env[line.slice(0, index)] = line.slice(index + 1);
  }
  return env;
}

/** Client Supabase đăng nhập bằng tài khoản thử (dùng để chuẩn bị/dọn dữ liệu bằng API, RLS vẫn áp dụng). */
export async function asUser(email: string): Promise<SupabaseClient> {
  const env = readEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PW ?? "" });
  if (error) throw new Error(`Không đăng nhập được ${email}: ${error.message}`);
  return client;
}

/** Đăng nhập nhân sự qua giao diện. */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/quan-tri/dang-nhap");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(TEST_PW ?? "");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(/\/quan-tri$/);
}

/** Dọn dữ liệu của bộ E2E (bằng quyền admin). */
export async function cleanupE2eData(admin: SupabaseClient): Promise<void> {
  await admin.from("historical_events").delete().like("slug", `${E2E_PREFIX}-%`);
  await admin.from("sources").delete().like("title", `${E2E_TITLE}%`);
}

/** Không có tràn ngang ngoài ý muốn (yêu cầu responsive 0.4). */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}
