import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { RECOVERY_COOKIE, SIGNUP_EMAIL_COOKIE, shortCookie } from "@/lib/auth/cookies";
import { ensureLearnerProfile } from "@/lib/auth/learner";
import { ACCOUNT_HOME, AUTH_ERROR, RESET_PASSWORD, safeNext } from "@/lib/auth/routes";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

// Link trong email (mẫu ở supabase/email-templates/): /auth/confirm?token_hash=…&type=…&next=…
// Dùng token_hash + verifyOtp nên mở được trên trình duyệt KHÁC trình duyệt đã đăng ký (docs/ke-hoach-tai-khoan.md, 4.2).
// Phiên đăng nhập do @supabase/ssr ghi vào cookie qua lib/supabase/server.ts.

/** type trong link → type của verifyOtp ("signup" là tên cũ của "email"). */
const OTP_TYPES: Record<string, EmailOtpType> = {
  email: "email",
  signup: "email",
  recovery: "recovery",
  email_change: "email_change",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = OTP_TYPES[params.get("type") ?? ""];
  if (!tokenHash || !type || tokenHash.length > 200) redirect(`${AUTH_ERROR}?ly-do=khong-hop-le`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) {
    redirect(`${AUTH_ERROR}?ly-do=${error?.code === "otp_expired" ? "het-han" : "khong-hop-le"}`);
  }

  const cookieStore = await cookies();
  if (type === "recovery") {
    cookieStore.set(RECOVERY_COOKIE, data.user.id, shortCookie(15 * 60));
    redirect(RESET_PASSWORD);
  }

  await ensureLearnerProfile(supabase, data.user);
  cookieStore.delete(SIGNUP_EMAIL_COOKIE);
  // Supabase thay `{{ .RedirectTo }}` bằng Site URL khi đường dẫn không nằm trong danh sách cho phép → "/" thì về tài khoản.
  const target = safeNext(params.get("next"), ACCOUNT_HOME, siteUrl());
  const next = target === "/" ? ACCOUNT_HOME : target;
  redirect(next === ACCOUNT_HOME ? `${ACCOUNT_HOME}?thong-bao=${type === "email_change" ? "doi-email" : "xac-nhan"}` : next);
}
