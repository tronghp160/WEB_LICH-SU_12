"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_COOKIE, SIGNUP_EMAIL_COOKIE, hasRecoveryMark, readSignUpEmail, shortCookie } from "@/lib/auth/cookies";
import { PASSWORD_SET_FLAG, loginMethods } from "@/lib/auth/identities";
import { ensureLearnerProfile } from "@/lib/auth/learner";
import { profileDefaults } from "@/lib/auth/oauth";
import { getAuthSettings, isGoogleAuthEnabled } from "@/lib/auth/providers";
import {
  ACCOUNT_HOME,
  ACCOUNT_ORDERS,
  ACCOUNT_SECURITY,
  AUTH_CALLBACK,
  LEARNER_LOGIN,
  RESET_PASSWORD,
  SIGNUP_CHECK_EMAIL,
  loginPath,
  safeNext,
} from "@/lib/auth/routes";
import { verifyCurrentPassword } from "@/lib/auth/verify-password";
import { normalizeLicenseCode } from "@/lib/payments/license";
import { consumeRateLimit } from "@/lib/payments/rate-limit";
import { TERMS_VERSION } from "@/lib/legal";
import { siteUrl } from "@/lib/site";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { translateLearnerAuthError } from "@/lib/utils/auth-errors";
import {
  changePasswordSchema,
  completeSignUpSchema,
  deleteAccountSchema,
  emailOnlySchema,
  learnerSignInSchema,
  newPasswordSchema,
  profileSchema,
  signUpSchema,
} from "@/lib/validation/account";

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

  // Tắt "Confirm email" mà email đã có tài khoản: không có email nào được gửi, đưa tới trang "kiểm tra email" là sai.
  // Báo thẳng (khi tắt xác nhận, Supabase vốn đã lộ việc email tồn tại qua chính lỗi này).
  if (error?.code === "user_already_exists" && (await getAuthSettings()).autoconfirm) {
    return { values, fieldErrors: { email: "Email này đã có tài khoản. Em đăng nhập, hoặc dùng “Quên mật khẩu” nếu không nhớ." } };
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

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password, data: { [PASSWORD_SET_FLAG]: true } });
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

export type GoogleSignInState = { error?: string };

/**
 * "Tiếp tục với Google" (mục 6.1): luồng PKCE phía server — @supabase/ssr lưu code_verifier vào cookie, Google → Supabase →
 * /auth/callback?code=…&next=…. `redirectTo` dựng từ siteUrl(), không từ header Host. Không xin scope ngoài
 * openid/email/profile; `prompt=select_account` để máy dùng chung (máy trường) luôn hỏi chọn tài khoản.
 */
export async function signInWithGoogleAction(_previous: GoogleSignInState, formData: FormData): Promise<GoogleSignInState> {
  const next = nextFrom(formData);
  if (!(await isGoogleAuthEnabled())) return { error: translateLearnerAuthError({ code: "provider_disabled" }) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}${AUTH_CALLBACK}?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return { error: translateLearnerAuthError(error ?? {}) };
  redirect(data.url);
}

export type CompleteSignUpState = {
  error?: string;
  fieldErrors?: { displayName?: string; agree?: string };
  displayName?: string;
};

/**
 * Người vào lần đầu bằng Google đồng ý điều khoản → tạo hồ sơ học sinh (RLS own_insert, phiên của chính họ). Ảnh đại
 * diện lấy từ Google; không lưu provider_token.
 */
export async function completeSignUpAction(_previous: CompleteSignUpState, formData: FormData): Promise<CompleteSignUpState> {
  const displayName = String(formData.get("displayName") ?? "").slice(0, 100);
  const parsed = completeSignUpSchema.safeParse({ displayName: formData.get("displayName"), agree: formData.get("agree") });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { displayName, fieldErrors: { displayName: firstError(errors, "displayName"), agree: firstError(errors, "agree") } };
  }

  const next = nextFrom(formData);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(loginPath(next));

  const { error } = await supabase.from("learner_profiles").insert({
    id: userData.user.id,
    display_name: parsed.data.displayName,
    avatar_url: profileDefaults(userData.user).avatarUrl,
    terms_version: TERMS_VERSION,
  });
  // 23505: đã có hồ sơ (bấm hai lần / hai thẻ) → coi như xong.
  if (error && error.code !== "23505") return { displayName, error: "Chưa lưu được hồ sơ. Em thử lại nhé." };
  redirect(next);
}

/**
 * Đăng xuất trên máy này rồi về trang chủ. Ô "máy dùng chung" (xóa tiến độ + mã kích hoạt trên máy) do hộp thoại xử lý
 * phía client trước khi gửi form — dữ liệu đó chỉ nằm trong localStorage (mục 6.5).
 */
export async function signOutLearnerAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ——— Trang tài khoản và Bảo mật (giai đoạn B4: docs/ke-hoach-tai-khoan.md, mục 4.4, 10, 11) ———

