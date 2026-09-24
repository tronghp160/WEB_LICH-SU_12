/**
 * Chuyển chuỗi tiếng Việt có dấu thành slug không dấu, chữ thường, nối bằng "-".
 * Ví dụ: slugify("Chiến dịch Điện Biên Phủ") === "chien-dich-dien-bien-phu"
 */
export function slugify(input: string): string {
  // đ/Đ không tách được bằng NFD (là chữ cái riêng, không phải chữ + dấu)
  // nên phải thay trước.
  const withoutDao = input.replace(/đ/g, "d").replace(/Đ/g, "D");

  const withoutDiacritics = withoutDao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  return withoutDiacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
    .replace(/\s+/g, "-") // khoảng trắng -> gạch nối
    .replace(/-+/g, "-") // gộp nhiều gạch nối liền nhau
    .replace(/^-+|-+$/g, ""); // bỏ gạch nối ở đầu/cuối
}
