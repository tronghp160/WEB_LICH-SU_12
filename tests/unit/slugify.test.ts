import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/utils/slugify";

describe("slugify", () => {
  it("chuyển chuỗi có dấu tiếng Việt thành slug không dấu", () => {
    expect(slugify("Chiến dịch Điện Biên Phủ")).toBe(
      "chien-dich-dien-bien-phu",
    );
  });

  it("xử lý đúng đ và Đ", () => {
    expect(slugify("Độc lập")).toBe("doc-lap");
    expect(slugify("đất nước")).toBe("dat-nuoc");
  });

  it("gộp khoảng trắng thừa và bỏ khoảng trắng đầu/cuối", () => {
    expect(slugify("  Hà   Nội  ")).toBe("ha-noi");
  });

  it("bỏ ký tự đặc biệt", () => {
    expect(slugify("Hiệp định Genève (1954)!")).toBe(
      "hiep-dinh-geneve-1954",
    );
  });
});
