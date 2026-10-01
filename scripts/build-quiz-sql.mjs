// Dựng supabase/seed-quiz.sql từ supabase/content/trac-nghiem.json (GĐ4.1: câu hỏi trắc nghiệm soạn tay).
// Mỗi câu hỏi gắn với một sự kiện theo slug; INSERT có "where not exists" (cùng sự kiện + cùng câu hỏi) nên chạy lại
// không tạo trùng. Script chỉ in SQL ra file để người phụ trách xem và duyệt; KHÔNG kết nối database.
//
// Dùng: node scripts/build-quiz-sql.mjs

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const input = path.join(root, "supabase", "content", "trac-nghiem.json");
const output = path.join(root, "supabase", "seed-quiz.sql");

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const eventId = (slug) => `(select id from public.historical_events where slug = ${q(slug)})`;

const { questions } = JSON.parse(readFileSync(input, "utf8"));
const out = [];
const perEvent = new Map();

questions.forEach((item, index) => {
  const where = `câu ${index + 1} (${item.event})`;
  if (!Array.isArray(item.choices) || item.choices.length !== 4) throw new Error(`${where}: cần đúng 4 đáp án`);
  if (new Set(item.choices.map((choice) => choice.trim().toLowerCase())).size !== 4) throw new Error(`${where}: đáp án trùng nhau`);
  if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) throw new Error(`${where}: correct phải từ 0 đến 3`);
  if (item.question.trim().length < 5 || item.question.length > 300) throw new Error(`${where}: câu hỏi dài 5–300 ký tự`);
  if (item.explanation.trim().length < 5 || item.explanation.length > 1000) throw new Error(`${where}: giải thích dài 5–1000 ký tự`);
  if (item.choices.some((choice) => choice.trim() === "" || choice.length > 200)) throw new Error(`${where}: đáp án trống hoặc quá 200 ký tự`);
  if (/\b(TODO|FIXME)\b/i.test(JSON.stringify(item))) throw new Error(`${where}: còn ghi chú TODO`);

  const order = (perEvent.get(item.event) ?? 0) + 1;
  perEvent.set(item.event, order);
  const choices = `array[${item.choices.map(q).join(", ")}]`;
  out.push(
    `insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select ${eventId(item.event)}, ${q(item.question)}, ${choices}, ${item.correct}, ${q(item.explanation)}, ${order}
where exists (select 1 from public.historical_events where slug = ${q(item.event)})
  and not exists (select 1 from public.quiz_questions where event_id = ${eventId(item.event)} and question = ${q(item.question)});`,
  );
});

const header = `-- Giai đoạn 4.1 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md): câu hỏi trắc nghiệm soạn tay cho ${perEvent.size} sự kiện (${questions.length} câu).
-- TỆP SINH TỰ ĐỘNG bởi scripts/build-quiz-sql.mjs từ supabase/content/trac-nghiem.json — sửa ở file JSON rồi chạy lại script.
-- KHÔNG phải migration: là dữ liệu, chạy SAU migration 20260930000001_quiz_questions.sql.
-- Câu hỏi hiện ở trang công khai khi sự kiện của nó đã công bố (RLS). Chỉ INSERT, không xóa; chạy lại không tạo trùng.
-- Đáp án và giải thích chỉ dùng chi tiết đã có trong bài viết của sự kiện; giáo viên đối chiếu SGK: docs/du-lieu-can-kiem-chung.md.
`;

writeFileSync(output, `${header}\nbegin;\n\n${out.join("\n\n")}\n\ncommit;\n\n-- Kiểm tra sau khi chạy:\n--   select e.slug, count(*) from public.quiz_questions q join public.historical_events e on e.id = q.event_id group by 1 order by 1;\n`);
console.log(`Đã ghi ${path.relative(root, output)}: ${questions.length} câu cho ${perEvent.size} sự kiện.`);
for (const [slug, count] of perEvent) console.log(`  ${slug.padEnd(48)} ${count} câu`);
