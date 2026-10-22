// Dựng supabase/seed-ngan-hang.sql từ supabase/content/ngan-hang/*.json (docs/ke-hoach-luyen-thi.md, mục 7.2 — định dạng
// giống trang quản trị "Nhập từ JSON"). Mọi câu / tư liệu vào trạng thái NHÁP; kiểm duyệt viên duyệt trên giao diện.
// Chạy lại không tạo trùng: câu có dấu vân tay đã có thì bỏ qua (ON CONFLICT fingerprint — trigger tự tính trước khi
// kiểm trùng), tư liệu trùng tên + nội dung thì dùng lại. Câu có `content_key` (docs/ke-hoach-demo-luyen-thi.md, GĐ-D1):
// gắn khóa cho câu nháp cũ cùng dấu vân tay, rồi ON CONFLICT content_key cập nhật nội dung — chỉ khi câu còn nháp / cần
// chỉnh sửa, không đè câu đang chờ duyệt hoặc đã công bố. Script chỉ in SQL ra file để người phụ trách xem và chạy trong
// SQL Editor; KHÔNG kết nối database.
//
// Kiểm tra ở đây là phần tối thiểu để SQL chạy được; kiểm đầy đủ (bài SGK, sự kiện, câu trùng, cảnh báo soạn câu) bằng nút
// "Kiểm tra" ở /quan-tri/ngan-hang-cau-hoi/nhap.
//
// Dùng: node scripts/build-exam-bank-sql.mjs

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
// Tham số tùy chọn (để thử): thư mục JSON, tệp SQL ra.
const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "supabase", "content", "ngan-hang");
const output = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, "supabase", "seed-ngan-hang.sql");

const LEVELS = new Set(["nhan_biet", "thong_hieu", "van_dung"]);
const COMPETENCIES = new Set(["tim_hieu_lich_su", "nhan_thuc_tu_duy", "van_dung_kien_thuc"]);
const lessons = new Set([...readFileSync(path.join(root, "lib", "sgk", "curriculum.ts"), "utf8").matchAll(/slug: "(\d+-[a-z0-9-]+)"/g)].map((match) => match[1]));

