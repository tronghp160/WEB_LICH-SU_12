import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

// Next.js 16 đổi middleware.ts thành proxy.ts (chạy trên Node.js runtime).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Áp dụng cho mọi request, trừ:
     * - _next/static (file tĩnh)
     * - _next/image (ảnh tối ưu hoá)
     * - favicon.ico
     * - ảnh .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
