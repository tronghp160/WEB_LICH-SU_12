import { describe, expect, it } from "vitest";
import { parseAccuracyLevel, parseDatePrecision } from "@/lib/utils/labels";

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
