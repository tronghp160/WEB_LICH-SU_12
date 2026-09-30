import { describe, expect, it } from "vitest";
import { countWords, missingStandardSections, parseInline, parseRichText } from "@/lib/utils/rich-text";

describe("parseRichText", () => {
  it("chia mục theo ## và giữ phần mở đầu", () => {
    const sections = parseRichText("Mở đầu.\n\n## Bối cảnh\n\nĐoạn 1.\n\nĐoạn 2.\n\n## Diễn biến\nDòng a\ndòng b");
    expect(sections.map((section) => section.heading)).toEqual([null, "Bối cảnh", "Diễn biến"]);
    expect(sections[1].blocks).toHaveLength(2);
    // Các dòng liền nhau gộp thành một đoạn
    expect(sections[2].blocks[0]).toEqual({ type: "paragraph", inlines: [{ text: "Dòng a dòng b", bold: false }] });
  });

  it("gạch đầu dòng, trích dẫn có nguồn, chữ đậm", () => {
    const [section] = parseRichText("- một\n- **hai**\n\n> Không có gì quý hơn độc lập, tự do.\n> — Hồ Chí Minh, 1966");
    expect(section.blocks[0]).toEqual({
      type: "list",
      items: [[{ text: "một", bold: false }], [{ text: "hai", bold: true }]],
    });
    expect(section.blocks[1]).toMatchObject({ type: "quote", cite: "Hồ Chí Minh, 1966" });
  });

  it("nội dung cũ không có tiêu đề vẫn hiện thành đoạn văn; rỗng → không có mục", () => {
    expect(parseRichText("Đoạn A.\n\nĐoạn B.")[0]).toMatchObject({ heading: null, blocks: [{ type: "paragraph" }, { type: "paragraph" }] });
    expect(parseRichText("   ")).toEqual([]);
    expect(parseRichText(null)).toEqual([]);
  });

  it("thẻ HTML chỉ là chữ thường (được React escape khi hiển thị), không thành phần tử", () => {
    const [section] = parseRichText("<script>alert(1)</script> <img src=x onerror=alert(1)>");
    expect(section.blocks[0]).toEqual({
      type: "paragraph",
      inlines: [{ text: "<script>alert(1)</script> <img src=x onerror=alert(1)>", bold: false }],
    });
  });

  it("in nghiêng *...*, và trích dẫn nhiều dòng giữ xuống dòng", () => {
    expect(parseInline("tác phẩm *Nhật ký trong tù* nổi tiếng")).toEqual([
      { text: "tác phẩm ", bold: false },
      { text: "Nhật ký trong tù", bold: false, italic: true },
      { text: " nổi tiếng", bold: false },
    ]);
    const [section] = parseRichText("> Sáng ra bờ suối, tối vào hang,\n> Cháo bẹ rau măng vẫn sẵn sàng.\n> — Hồ Chí Minh");
    expect(section.blocks[0]).toMatchObject({
      type: "quote",
      inlines: [{ text: "Sáng ra bờ suối, tối vào hang,\nCháo bẹ rau măng vẫn sẵn sàng." }],
      cite: "Hồ Chí Minh",
    });
  });

  it("dấu ** lẻ không làm hỏng câu", () => {
    expect(parseInline("a ** b **c** d")).toEqual([
      { text: "a ", bold: false },
      { text: " b ", bold: true },
      { text: "c** d", bold: false },
    ]);
  });
});

describe("khung nội dung chuẩn", () => {
  it("liệt kê mục chuẩn còn thiếu, không phân biệt hoa thường", () => {
    expect(missingStandardSections("## bối cảnh\nx\n## Diễn biến chính\ny")).toEqual(["Kết quả", "Ý nghĩa"]);
    expect(missingStandardSections("## Bối cảnh\n## Diễn biến\n## Kết quả\n## Ý nghĩa")).toEqual([]);
  });

  it("đếm chữ bỏ qua ký hiệu định dạng", () => {
    expect(countWords("## Bối cảnh\n\n- **một** hai\n> ba")).toBe(5);
  });
});
