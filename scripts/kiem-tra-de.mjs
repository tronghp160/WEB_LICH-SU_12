// Kiểm một đề luyện thi định dạng thpt_2025 trước khi dựng SQL (skill kiem-tra-de-thpt; docs/ke-hoach-demo-luyen-thi.md,
// mục 6.2): 24 trắc nghiệm + 4 Đúng/Sai, ma trận chủ đề (theo số tiết) + câu lớp 11, mức độ sát 40/30/30, tư liệu, số ý
// đúng Phần II, rải đáp án A/B/C/D sau khi xoay (6/6/6/6, không quá 3 câu liền cùng chữ), lời giải đầy đủ, không trùng câu
// của de-1 / de-2. In bảng ma trận; có lỗi → mã thoát 1. Chỉ đọc tệp, không kết nối database.
//
// Dùng: node scripts/kiem-tra-de.mjs de-3

import { readFileSync } from "node:fs";
import path from "node:path";
import { composeExam, displayedCorrect, LETTERS, MAX_RUN, ROOT } from "./lib/de-thi.mjs";

const slug = process.argv[2] ?? "de-3";
const { exam, rows } = composeExam(slug);
const problems = [];
const check = (ok, message) => ok || problems.push(message);

// Chủ đề của từng bài (lib/sgk/curriculum.ts) và số câu lớp 12 mỗi chủ đề theo số tiết (mục 6.2).
const TOPIC_OF_LESSON = (number) => (number <= 3 ? 1 : number <= 5 ? 2 : number <= 9 ? 3 : number <= 11 ? 4 : number <= 14 ? 5 : 6);
const TOPIC_TARGET = { 1: 3, 2: 2, 3: 5, 4: 3, 5: 3, 6: 4 };
const GRADE11_TARGET = 4;
const LEVEL_SHORT = { nhan_biet: "NB", thong_hieu: "TH", van_dung: "VD" };
const LEVEL_TARGET = { nhan_biet: 0.4, thong_hieu: 0.3, van_dung: 0.3 };

const section1 = rows.filter((row) => row.section === 1);
const section2 = rows.filter((row) => row.section === 2);

// 1. Cấu trúc
check(exam.format === "thpt_2025" && exam.duration_min === 50, "Đề phải có format thpt_2025, 50 phút");
check(section1.length === 24 && section1.every((row) => row.item.kind === "mcq"), `Phần I cần đúng 24 câu trắc nghiệm (đang có ${section1.length})`);
check(section2.length === 4 && section2.every((row) => row.item.kind === "true_false"), `Phần II cần đúng 4 câu Đúng/Sai (đang có ${section2.length})`);
const keys = rows.map((row) => row.item.content_key);
check(new Set(keys).size === keys.length, "Có câu xuất hiện hai lần trong đề");

// 2. Ma trận chủ đề + lớp 11
const topicCount = {};
let grade11 = 0;
for (const { item } of section1) {
  if (item.grade === 11) grade11 += 1;
  else {
    const topic = TOPIC_OF_LESSON(Number(item.lesson_slug.split("-")[0]));
    topicCount[topic] = (topicCount[topic] ?? 0) + 1;
  }
}
for (const [topic, target] of Object.entries(TOPIC_TARGET)) check((topicCount[topic] ?? 0) === target, `Chủ đề ${topic}: ${topicCount[topic] ?? 0} câu, cần ${target}`);
check(grade11 === GRADE11_TARGET, `Câu lớp 11 ở Phần I: ${grade11}, cần ${GRADE11_TARGET}`);
check(section2.every(({ item }) => item.grade !== 11), "Phần II toàn câu lớp 12");

// 3. Mức độ toàn đề sát 40/30/30 (lệch ≤ 10 điểm %)
const levels = Object.fromEntries(Object.keys(LEVEL_TARGET).map((level) => [level, rows.filter(({ item }) => item.level === level).length]));
for (const [level, target] of Object.entries(LEVEL_TARGET)) {
  const share = levels[level] / rows.length;
  check(Math.abs(share - target) <= 0.1, `Mức ${LEVEL_SHORT[level]}: ${Math.round(share * 100)}%, cần ${target * 100}% ± 10`);
}

// 4. Tư liệu và Phần II
const passage1 = section1.filter(({ item }) => item.passage).length;
check(passage1 >= 2, `Phần I cần ≥ 2 câu có tư liệu (đang có ${passage1})`);
check(section2.every(({ item }) => item.passage), "Cả 4 câu Phần II phải dựa trên tư liệu");
const truths = section2.map(({ item }) => item.statements.map((statement) => statement.is_true));
truths.forEach((list, index) => {
  const count = list.filter(Boolean).length;
  check(count >= 1 && count <= 3, `Phần II câu ${index + 1}: ${count} ý đúng, cần 1–3`);
});
const totalTrue = truths.flat().filter(Boolean).length;
check(totalTrue >= 7 && totalTrue <= 9, `Phần II: tổng ${totalTrue} ý đúng, cần 7–9`);
for (let column = 0; column < 4; column++) {
  const values = truths.map((list) => list[column]);
  check(!values.every((value) => value === values[0]), `Phần II: ý ${"abcd"[column]}) của cả 4 câu cùng ${values[0] ? "Đúng" : "Sai"}`);
}

