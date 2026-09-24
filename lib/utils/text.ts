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
