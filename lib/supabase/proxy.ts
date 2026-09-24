import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Làm mới phiên đăng nhập (refresh token) trên mỗi request.
 * Việc chặn truy cập /quan-tri/* theo vai trò được xử lý ở
 * app/quan-tri/layout.tsx (requireRole) từ Phase 9, không xử lý ở đây.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Với Fluid compute: không lưu client này vào biến toàn cục,
  // luôn tạo mới trong mỗi request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // KHÔNG chạy code nào giữa createServerClient và getClaims() —
  // dễ gây lỗi khó debug (người dùng bị đăng xuất ngẫu nhiên).
  // getClaims() xác minh chữ ký token ở mỗi lần gọi, an toàn hơn getSession().
  await supabase.auth.getClaims();

  // PHẢI trả về đúng đối tượng supabaseResponse (đã mang cookie mới),
  // nếu tạo response khác thì phải copy cookie sang, nếu không phiên
  // đăng nhập sẽ bị mất đồng bộ giữa trình duyệt và server.
  return supabaseResponse;
}
