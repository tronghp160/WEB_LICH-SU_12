import "server-only";

// Phương thức đăng nhập đang bật trong Supabase Auth. Google chỉ hoạt động sau khi cấu hình tay (docs/ke-hoach-tai-khoan.md,
// mục 9.1–9.2); khi chưa bật, Supabase trả JSON lỗi thô ở /authorize → ẩn nút Google thay vì để học sinh gặp trang đó.

/** Lưu đệm kết quả 5 phút: bật Google trong Supabase thì tối đa 5 phút sau nút mới hiện. */
const SETTINGS_REVALIDATE_SECONDS = 300;

/** GET /auth/v1/settings (công khai, chỉ cần khóa publishable). Lỗi mạng → coi như chưa bật. */
export async function isGoogleAuthEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: SETTINGS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;
    const settings = (await response.json()) as { external?: { google?: unknown } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
