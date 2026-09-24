// Dịch lỗi đăng nhập của Supabase Auth sang thông báo tiếng Việt (Quy tắc 5).
// Chủ ý KHÔNG phân biệt "sai email" và "sai mật khẩu" để không lộ email nào có tài khoản.

type AuthErrorLike = {
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

export const BLOCKED_ACCOUNT_MESSAGE =
  "Tài khoản đã bị khóa hoặc chưa được cấp quyền truy cập khu vực nội bộ. Vui lòng liên hệ quản trị viên.";

export function translateAuthError(error: AuthErrorLike): string {
  const { code, status, name } = error;

  if (code === "invalid_credentials" || code === "user_not_found") {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (code === "email_not_confirmed") {
    return "Tài khoản chưa được xác nhận email. Vui lòng liên hệ quản trị viên.";
  }
  if (code === "user_banned") {
    return BLOCKED_ACCOUNT_MESSAGE;
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429) {
    return "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.";
  }
  // Mất mạng / máy chủ Auth không phản hồi (status 0 hoặc 5xx, hoặc lỗi fetch có thể thử lại).
  if (name === "AuthRetryableFetchError" || status === 0 || (status !== null && status !== undefined && status >= 500)) {
    return "Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.";
  }
  return "Không đăng nhập được. Vui lòng thử lại.";
}
