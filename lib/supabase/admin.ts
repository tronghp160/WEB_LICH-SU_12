import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Client Supabase dùng SECRET KEY (bỏ qua RLS) — CHỈ dùng phía server, và CHỈ sau khi đã kiểm tra người gọi là
 * quản trị viên đang hoạt động (requireRole(["system_admin"])). Hiện chỉ dùng để tạo/liệt kê tài khoản Auth
 * của nhân sự (UC13); mọi thao tác dữ liệu khác vẫn đi bằng phiên của người dùng để RLS áp dụng.
 *
 * Quy tắc (Mục 1, KE_HOACH_DU_AN.md): khóa này KHÔNG bao giờ được đặt trong biến `NEXT_PUBLIC_*`, đưa vào code
 * client hay commit lên Git. `import "server-only"` làm build lỗi nếu file này bị import từ Client Component.
 */
function readSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
}

/** Đã cấu hình khóa chưa — để giao diện báo rõ thay vì lỗi khó hiểu. */
export function isAdminClientConfigured(): boolean {
  return Boolean(readSecretKey());
}

/** Luôn tạo client mới trong mỗi lần gọi (không lưu vào biến toàn cục). */
export function createAdminClient() {
  const key = readSecretKey();
  if (!key) {
    throw new Error("Chưa cấu hình SUPABASE_SECRET_KEY trong biến môi trường của server.");
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
