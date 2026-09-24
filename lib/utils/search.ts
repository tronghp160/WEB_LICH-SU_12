// Hàm thuần cho trang Tra cứu (UC04) — tách riêng để unit test được.
//
// Tìm KHÔNG DẤU làm hoàn toàn bằng code (không đổi schema): so sánh trên chuỗi đã
// "gấp" (fold) — chữ thường, bỏ dấu, đ→d — rồi ánh xạ vị trí khớp về chuỗi gốc để tô sáng.

/** Độ dài tối đa của từ khóa (khớp `maxLength` của ô tìm nhanh ở trang chủ). */
export const MAX_QUERY_LENGTH = 100;

export const SEARCH_KIND_PARAM = "loai";
export const SEARCH_QUERY_PARAM = "q";

export const SEARCH_KINDS = ["su-kien", "nhan-vat", "dia-diem"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

/** Chuẩn hóa từ khóa: bỏ khoảng trắng đầu/cuối và thừa, cắt theo độ dài tối đa. */
export function normalizeQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH).trim();
}

/** Gấp một ký tự (code point): chữ thường, bỏ dấu tổ hợp, đ→d. Dấu tổ hợp đứng riêng → "". */
function foldChar(char: string): string {
  return char
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // \p{M}: mọi dấu tổ hợp (sắc, huyền, hỏi, ngã, nặng, mũ, móc…)
    .replace(/đ/g, "d");
}

/** "Điện Biên Phủ" → "dien bien phu". */
export function foldText(text: string): string {
  let result = "";
  for (const char of text) result += foldChar(char);
  return result;
}

/** Tách từ khóa thành các từ đã gấp (loại trùng); tất cả các từ phải xuất hiện (AND). */
export function toTokens(query: string): string[] {
  const tokens = foldText(normalizeQuery(query)).split(" ").filter(Boolean);
  return [...new Set(tokens)];
}

/** Văn bản có chứa mọi từ của từ khóa không (không phân biệt hoa thường và dấu). Không có từ → luôn khớp. */
export function matchesTokens(text: string | null | undefined, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return true;
  if (!text) return false;
  const folded = foldText(text);
  return tokens.every((token) => folded.includes(token));
}

export type TextSegment = { text: string; match: boolean };

/**
 * Chia văn bản gốc thành các đoạn khớp / không khớp để tô sáng. Vị trí khớp tìm
 * trên chuỗi đã gấp rồi ánh xạ ngược về chuỗi gốc (độ dài hai chuỗi có thể khác
 * nhau khi văn bản dùng dấu tổ hợp tách rời).
 */
export function highlightSegments(text: string, tokens: readonly string[]): TextSegment[] {
  if (tokens.length === 0 || !text) return [{ text, match: false }];

  // folded[i] thuộc ký tự gốc bắt đầu tại originalStart[i], dài originalLength[i] code unit.
  let folded = "";
  const originalStart: number[] = [];
  const originalEnd: number[] = [];
  let position = 0;
  for (const char of text) {
    const piece = foldChar(char);
    for (let i = 0; i < piece.length; i++) {
      originalStart.push(position);
      originalEnd.push(position + char.length);
    }
    folded += piece;
    position += char.length;
  }

  // Gom mọi khoảng khớp (theo chỉ số trong `folded`), rồi gộp khoảng chồng nhau.
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const found = folded.indexOf(token, from);
      if (found === -1) break;
      ranges.push([found, found + token.length]);
      from = found + token.length;
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    const from = originalStart[start];
    let to = originalEnd[end - 1];
    // Văn bản NFD: dấu tổ hợp đứng ngay sau chữ khớp thuộc về chữ đó → tô sáng luôn.
    while (to < text.length && /\p{M}/u.test(text[to])) to++;
    if (from > cursor) segments.push({ text: text.slice(cursor, from), match: false });
    segments.push({ text: text.slice(from, to), match: true });
    cursor = to;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

/** Đọc `loai` từ URL; giá trị lạ hoặc thiếu → null (= tất cả các loại). */
export function parseSearchKind(raw: string | null | undefined): SearchKind | null {
  return SEARCH_KINDS.find((kind) => kind === raw) ?? null;
}

/** Ghép URL tra cứu; tham số rỗng thì bỏ để URL gọn. Slug chủ đề chỉ gồm a-z, 0-9, "-" nên giữ dấu "," không mã hóa. */
export function buildSearchUrl(
  pathname: string,
  params: { query: string; topics: readonly string[]; kind: SearchKind | null },
): string {
  const parts: string[] = [];
  const query = normalizeQuery(params.query);
  if (query) parts.push(`${SEARCH_QUERY_PARAM}=${encodeURIComponent(query)}`);
  if (params.topics.length > 0) parts.push(`chu-de=${params.topics.join(",")}`);
  if (params.kind) parts.push(`${SEARCH_KIND_PARAM}=${params.kind}`);
  return parts.length > 0 ? `${pathname}?${parts.join("&")}` : pathname;
}
