// Dựng supabase/seed-content.sql từ các file Markdown trong supabase/content/su-kien/ (GĐ3).
// Mỗi file = một sự kiện: phần đầu (giữa hai dòng ---) là thông tin, phần sau là nội dung theo khung
// Bối cảnh – Diễn biến – Kết quả – Ý nghĩa – Câu chuyện nhỏ – Em có biết? – Di tích ngày nay.
//
//   mode: update → CHỈ thay nội dung sự kiện đã có (kèm điều kiện md5 của nội dung cũ, để không đè bản đã sửa tay).
//   mode: new    → thêm sự kiện mới ở trạng thái NHÁP (draft): phải qua kiểm duyệt trong trang quản trị mới công khai.
//
// Dùng: node scripts/build-content-sql.mjs [--md5 <file json slug→md5 nội dung hiện tại>]
//       node scripts/build-content-sql.mjs --batch gd7
//   --batch <tên>: chỉ các file có "batch: <tên>" + chủ đề mới (chu-de-<tên>.json) + địa điểm mới (dia-diem-<tên>.json)
//                  → supabase/seed-content-<tên>.sql. Không có --batch: các file KHÔNG thuộc đợt nào → seed-content.sql
//                  như trước (đợt mới không lẫn vào tệp đã chạy).
// Script chỉ in SQL ra file để người phụ trách xem và duyệt; KHÔNG kết nối database.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const root = path.resolve(import.meta.dirname, "..");
const contentDir = path.join(root, "supabase", "content", "su-kien");
const { values: args } = parseArgs({ options: { md5: { type: "string" }, batch: { type: "string" } } });
const batch = args.batch;
const currentMd5 = args.md5 ? JSON.parse(readFileSync(args.md5, "utf8")) : {};

const SGK = "Sách giáo khoa Lịch sử 12";
const SOURCE_NOTE = "Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).";
const REQUIRED_NEW = ["slug", "title", "topic", "start_year", "date_text", "date_precision", "summary", "locations"];

