import "server-only";

// Cài đặt Supabase Auth đang bật (docs/ke-hoach-tai-khoan.md, mục 9.1–9.2) — đọc từ GET /auth/v1/settings (công khai, chỉ
// cần khóa publishable). Google chỉ hoạt động sau khi cấu hình tay; khi chưa bật, Supabase trả JSON lỗi thô ở /authorize
// → ẩn nút Google thay vì để học sinh gặp trang đó.

/** Lưu đệm kết quả 5 phút: đổi cài đặt trong Supabase thì tối đa 5 phút sau trang mới theo. */
const SETTINGS_REVALIDATE_SECONDS = 300;

export type AuthSettings = {
  /** Đã bật đăng nhập Google. */
  google: boolean;
  /**
   * Đã TẮT "Confirm email" (Supabase gọi là mailer_autoconfirm): đăng ký bằng email xong là vào được ngay, không gửi
   * email xác nhận.
   */
  autoconfirm: boolean;
};

const UNKNOWN: AuthSettings = { google: false, autoconfirm: false };

/** Lỗi mạng / thiếu cấu hình → coi như chưa bật gì (an toàn: ẩn Google, giữ luồng xác nhận email). */
export async function getAuthSettings(): Promise<AuthSettings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return UNKNOWN;
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: SETTINGS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return UNKNOWN;
    const settings = (await response.json()) as { external?: { google?: unknown }; mailer_autoconfirm?: unknown };
    return { google: settings.external?.google === true, autoconfirm: settings.mailer_autoconfirm === true };
  } catch {
    return UNKNOWN;
  }
}

let hiddenGoogleNoticeShown = false;

export async function isGoogleAuthEnabled(): Promise<boolean> {
  const { google } = await getAuthSettings();
  // Chỉ khi phát triển, nhắc một lần cho người cấu hình (không in URL / khóa).
  if (!google && process.env.NODE_ENV !== "production" && !hiddenGoogleNoticeShown) {
    hiddenGoogleNoticeShown = true;
    console.info("Nút Google đang ẩn vì Supabase chưa bật provider Google (Authentication → Providers).");
  }
  return google;
}
