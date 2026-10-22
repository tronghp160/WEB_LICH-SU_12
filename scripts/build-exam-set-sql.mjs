// Dựng supabase/seed-<slug>.sql từ supabase/content/de-thi/<slug>.json (docs/ke-hoach-demo-luyen-thi.md, GĐ-D3): cập nhật
// thông tin đề trong exam_sets, xếp lại toàn bộ câu của đề (exam_set_items) theo content_key với độ xoay tính bằng
// scripts/lib/de-thi.mjs (cùng thuật toán balancedShift của lib/exams/compose.ts). Chạy lại được; từ chối nếu đề đã công
// bố (không sửa đề đang có người làm) hoặc thiếu câu. Chỉ in SQL ra tệp để người phụ trách xem và chạy trong SQL Editor —
// KHÔNG kết nối database. Câu phải có sẵn trong ngân hàng (chạy supabase/seed-ngan-hang.sql trước).
//
// Dùng: node scripts/build-exam-set-sql.mjs de-3   (nên chạy node scripts/kiem-tra-de.mjs de-3 trước)

import { writeFileSync } from "node:fs";
import path from "node:path";
import { composeExam, ROOT } from "./lib/de-thi.mjs";

const slug = process.argv[2] ?? "de-3";
const { exam, rows } = composeExam(slug);
const q = (value) => (value === null || value === undefined ? "null" : `'${String(value).replace(/'/g, "''")}'`);
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error("slug không hợp lệ");

const values = rows.map(({ item, section, position, shift }) => `    (${q(item.content_key)}, ${section}, ${position}, ${shift})`).join(",\n");
const sql = `-- SINH TỰ ĐỘNG bởi scripts/build-exam-set-sql.mjs từ supabase/content/de-thi/${slug}.json — không sửa tay.
-- Chạy SAU migration 20261101000000_exam_item_explain.sql và supabase/seed-ngan-hang.sql (câu phải có sẵn, tra theo
-- content_key). Đề vẫn ở trạng thái hiện tại (nháp); công bố đề ở bước sau (seed demo hoặc giao diện duyệt).
-- ${exam.section1.length} câu Phần I + ${exam.section2.length} câu Phần II. Chạy lại được.

begin;

do $$
begin
  if not exists (select 1 from public.exam_sets where slug = ${q(slug)}) then
    raise exception 'Chưa có đề ${slug} (seed-payments.sql tạo sẵn de-1 … de-10).';
  end if;
  if exists (select 1 from public.exam_sets where slug = ${q(slug)} and workflow_status = 'published') then
    raise exception 'Đề ${slug} đã công bố — không xếp lại câu của đề đang có người làm.';
  end if;
end
$$;

update public.exam_sets
   set title = ${q(exam.title)},
       description = ${q(exam.description)},
       format = ${q(exam.format)},
       duration_min = ${exam.duration_min},
       difficulty = ${exam.difficulty},
       product_id = ${exam.free ? "null" : "product_id"}
 where slug = ${q(slug)};

delete from public.exam_set_items where set_id = (select id from public.exam_sets where slug = ${q(slug)});

insert into public.exam_set_items (set_id, item_id, section, position, choice_shift)
select s.id, i.id, v.section, v.position, v.shift
  from (values
${values}
  ) as v(content_key, section, position, shift)
  join public.exam_items i on i.content_key = v.content_key
 cross join (select id from public.exam_sets where slug = ${q(slug)}) as s;

do $$
declare
  n integer;
begin
  select count(*) into n from public.exam_set_items where set_id = (select id from public.exam_sets where slug = ${q(slug)});
  if n <> ${rows.length} then
    raise exception 'Đề ${slug} chỉ ghép được % / ${rows.length} câu — thiếu câu trong ngân hàng (chạy seed-ngan-hang.sql trước).', n;
  end if;
end
$$;

commit;

-- Kiểm tra:
--   select section, count(*), sum(choice_shift) from public.exam_set_items
--    where set_id = (select id from public.exam_sets where slug = ${q(slug)}) group by section order by section;   → 1: ${exam.section1.length} câu · 2: ${exam.section2.length} câu
`;
const output = path.join(ROOT, "supabase", `seed-${slug}.sql`);
writeFileSync(output, sql);
console.log(`Đã ghi ${path.relative(ROOT, output)}: ${rows.length} câu.`);
