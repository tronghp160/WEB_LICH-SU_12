// Đặt lại mật khẩu chung cho các tài khoản thử @test.local (dùng làm TEST_PW khi chạy kiểm thử E2E / RLS).
// Chỉ đổi đúng 4 tài khoản dưới đây; mật khẩu mới đọc từ biến môi trường NEW_PW, không ghi ra tệp, không in ra màn hình.
//
// Cách chạy (PowerShell, ở thư mục gốc dự án):
//   $env:NEW_PW='<mật khẩu mới>'; node --env-file=.env.local scripts/dat-lai-mat-khau-thu.mjs

import { createClient } from "@supabase/supabase-js";

const TEST_EMAILS = ["admin@test.local", "editor@test.local", "reviewer@test.local", "locked@test.local"];

const password = process.env.NEW_PW ?? "";
// Cùng luật với staffPasswordSchema (lib/validation/staff.ts).
if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  console.error("NEW_PW phải dài 8–72 ký tự, gồm cả chữ và số.");
  process.exit(1);
}
const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"].filter(
  (key) => !process.env[key]?.trim(),
);
if (missing.length > 0) {
  console.error(`Thiếu biến môi trường: ${missing.join(", ")} (chạy kèm --env-file=.env.local)`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY.trim(), authOptions);

// Tìm id theo email (duyệt hết các trang danh sách người dùng).
const ids = new Map();
for (let page = 1; ; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(`Không đọc được danh sách người dùng: ${error.message}`);
    process.exit(1);
  }
  for (const user of data.users) {
    if (user.email && TEST_EMAILS.includes(user.email.toLowerCase())) ids.set(user.email.toLowerCase(), user.id);
  }
  if (data.users.length < 200) break;
}

let failed = 0;
for (const email of TEST_EMAILS) {
  const id = ids.get(email);
  if (!id) {
    console.log(`✗ ${email}: không tìm thấy tài khoản`);
    failed += 1;
    continue;
  }
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    console.log(`✗ ${email}: ${error.message}`);
    failed += 1;
    continue;
  }
  // Kiểm tra lại bằng đúng cách ứng dụng đăng nhập.
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim(), authOptions);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.log(`✗ ${email}: đã đổi nhưng đăng nhập thử lỗi: ${signInError.message}`);
    failed += 1;
  } else {
    console.log(`✓ ${email}: đã đổi mật khẩu, đăng nhập thử được`);
    await client.auth.signOut();
  }
}

process.exit(failed > 0 ? 1 : 0);
