// Nội dung sự kiện có cấu trúc (GĐ3): một tập con rất nhỏ của Markdown, phân tích thành khối dữ liệu rồi
// dựng bằng React (KHÔNG dùng dangerouslySetInnerHTML) → không thể chèn HTML/script dù biên tập viên gõ gì.
//
// Hỗ trợ:
//   ## Tiêu đề mục            → chia nội dung thành các mục (Bối cảnh, Diễn biến, …)
//   đoạn văn (cách nhau 1 dòng trống)
//   - gạch đầu dòng
//   > trích dẫn  (dòng "> — Nguồn" ngay sau là nguồn trích)
//   **in đậm**, *in nghiêng* trong câu; trong trích dẫn, mỗi dòng "> " giữ nguyên xuống dòng (trích thơ)
// Nội dung cũ không có "##" vẫn hiện như các đoạn văn bình thường.

export type Inline = { text: string; bold: boolean; italic?: true };

export type Block =
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "list"; items: Inline[][] }
  | { type: "quote"; inlines: Inline[]; cite: string | null };

export type RichSection = {
  /** null: phần mở đầu trước tiêu đề "##" đầu tiên. */
  heading: string | null;
  blocks: Block[];
};

/** Tách "**đậm**" và "*nghiêng*" trong một dòng; dấu * lẻ (không đóng) được giữ nguyên như chữ thường. */
export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  // Nhánh 1: **đậm**; nhánh 2: *nghiêng* (không bắt đầu/kết thúc bằng khoảng trắng, không chứa *).
  const pattern = /\*\*(.+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), bold: false });
    parts.push(match[1] !== undefined ? { text: match[1], bold: true } : { text: match[2], bold: false, italic: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts.filter((part) => part.text.length > 0);
}

function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let quote: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", inlines: parseInline(paragraph.join(" ")) });
    if (list.length) blocks.push({ type: "list", items: list.map(parseInline) });
    if (quote.length) {
      const citeIndex = quote.findIndex((line) => /^[—–-]\s/.test(line));
      const body = citeIndex === -1 ? quote : quote.slice(0, citeIndex);
      const cite = citeIndex === -1 ? null : quote.slice(citeIndex).join(" ").replace(/^[—–-]\s*/, "");
      // Giữ xuống dòng trong trích dẫn (trích thơ).
      blocks.push({ type: "quote", inlines: parseInline(body.join("\n")), cite });
    }
    paragraph = [];
    list = [];
    quote = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flush();
    } else if (/^[-*]\s+/.test(line)) {
      if (paragraph.length || quote.length) flush();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.startsWith(">")) {
      if (paragraph.length || list.length) flush();
      quote.push(line.replace(/^>\s?/, ""));
    } else {
      if (list.length || quote.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function parseRichText(source: string | null | undefined): RichSection[] {
  if (!source || source.trim() === "") return [];
  const sections: { heading: string | null; lines: string[] }[] = [{ heading: null, lines: [] }];
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = /^#{2,3}\s+(.+?)\s*#*$/.exec(line.trim());
    if (heading) sections.push({ heading: heading[1], lines: [] });
    else sections[sections.length - 1].lines.push(line);
  }
  return sections
    .map((section) => ({ heading: section.heading, blocks: toBlocks(section.lines) }))
    .filter((section) => section.heading !== null || section.blocks.length > 0);
}

/** Các mục của khung nội dung chuẩn (kế hoạch GĐ3, mục 3.1) — dùng để nhắc biên tập viên. */
export const STANDARD_SECTIONS = ["Bối cảnh", "Diễn biến", "Kết quả", "Ý nghĩa"] as const;

/** Mục chuẩn còn thiếu trong nội dung (so khớp không phân biệt hoa thường). */
export function missingStandardSections(source: string | null | undefined): string[] {
  const headings = parseRichText(source)
    .map((section) => section.heading?.toLowerCase())
    .filter(Boolean);
  return STANDARD_SECTIONS.filter((name) => !headings.some((heading) => heading!.startsWith(name.toLowerCase())));
}

/** Đếm số chữ (để nhắc độ dài 400–800 chữ). */
export function countWords(source: string | null | undefined): number {
  return (source ?? "").replace(/[#>*\-]/g, " ").split(/\s+/).filter(Boolean).length;
}
