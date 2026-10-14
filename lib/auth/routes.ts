// Đường dẫn tài khoản học sinh + logic thuần "trang nào cần đăng nhập" và "chuyển về đâu sau khi đăng nhập" (dùng ở
// proxy.ts, Server Action và route handler, nên KHÔNG import server-only) — tách riêng để unit test được.
// docs/ke-hoach-tai-khoan.md, mục 4.4 và 6.6.

export const ACCOUNT_HOME = "/tai-khoan";
/** Đổi / đặt mật khẩu, liên kết Google, đăng xuất mọi máy, tải dữ liệu, xóa tài khoản. */
export const ACCOUNT_SECURITY = "/tai-khoan/bao-mat";
/** Đơn hàng + gói luyện thi gắn với tài khoản (B6). */
export const ACCOUNT_ORDERS = "/tai-khoan/don-hang";
/** Route tải dữ liệu của em (JSON). */
export const ACCOUNT_DATA_EXPORT = "/tai-khoan/du-lieu";
export const LEARNER_LOGIN = "/dang-nhap";
export const LEARNER_SIGNUP = "/dang-ky";
export const SIGNUP_CHECK_EMAIL = "/dang-ky/kiem-tra-email";
/** Người vào lần đầu bằng Google: đồng ý điều khoản + tên hiển thị trước khi có hồ sơ học sinh. */
export const SIGNUP_COMPLETE = "/dang-ky/hoan-tat";
export const FORGOT_PASSWORD = "/quen-mat-khau";
export const RESET_PASSWORD = "/dat-lai-mat-khau";
export const AUTH_CONFIRM = "/auth/confirm";
export const AUTH_CALLBACK = "/auth/callback";
export const AUTH_ERROR = "/auth/loi";
export const TERMS_PATH = "/dieu-khoan";
export const PRIVACY_PATH = "/chinh-sach-bao-mat";

/** Độ dài tối đa của tham số `next` (đủ cho mọi đường dẫn nội bộ; chặn chuỗi rác dài). */
const MAX_NEXT_LENGTH = 300;
/** Gốc giả để phân tích đường dẫn tương đối: kết quả mang gốc khác nghĩa là chuỗi trỏ ra ngoài trang. */
const PROBE_ORIGIN = "http://ls12.invalid";
/** Ký tự điều khiển (xuống dòng, tab, NUL…). */
const CONTROL_CHARS = /\p{Cc}/u;

/**
 * `/tai-khoan` và mọi đường dẫn con cần đăng nhập. So khớp theo ranh giới đoạn nên `/tai-khoan-abc` không bị tính, và
 * dấu "/" cuối hoặc chữ hoa/thường không giúp lách qua kiểm tra.
 */
export function isProtectedLearnerPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  return path === ACCOUNT_HOME || path.startsWith(`${ACCOUNT_HOME}/`);
}

/**
 * Chỉ nhận đường dẫn NỘI BỘ cho tham số `next` / `redirectTo` (chống chuyển hướng mở). Sai thì trả `fallback`.
 *  - phải bắt đầu bằng "/", không bắt đầu bằng "//" hay "/\" (kể cả sau khi giải mã %2F, %5C);
 *  - không có ký tự điều khiển (xuống dòng…), dấu "\", độ dài ≤ 300;
 *  - không trỏ vào /auth/* (tránh vòng lặp qua route xác thực).
 * `siteOrigin` (tùy chọn): chấp nhận thêm URL tuyệt đối CÙNG gốc với trang — mẫu email của Supabase gửi `{{ .RedirectTo }}`
 * là URL đầy đủ — rồi đổi về đường dẫn.
 */
export function safeNext(raw: unknown, fallback: string = ACCOUNT_HOME, siteOrigin?: string): string {
  if (typeof raw !== "string") return fallback;
  let value = raw.trim();
  if (!value || value.length > MAX_NEXT_LENGTH) return fallback;

  if (siteOrigin && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(siteOrigin).origin) return fallback;
      value = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallback;
    }
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (CONTROL_CHARS.test(value)) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || decoded.includes("\\") || CONTROL_CHARS.test(decoded)) return fallback;

  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;
  const path = `${url.pathname}${url.search}${url.hash}`;
  if (url.pathname.toLowerCase() === "/auth" || url.pathname.toLowerCase().startsWith("/auth/")) return fallback;
  return path;
}

/** Trang đăng nhập học sinh, mang theo đường dẫn cần quay về (chỉ khi khác trang mặc định). */
export function loginPath(next?: string): string {
  const target = safeNext(next);
  return target === ACCOUNT_HOME ? LEARNER_LOGIN : `${LEARNER_LOGIN}?next=${encodeURIComponent(target)}`;
}

/** Trang đăng ký, mang theo đường dẫn cần quay về. */
export function signUpPath(next?: string): string {
  const target = safeNext(next);
  return target === ACCOUNT_HOME ? LEARNER_SIGNUP : `${LEARNER_SIGNUP}?next=${encodeURIComponent(target)}`;
}

/** Trang hoàn tất đăng ký (Google lần đầu), mang theo đường dẫn cần quay về. */
export function completeSignUpPath(next?: string): string {
  const target = safeNext(next);
  return target === ACCOUNT_HOME ? SIGNUP_COMPLETE : `${SIGNUP_COMPLETE}?next=${encodeURIComponent(target)}`;
}
