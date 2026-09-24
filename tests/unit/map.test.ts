import { describe, expect, it } from "vitest";
import {
  findLocationForEvent,
  formatDistanceKm,
  normalizeLng,
  validateRadiusKm,
} from "@/lib/utils/map";

describe("validateRadiusKm", () => {
  it("nhận số hợp lệ, kể cả dấu phẩy thập phân và khoảng trắng", () => {
    expect(validateRadiusKm("50")).toEqual({ ok: true, km: 50 });
    expect(validateRadiusKm(" 12,5 ")).toEqual({ ok: true, km: 12.5 });
    expect(validateRadiusKm("0.5")).toEqual({ ok: true, km: 0.5 });
  });

  it("từ chối bán kính bằng 0 hoặc âm, có thông báo tiếng Việt", () => {
    for (const raw of ["0", "-5", "-0.1", "0,0"]) {
      const result = validateRadiusKm(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain("lớn hơn 0");
    }
  });

  it("từ chối rỗng, chữ, ký hiệu khoa học và số vô hạn", () => {
    for (const raw of ["", "   ", "abc", "1e3", "Infinity", "NaN", "5km", "1.2.3"]) {
      expect(validateRadiusKm(raw).ok).toBe(false);
    }
  });

  it("từ chối bán kính vượt trần 2.000 km", () => {
    expect(validateRadiusKm("2000")).toEqual({ ok: true, km: 2000 });
    expect(validateRadiusKm("2001").ok).toBe(false);
  });
});

describe("normalizeLng", () => {
  it("giữ nguyên kinh độ trong khoảng hợp lệ", () => {
    expect(normalizeLng(105.85)).toBeCloseTo(105.85);
    expect(normalizeLng(-73.9)).toBeCloseTo(-73.9);
  });

  it("đưa kinh độ vòng quanh về [-180, 180)", () => {
    expect(normalizeLng(465.85)).toBeCloseTo(105.85);
    expect(normalizeLng(-254.15)).toBeCloseTo(105.85);
  });
});

describe("formatDistanceKm", () => {
  it("làm tròn 1 chữ số thập phân, dấu phẩy kiểu Việt Nam", () => {
    expect(formatDistanceKm(3412)).toBe("3,4 km");
    expect(formatDistanceKm(0)).toBe("0,0 km");
    expect(formatDistanceKm(50000)).toBe("50,0 km");
  });
});

describe("findLocationForEvent", () => {
  const locations = [
    { slug: "sai-gon", events: [{ slug: "tet-mau-than", isPrimary: false }] },
    { slug: "hue", events: [{ slug: "tet-mau-than", isPrimary: true }] },
    { slug: "ba-dinh", events: [{ slug: "tuyen-ngon", isPrimary: true }] },
  ];

  it("ưu tiên địa điểm chính", () => {
    expect(findLocationForEvent(locations, "tet-mau-than")?.slug).toBe("hue");
  });

  it("không có địa điểm chính thì lấy địa điểm phụ đầu tiên", () => {
    const onlySecondary = [{ slug: "a", events: [{ slug: "x", isPrimary: false }] }];
    expect(findLocationForEvent(onlySecondary, "x")?.slug).toBe("a");
  });

  it("sự kiện không có địa điểm nào thì trả về undefined", () => {
    expect(findLocationForEvent(locations, "khong-ton-tai")).toBeUndefined();
  });
});
