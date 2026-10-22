// Thống kê ngân hàng câu hỏi soạn bằng JSON (supabase/content/ngan-hang/*.json) theo bài × mục × dạng × mức độ × tư liệu,
// và so với chỉ tiêu của docs/ke-hoach-demo-luyen-thi.md (mục 5.2) cho các tệp bai-*.json. Chỉ đọc tệp, không kết nối DB.
//
// Dùng: node scripts/thong-ke-ngan-hang.mjs [tên-tệp…]   (bỏ trống = mọi tệp)

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "..", "supabase", "content", "ngan-hang");
const wanted = process.argv.slice(2);
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".json") && (wanted.length === 0 || wanted.some((item) => name.startsWith(item))))
  .sort();

const LEVELS = ["nhan_biet", "thong_hieu", "van_dung"];
const LEVEL_SHORT = { nhan_biet: "NB", thong_hieu: "TH", van_dung: "VD" };
const COMPETENCIES = ["tim_hieu_lich_su", "nhan_thuc_tu_duy", "van_dung_kien_thuc"];
// Chỉ tiêu mỗi bài (mục 5.2): 30 trắc nghiệm 12/9/9, ≥ 10 có tư liệu; 8 Đúng/Sai 2/3/3, ≥ 5 có tư liệu.
const TARGET = { mcq: { total: 30, levels: [12, 9, 9], passage: 10 }, true_false: { total: 8, levels: [2, 3, 3], passage: 5 } };

let failed = false;
for (const name of files) {
  const { items = [] } = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
  console.log(`\n=== ${name}: ${items.length} câu ===`);
  const byLesson = new Map();
  for (const item of items) {
    const lesson = item.lesson_slug ? `Bài ${item.lesson_slug.split("-")[0]}` : (item.topic_tag ?? "?");
    if (!byLesson.has(lesson)) byLesson.set(lesson, []);
    byLesson.get(lesson).push(item);
  }
  for (const [lesson, list] of byLesson) {
    console.log(`\n${lesson}`);
    const rows = [];
    for (const kind of ["mcq", "true_false"]) {
      const ofKind = list.filter((item) => item.kind === kind);
      if (ofKind.length === 0) continue;
      const levels = LEVELS.map((level) => ofKind.filter((item) => item.level === level).length);
      const passage = ofKind.filter((item) => item.passage).length;
      const sections = {};
      for (const item of ofKind) sections[item.section_id ?? "—"] = (sections[item.section_id ?? "—"] ?? 0) + 1;
      rows.push({
        dạng: kind === "mcq" ? "Trắc nghiệm" : "Đúng/Sai",
        tổng: ofKind.length,
        "NB/TH/VD": levels.join("/"),
        "tư liệu": passage,
        "theo mục": Object.entries(sections).sort().map(([section, count]) => `${section}:${count}`).join(" "),
      });
      if (/^bai-\d+/.test(name)) {
        const target = TARGET[kind];
        const problems = [];
        if (ofKind.length < target.total) problems.push(`thiếu câu (${ofKind.length}/${target.total})`);
        levels.forEach((count, index) => {
          if (count < target.levels[index]) problems.push(`${LEVEL_SHORT[LEVELS[index]]} ${count}/${target.levels[index]}`);
        });
        if (passage < target.passage) problems.push(`tư liệu ${passage}/${target.passage}`);
        if (problems.length) {
          failed = true;
          console.log(`  ✗ ${kind}: ${problems.join(", ")}`);
        }
      }
    }
    console.table(rows);
    const mcq = list.filter((item) => item.kind === "mcq");
    const letters = [0, 0, 0, 0];
    for (const item of mcq) letters[item.correct] += 1;
    const competencies = COMPETENCIES.map((competency) => list.filter((item) => item.competency === competency).length);
    const truths = list.filter((item) => item.kind === "true_false").map((item) => item.statements.filter((statement) => statement.is_true).length);
    console.log(`  Đáp án gốc A/B/C/D: ${letters.join("/")} · Năng lực tìm hiểu/nhận thức/vận dụng: ${competencies.join("/")} · Số ý đúng từng câu Đ/S: ${truths.join(",") || "—"}`);
  }
}
if (failed) {
  console.log("\nCHƯA ĐẠT chỉ tiêu (docs/ke-hoach-demo-luyen-thi.md, mục 5.2).");
  process.exitCode = 1;
}
