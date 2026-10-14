// Mã kích hoạt gói luyện thi (docs/ke-hoach-thanh-toan.md, mục 16.2) — hàm thuần, unit test được.
//
// Dạng `LT12-XXXX-XXXX-XXXX`. Bảng chữ 32 ký tự bỏ I, O, 0, 1 cho dễ đọc khi chép tay. 12 ký tự ngẫu nhiên × 5 bit
// = 60 bit — không đoán được, cộng thêm giới hạn số lần thử ở server. Định dạng khớp CHECK `licenses.code` trong DB.

export const LICENSE_PREFIX = "LT12";
export const LICENSE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUPS = 3;
const GROUP_SIZE = 4;
const BODY_LENGTH = GROUPS * GROUP_SIZE;

/** Biểu thức chính quy giống CHECK trong migration (giữ hai nơi khớp nhau — có unit test). */
export const LICENSE_CODE_PATTERN = /^LT12-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

function format(body: string): string {
  const groups: string[] = [];
  for (let index = 0; index < BODY_LENGTH; index += GROUP_SIZE) groups.push(body.slice(index, index + GROUP_SIZE));
  return `${LICENSE_PREFIX}-${groups.join("-")}`;
}

/**
 * Sinh mã mới. 32 là ước của 256 nên lấy `byte % 32` không lệch phân bố.
 * `fillRandom` chỉ thay được trong unit test; mặc định dùng `crypto.getRandomValues` (an toàn mật mã).
 */
export function generateLicenseCode(fillRandom: (bytes: Uint8Array) => Uint8Array = (bytes) => crypto.getRandomValues(bytes)): string {
  const bytes = fillRandom(new Uint8Array(BODY_LENGTH));
  let body = "";
  for (const byte of bytes) body += LICENSE_ALPHABET[byte % LICENSE_ALPHABET.length];
  return format(body);
}

/**
 * Chuẩn hóa mã người dùng gõ: bỏ khoảng trắng, gạch, chấm; in hoa; tiền tố `LT12` có hay không đều được.
 * Trả null nếu không thành mã hợp lệ (sai độ dài, có ký tự ngoài bảng chữ — kể cả I, O, 0, 1).
 */
export function normalizeLicenseCode(input: string): string | null {
  let compact = input.normalize("NFKC").toUpperCase().replace(/[\s\-._–—]/g, "");
  if (compact.startsWith(LICENSE_PREFIX) && compact.length === LICENSE_PREFIX.length + BODY_LENGTH) {
    compact = compact.slice(LICENSE_PREFIX.length);
  }
  if (compact.length !== BODY_LENGTH) return null;
  for (const char of compact) if (!LICENSE_ALPHABET.includes(char)) return null;
  return format(compact);
}

export function isLicenseCode(value: string): boolean {
  return LICENSE_CODE_PATTERN.test(value);
}

/** Che bớt mã khi hiển thị ở nơi đông người (trang quản trị, nhật ký): `LT12-AB…-…-…XY`. */
export function maskLicenseCode(code: string): string {
  if (!isLicenseCode(code)) return "—";
  return `${code.slice(0, 7)}**-****-**${code.slice(-2)}`;
}
