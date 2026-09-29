// Hàm thuần cho trang chi tiết (UC05) — tách riêng để unit test được.

/**
 * Tách nội dung dài thành các đoạn: đoạn ngăn cách nhau bằng dòng trống; xuống
 * dòng đơn trong một đoạn được giữ lại (hiển thị bằng `whitespace-pre-line`).
 * Chuẩn hóa \r\n, bỏ đoạn rỗng và khoảng trắng thừa.
 */
export function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Năm sinh – năm mất của nhân vật, dạng "1890 – 1969". Thiếu một đầu thì ghi rõ
 * "?" (không đoán); thiếu cả hai thì trả về null để trang không hiện dòng này.
 */
export function formatLifespan(birthYear: number | null, deathYear: number | null): string | null {
  if (birthYear === null && deathYear === null) return null;
  return `${birthYear ?? "?"} – ${deathYear ?? "?"}`;
}

/** Cắt mô tả cho thẻ meta (SEO/chia sẻ) tại ranh giới từ, thêm "…" khi bị cắt. */
export function truncateForMeta(text: string, maxLength = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Ảnh Wikimedia Commons dạng `Special:FilePath/<tên>` trả về file gốc (có thể
 * nhiều MB). Thêm `?width=` để Commons trả bản thu nhỏ; URL khác giữ nguyên.
 */
export function resizeCommonsImage(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "commons.wikimedia.org" && parsed.pathname.includes("/Special:FilePath/")) {
      parsed.searchParams.set("width", String(width));
      return parsed.toString();
    }
  } catch {
    // URL không hợp lệ: để trình duyệt tự xử lý (và ảnh lỗi sẽ hiện chữ thay thế).
  }
  return url;
}

/** Các cỡ ảnh do `scripts/import-commons-image.mjs` tạo sẵn: `<tên>-400.webp`, `-1200.webp`, `-2000.webp`. */
export const IMAGE_VARIANT_WIDTHS = [400, 1200, 2000] as const;
const VARIANT_PATTERN = /-(400|1200|2000)\.webp$/;

/**
 * Nguồn ảnh vừa với chiều rộng hiển thị `width` (px CSS):
 *  - ảnh tự lưu có đủ 3 cỡ → `src` là cỡ nhỏ nhất đủ nét + `srcSet` để trình duyệt tự chọn theo màn hình;
 *  - ảnh Commons → bản thu nhỏ của Commons;
 *  - ảnh khác → giữ nguyên.
 */
export function responsiveImage(url: string, width: number): { src: string; srcSet?: string } {
  if (VARIANT_PATTERN.test(url)) {
    const at = (size: number) => url.replace(VARIANT_PATTERN, `-${size}.webp`);
    const fit = IMAGE_VARIANT_WIDTHS.find((size) => size >= width) ?? 2000;
    return { src: at(fit), srcSet: IMAGE_VARIANT_WIDTHS.map((size) => `${at(size)} ${size}w`).join(", ") };
  }
  return { src: resizeCommonsImage(url, width) };
}