/** Người dùng đã xác minh của request; chưa đăng nhập thì về trang đăng nhập rồi quay lại `next`. */
async function verifiedUser(next: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(loginPath(next));
  return { supabase, user: data.user };
}

export type ProfileState = {
  status?: "saved";
  error?: string;
  fieldErrors?: { displayName?: string; school?: string };
  values?: { displayName: string; school: string };
};

/** Sửa tên hiển thị, trường (RLS own_update — chỉ dòng của chính mình). */
export async function updateProfileAction(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const values = {
    displayName: String(formData.get("displayName") ?? "").slice(0, 100),
    school: String(formData.get("school") ?? "").slice(0, 200),
  };
  const parsed = profileSchema.safeParse({ displayName: formData.get("displayName"), school: formData.get("school") ?? undefined });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { values, fieldErrors: { displayName: firstError(errors, "displayName"), school: firstError(errors, "school") } };
  }

  const { supabase, user } = await verifiedUser(ACCOUNT_HOME);
  const { data, error } = await supabase
    .from("learner_profiles")
    .update({ display_name: parsed.data.displayName, school: parsed.data.school })
    .eq("id", user.id)
    .select("id");
  if (error) return { values, error: "Chưa lưu được hồ sơ. Em thử lại nhé." };
  if (!data?.length) return { values, error: "Tài khoản này chưa có hồ sơ học sinh." };
  return { status: "saved", values: { displayName: parsed.data.displayName, school: parsed.data.school ?? "" } };
}

export type ChangePasswordState = {
  status?: "saved";
  message?: string;
  error?: string;
  fieldErrors?: { current?: string; password?: string; confirm?: string };
};

/**
 * Đổi mật khẩu (đã có mật khẩu: bắt nhập mật khẩu hiện tại) hoặc đặt mật khẩu lần đầu (tài khoản chỉ có Google). Xong
 * thì đăng xuất các máy khác (mục 10), giữ phiên trên máy này.
 */
export async function changePasswordAction(_previous: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current") ?? undefined,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        current: firstError(errors, "current"),
        password: firstError(errors, "password"),
        confirm: firstError(errors, "confirm"),
      },
    };
  }

  const { supabase, user } = await verifiedUser(ACCOUNT_SECURITY);
  const hadPassword = loginMethods(user).password;
  if (hadPassword) {
    if (!parsed.data.current) return { fieldErrors: { current: "Vui lòng nhập mật khẩu hiện tại." } };
    const failure = await verifyCurrentPassword(user.email ?? "", parsed.data.current);
    if (failure) {
      if (failure.code === "invalid_credentials") return { fieldErrors: { current: "Mật khẩu hiện tại không đúng." } };
      return { error: translateLearnerAuthError(failure) };
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password, data: { [PASSWORD_SET_FLAG]: true } });
  if (error) {
    if (error.code === "weak_password" || error.code === "same_password") {
      return { fieldErrors: { password: translateLearnerAuthError(error) } };
    }
    return { error: translateLearnerAuthError(error) };
  }
  await supabase.auth.signOut({ scope: "others" });
  return {
    status: "saved",
    message: hadPassword
      ? "Đã đổi mật khẩu. Các máy khác đã được đăng xuất."
      : "Đã đặt mật khẩu. Từ giờ em đăng nhập được bằng email và mật khẩu này.",
  };
}

export type IdentityState = { error?: string };

/**
 * Liên kết Google vào tài khoản đang đăng nhập (cần bật *Manual linking* trong Supabase, mục 9.2). Luồng PKCE giống
 * đăng nhập: Google → Supabase → /auth/callback?code=… → quay về trang Bảo mật.
 */
export async function linkGoogleAction(): Promise<IdentityState> {
  if (!(await isGoogleAuthEnabled())) return { error: translateLearnerAuthError({ code: "provider_disabled" }) };
  const { supabase } = await verifiedUser(ACCOUNT_SECURITY);
  const back = `${ACCOUNT_SECURITY}?thong-bao=lien-ket-google`;
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}${AUTH_CALLBACK}?next=${encodeURIComponent(back)}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) return { error: translateLearnerAuthError(error ?? {}) };
  redirect(data.url);
}

/** Gỡ Google — chỉ khi còn đăng nhập được bằng email + mật khẩu (Supabase cũng cấm gỡ danh tính cuối cùng). */
export async function unlinkGoogleAction(): Promise<IdentityState> {
  const { supabase, user } = await verifiedUser(ACCOUNT_SECURITY);
  if (!loginMethods(user).canUnlinkGoogle) return { error: translateLearnerAuthError({ code: "single_identity_not_deletable" }) };
  const google = user.identities?.find((identity) => identity.provider === "google");
  if (!google) return { error: translateLearnerAuthError({ code: "identity_not_found" }) };

  const { error } = await supabase.auth.unlinkIdentity(google);
  if (error) return { error: translateLearnerAuthError(error) };
  redirect(`${ACCOUNT_SECURITY}?thong-bao=go-google`);
}

