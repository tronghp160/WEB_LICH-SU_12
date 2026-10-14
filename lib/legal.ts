// Phiên bản Điều khoản sử dụng + Chính sách bảo mật hiện hành (trang /dieu-khoan, /chinh-sach-bao-mat). Lưu vào
// learner_profiles.terms_version khi học sinh đồng ý (docs/ke-hoach-tai-khoan.md, mục 11). Sửa nội dung hai trang thì
// tăng phiên bản này cùng commit.
export const TERMS_VERSION = "2026-10";
export const TERMS_UPDATED_AT = "14/10/2026";

/** Email liên hệ về dữ liệu cá nhân / tài khoản (đặt NEXT_PUBLIC_CONTACT_EMAIL khi có hộp thư của nhóm). */
export function contactEmail(): string | null {
  const value = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return value && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
}
