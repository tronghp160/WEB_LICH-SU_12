// Phần thuần của đăng nhập Google (docs/ke-hoach-tai-khoan.md, mục 6.1) — tách riêng để unit test được, KHÔNG import
// server-only: dịch lỗi ở /auth/callback thành lý do cho trang /auth/loi, lấy tên / ảnh gợi ý từ hồ sơ Google.

/** Lý do hiển thị ở /auth/loi?ly-do=… cho các lỗi của luồng Google. */
export type OAuthFailure = "google-huy" | "google-het-han" | "google-loi" | "google-da-gan";

/**
 * Supabase chuyển về /auth/callback?error=…&error_code=…&error_description=… khi Google / Supabase từ chối. Người dùng bấm
 * "Hủy" ở màn hình Google → `access_denied`. Không đưa error_description lên giao diện (tiếng Anh, có thể dài).
 */
export function oauthErrorReason(error: string | null, errorCode: string | null): OAuthFailure {
  if (error === "access_denied" || errorCode === "access_denied") return "google-huy";
  // Liên kết Google ở /tai-khoan/bao-mat bằng một Gmail đã thuộc tài khoản khác.
  if (errorCode === "identity_already_exists") return "google-da-gan";
  if (errorCode === "flow_state_expired" || errorCode === "flow_state_not_found") return "google-het-han";
  return "google-loi";
}

type ExchangeErrorLike = { code?: string | null; name?: string | null };

/**
 * Lỗi khi đổi `code` lấy phiên. Thiếu code_verifier (mở link callback ở trình duyệt khác, hoặc dùng lại link lần hai sau
 * khi cookie đã bị xóa) và luồng hết hạn đều là "hết hạn — bấm lại"; còn lại là lỗi chung.
 */
export function exchangeErrorReason(error: ExchangeErrorLike | null | undefined): OAuthFailure {
  const code = error?.code ?? "";
  if (
    error?.name === "AuthPKCECodeVerifierMissingError" ||
    code === "pkce_code_verifier_not_found" ||
    code === "bad_code_verifier" ||
    code === "flow_state_not_found" ||
    code === "flow_state_expired" ||
    code === "bad_oauth_state"
  ) {
    return "google-het-han";
  }
  return "google-loi";
}

type UserLike = { email?: string | null; user_metadata?: Record<string, unknown> | null };

const cleanText = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : null;
};

/** Ảnh đại diện chỉ nhận URL https ≤ 500 ký tự (khớp CHECK của learner_profiles.avatar_url). */
const cleanAvatar = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

/**
 * Tên hiển thị + ảnh gợi ý cho người vào lần đầu bằng Google (trang /dang-ky/hoan-tat). Google gửi `full_name` / `name`
 * và `avatar_url` / `picture` trong user_metadata. Không có tên thì lấy phần trước @ của email.
 */
export function profileDefaults(user: UserLike): { displayName: string; avatarUrl: string | null } {
  const meta = user.user_metadata ?? {};
  const displayName =
    cleanText(meta.display_name, 60) ??
    cleanText(meta.full_name, 60) ??
    cleanText(meta.name, 60) ??
    cleanText((user.email ?? "").split("@")[0], 60) ??
    "Học sinh";
  return { displayName, avatarUrl: cleanAvatar(meta.avatar_url) ?? cleanAvatar(meta.picture) };
}
