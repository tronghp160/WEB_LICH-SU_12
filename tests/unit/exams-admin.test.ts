import { describe, expect, it } from "vitest";
import { canEditExam, canSubmitExam, examReadiness, examSetSchema, type ReadinessItem } from "@/lib/exams/admin";

const mcq = (correct: number, overrides: Partial<ReadinessItem> = {}): ReadinessItem => ({
  kind: "mcq",
  section: 1,
  correct_index: correct,
  shift: 0,
  explanation: "Giải thích đủ dài",
  source_note: "SGK",
  status: "published",
  level: "nhan_biet",
  event_id: null,
  hasPassage: false,
  ...overrides,
});
const tf = (overrides: Partial<ReadinessItem> = {}): ReadinessItem => ({ ...mcq(0), kind: "true_false", section: 2, correct_index: null, ...overrides });
const mini = { duration_min: 15, format: "mini" as const };
const full = { duration_min: 50, format: "thpt_2025" as const };

/** Đề đầy đủ hợp lệ: 24 trắc nghiệm rải đều, mức độ 40/30/30, 4 Đúng/Sai. */
function fullExam(): ReadinessItem[] {
  const levels = ["nhan_biet", "thong_hieu", "van_dung"] as const;
  const items = Array.from({ length: 24 }, (_, index) => mcq(index % 4, { level: index < 11 ? levels[0] : index < 19 ? levels[1] : levels[2] }));
  return [...items, tf({ level: "nhan_biet" }), tf({ level: "thong_hieu" }), tf({ level: "van_dung" }), tf({ level: "van_dung" })];
}

describe("thông tin đề", () => {
  it("loại đề, thời gian 5–180 phút, độ khó 1–3 hoặc trống", () => {
    expect(examSetSchema.parse({ title: "Đề số 3", description: "", format: "thpt_2025", duration_min: "50", difficulty: "", sort_order: "" })).toEqual({
      title: "Đề số 3",
      description: null,
      format: "thpt_2025",
      duration_min: 50,
      difficulty: null,
      sort_order: 0,
    });
    expect(examSetSchema.parse({ title: "Đề số 3", format: "mini", duration_min: "15", difficulty: "2" }).difficulty).toBe(2);
    expect(examSetSchema.safeParse({ title: "Đề", format: "mini", duration_min: "50" }).success).toBe(false);
    expect(examSetSchema.safeParse({ title: "Đề số 3", format: "khac", duration_min: "50" }).success).toBe(false);
    expect(examSetSchema.safeParse({ title: "Đề số 3", format: "mini", duration_min: "45.5" }).success).toBe(false);
    expect(examSetSchema.safeParse({ title: "Đề số 3", format: "mini", duration_min: "50", difficulty: "4" }).success).toBe(false);
  });
});

