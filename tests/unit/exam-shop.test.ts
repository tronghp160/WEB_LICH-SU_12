import { describe, expect, it } from "vitest";
import { buildTimeline, figureYears, FREE_HANDBOOK_LESSON } from "@/lib/exams/handbook";
import { packBenefits } from "@/lib/exams/pack";
import { SOURCE_EXAMPLES, TRUE_FALSE_EXAMPLES } from "@/lib/exams/skills";
import { getSgkLesson } from "@/lib/sgk/curriculum";

const none = { fullSets: 0, bankMcq: 0, bankTrueFalse: 0, generated: false, handbookLessons: 0 };

describe("packBenefits — chỉ nêu điều có thật", () => {
  it("không có đề đầy đủ / ngân hàng / đề tự sinh / sổ tay thì không nhắc", () => {
    const lines = packBenefits(none).join("\n");
    expect(lines).not.toMatch(/đề đầy đủ|Ngân hàng|Đề tự sinh|Sổ tay/);
    expect(lines).toMatch(/In đề \+ phiếu trả lời/);
  });

  it("có số liệu thì nêu đúng số", () => {
    const lines = packBenefits({ fullSets: 5, bankMcq: 360, bankTrueFalse: 60, generated: true, handbookLessons: 17 });
    expect(lines).toContain("5 đề đầy đủ đúng cấu trúc thi tốt nghiệp từ 2025 (24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút)");
    expect(lines).toContain("Ngân hàng 420 câu hỏi đã kiểm duyệt, trong đó 60 câu Đúng/Sai");
    expect(lines.some((line) => line.startsWith("Đề tự sinh"))).toBe(true);
    expect(lines).toContain("Sổ tay ôn thi 17 bài, in được");
  });

  it("ngân hàng chỉ có trắc nghiệm thì không nhắc Đúng/Sai", () => {
    expect(packBenefits({ ...none, bankMcq: 20 })).toContain("Ngân hàng 20 câu hỏi đã kiểm duyệt");
  });
});

describe("sổ tay", () => {
  it("bài xem thử có trong khung SGK", () => {
    expect(getSgkLesson(FREE_HANDBOOK_LESSON)?.number).toBe(6);
  });

  it("mốc thời gian không trùng, theo năm", () => {
    const event = (slug: string, startYear: number) => ({ slug, title: slug, dateText: String(startYear), startYear, summary: "" });
    const timeline = buildTimeline([
      { id: "muc-1", numeral: "1", title: "Một", events: [event("b", 1954), event("a", 1945)] },
      { id: "muc-2", numeral: "2", title: "Hai", events: [event("a", 1945), event("c", 1950)] },
    ]);
    expect(timeline.map((item) => item.slug)).toEqual(["a", "c", "b"]);
  });

  it("năm sinh – mất của nhân vật", () => {
    expect(figureYears(1890, 1969)).toBe("1890–1969");
    expect(figureYears(1911, null)).toBe("sinh 1911");
    expect(figureYears(null, null)).toBeNull();
  });
});

describe("ví dụ kỹ năng", () => {
  const all = [...TRUE_FALSE_EXAMPLES, ...SOURCE_EXAMPLES];

  it("mỗi trang 5 ví dụ, mã không trùng, bài có trong khung SGK", () => {
    expect(TRUE_FALSE_EXAMPLES).toHaveLength(5);
    expect(SOURCE_EXAMPLES).toHaveLength(5);
    expect(new Set(all.map((example) => example.id)).size).toBe(all.length);
    for (const example of all) expect(getSgkLesson(example.lesson), example.id).toBeDefined();
  });

  it("câu Đúng/Sai: đủ 4 ý, có cả ý đúng lẫn ý sai, ý nào cũng có lời giải", () => {
    for (const example of all) {
      if (example.kind !== "true_false") continue;
      expect(example.statements, example.id).toHaveLength(4);
      expect(example.statements.some((statement) => statement.truth), example.id).toBe(true);
      expect(example.statements.some((statement) => !statement.truth), example.id).toBe(true);
      for (const statement of example.statements) expect(statement.why.length, example.id).toBeGreaterThan(10);
    }
  });

  it("câu trắc nghiệm: 4 lựa chọn khác nhau, đáp án trong khoảng, có lời giải", () => {
    for (const example of all) {
      if (example.kind !== "mcq") continue;
      expect(new Set(example.choices).size, example.id).toBe(4);
      expect(example.correct, example.id).toBeGreaterThanOrEqual(0);
      expect(example.correct, example.id).toBeLessThan(4);
      expect(example.why.length, example.id).toBeGreaterThan(20);
    }
  });
});
