// Dùng chung cho scripts/kiem-tra-de.mjs và scripts/build-exam-set-sql.mjs (docs/ke-hoach-demo-luyen-thi.md, GĐ-D3):
// đọc tệp mô tả đề (supabase/content/de-thi/<slug>.json) + ngân hàng JSON, và tính độ xoay lựa chọn bằng đúng hàm
// `balancedShift` của lib/exams/compose.ts (Node chạy tệp .ts bằng type stripping) — thêm ràng buộc không quá 3 câu liền
// có cùng chữ cái đáp án.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { balancedShift, displayedCorrect } from "../../lib/exams/compose.ts";

export const ROOT = path.resolve(import.meta.dirname, "..", "..");
const BANK_DIR = path.join(ROOT, "supabase", "content", "ngan-hang");

/** Mọi câu (và tư liệu) trong ngân hàng JSON, tra theo content_key. */
export function loadBank() {
  const items = new Map();
  for (const name of readdirSync(BANK_DIR).filter((file) => file.endsWith(".json")).sort()) {
    const { passages = [], items: list = [] } = JSON.parse(readFileSync(path.join(BANK_DIR, name), "utf8"));
    const byKey = new Map(passages.map((passage) => [passage.key, passage]));
    for (const item of list) {
      if (!item.content_key) continue;
      if (items.has(item.content_key)) throw new Error(`content_key ${item.content_key} trùng (${name})`);
      items.set(item.content_key, { ...item, file: name, passageData: item.passage ? byKey.get(item.passage) : null });
    }
  }
  return items;
}

export function loadExam(slug) {
  return JSON.parse(readFileSync(path.join(ROOT, "supabase", "content", "de-thi", `${slug}.json`), "utf8"));
}

/** Bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32) — cùng đề luôn ra cùng độ xoay. */
function seeded(text) {
  let seed = [...text].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0, 7);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAX_RUN = 3;

/**
 * Độ xoay cho các câu trắc nghiệm theo thứ tự trong đề: chữ cái đáp án đang ít nhất (như balancedShift), không được tạo
 * chuỗi quá MAX_RUN câu liền cùng chữ (chữ đó bị coi như đã đủ). `correct` là chỉ số đáp án gốc.
 */
export function shiftsFor(slug, corrects) {
  const random = seeded(slug);
  const counts = [0, 0, 0, 0];
  const letters = [];
  return corrects.map((correct) => {
    const run = letters.slice(-MAX_RUN);
    const blocked = run.length === MAX_RUN && run.every((letter) => letter === run[0]) ? run[0] : null;
    const view = counts.map((count, letter) => (letter === blocked ? Number.MAX_SAFE_INTEGER : count));
    const shift = balancedShift(view, correct, random);
    const letter = displayedCorrect(correct, shift);
    counts[letter] += 1;
    letters.push(letter);
    return shift;
  });
}

/** Câu của đề theo đúng thứ tự, kèm phần, vị trí, độ xoay; thiếu khóa → lỗi. */
export function composeExam(slug) {
  const exam = loadExam(slug);
  const bank = loadBank();
  const pick = (key) => {
    const item = bank.get(key);
    if (!item) throw new Error(`Đề ${slug}: không có câu content_key "${key}" trong ngân hàng`);
    return item;
  };
  const section1 = exam.section1.map(pick);
  const section2 = exam.section2.map(pick);
  const shifts = shiftsFor(slug, section1.map((item) => item.correct ?? 0));
  return {
    exam,
    rows: [
      ...section1.map((item, index) => ({ item, section: 1, position: index + 1, shift: item.kind === "mcq" ? shifts[index] : 0 })),
      ...section2.map((item, index) => ({ item, section: 2, position: index + 1, shift: 0 })),
    ],
  };
}

export const LETTERS = ["A", "B", "C", "D"];
export { displayedCorrect };
