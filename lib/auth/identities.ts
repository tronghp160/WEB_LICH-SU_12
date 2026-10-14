// Phương thức đăng nhập của một tài khoản (docs/ke-hoach-tai-khoan.md, mục 4.4 — /tai-khoan/bao-mat). Thuần, KHÔNG
// import server-only để unit test được.

type IdentityLike = { provider?: string | null; identity_id?: string | null; id?: string | null };
type UserLike = { identities?: IdentityLike[] | null; user_metadata?: Record<string, unknown> | null };

/** Cờ trong user_metadata: tài khoản (thường là Google) đã tự đặt mật khẩu qua trang Bảo mật / quên mật khẩu. */
export const PASSWORD_SET_FLAG = "password_set";

export type LoginMethods = {
  /** Đăng nhập được bằng email + mật khẩu. */
  password: boolean;
  /** Đã gắn Google. */
  google: boolean;
  /** Có danh tính email riêng (đăng ký bằng email) — chỉ khi đó mới gỡ được Google (Supabase cấm gỡ danh tính cuối cùng). */
  canUnlinkGoogle: boolean;
};

/**
 * Tài khoản đăng ký bằng email có danh tính `email`. Tài khoản Google tự đặt mật khẩu thì Supabase KHÔNG thêm danh tính
 * `email` (chỉ lưu mật khẩu), nên dựa thêm vào cờ `password_set` do chính trang này ghi. Cờ chỉ dùng để hiển thị và chọn
 * form "đổi" hay "đặt" mật khẩu — không phải ranh giới quyền.
 */
export function loginMethods(user: UserLike): LoginMethods {
  const providers = new Set((user.identities ?? []).map((identity) => identity.provider ?? ""));
  const hasEmailIdentity = providers.has("email");
  const google = providers.has("google");
  return {
    password: hasEmailIdentity || user.user_metadata?.[PASSWORD_SET_FLAG] === true,
    google,
    canUnlinkGoogle: google && hasEmailIdentity && providers.size >= 2,
  };
}
