import { describe, expect, it } from "vitest";
import { mediaHonestyLabels, parseAccuracyLevel, parseDatePrecision, parseMediaEra } from "@/lib/utils/labels";

describe("parseDatePrecision", () => {
  it("giữ nguyên các giá trị hợp lệ", () => {
    for (const value of ["exact", "year", "period", "approximate", "disputed"] as const) {
      expect(parseDatePrecision(value)).toBe(value);
    }
  });

  it("giá trị lạ được coi là 'approximate' (vẫn hiện nhãn cảnh báo)", () => {
    expect(parseDatePrecision("abc")).toBe("approximate");
    expect(parseDatePrecision("")).toBe("approximate");
  });

  it("không bị đánh lừa bởi thuộc tính của Object.prototype", () => {
    expect(parseDatePrecision("toString")).toBe("approximate");
    expect(parseDatePrecision("constructor")).toBe("approximate");
  });
});

describe("parseAccuracyLevel", () => {
  it("giữ nguyên giá trị hợp lệ, giá trị lạ thành 'unknown'", () => {
    for (const value of ["exact", "approximate", "region", "unknown"] as const) {
      expect(parseAccuracyLevel(value)).toBe(value);
    }
    expect(parseAccuracyLevel("abc")).toBe("unknown");
    expect(parseAccuracyLevel("toString")).toBe("unknown");
  });
});

describe("nhãn trung thực của ảnh", () => {
  const photo = { era: "historical", year_taken: 1954, is_reenactment: false, is_colorized: false };

  it("ảnh tư liệu có năm, ảnh ngày nay có năm trong ngoặc", () => {
    expect(mediaHonestyLabels(photo)).toEqual(["Ảnh tư liệu 1954"]);
    expect(mediaHonestyLabels({ ...photo, era: "today", year_taken: 2022 })).toEqual(["Ảnh ngày nay (2022)"]);
    expect(mediaHonestyLabels({ ...photo, year_taken: null })).toEqual(["Ảnh tư liệu"]);
  });

  it("cảnh dựng lại và ảnh tô màu luôn được gắn nhãn", () => {
    expect(mediaHonestyLabels({ ...photo, is_reenactment: true, is_colorized: true })).toEqual([
      "Ảnh tư liệu 1954",
      "Cảnh dựng lại",
      "Ảnh tô màu",
    ]);
  });

  it("loại ảnh lạ được coi là minh họa, không bao giờ trình bày như ảnh tư liệu", () => {
    expect(parseMediaEra("ai-generated")).toBe("illustration");
    expect(mediaHonestyLabels({ ...photo, era: "???" })).toEqual(["Tranh / ảnh minh họa"]);
  });
});
