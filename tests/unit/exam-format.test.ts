import { describe, expect, it } from "vitest";
import { daysUntilExam, parseExamDate } from "@/lib/exams/config";
import { maxScore, suggestedMinutes, THPT_2025, THPT_2025_LABEL, TRUE_FALSE_POINTS } from "@/lib/exams/format";

describe("cấu trúc đề thi tốt nghiệp từ 2025", () => {
  it("24 câu trắc nghiệm × 0,25 + 4 câu Đúng/Sai × 1 = 10 điểm, 50 phút", () => {
    expect(THPT_2025.sections.map((spec) => [spec.kind, spec.count])).toEqual([
      ["mcq", 24],
      ["true_false", 4],
    ]);
    expect(maxScore(THPT_2025.sections)).toBe(10);
    expect(THPT_2025.durationMin).toBe(50);
    expect(THPT_2025_LABEL).toBe("24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút");
  });

  it("điểm câu Đúng/Sai theo số ý đúng: 0 / 0,1 / 0,25 / 0,5 / 1", () => {
    expect(TRUE_FALSE_POINTS).toEqual([0, 0.1, 0.25, 0.5, 1]);
  });

  it("thời gian gợi ý chia 50 phút theo điểm", () => {
    expect(suggestedMinutes(24, 4)).toBe(50);
    expect(suggestedMinutes(24)).toBe(30);
    expect(suggestedMinutes(10)).toBe(13);
    expect(suggestedMinutes(10, 1)).toBe(18);
  });
});

describe("ngày thi (NEXT_PUBLIC_EXAM_DATE)", () => {
  it("chỉ nhận YYYY-MM-DD có thật; rỗng hoặc sai → null (không hiện đếm ngược)", () => {
    expect(parseExamDate("2027-06-11")).toBe("2027-06-11");
    expect(parseExamDate(" 2027-06-11 ")).toBe("2027-06-11");
    expect(parseExamDate(undefined)).toBeNull();
    expect(parseExamDate("")).toBeNull();
    expect(parseExamDate("11/06/2027")).toBeNull();
    expect(parseExamDate("2027-02-30")).toBeNull();
  });

  it("đếm ngày theo lịch Việt Nam", () => {
    // 23:30 ngày 10/6 giờ UTC = 6:30 sáng 11/6 ở Việt Nam → đúng ngày thi.
    expect(daysUntilExam("2027-06-11", new Date("2027-06-10T23:30:00Z"))).toBe(0);
    expect(daysUntilExam("2027-06-11", new Date("2027-06-10T16:59:00Z"))).toBe(1);
    expect(daysUntilExam("2027-06-11", new Date("2026-12-31T17:00:00Z"))).toBe(161);
    expect(daysUntilExam("2027-06-11", new Date("2027-06-12T03:00:00Z"))).toBe(-1);
    expect(daysUntilExam(null)).toBeNull();
  });
});
