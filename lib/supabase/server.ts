import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client dùng trong Server Component / Server Action / Route Handler.
 * Dùng anon/publishable key + phiên đăng nhập từ cookie (RLS vẫn áp dụng).
 *
 * Quan trọng (Fluid compute): không lưu client này vào biến toàn cục,
 * luôn tạo mới trong mỗi hàm.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll được gọi từ Server Component — có thể bỏ qua vì
            // proxy.ts đã lo việc làm mới phiên đăng nhập.
          }
        },
      },
    },
  );
}
