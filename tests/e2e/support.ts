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
export async function asUser(email: string, password: string | undefined = TEST_PW): Promise<SupabaseClient> {
  const env = readEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: password ?? "" });
  if (error) throw new Error(`Không đăng nhập được ${email}: ${error.message}`);
  return client;
}

/** Đã cấu hình khóa bí mật (cần cho việc dọn tài khoản Auth do bộ kiểm thử tạo ra). KHÔNG bao giờ in giá trị khóa. */
export function hasSecretKey(): boolean {
  return Boolean(readEnv().SUPABASE_SECRET_KEY);
}

/** Client dùng khóa bí mật (bỏ qua RLS) — CHỈ để dọn dữ liệu của bộ kiểm thử; chạy trong Node, không bao giờ vào bundle. */
export function adminApi(): SupabaseClient {
  const env = readEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Xóa tài khoản Auth theo email (hồ sơ `staff_profiles` xóa theo nhờ ON DELETE CASCADE). */
export async function deleteAuthUserByEmail(email: string): Promise<void> {
  const api = adminApi();
  const { data } = await api.auth.admin.listUsers({ perPage: 1000 });
  for (const user of data?.users ?? []) {
    if (user.email === email) await api.auth.admin.deleteUser(user.id);
  }
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

/** Tên tab của mục "Tư liệu" trong chuyên đề tương tác (components/lesson/LessonView → buildResourceTabs). */
const RESOURCE_TABS = { video: /^Phim tư liệu/, "hien-vat": /^Hiện vật/, "sa-ban": /^Sa bàn 3D/, "ngay-nay": /^Di tích ngày nay/ } as const;

/** Mở một tab của mục "Tư liệu" (chỉ tab đang mở mới được dựng) và trả về vùng nội dung của tab đó. */
export async function openResource(page: Page, id: keyof typeof RESOURCE_TABS) {
  const tab = page.getByRole("tablist", { name: "Loại tư liệu" }).getByRole("tab", { name: RESOURCE_TABS[id] });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  return page.locator(`[data-resource="${id}"]`);
}