const q = (value) => (value === undefined || value === null || value === "" ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const dollar = (text) => {
  if (text.includes("$md$")) throw new Error("Nội dung chứa $md$");
  return `$md$${text}$md$`;
};

function parseFile(file) {
  const raw = readFileSync(path.join(contentDir, file), "utf8").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${file}: thiếu phần đầu --- … ---`);
  const meta = {};
  for (const line of match[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  const content = match[2].trim();
  if (/\b(TODO|FIXME)\b/i.test(content)) throw new Error(`${file}: còn ghi chú TODO trong nội dung`);
  return { file, meta, content };
}

const list = (value) => (value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []);
const topicId = (slug) => `(select id from public.curriculum_topics where slug = ${q(slug)})`;
const eventId = (slug) => `(select id from public.historical_events where slug = ${q(slug)})`;

const files = readdirSync(contentDir).filter((file) => file.endsWith(".md")).sort();
const items = files.map(parseFile).filter((item) => (batch ? item.meta.batch === batch : !item.meta.batch));
if (items.length === 0) throw new Error(`Không có file nội dung nào${batch ? ` thuộc đợt "${batch}"` : ""}.`);
const out = [];
const report = [];

for (const { file, meta, content } of items) {
  const words = content.replace(/[#>*\-]/g, " ").split(/\s+/).filter(Boolean).length;
  const headings = [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  report.push(`${meta.mode === "new" ? "MỚI " : "SỬA "} ${meta.slug.padEnd(48)} ${String(words).padStart(4)} chữ · ${headings.length} mục`);

  if (meta.mode === "update") {
    const guard = currentMd5[meta.slug] ? ` and md5(content) = ${q(currentMd5[meta.slug])}` : "";
    out.push(`-- ${file}\nupdate public.historical_events set content = ${dollar(content)}\nwhere slug = ${q(meta.slug)}${guard};`);
  } else if (meta.mode === "new") {
    for (const key of REQUIRED_NEW) if (!meta[key]) throw new Error(`${file}: thiếu ${key}`);
    out.push(`-- ${file} (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select ${topicId(meta.topic)}, ${q(meta.title)}, ${q(meta.slug)}, ${Number(meta.start_year)}, ${meta.end_year ? Number(meta.end_year) : "null"},
  ${q(meta.start_date)}, ${q(meta.end_date)}, ${q(meta.date_text)}, ${q(meta.date_precision)}, ${q(meta.summary)},
  ${dollar(content)}, false, 'draft'
where not exists (select 1 from public.historical_events where slug = ${q(meta.slug)});`);
    out.push(`insert into public.event_sources (event_id, source_id, source_note)
select ${eventId(meta.slug)}, (select id from public.sources where title = ${q(SGK)}), ${q(SOURCE_NOTE)}
where not exists (select 1 from public.event_sources where event_id = ${eventId(meta.slug)});`);
    for (const entry of meta.locations.split(";")) {
      const [slug, role, primary] = entry.split("|").map((part) => part.trim());
      out.push(`insert into public.event_locations (event_id, location_id, location_role, is_primary)
select ${eventId(meta.slug)}, (select id from public.historical_locations where slug = ${q(slug)}), ${q(role)}, ${primary === "primary"}
where not exists (select 1 from public.event_locations where event_id = ${eventId(meta.slug)} and location_id = (select id from public.historical_locations where slug = ${q(slug)}));`);
    }
    for (const [index, entry] of (meta.figures ? meta.figures.split(";") : []).entries()) {
      const [slug, relationship] = entry.split("|").map((part) => part.trim());
      out.push(`insert into public.event_figures (event_id, figure_id, relationship, sort_order)
select ${eventId(meta.slug)}, (select id from public.historical_figures where slug = ${q(slug)}), ${q(relationship)}, ${index + 1}
where not exists (select 1 from public.event_figures where event_id = ${eventId(meta.slug)} and figure_id = (select id from public.historical_figures where slug = ${q(slug)}));`);
    }
  } else {
    throw new Error(`${file}: mode phải là update hoặc new`);
  }

  for (const topic of list(meta.secondary_topics)) {
    out.push(`insert into public.event_topics (event_id, topic_id)
select ${eventId(meta.slug)}, ${topicId(topic)}
where not exists (select 1 from public.event_topics where event_id = ${eventId(meta.slug)} and topic_id = ${topicId(topic)});`);
  }
}

const locations = JSON.parse(readFileSync(path.join(root, "supabase", "content", batch ? `dia-diem-${batch}.json` : "dia-diem-moi.json"), "utf8"));
const topics = batch ? JSON.parse(readFileSync(path.join(root, "supabase", "content", `chu-de-${batch}.json`), "utf8")) : [];
const topicSql = topics.map(
  (item) => `insert into public.curriculum_topics (name, slug, description, sort_order, workflow_status)
select ${q(item.name)}, ${q(item.slug)}, ${q(item.description)}, ${Number(item.sort_order)}, 'draft'
where not exists (select 1 from public.curriculum_topics where slug = ${q(item.slug)});`,
);
const locationSql = locations.map(
  (item) => `insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select ${q(item.name)}, ${q(item.historical_name)}, ${q(item.slug)}, ${q(item.description)}, ${item.latitude}, ${item.longitude}, ${q(item.accuracy_level)}, ${q(item.accuracy_note)}, 'draft'
where not exists (select 1 from public.historical_locations where slug = ${q(item.slug)});`,
);

const sql = `-- Giai đoạn 3 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md, mục 3.1–3.3): nội dung theo khung chuẩn.
-- TỆP SINH TỰ ĐỘNG bởi scripts/build-content-sql.mjs từ supabase/content/ — sửa nội dung ở các file .md rồi chạy lại script.
-- KHÔNG phải migration: là dữ liệu, chạy SAU seed.sql, seed-media.sql và migration 20260930000000_event_topics.sql.
--
-- 1. Viết lại nội dung ${items.filter((i) => i.meta.mode === "update").length} sự kiện đã công bố theo khung Bối cảnh – Diễn biến – Kết quả – Ý nghĩa – Câu chuyện nhỏ –
--    Em có biết? – Di tích ngày nay. Mỗi UPDATE chỉ chạy khi nội dung cũ còn nguyên (so md5), không đè bản đã sửa tay.
-- 2. Thêm ${items.filter((i) => i.meta.mode === "new").length} sự kiện mới và ${locations.length} địa điểm mới ở trạng thái NHÁP (draft) — phải qua kiểm duyệt mới hiện ở trang công khai.
-- 3. Gắn chủ đề phụ (event_topics), ví dụ Genève/Paris → "Lịch sử đối ngoại".
-- 4. Sửa chú thích ảnh xe tăng 843 (xe ở Dinh Độc Lập là xe cùng loại; xe nguyên bản ở Hà Nội).
--
-- Chỉ UPDATE/INSERT, không xóa. Mọi INSERT có "where not exists" nên chạy lại không tạo trùng.
-- Nội dung cần giáo viên đối chiếu SGK: xem docs/du-lieu-can-kiem-chung.md, mục "Nội dung GĐ3".

begin;

-- ---------- Địa điểm mới (nháp) ----------
${locationSql.join("\n\n")}

-- ---------- Sự kiện ----------
${out.join("\n\n")}

-- ---------- Sửa chú thích ảnh xe tăng 843 ----------
update public.media_assets
set caption = 'Xe tăng mang số hiệu 843 trưng bày trong khuôn viên Dinh Độc Lập (ảnh năm 2007) — đây là xe cùng loại; hai xe tăng 390 và 843 nguyên bản tiến vào Dinh trưa 30/4/1975 là Bảo vật quốc gia, được lưu giữ tại Hà Nội.'
where file_url like '%/events/chien-dich-ho-chi-minh/xe-tang-dinh-doc-lap-1200.webp'
  and caption like 'Xe tăng 843, một trong những xe tăng đầu tiên%';

commit;
`;

if (batch) {
  const batchSql = `-- Đợt nội dung "${batch}" (KE_HOACH_NANG_CAP_GIAO_DIEN.md, GĐ7: nội dung còn thiếu của các bài SGK).
-- TỆP SINH TỰ ĐỘNG bởi: node scripts/build-content-sql.mjs --batch ${batch} — sửa các file .md có "batch: ${batch}" rồi chạy lại.
-- KHÔNG phải migration: là dữ liệu, chạy SAU seed-content.sql. Sau đó chạy supabase/seed-sgk.sql để gán sự kiện vào bài.
--
-- Thêm ${topics.length} chủ đề, ${locations.length} địa điểm và ${items.length} sự kiện ở trạng thái NHÁP (draft): phải qua kiểm duyệt trong trang
-- quản trị (chủ đề và địa điểm công bố TRƯỚC sự kiện) mới hiện ở trang công khai.
-- Chỉ INSERT, mọi câu có "where not exists" nên chạy lại không tạo trùng. Không xóa, không sửa dữ liệu cũ.
-- Nội dung cần giáo viên đối chiếu SGK: docs/du-lieu-can-kiem-chung.md, mục "Nội dung GĐ7".

begin;

-- ---------- Chủ đề mới (nháp) ----------
${topicSql.join("\n\n")}

-- ---------- Địa điểm mới (nháp) ----------
${locationSql.join("\n\n")}

-- ---------- Sự kiện mới (nháp) ----------
${out.join("\n\n")}

commit;
`;
  writeFileSync(path.join(root, "supabase", `seed-content-${batch}.sql`), batchSql);
  console.log(report.join("\n"));
  console.log(`→ supabase/seed-content-${batch}.sql (${batchSql.length} ký tự)`);
} else {
  writeFileSync(path.join(root, "supabase", "seed-content.sql"), sql);
  console.log(report.join("\n"));
  console.log(`→ supabase/seed-content.sql (${sql.length} ký tự)`);
}
