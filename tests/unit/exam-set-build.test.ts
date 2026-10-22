import { describe, expect, it } from "vitest";
import { composeExam, MAX_RUN, shiftsFor } from "../../scripts/lib/de-thi.mjs";
import { displayedCorrect } from "@/lib/exams/compose";

// Ghép đề từ tệp mô tả (docs/ke-hoach-demo-luyen-thi.md, GĐ-D3): độ xoay rải đáp án Phần I đúng 6/6/6/6, không quá 3 câu
// liền cùng chữ, tính lại luôn ra cùng kết quả (seed-de-3.sql và scripts/kiem-tra-de.mjs khớp nhau).

type Row = { item: { kind: string; correct?: number; content_key: string }; section: number; position: number; shift: number };

const runs = (letters: number[]) => {
  let longest = 1;
  let run = 1;
  for (let index = 1; index < letters.length; index++) {
    run = letters[index] === letters[index - 1] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
};

describe("rải đáp án khi ghép đề", () => {
  it("24 câu cùng đáp án gốc A → sau khi xoay đúng 6/6/6/6, không quá 3 câu liền cùng chữ", () => {
    const corrects = Array.from({ length: 24 }, () => 0);
    const letters = shiftsFor("thu-nghiem", corrects).map((shift: number, index: number) => displayedCorrect(corrects[index], shift));
    expect([0, 1, 2, 3].map((letter) => letters.filter((value: number) => value === letter).length)).toEqual([6, 6, 6, 6]);
    expect(runs(letters)).toBeLessThanOrEqual(MAX_RUN);
  });

  it("cùng một đề luôn ra cùng độ xoay (có hạt giống), đề khác có thể khác", () => {
    const corrects = [3, 1, 0, 2, 2, 1, 0, 3, 1, 1, 2, 0];
    expect(shiftsFor("de-3", corrects)).toEqual(shiftsFor("de-3", corrects));
  });

  it("đề số 3: 24 trắc nghiệm ở Phần I + 4 Đúng/Sai ở Phần II, đáp án hiển thị 6/6/6/6", () => {
    const { exam, rows } = composeExam("de-3") as { exam: { format: string; duration_min: number }; rows: Row[] };
    expect(exam).toMatchObject({ format: "thpt_2025", duration_min: 50 });
    const section1 = rows.filter((row) => row.section === 1);
    const section2 = rows.filter((row) => row.section === 2);
    expect(section1.map((row) => row.item.kind)).toEqual(Array(24).fill("mcq"));
    expect(section2.map((row) => row.item.kind)).toEqual(Array(4).fill("true_false"));
    expect(section1.map((row) => row.position)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
    expect(section2.every((row) => row.shift === 0)).toBe(true);
    const letters = section1.map((row) => displayedCorrect(row.item.correct ?? 0, row.shift));
    expect([0, 1, 2, 3].map((letter) => letters.filter((value) => value === letter).length)).toEqual([6, 6, 6, 6]);
    expect(runs(letters)).toBeLessThanOrEqual(MAX_RUN);
  });
});
