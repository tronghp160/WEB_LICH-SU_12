// Dựng supabase/seed-sgk.sql: cách gán sự kiện vào bài/mục SGK viết trong lib/sgk/curriculum.ts → bảng sgk_lesson_events
// (GĐ7 nâng cấp giao diện). Node 24 đọc thẳng file .ts (curriculum.ts không import gì).
//
// Dùng: node scripts/build-sgk-sql.mjs
// Script chỉ in SQL ra file để người phụ trách xem và duyệt; KHÔNG kết nối database.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { staticAssignments } from "../lib/sgk/curriculum.ts";

const root = path.resolve(import.meta.dirname, "..");
const q = (value) => `'${String(value).replace(/'/g, "''")}'`;

const rows = staticAssignments();
const statements = rows.map(
  (row) => `insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select ${q(row.lessonSlug)}, ${q(row.sectionId)}, e.id, ${row.sortOrder}
from public.historical_events e
where e.slug = ${q(row.eventSlug)}
on conflict (lesson_slug, section_id, event_id) do nothing;`,
);

const sql = `-- GĐ7 nâng cấp giao diện: dữ liệu ban đầu của bảng sgk_lesson_events (sự kiện nào thuộc bài/mục SGK nào).
-- TỆP SINH TỰ ĐỘNG bởi scripts/build-sgk-sql.mjs từ lib/sgk/curriculum.ts — sửa ở đó rồi chạy lại script.
-- KHÔNG phải migration: là dữ liệu, chạy SAU migration 20261001000000_sgk_lesson_events.sql và SAU seed-content-gd7.sql
-- (sự kiện mới chưa có trong database thì dòng gán của nó tự bỏ qua; chạy lại sau sẽ bổ sung).
--
-- ${rows.length} dòng gán. Chỉ INSERT, "on conflict do nothing" nên chạy lại không tạo trùng và không đè cách gán đã sửa
-- trong trang quản trị "Bài SGK".

begin;

${statements.join("\n\n")}

commit;

-- Kiểm tra: select lesson_slug, count(*) from public.sgk_lesson_events group by 1 order by 1;
`;

writeFileSync(path.join(root, "supabase", "seed-sgk.sql"), sql);
console.log(`→ supabase/seed-sgk.sql (${rows.length} dòng gán)`);
