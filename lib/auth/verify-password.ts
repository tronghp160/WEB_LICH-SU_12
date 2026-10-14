import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Kiểm mật khẩu hiện tại trước khi đổi (trang Bảo mật) mà KHÔNG đụng phiên trong cookie: đăng nhập bằng một client tạm
 * không lưu phiên (khóa publishable), rồi thu hồi ngay phiên tạm đó. Trả mã lỗi Supabase (vd. `invalid_credentials`,
 * `over_request_rate_limit`) hoặc null khi đúng.
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<{ code?: string; status?: number } | null> {
  const probe = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  if (error) return { code: error.code ?? undefined, status: error.status };
  await probe.auth.signOut({ scope: "local" });
  return null;
}