// 5. Rải đáp án sau khi xoay
const shown = section1.map(({ item, shift }) => displayedCorrect(item.correct, shift));
const letterCount = [0, 1, 2, 3].map((letter) => shown.filter((value) => value === letter).length);
check(letterCount.every((count) => count === 6), `Đáp án Phần I sau khi xoay: ${letterCount.join("/")}, cần 6/6/6/6`);
let run = 1;
for (let index = 1; index < shown.length; index++) {
  run = shown[index] === shown[index - 1] ? run + 1 : 1;
  check(run <= MAX_RUN, `Câu ${index - (MAX_RUN - 1)}–${index + 1}: hơn ${MAX_RUN} câu liền cùng đáp án ${LETTERS[shown[index]]}`);
}

// 6. Lời giải đầy đủ
for (const { item, section, position } of rows) {
  const where = `Phần ${section === 1 ? "I" : "II"} câu ${position} (${item.content_key})`;
  if (item.grade === 11) check(item.kind !== "mcq" || item.choice_notes?.every((note) => note.ref), `${where}: câu lớp 11 cần ref ở mọi lựa chọn`);
  else check(Boolean(item.section_id), `${where}: thiếu section_id`);
  if (item.kind === "mcq") {
    check(item.choice_notes?.length === 4, `${where}: thiếu lời giải 4 lựa chọn`);
    item.choice_notes?.forEach((note, slot) => check(slot === item.correct || Boolean(note.trap), `${where}: lựa chọn ${LETTERS[slot]} sai chưa có trap`));
  } else {
    item.statements.forEach((statement, slot) => check(statement.is_true || Boolean(statement.trap), `${where}: ý ${"abcd"[slot]}) sai chưa có trap`));
  }
}

// 7. Không trùng câu của đề mẫu de-1 / de-2 (supabase/seed-exam-mau.sql) — so câu hỏi đã bỏ dấu, gần giống ≥ 85%
const fold = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "");
const bigrams = (value) => {
  const grams = new Map();
  for (let index = 0; index < value.length - 1; index++) grams.set(value.slice(index, index + 2), (grams.get(value.slice(index, index + 2)) ?? 0) + 1);
  return grams;
};
const similarity = (a, b) => {
  const [left, right] = [fold(a), fold(b)];
  if (left === right) return 1;
  const grams = bigrams(left);
  let overlap = 0;
  for (const [gram, count] of bigrams(right)) overlap += Math.min(count, grams.get(gram) ?? 0);
  return (2 * overlap) / Math.max(1, left.length - 1 + right.length - 1);
};
const sample = readFileSync(path.join(ROOT, "supabase", "seed-exam-mau.sql"), "utf8");
const sampleStems = [...sample.matchAll(/\('de-[12]', \d+, '((?:[^']|'')*)'/g)].map((match) => match[1].replace(/''/g, "'"));
for (const { item, section, position } of rows) {
  const near = sampleStems.find((stem) => similarity(stem, item.stem) >= 0.85);
  check(!near, `Phần ${section === 1 ? "I" : "II"} câu ${position}: gần trùng câu của đề mẫu — “${near}”`);
}

// Bảng ma trận
console.log(`\n${exam.title} (${slug}) — ${rows.length} câu, ${exam.duration_min} phút\n`);
console.table(
  rows.map(({ item, section, position, shift }) => ({
    phần: section === 1 ? "I" : "II",
    câu: position,
    bài: item.grade === 11 ? "Lớp 11" : `Bài ${item.lesson_slug.split("-")[0]}${item.section_id ? ` › ${item.section_id.replace("muc-", "mục ")}` : ""}`,
    mức: LEVEL_SHORT[item.level],
    "tư liệu": item.passage ? "✔" : "",
    "đáp án": item.kind === "mcq" ? LETTERS[displayedCorrect(item.correct, shift)] : truths[position - 1].map((value) => (value ? "Đ" : "S")).join(""),
    khóa: item.content_key,
  })),
);
console.log(`Chủ đề (lớp 12, Phần I): ${Object.entries(topicCount).map(([topic, count]) => `CĐ${topic}: ${count}`).join(" · ")} · lớp 11: ${grade11}`);
console.log(`Mức độ toàn đề: NB ${levels.nhan_biet} · TH ${levels.thong_hieu} · VD ${levels.van_dung} (${rows.length} câu)`);
console.log(`Tư liệu: Phần I ${passage1}/24, Phần II ${section2.filter(({ item }) => item.passage).length}/4 · Ý đúng Phần II: ${truths.map((list) => list.filter(Boolean).length).join(" + ")} = ${totalTrue}`);
console.log(`Đáp án Phần I sau khi xoay: A ${letterCount[0]} · B ${letterCount[1]} · C ${letterCount[2]} · D ${letterCount[3]} — thứ tự ${shown.map((value) => LETTERS[value]).join("")}`);

if (problems.length) {
  console.log(`\nCHƯA ĐẠT (${problems.length}):`);
  for (const problem of problems) console.log(`  ✗ ${problem}`);
  process.exitCode = 1;
} else {
  console.log("\nĐẠT tất cả các điều kiện của đề thpt_2025.");
}