const q = (value) => (value === null || value === undefined || value === "" ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const length = (value, min, max) => typeof value === "string" && value.trim().length >= min && value.length <= max;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SECTION = /^muc-[0-9]{1,2}$/;
const TRAPS = new Set(["thoi_gian", "chu_the", "dia_diem", "so_lieu", "nhan_qua", "tuyet_doi", "khai_niem", "ban_chat"]);
const contentKeys = new Map();

/** Vị trí kiến thức + kiểu bẫy của một lựa chọn / ý (migration 20261101000000_exam_item_explain.sql) — chỉ giữ khóa có giá trị. */
function refOf(value, where) {
  const ref = {};
  if (value.lesson_slug) {
    if (!lessons.has(value.lesson_slug)) throw new Error(`${where}: bài SGK lạ ${value.lesson_slug}`);
    ref.lesson_slug = value.lesson_slug;
  }
  if (value.section_id) {
    if (!SECTION.test(value.section_id)) throw new Error(`${where}: section_id ${value.section_id} không đúng dạng muc-N`);
    ref.section_id = value.section_id;
  }
  if (value.ref) {
    if (!length(value.ref, 3, 160)) throw new Error(`${where}: ref dài 3–160 ký tự`);
    ref.ref = value.ref.trim();
  }
  if (value.trap) {
    if (!TRAPS.has(value.trap)) throw new Error(`${where}: trap lạ ${value.trap}`);
    ref.trap = value.trap;
  }
  return ref;
}

const files = existsSync(inputDir) ? readdirSync(inputDir).filter((name) => name.endsWith(".json")).sort() : [];
const out = [
  "-- SINH TỰ ĐỘNG bởi scripts/build-exam-bank-sql.mjs từ supabase/content/ngan-hang/*.json — không sửa tay.",
  "-- Chạy SAU migration 20261025000000_exam_bank.sql và 20261101000000_exam_item_explain.sql. Mọi câu / tư liệu mới vào trạng",
  "-- thái nháp. Chạy lại không tạo trùng; câu có content_key còn nháp thì được cập nhật theo tệp JSON.",
  "",
  "begin;",
];
let itemCount = 0;

for (const name of files) {
  const { passages = [], items = [] } = JSON.parse(readFileSync(path.join(inputDir, name), "utf8"));
  const passageSql = new Map();
  out.push("", `-- ===== ${name} =====`);

  for (const passage of passages) {
    const where = `${name}, tư liệu ${passage.key}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(passage.key ?? "")) throw new Error(`${where}: key không hợp lệ`);
    if (!length(passage.title, 3, 160) || !length(passage.body, 30, 2000) || !length(passage.source_citation, 5, 500)) throw new Error(`${where}: thiếu tên / nội dung / nguồn hoặc sai độ dài`);
    if (passage.lesson_slug && !lessons.has(passage.lesson_slug)) throw new Error(`${where}: bài SGK lạ ${passage.lesson_slug}`);
    const match = `title = ${q(passage.title.trim())} and body = ${q(passage.body.trim())}`;
    out.push(
      `insert into public.exam_passages (title, body, source_citation, lesson_slug)
select ${q(passage.title.trim())}, ${q(passage.body.trim())}, ${q(passage.source_citation.trim())}, ${q(passage.lesson_slug)}
where not exists (select 1 from public.exam_passages where ${match});`,
    );
    passageSql.set(passage.key, `(select id from public.exam_passages where ${match} order by created_at limit 1)`);
  }

  items.forEach((item, index) => {
    const where = `${name}, câu ${index + 1}`;
    if (/\b(TODO|FIXME)\b/i.test(JSON.stringify(item))) throw new Error(`${where}: còn ghi chú TODO`);
    if (!length(item.stem, 5, 800) || !length(item.explanation, 5, 2000) || !length(item.source_note, 3, 500)) throw new Error(`${where}: thiếu câu hỏi / lời giải / nguồn hoặc sai độ dài`);
    if (!LEVELS.has(item.level) || !COMPETENCIES.has(item.competency)) throw new Error(`${where}: level / competency không hợp lệ`);
    const grade = item.grade ?? 12;
    if (grade !== 11 && grade !== 12) throw new Error(`${where}: grade phải là 11 hoặc 12`);
    if (item.lesson_slug && (grade !== 12 || !lessons.has(item.lesson_slug))) throw new Error(`${where}: bài SGK lạ hoặc câu lớp 11 gắn bài lớp 12`);
    if (item.passage && !passageSql.has(item.passage)) throw new Error(`${where}: không có tư liệu key "${item.passage}" trong tệp`);

    if (item.section_id && (!SECTION.test(item.section_id) || !item.lesson_slug)) throw new Error(`${where}: section_id phải dạng muc-N và đi kèm lesson_slug`);
    if (item.remember && !length(item.remember, 10, 300)) throw new Error(`${where}: remember dài 10–300 ký tự`);
    if (item.content_key !== undefined && !SLUG.test(item.content_key ?? "")) throw new Error(`${where}: content_key không hợp lệ`);
    if (item.content_key && contentKeys.has(item.content_key)) throw new Error(`${where}: content_key ${item.content_key} trùng ${contentKeys.get(item.content_key)}`);
    if (item.content_key) contentKeys.set(item.content_key, where);

    let shape;
    let choicesSql = "null";
    let statementsSql = "null";
    let notesSql = "null";
    if (item.kind === "mcq") {
      if (!Array.isArray(item.choices) || item.choices.length !== 4 || !item.choices.every((choice) => length(choice, 1, 300))) throw new Error(`${where}: cần đúng 4 lựa chọn`);
      if (new Set(item.choices.map((choice) => choice.trim().toLowerCase())).size !== 4) throw new Error(`${where}: lựa chọn trùng nhau`);
      if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) throw new Error(`${where}: correct phải từ 0 đến 3`);
      choicesSql = `array[${item.choices.map((choice) => q(choice.trim())).join(", ")}]`;
      shape = `${choicesSql}, ${item.correct}, null`;
      if (item.choice_notes) {
        if (!Array.isArray(item.choice_notes) || item.choice_notes.length !== 4 || !item.choice_notes.every((note) => length(note?.note, 10, 500))) {
          throw new Error(`${where}: choice_notes cần đúng 4 phần tử, mỗi note 10–500 ký tự`);
        }
        notesSql = `${q(JSON.stringify(item.choice_notes.map((note) => ({ note: note.note.trim(), ...refOf(note, where) }))))}::jsonb`;
      }
    } else if (item.kind === "true_false") {
      const statements = item.statements;
      if (!Array.isArray(statements) || statements.length !== 4) throw new Error(`${where}: cần đúng 4 ý`);
      if (!statements.every((s) => length(s.text, 5, 500) && typeof s.is_true === "boolean" && length(s.explanation, 5, 1000))) throw new Error(`${where}: mỗi ý cần text, is_true, explanation`);
      if (item.choice_notes) throw new Error(`${where}: câu Đúng/Sai không có choice_notes`);
      const json = JSON.stringify(statements.map((s) => ({ text: s.text.trim(), is_true: s.is_true, explanation: s.explanation.trim(), ...refOf(s, where) })));
      statementsSql = `${q(json)}::jsonb`;
      shape = `null, null, ${statementsSql}`;
    } else {
      throw new Error(`${where}: kind phải là mcq hoặc true_false`);
    }
    const eventSlug = item.event ?? item.event_slug;
    const event = eventSlug ? `(select id from public.historical_events where slug = ${q(eventSlug)})` : "null";
    const columns = "kind, stem, passage_id, choices, correct_index, statements, choice_notes, explanation, remember, grade, lesson_slug, section_id, topic_tag, level, competency, event_id, source_note";
    const values = `'${item.kind}', ${q(item.stem.trim())}, ${item.passage ? passageSql.get(item.passage) : "null"}, ${shape}, ${notesSql}, ${q(item.explanation.trim())}, ${q(item.remember?.trim())}, ${grade}, ${q(item.lesson_slug)}, ${q(item.section_id)}, ${q(item.topic_tag?.trim())}, '${item.level}', '${item.competency}', ${event}, ${q(item.source_note.trim())}`;
    if (item.content_key) {
      // Câu nháp cũ (chưa có khóa) cùng dấu vân tay → gắn khóa để cập nhật thay vì tạo câu trùng.
      out.push(
        `update public.exam_items set content_key = ${q(item.content_key)}
 where content_key is null and fingerprint = public.exam_item_fingerprint('${item.kind}', ${q(item.stem.trim())}, ${item.kind === "mcq" ? choicesSql : "null"}, ${statementsSql})
   and not exists (select 1 from public.exam_items where content_key = ${q(item.content_key)});`,
        // Chạy lại: chỉ cập nhật câu còn nháp / cần chỉnh sửa — không đè câu đang chờ duyệt hoặc đã công bố.
        `insert into public.exam_items (content_key, ${columns})
values (${q(item.content_key)}, ${values})
on conflict (content_key) do update set ${columns.split(", ").map((column) => `${column} = excluded.${column}`).join(", ")}
 where public.exam_items.workflow_status in ('draft', 'needs_revision');`,
      );
    } else {
      out.push(
        `insert into public.exam_items (${columns})
values (${values})
on conflict (fingerprint) do nothing;`,
      );
    }
    itemCount++;
  });
}

out.push("", "commit;", "");
writeFileSync(output, out.join("\n"));
console.log(`Đã ghi ${path.relative(root, output)}: ${files.length} tệp, ${itemCount} câu.`);