describe("điều kiện gửi duyệt / công bố đề", () => {
  it("đề đầy đủ đúng 24 + 4, 50 phút, mức độ cân đối → gửi duyệt và công bố được (phòng thi GĐ3 làm được Đúng/Sai, tư liệu)", () => {
    expect(examReadiness(full, fullExam())).toEqual({ blockers: [], warnings: [], publishBlockers: [] });
  });

  it("đề đầy đủ thiếu / thừa câu → chặn, nêu số câu hiện có", () => {
    const items = fullExam().slice(1, 26);
    expect(examReadiness(full, items).blockers).toEqual(["Đề đầy đủ cần đúng 24 câu trắc nghiệm + 4 câu Đúng/Sai (hiện có 23 câu trắc nghiệm, 2 câu Đúng/Sai)."]);
  });

  it("đề đầy đủ: thời gian khác 50 phút, mức độ lệch, quá 2 câu một sự kiện → cảnh báo", () => {
    const items = fullExam().map((item, index) => ({ ...item, level: "nhan_biet" as const, event_id: index < 3 ? "e1" : null }));
    const warnings = examReadiness({ ...full, duration_min: 45 }, items).warnings;
    expect(warnings[0]).toBe("Đề thi thật làm trong 50 phút; đề này đặt 45 phút.");
    expect(warnings[1]).toContain("Tỉ lệ mức độ lệch xa gợi ý");
    expect(warnings[2]).toBe("Có 3 câu cùng hỏi về một sự kiện — nên đa dạng hơn (tối đa 2 câu / sự kiện).");
  });

  it("câu sai phần, câu còn nháp / cần sửa / ẩn → chặn; câu chờ duyệt được (công bố cùng đề)", () => {
    const items = fullExam();
    items[0] = { ...items[0], section: 2 };
    items[1] = { ...items[1], status: "draft" };
    items[2] = { ...items[2], status: "hidden" };
    items[3] = { ...items[3], status: "pending_review" };
    const { blockers } = examReadiness(full, items);
    expect(blockers).toContain("Có câu nằm sai phần (trắc nghiệm ở Phần I, Đúng/Sai ở Phần II).");
    expect(blockers).toContain("Có 2 câu đang nháp, cần chỉnh sửa hoặc đã ẩn — gửi duyệt các câu này trước (câu đang chờ duyệt được công bố cùng đề).");
  });

  it("đề ngắn: dưới 10 câu → chặn", () => {
    expect(examReadiness(mini, [mcq(0), mcq(1)]).blockers).toEqual(["Đề cần ít nhất 10 câu (hiện có 2)."]);
  });

  it("đề ngắn 10 câu trắc nghiệm đúng thời gian, rải đều → chỉ nhắc ghi rõ đề mẫu; công bố được", () => {
    const readiness = examReadiness(mini, Array.from({ length: 10 }, (_, index) => mcq(index % 4)));
    expect(readiness).toEqual({
      blockers: [],
      warnings: ['Đề thi thật gồm 24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút; đề này có 10 câu — nên ghi rõ "đề mẫu" trong tên hoặc mô tả.'],
      publishBlockers: [],
    });
  });

  it("thời gian gợi ý theo điểm; đáp án dồn một chữ SAU KHI XOAY → cảnh báo", () => {
    const items = Array.from({ length: 10 }, () => mcq(0));
    const readiness = examReadiness({ ...mini, duration_min: 50 }, items);
    expect(readiness.warnings[1]).toBe("Thời gian 50 phút chưa tương xứng với 10 câu (gợi ý khoảng 13 phút).");
    expect(readiness.warnings[2]).toContain("dồn vào A (10/10");
    // Cùng đáp án gốc A nhưng đã xoay rải đều → hết cảnh báo.
    const rotated = items.map((item, index) => ({ ...item, shift: index % 4 }));
    expect(examReadiness(mini, rotated).warnings).toHaveLength(1);
  });

  it("đề theo chủ đề có câu tư liệu → công bố được; không nhắc 'đề mẫu'", () => {
    const items = Array.from({ length: 10 }, (_, index) => mcq(index % 4, { hasPassage: index === 0 }));
    expect(examReadiness({ duration_min: 13, format: "chuyen_de" }, items)).toEqual({ blockers: [], warnings: [], publishBlockers: [] });
  });

  it("thiếu giải thích hoặc nguồn → chặn", () => {
    const items = Array.from({ length: 10 }, (_, index) => mcq(index % 4));
    items[3] = { ...items[3], explanation: " " };
    items[5] = { ...items[5], source_note: "" };
    expect(examReadiness(mini, items).blockers).toEqual(["Có câu thiếu lời giải thích.", "Có câu thiếu nguồn."]);
  });
});

describe("quyền soạn đề", () => {
  it("biên tập viên sửa/gửi duyệt khi nháp hoặc cần chỉnh sửa; kiểm duyệt viên không sửa nội dung", () => {
    expect(canEditExam("editor", "draft")).toBe(true);
    expect(canEditExam("editor", "pending_review")).toBe(false);
    expect(canEditExam("reviewer", "draft")).toBe(false);
    expect(canEditExam("system_admin", "published")).toBe(true);
    expect(canSubmitExam("editor", "needs_revision")).toBe(true);
    expect(canSubmitExam("editor", "published")).toBe(false);
    expect(canSubmitExam("reviewer", "draft")).toBe(false);
  });
});
