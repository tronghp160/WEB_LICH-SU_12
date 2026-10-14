"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_COOKIE, SIGNUP_EMAIL_COOKIE, hasRecoveryMark, readSignUpEmail, shortCookie } from "@/lib/auth/cookies";
import { ensureLearnerProfile } from "@/lib/auth/learner";
import { ACCOUNT_HOME, RESET_PASSWORD, SIGNUP_CHECK_EMAIL, safeNext } from "@/lib/auth/routes";
import { TERMS_VERSION } from "@/lib/legal";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { translateLearnerAuthError } from "@/lib/utils/auth-errors";
import { emailOnlySchema, learnerSignInSchema, newPasswordSchema, signUpSchema } from "@/lib/validation/account";

// Đăng ký / đăng nhập / quên mật khẩu bằng email cho HỌC SINH (docs/ke-hoach-tai-khoan.md, giai đoạn B2).
// Nguyên tắc (mục 10): user id luôn lấy từ phiên đã xác minh; mọi `next` đi qua safeNext; đăng ký, gửi lại xác nhận,
// quên mật khẩu trả CÙNG một kết quả dù email đã có tài khoản hay chưa; không bao giờ trả mật khẩu về form.

const firstError = (errors: Record<string, string[] | undefined>, key: string) => errors[key]?.[0];
const nextFrom = (formData: FormData) => safeNext(formData.get("next"));
/** Link trong email đưa về đây sau khi xác nhận (mẫu email gửi `{{ .RedirectTo }}` làm `next`). */
const emailRedirect = (next: string) => `${siteUrl()}${next}`;

export type SignUpState = {
  error?: string;
  fieldErrors?: { displayName?: string; email?: string; password?: string; agree?: string };
  values?: { displayName: string; email: string };
};

export async function signUpAction(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  const values = {
    displayName: String(formData.get("displayName") ?? "").slice(0, 100),
    email: String(formData.get("email") ?? "").trim().slice(0, 254),
  };
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    agree: formData.get("agree"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      values,
      fieldErrors: {
        displayName: firstError(errors, "displayName"),
        email: firstError(errors, "email"),
        password: firstError(errors, "password"),
        agree: firstError(errors, "agree"),
      },
    };
  }

  const next = nextFrom(formData);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: emailRedirect(next),
      data: { display_name: parsed.data.displayName, terms_version: TERMS_VERSION },
    },
  });

  if (error && error.code !== "user_already_exists") {
    if (error.code === "weak_password") return { values, fieldErrors: { password: translateLearnerAuthError(error) } };
    return { values, error: translateLearnerAuthError(error) };
  }

  // Dự án tắt "Confirm email" → có phiên ngay: tạo hồ sơ rồi vào thẳng.
  if (data?.session && data.user) {
    await ensureLearnerProfile(supabase, data.user);
    redirect(next);
  }

  (await cookies()).set(SIGNUP_EMAIL_COOKIE, parsed.data.email, shortCookie(30 * 60));
  redirect(next === ACCOUNT_HOME ? SIGNUP_CHECK_EMAIL : `${SIGNUP_CHECK_EMAIL}?next=${encodeURIComponent(next)}`);
}

export type ResendState = { status: "idle" | "sent" | "error"; message?: string };

/** Gửi lại email xác nhận. Email lấy từ form (trang đăng nhập) hoặc cookie đăng ký. Luôn báo cùng một kết quả. */
export async function resendConfirmationAction(_previous: ResendState, formData: FormData): Promise<ResendState> {
  const raw = formData.get("email") ?? (await readSignUpEmail());
  const parsed = emailOnlySchema.safeParse({ email: raw });
  if (!parsed.success) return { status: "error", message: "Email không hợp lệ." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: emailRedirect(nextFrom(formData)) },
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.status === 429)) {
    return { status: "error", message: translateLearnerAuthError(error) };
  }
  return { status: "sent", message: "Nếu email này đang chờ xác nhận, em sẽ nhận được email mới trong vài phút." };
}

export type LearnerSignInState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  email?: string;
  /** Sai vì chưa xác nhận email → form hiện nút "Gửi lại email xác nhận". */
  needsConfirmation?: boolean;
};

export async function signInLearnerAction(_previous: LearnerSignInState, formData: FormData): Promise<LearnerSignInState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const parsed = learnerSignInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { email, fieldErrors: { email: firstError(errors, "email"), password: firstError(errors, "password") } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return {
      email,
      error: translateLearnerAuthError(error ?? {}),
      needsConfirmation: error?.code === "email_not_confirmed",
    };
  }

  await ensureLearnerProfile(supabase, data.user);
  redirect(nextFrom(formData));
}

export type ResetRequestState = { status: "idle" | "sent" | "error"; message?: string; fieldError?: string; email?: string };

/** Gửi link đặt lại mật khẩu. Luôn báo cùng một thông báo — không lộ email nào có tài khoản. */
export async function requestPasswordResetAction(_previous: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const parsed = emailOnlySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", email, fieldError: firstError(parsed.error.flatten().fieldErrors, "email") };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: emailRedirect(RESET_PASSWORD) });
  if (error && (error.code === "over_email_send_rate_limit" || error.status === 429)) {
    return { status: "error", email, message: translateLearnerAuthError(error) };
  }
  return { status: "sent", message: "Nếu email này có tài khoản, em sẽ nhận được link đặt lại mật khẩu trong vài phút. Nhớ xem cả thư mục Spam." };
}

export type NewPasswordState = { error?: string; fieldErrors?: { password?: string; confirm?: string } };

/** Đặt mật khẩu mới sau khi bấm link trong email; xong thì đăng xuất mọi máy khác. */
export async function updatePasswordAction(_previous: NewPasswordState, formData: FormData): Promise<NewPasswordState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { password: firstError(errors, "password"), confirm: firstError(errors, "confirm") } };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || !(await hasRecoveryMark(userData.user.id))) {
    return { error: "Link đặt lại mật khẩu đã hết hạn. Em yêu cầu link mới nhé." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password" || error.code === "same_password") {
      return { fieldErrors: { password: translateLearnerAuthError(error) } };
    }
    return { error: translateLearnerAuthError(error) };
  }
  await supabase.auth.signOut({ scope: "others" });
  (await cookies()).delete(RECOVERY_COOKIE);
  redirect(`${ACCOUNT_HOME}?thong-bao=doi-mat-khau`);
}

/** Đăng xuất trên máy này rồi về trang chủ. */
export async function signOutLearnerAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
