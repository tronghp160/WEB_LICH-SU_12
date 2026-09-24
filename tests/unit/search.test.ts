import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_LENGTH,
  buildSearchUrl,
  foldText,
  highlightSegments,
  matchesTokens,
  normalizeQuery,
  parseSearchKind,
  toTokens,
} from "@/lib/utils/search";

describe("normalizeQuery", () => {
  it("bỏ khoảng trắng đầu/cuối và gộp khoảng trắng thừa", () => {
    expect(normalizeQuery("  điện   biên \n phủ ")).toBe("điện biên phủ");
  });

  it("null/undefined/rỗng cho chuỗi rỗng", () => {
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery("   ")).toBe("");
  });

  it("cắt theo độ dài tối đa", () => {
    expect(normalizeQuery("a".repeat(500))).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe("foldText", () => {
  it("bỏ dấu và đ→d, không phân biệt hoa thường", () => {
    expect(foldText("Điện Biên Phủ")).toBe("dien bien phu");
    expect(foldText("Nguyễn Ái Quốc")).toBe("nguyen ai quoc");
    expect(foldText("ĐỔI MỚI")).toBe("doi moi");
  });

  it("cho cùng kết quả với chữ có dấu dựng sẵn (NFC) và tổ hợp (NFD)", () => {
    const nfc = "Điện Biên Phủ".normalize("NFC");
    const nfd = "Điện Biên Phủ".normalize("NFD");
    expect(foldText(nfc)).toBe(foldText(nfd));
  });

  it("ký tự đặc biệt giữ nguyên, không gây lỗi", () => {
    expect(foldText("100% _ [a] (b) \\ .*")).toBe("100% _ [a] (b) \\ .*");
  });
});

describe("toTokens / matchesTokens", () => {
  it("tách từ, gấp dấu, loại trùng", () => {
    expect(toTokens(" Điện  điện Biên ")).toEqual(["dien", "bien"]);
    expect(toTokens("")).toEqual([]);
  });

  it("khớp có dấu và không dấu như nhau", () => {
    for (const query of ["dien bien phu", "Điện Biên Phủ", "DIEN BIEN", "bien phu"]) {
      expect(matchesTokens("Chiến dịch Điện Biên Phủ", toTokens(query))).toBe(true);
    }
  });

  it("mọi từ phải xuất hiện (AND), không cần đúng thứ tự", () => {
    expect(matchesTokens("Chiến dịch Điện Biên Phủ", toTokens("phu dien"))).toBe(true);
    expect(matchesTokens("Chiến dịch Điện Biên Phủ", toTokens("dien hue"))).toBe(false);
  });

  it("không có từ khóa thì luôn khớp; văn bản rỗng thì không khớp khi có từ khóa", () => {
    expect(matchesTokens("abc", [])).toBe(true);
    expect(matchesTokens(null, ["a"])).toBe(false);
  });

  it("ký tự đặc biệt được coi là chữ thường, không phải mẫu (regex/ilike)", () => {
    expect(matchesTokens("Điện Biên Phủ", toTokens("%"))).toBe(false);
    expect(matchesTokens("Điện Biên Phủ", toTokens(".*"))).toBe(false);
    expect(matchesTokens("Giảm 50% thuế", toTokens("50%"))).toBe(true);
    expect(() => toTokens("(((")).not.toThrow();
  });
});

describe("highlightSegments", () => {
  it("tô sáng từng từ khớp trong văn bản gốc, giữ nguyên dấu", () => {
    expect(highlightSegments("Chiến dịch Điện Biên Phủ", toTokens("dien bien"))).toEqual([
      { text: "Chiến dịch ", match: false },
      { text: "Điện", match: true },
      { text: " ", match: false },
      { text: "Biên", match: true },
      { text: " Phủ", match: false },
    ]);
  });

  it("gộp các khoảng khớp chồng/sát nhau", () => {
    expect(highlightSegments("Điện Biên", toTokens("dien bien di"))).toEqual([
      { text: "Điện", match: true },
      { text: " ", match: false },
      { text: "Biên", match: true },
    ]);
  });

  it("đúng với văn bản dùng dấu tổ hợp tách rời (NFD)", () => {
    const text = "Điện Biên Phủ".normalize("NFD");
    const segments = highlightSegments(text, toTokens("phu"));
    expect(segments.filter((s) => s.match).map((s) => s.text.normalize("NFC"))).toEqual(["Phủ"]);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });

  it("không có từ khóa hoặc không khớp thì trả nguyên văn", () => {
    expect(highlightSegments("Hà Nội", [])).toEqual([{ text: "Hà Nội", match: false }]);
    expect(highlightSegments("Hà Nội", ["hue"])).toEqual([{ text: "Hà Nội", match: false }]);
  });
});

describe("parseSearchKind", () => {
  it("nhận giá trị hợp lệ, còn lại là null", () => {
    expect(parseSearchKind("su-kien")).toBe("su-kien");
    expect(parseSearchKind("nhan-vat")).toBe("nhan-vat");
    expect(parseSearchKind("dia-diem")).toBe("dia-diem");
    expect(parseSearchKind("abc")).toBeNull();
    expect(parseSearchKind(null)).toBeNull();
  });
});

describe("buildSearchUrl", () => {
  it("không có điều kiện thì chỉ trả về đường dẫn", () => {
    expect(buildSearchUrl("/tra-cuu", { query: "  ", topics: [], kind: null })).toBe("/tra-cuu");
  });

  it("ghép đủ tham số, mã hóa từ khóa", () => {
    expect(
      buildSearchUrl("/tra-cuu", { query: "điện biên & phủ", topics: ["a", "b"], kind: "su-kien" }),
    ).toBe("/tra-cuu?q=%C4%91i%E1%BB%87n%20bi%C3%AAn%20%26%20ph%E1%BB%A7&chu-de=a,b&loai=su-kien");
  });
});