/** Đăng xuất mọi thiết bị (thu hồi mọi phiên, kể cả máy này) — dùng khi quên đăng xuất ở máy trường. */
export async function signOutEverywhereAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect(`${LEARNER_LOGIN}?thong-bao=dang-xuat-moi-may`);
}

export type DeleteAccountState = { error?: string; fieldError?: string };

/**
 * Xóa tài khoản (mục 10, 11): gõ lại đúng email; KHÔNG cho xóa tài khoản đang có hồ sơ nhân sự (phải gỡ quyền trước).
 * Xóa bằng Admin API sau khi đã xác minh phiên — hồ sơ, tiến độ xóa theo (cascade), đơn hàng / mã kích hoạt giữ lại với
 * user_id = null nên mã vẫn dùng được bằng đường mã + thiết bị.
 */
export async function deleteAccountAction(_previous: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const parsed = deleteAccountSchema.safeParse({ confirmEmail: formData.get("confirmEmail") });
  if (!parsed.success) return { fieldError: firstError(parsed.error.flatten().fieldErrors, "confirmEmail") };

  const { supabase, user } = await verifiedUser(ACCOUNT_SECURITY);
  if (!user.email || parsed.data.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return { fieldError: "Email chưa khớp với email của tài khoản." };
  }
  if (!isAdminClientConfigured()) return { error: "Máy chủ chưa cấu hình để xóa tài khoản. Em thử lại sau nhé." };

  const admin = createAdminClient();
  const { data: staff, error: staffError } = await admin.from("staff_profiles").select("id").eq("id", user.id).maybeSingle();
  if (staffError) return { error: "Chưa xóa được tài khoản. Em thử lại nhé." };
  if (staff) {
    return { error: "Tài khoản này đang là tài khoản nhân sự. Nhờ quản trị viên gỡ quyền nhân sự trước khi xóa." };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Chưa xóa được tài khoản. Em thử lại nhé." };
  // Người dùng đã bị xóa → Supabase trả 401/403/404 và client tự xóa cookie phiên.
  await supabase.auth.signOut({ scope: "local" });
  redirect(`${LEARNER_LOGIN}?thong-bao=da-xoa-tai-khoan`);
}

// ——— Gói luyện thi theo tài khoản (giai đoạn B6: docs/ke-hoach-tai-khoan.md, mục 7.2) ———

const CLAIM_ERRORS: Record<string, string> = {
  invalid_code: "Mã không đúng. Em kiểm tra lại từng ký tự nhé.",
  revoked: "Mã này đã bị thu hồi. Liên hệ quản trị viên nếu em nghĩ đây là nhầm lẫn.",
  expired: "Mã này đã hết hạn sử dụng.",
  owned_by_other: "Mã này đã được thêm vào một tài khoản khác.",
};

export type ClaimLicenseState = { status?: "claimed" | "already"; message?: string; error?: string; code?: string };

/**
 * Thêm mã đã mua (lúc chưa đăng nhập) vào tài khoản → đăng nhập ở máy nào cũng mở được đề, không tốn lượt thiết bị.
 * Hàm SQL claim_license (chỉ service_role) từ chối mã của người khác / bị thu hồi / hết hạn. Giới hạn 10 lần / 15 phút.
 */
export async function claimLicenseAction(_previous: ClaimLicenseState, formData: FormData): Promise<ClaimLicenseState> {
  const raw = String(formData.get("code") ?? "").slice(0, 64);
  const code = normalizeLicenseCode(raw);
  if (!code) return { code: raw, error: CLAIM_ERRORS.invalid_code };

  const { user } = await verifiedUser(String(formData.get("next") ?? "") || ACCOUNT_ORDERS);
  // Không đếm được thì vẫn cho: mã 60 bit ngẫu nhiên nên dò mã không khả thi.
  if ((await consumeRateLimit("license_claim", `user:${user.id}`)) === "limited") {
    return { code: raw, error: "Em đã thử quá nhiều lần. Đợi khoảng 15 phút rồi thử lại nhé." };
  }
  if (!isAdminClientConfigured()) return { code: raw, error: "Chưa thêm được mã lúc này. Em thử lại sau nhé." };

  const { data, error } = await createAdminClient().rpc("claim_license", { p_code: code, p_user_id: user.id });
  const result = (data ?? {}) as { ok?: boolean; already?: boolean; reason?: string };
  if (error || typeof result.ok !== "boolean") return { code: raw, error: "Chưa thêm được mã lúc này. Em thử lại sau nhé." };
  if (!result.ok) return { code: raw, error: CLAIM_ERRORS[result.reason ?? ""] ?? CLAIM_ERRORS.invalid_code };
  return result.already
    ? { status: "already", message: "Mã này đã có trong tài khoản của em." }
    : { status: "claimed", message: "Đã thêm mã vào tài khoản. Đăng nhập ở máy nào cũng mở được đề, không cần nhập mã." };
}
