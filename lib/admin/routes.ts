// Đường dẫn khu vực nội bộ + logic thuần "đường dẫn nào cần đăng nhập" (dùng ở proxy.ts,
// nên KHÔNG import server-only) — tách riêng để unit test được.

export const ADMIN_HOME = "/quan-tri";
export const ADMIN_LOGIN = "/quan-tri/dang-nhap";
/** Đã đăng nhập nhưng vai trò không đủ quyền cho trang này. */
export const ADMIN_FORBIDDEN = "/quan-tri/khong-co-quyen";
/** Đã đăng nhập nhưng tài khoản bị khóa hoặc chưa có hồ sơ nhân sự. */
export const ADMIN_BLOCKED = "/quan-tri/tai-khoan-bi-khoa";

/**
 * `/quan-tri` và mọi đường dẫn con đều thuộc khu vực nội bộ, trừ trang đăng nhập.
 * So khớp theo ranh giới đoạn nên `/quan-tri-abc` không bị coi là khu nội bộ, và
 * dấu "/" cuối hoặc chữ hoa/thường không giúp lách qua kiểm tra.
 */
export function isProtectedAdminPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  const isAdmin = path === ADMIN_HOME || path.startsWith(`${ADMIN_HOME}/`);
  return isAdmin && path !== ADMIN_LOGIN;
}

/** Trang quản trị "Bài SGK" (GĐ7): gán sự kiện vào bài/mục. */
export const sgkAdminPath = (lessonSlug?: string) => (lessonSlug ? `/quan-tri/bai-sgk/${lessonSlug}` : "/quan-tri/bai-sgk");
