import { describe, expect, it } from "vitest";
import { formatLifespan, resizeCommonsImage, splitParagraphs, truncateForMeta } from "@/lib/utils/text";

describe("splitParagraphs", () => {
  it("tách theo dòng trống, giữ xuống dòng đơn trong đoạn", () => {
    expect(splitParagraphs("Đoạn 1\ndòng 2\n\nĐoạn 2")).toEqual(["Đoạn 1\ndòng 2", "Đoạn 2"]);
  });

  it("chuẩn hóa \\r\\n, bỏ đoạn rỗng và khoảng trắng thừa", () => {
    expect(splitParagraphs("  A  \r\n\r\n\r\n   \r\n B ")).toEqual(["A", "B"]);
  });

  it("null/undefined/rỗng cho mảng rỗng", () => {
    expect(splitParagraphs(null)).toEqual([]);
    expect(splitParagraphs(undefined)).toEqual([]);
    expect(splitParagraphs("  \n\n ")).toEqual([]);
  });
});

describe("formatLifespan", () => {
  it("ghi đủ hai đầu", () => {
    expect(formatLifespan(1890, 1969)).toBe("1890 – 1969");
  });

  it("thiếu một đầu thì ghi '?', không đoán", () => {
    expect(formatLifespan(1911, null)).toBe("1911 – ?");
    expect(formatLifespan(null, 1975)).toBe("? – 1975");
  });

  it("thiếu cả hai thì null", () => {
    expect(formatLifespan(null, null)).toBeNull();
  });
});

describe("truncateForMeta", () => {
  it("giữ nguyên chuỗi ngắn, gộp khoảng trắng", () => {
    expect(truncateForMeta("  a   b\n c ")).toBe("a b c");
  });

  it("cắt chuỗi dài tại ranh giới từ và thêm …", () => {
    const text = "từ ".repeat(100);
    const result = truncateForMeta(text, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("  ");
  });
});

describe("resizeCommonsImage", () => {
  it("thêm width cho Special:FilePath của Wikimedia Commons", () => {
    expect(
      resizeCommonsImage("https://commons.wikimedia.org/wiki/Special:FilePath/A_b.jpg", 1000),
    ).toBe("https://commons.wikimedia.org/wiki/Special:FilePath/A_b.jpg?width=1000");
  });

  it("giữ nguyên URL khác hoặc URL không hợp lệ", () => {
    expect(resizeCommonsImage("https://example.com/a.jpg", 800)).toBe("https://example.com/a.jpg");
    expect(resizeCommonsImage("khong-phai-url", 800)).toBe("khong-phai-url");
  });
});
