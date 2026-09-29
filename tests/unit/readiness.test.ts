import { describe, expect, it } from "vitest";
import { evaluateReadiness, isReady } from "@/lib/admin/readiness";

const fullEvent = {
  kind: "su-kien" as const,
  content: "Nội dung",
  sourceCount: 1,
  hasPrimaryLocation: true,
  figureCount: 2,
  unpublishedLinkedCount: 0,
  media: { count: 1, missingAlt: 0, missingLicense: 0 },
};

describe("evaluateReadiness — sự kiện", () => {
  it("đủ mọi thứ → sẵn sàng, không cảnh báo", () => {
    const result = evaluateReadiness(fullEvent);
    expect(result).toEqual({ blocking: [], warnings: [] });
    expect(isReady(result)).toBe(true);
  });

  it("thiếu nguồn → chặn (khớp yêu cầu ≥ 1 nguồn và trigger G4)", () => {
    const result = evaluateReadiness({ ...fullEvent, sourceCount: 0 });
    expect(result.blocking).toEqual(["Sự kiện phải có ít nhất 1 nguồn tham khảo."]);
    expect(isReady(result)).toBe(false);
  });

  it("ảnh thiếu alt text → chặn", () => {
    const result = evaluateReadiness({ ...fullEvent, media: { count: 3, missingAlt: 2, missingLicense: 0 } });
    expect(result.blocking[0]).toContain("2 ảnh");
    expect(isReady(result)).toBe(false);
  });

  it("ảnh thiếu giấy phép → chặn", () => {
    const result = evaluateReadiness({ ...fullEvent, media: { count: 2, missingAlt: 0, missingLicense: 1 } });
    expect(result.blocking.join(" ")).toContain("giấy phép");
    expect(isReady(result)).toBe(false);
  });

  it("chưa có ảnh nào → cảnh báo (chưa chặn)", () => {
    const result = evaluateReadiness({ ...fullEvent, media: { count: 0, missingAlt: 0, missingLicense: 0 } });
    expect(isReady(result)).toBe(true);
    expect(result.warnings.join(" ")).toContain("Chưa có ảnh");
  });

  it("thiếu địa điểm chính chỉ là cảnh báo (khuyến nghị), không chặn", () => {
    const result = evaluateReadiness({ ...fullEvent, hasPrimaryLocation: false });
    expect(isReady(result)).toBe(true);
    expect(result.warnings.join(" ")).toContain("địa điểm chính");
  });

  it("thiếu nội dung/nhân vật, liên kết chưa công bố → cảnh báo", () => {
    const result = evaluateReadiness({ ...fullEvent, content: "  ", figureCount: 0, unpublishedLinkedCount: 3 });
    expect(isReady(result)).toBe(true);
    expect(result.warnings).toHaveLength(3);
  });
});

describe("evaluateReadiness — các loại khác", () => {
  it("địa điểm không có tọa độ → cảnh báo, vẫn gửi duyệt được", () => {
    const result = evaluateReadiness({ kind: "dia-diem", latitude: null, longitude: null, accuracyLevel: "unknown", description: "Mô tả" });
    expect(isReady(result)).toBe(true);
    expect(result.warnings.join(" ")).toContain("tọa độ");
  });

  it("có tọa độ nhưng độ chính xác chưa xác định → cảnh báo", () => {
    const result = evaluateReadiness({ kind: "dia-diem", latitude: 21, longitude: 105, accuracyLevel: "unknown", description: "Mô tả" });
    expect(result.warnings.join(" ")).toContain("Chưa xác định");
  });

  it("ảnh của nhân vật và địa điểm cũng phải có alt và giấy phép", () => {
    const figure = evaluateReadiness({ kind: "nhan-vat", biography: "x", media: { count: 1, missingAlt: 0, missingLicense: 1 } });
    expect(isReady(figure)).toBe(false);
    const location = evaluateReadiness({
      kind: "dia-diem",
      latitude: 21,
      longitude: 105,
      accuracyLevel: "exact",
      description: "Mô tả",
      media: { count: 1, missingAlt: 1, missingLicense: 0 },
    });
    expect(isReady(location)).toBe(false);
  });

  it("nhân vật và chủ đề: chỉ cảnh báo thiếu mô tả/tiểu sử", () => {
    expect(evaluateReadiness({ kind: "nhan-vat", biography: null }).warnings).toHaveLength(1);
    expect(evaluateReadiness({ kind: "nhan-vat", biography: "Tiểu sử" }).warnings).toHaveLength(0);
    expect(evaluateReadiness({ kind: "chu-de", description: "" }).warnings).toHaveLength(1);
    expect(isReady(evaluateReadiness({ kind: "chu-de", description: null }))).toBe(true);
  });
});

describe("evaluateReadiness — ghi chú nội bộ TODO", () => {
  it("chữ TODO trong phần công khai → chặn gửi duyệt, đếm đúng số đoạn", () => {
    const result = evaluateReadiness({
      ...fullEvent,
      publicTexts: ["Tóm tắt", "Xem SGK — TODO: bổ sung số trang", null, "fixme sau"],
    });
    expect(isReady(result)).toBe(false);
    expect(result.blocking[0]).toContain("2 đoạn");
  });

  it("áp dụng cho mọi loại nội dung", () => {
    const location = evaluateReadiness({
      kind: "dia-diem",
      latitude: 21,
      longitude: 105,
      accuracyLevel: "exact",
      description: "Mô tả",
      publicTexts: ["Tọa độ — TODO: kiểm chứng."],
    });
    expect(isReady(location)).toBe(false);
    expect(isReady(evaluateReadiness({ kind: "nhan-vat", biography: "x", publicTexts: ["TODO"] }))).toBe(false);
  });

  it("không bắt nhầm chữ có chứa 'todo' ở giữa từ", () => {
    expect(isReady(evaluateReadiness({ ...fullEvent, publicTexts: ["Mastodon", "photodocument"] }))).toBe(true);
  });
});
