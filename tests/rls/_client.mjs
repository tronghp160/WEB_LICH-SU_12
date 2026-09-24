// Kịch bản kiểm thử RLS chạy trên database THẬT bằng các tài khoản thử (Phase 9–12).
// Cách chạy:  TEST_PW='<mật khẩu chung của tài khoản @test.local>' node tests/rls/<tên>.mjs
// Mật khẩu KHÔNG nằm trong repo. Mọi dữ liệu thử có tiền tố "zz-kiem-thu"/"ZZ KIỂM THỬ" và được dọn ở cuối.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
export const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
export const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export function anon() { return createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function as(email) {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: process.env.TEST_PW });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}
