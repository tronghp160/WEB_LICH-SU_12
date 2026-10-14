import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { ensureLearnerProfile } from "@/lib/auth/learner";
import { exchangeErrorReason, oauthErrorReason } from "@/lib/auth/oauth";
import { AUTH_ERROR, completeSignUpPath, safeNext } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Google → Supabase → /auth/callback?code=…&next=… (docs/ke-hoach-tai-khoan.md, mục 6.1). Đổi `code` lấy phiên bằng
// code_verifier trong cookie (PKCE, đặt lúc bấm nút ở signInWithGoogleAction). Không ghi code / email vào log.

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));

  // Người dùng bấm "Hủy" ở Google, hoặc Supabase từ chối (luồng hết hạn…).
  if (params.has("error") || params.has("error_code")) {
    redirect(`${AUTH_ERROR}?ly-do=${oauthErrorReason(params.get("error"), params.get("error_code"))}`);
  }

  const code = params.get("code");
  if (!code || code.length > 500) redirect(`${AUTH_ERROR}?ly-do=google-loi`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    // Mở lại link callback lần hai (đã đổi xong, cookie verifier bị xóa) mà vẫn đang đăng nhập → đi tiếp như thường.
    const { data: current } = await supabase.auth.getUser();
    if (current.user) redirect(next);
    redirect(`${AUTH_ERROR}?ly-do=${exchangeErrorReason(error)}`);
  }

  // Tài khoản đã có hồ sơ (kể cả tài khoản email được Supabase gộp danh tính Google cùng email) → đi tiếp.
  const profile = await ensureLearnerProfile(supabase, data.user);
  if (profile) redirect(next);

  // Nhân sự đăng nhập Google ở trang công khai (quyết định Q1): không bắt tạo hồ sơ học sinh.
  const { data: staff } = await supabase.from("staff_profiles").select("account_status").eq("id", data.user.id).maybeSingle();
  if (staff?.account_status === "active") redirect(next);

  // Lần đầu: đồng ý điều khoản, chọn tên hiển thị.
  redirect(completeSignUpPath(next));
}
