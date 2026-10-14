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

/**
 * Lỗi Supabase Auth ở các trang tài khoản HỌC SINH (docs/ke-hoach-tai-khoan.md, mục 6.4) — xưng "em", không nhắc tới
 * quản trị viên. `user_already_exists` không bao giờ hiện ra (đăng ký đi luồng "kiểm tra email" chung để không lộ email).
 */
export function translateLearnerAuthError(error: AuthErrorLike): string {
  const { code, status, name } = error;

  switch (code) {
    case "invalid_credentials":
    case "user_not_found":
      return "Email hoặc mật khẩu không đúng.";
    case "email_not_confirmed":
      return "Em chưa xác nhận email. Mở email xác nhận, hoặc bấm “Gửi lại email xác nhận” bên dưới.";
    case "weak_password":
      return "Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự gồm chữ và số.";
    case "same_password":
      return "Mật khẩu mới phải khác mật khẩu cũ.";
    case "otp_expired":
      return "Link đã hết hạn hoặc đã được dùng. Em yêu cầu link mới nhé.";
    case "over_email_send_rate_limit":
      return "Em vừa yêu cầu email. Đợi một phút rồi thử lại nhé.";
    case "provider_disabled":
      return "Cách đăng nhập này đang tạm tắt. Em dùng email nhé.";
    case "identity_already_exists":
      return "Tài khoản Google này đã gắn với một tài khoản khác.";
    case "signup_disabled":
      return "Hệ thống đang tạm dừng đăng ký tài khoản mới.";
    case "user_banned":
      return "Tài khoản đang bị tạm khóa.";
    case "email_address_invalid":
      return "Email không hợp lệ.";
    case "email_address_not_authorized":
      // SMTP mặc định của Supabase chỉ gửi tới email trong nhóm dự án (docs/ke-hoach-tai-khoan.md, mục 9.3).
      return "Hệ thống chưa gửi được email tới địa chỉ này. Em thử lại sau nhé.";
  }
  if (code === "over_request_rate_limit" || status === 429) {
    return "Em thao tác quá nhanh. Đợi vài phút rồi thử lại nhé.";
  }
  if (name === "AuthRetryableFetchError" || status === 0 || (status !== null && status !== undefined && status >= 500)) {
    return "Không kết nối được máy chủ. Em kiểm tra mạng rồi thử lại nhé.";
  }
  return "Có lỗi xảy ra. Em thử lại nhé.";
}
