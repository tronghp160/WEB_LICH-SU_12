import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_LOGIN, isProtectedAdminPath } from "@/lib/admin/routes";

/**
 * Làm mới phiên đăng nhập (refresh token) trên mỗi request.
 * Chặn sớm /quan-tri/* khi chưa đăng nhập (kiểm tra lạc quan); việc kiểm tra
 * vai trò/khóa tài khoản nằm ở requireRole() trong từng trang (lib/auth.ts).
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
  const { data } = await supabase.auth.getClaims();

  // Kiểm tra "lạc quan" (optimistic): chưa có phiên hợp lệ thì chặn sớm khu vực nội bộ
  // (trừ trang đăng nhập). Proxy chỉ biết ĐÃ đăng nhập hay chưa — vai trò, trạng thái
  // khóa và quyền thật được kiểm ở requireRole() (lib/auth.ts) và RLS ở database.
  if (!data?.claims && isProtectedAdminPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = ADMIN_LOGIN;
    loginUrl.search = "";
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Mang theo cookie vừa làm mới (nếu có) để không làm lệch phiên trình duyệt/server.
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  // PHẢI trả về đúng đối tượng supabaseResponse (đã mang cookie mới),
  // nếu tạo response khác thì phải copy cookie sang, nếu không phiên
  // đăng nhập sẽ bị mất đồng bộ giữa trình duyệt và server.
  return supabaseResponse;
}
