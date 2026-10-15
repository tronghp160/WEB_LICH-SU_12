// Ghép đề từ ngân hàng câu hỏi (docs/ke-hoach-luyen-thi.md, mục 3.4, 7.2) — phần, thứ tự, xoay lựa chọn để rải đều
// A/B/C/D. Hàm thuần, unit test được.
//
// Cách rải đáp án đã chọn: mỗi câu trắc nghiệm trong đề có `choice_shift` (0–3) lưu ở exam_set_items. Học sinh thấy lựa
// chọn gốc i ở vị trí (i + shift) mod 4, nên đáp án đúng hiển thị = (correct_index + shift) mod 4 — giống get_exam_set.

import type { ExamItemKind } from "@/lib/exams/items";

/** Phần của câu trong đề: trắc nghiệm → Phần I, Đúng/Sai → Phần II. */
export function sectionForKind(kind: ExamItemKind): 1 | 2 {
  return kind === "mcq" ? 1 : 2;
}

/** Đáp án đúng học sinh thấy (0–3) sau khi xoay. */
export function displayedCorrect(correctIndex: number, shift: number): number {
  return (correctIndex + shift) % 4;
}

/** Thứ tự lựa chọn học sinh thấy: phần tử ở vị trí k lấy từ vị trí gốc (k - shift) mod 4. */
export function rotateChoices<T>(choices: readonly T[], shift: number): T[] {
  return [0, 1, 2, 3].map((position) => choices[(position - shift + 4) % 4]);
}

/** Chọn độ xoay để đáp án đúng rơi vào chữ cái đang ít nhất trong đề (bằng nhau thì lấy chữ đứng trước). */
export function balancedShift(letterCounts: readonly number[], correctIndex: number): number {
  const fewest = Math.min(...letterCounts);
  const target = letterCounts.indexOf(fewest);
  return (target - correctIndex + 4) % 4;
}

export type ComposedItem = { itemId: string; kind: ExamItemKind; correctIndex: number | null; shift: number };

/** Xếp lại độ xoay cho cả đề theo thứ tự hiện tại (nút "Rải đều đáp án"). Câu Đúng/Sai giữ 0. */
export function rebalanceShifts<T extends ComposedItem>(items: readonly T[]): T[] {
  const counts = [0, 0, 0, 0];
  return items.map((item) => {
    if (item.kind !== "mcq" || item.correctIndex === null) return { ...item, shift: 0 };
    const shift = balancedShift(counts, item.correctIndex);
    counts[displayedCorrect(item.correctIndex, shift)] += 1;
    return { ...item, shift };
  });
}

/** Đếm đáp án đúng hiển thị theo chữ cái (chỉ câu trắc nghiệm). */
export function letterCounts(items: readonly Pick<ComposedItem, "kind" | "correctIndex" | "shift">[]): number[] {
  const counts = [0, 0, 0, 0];
  for (const item of items) if (item.kind === "mcq" && item.correctIndex !== null) counts[displayedCorrect(item.correctIndex, item.shift)] += 1;
  return counts;
}

/** Đổi chỗ câu ở `index` với câu kề trên (-1) / dưới (+1) trong cùng danh sách; ra ngoài biên thì giữ nguyên. */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
