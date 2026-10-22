-- Seed demo luyện thi (docs/ke-hoach-demo-luyen-thi.md, GĐ-D4).
--
-- ⚠ CHẠY FILE NÀY SẼ CÔNG BỐ (học sinh thấy ngay) câu hỏi của Bài 6, 7, 8 cùng các câu và tư liệu của Đề luyện thi số 3,
-- và công bố Đề luyện thi số 3 (miễn phí) — CHƯA QUA MÀN HÌNH KIỂM DUYỆT. Mọi câu được công bố mang ghi chú
-- review_note = 'Demo 10/2026 — cần giáo viên đối chiếu SGK in' để giáo viên lọc ra duyệt lại; những dữ kiện chưa chắc ghi
-- ở docs/du-lieu-can-kiem-chung.md, mục 6f. Cách chuẩn (không dùng file này): duyệt từng câu ở /quan-tri/ngan-hang-cau-hoi
-- rồi công bố đề ở /quan-tri/de-luyen-thi.
--
-- Thứ tự chạy (mỗi file một lần, trong Supabase SQL Editor):
--   1. migration 20261101000000_exam_item_explain.sql   (đã chạy 22/10/2026)
--   2. supabase/seed-ngan-hang.sql                       (nạp / cập nhật câu nháp theo content_key)
--   3. supabase/seed-de-3.sql                            (ghép 24 + 4 câu vào đề de-3, đề vẫn nháp)
--   4. supabase/seed-demo-luyen-thi.sql                  (file này)
-- Chạy lại được: câu / tư liệu / đề đã công bố thì giữ nguyên.

begin;

-- 0. Điều kiện trước: đã chạy bước 1 – 3.
do $$
declare
  n_bank integer;
  n_set integer;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'exam_items' and column_name = 'content_key') then
    raise exception 'Chưa chạy migration 20261101000000_exam_item_explain.sql.';
  end if;
  select count(*) into n_bank from public.exam_items where content_key ~ '^b[678]-m[0-9]+-(tn|ds)-[0-9]+$';
  if n_bank < 114 then
    raise exception 'Mới có % / 114 câu Bài 6 – 8 có content_key — chạy supabase/seed-ngan-hang.sql trước.', n_bank;
  end if;
  select count(*) into n_set from public.exam_set_items where set_id = (select id from public.exam_sets where slug = 'de-3');
  if n_set <> 28 then
    raise exception 'Đề de-3 đang có % / 28 câu — chạy supabase/seed-de-3.sql trước.', n_set;
  end if;
end
$$;

-- 1. Xóa 2 câu nháp cũ (lô nháp 16/10/2026, chu-de-3.json) đã được thay bằng b7-m2-tn-02 và b7-m3-tn-02 — chỉ khi vẫn
--    là nháp, chưa có content_key và không nằm trong đề nào.
delete from public.exam_items i
 where i.content_key is null
   and i.workflow_status = 'draft'
   and not exists (select 1 from public.exam_set_items s where s.item_id = i.id)
   and i.fingerprint in (
    public.exam_item_fingerprint('mcq', 'Thắng lợi của chiến dịch Việt Bắc thu – đông năm 1947 đã làm phá sản chiến lược nào của thực dân Pháp?', array['Kế hoạch Rơ-ve', 'Kế hoạch Đờ Lát đơ Tát-xi-nhi', '“Đánh nhanh, thắng nhanh”', 'Kế hoạch Na-va'], null),
    public.exam_item_fingerprint('mcq', 'Năm 1953, Pháp và Mỹ đề ra kế hoạch quân sự nào nhằm giành thắng lợi quyết định trong vòng 18 tháng?', array['Kế hoạch Na-va', 'Kế hoạch Rơ-ve', 'Kế hoạch Xta-lây – Tay-lo', 'Kế hoạch Mác-san'], null)
   );

-- Câu cần công bố: toàn bộ câu chi tiết Bài 6 – 8 và mọi câu của đề 3.
create temporary table demo_items on commit drop as
select i.id, i.passage_id
  from public.exam_items i
 where i.content_key ~ '^b[678]-m[0-9]+-(tn|ds)-[0-9]+$'
    or i.id in (select item_id from public.exam_set_items where set_id = (select id from public.exam_sets where slug = 'de-3'));

-- 2. Tư liệu trước (câu đã công bố không được trỏ tới tư liệu nháp — cùng luật với giao diện duyệt).
update public.exam_passages
   set workflow_status = 'published', review_note = 'Demo 10/2026 — cần giáo viên đối chiếu SGK in'
 where id in (select passage_id from demo_items where passage_id is not null)
   and workflow_status in ('draft', 'pending_review', 'needs_revision');

-- 3. Câu.
update public.exam_items
   set workflow_status = 'published', review_note = 'Demo 10/2026 — cần giáo viên đối chiếu SGK in'
 where id in (select id from demo_items)
   and workflow_status in ('draft', 'pending_review', 'needs_revision');

-- 4. Đề 3 (miễn phí — seed-de-3.sql đã đặt product_id = null).
update public.exam_sets
   set workflow_status = 'published', review_note = null
 where slug = 'de-3'
   and workflow_status in ('draft', 'pending_review', 'needs_revision');

-- 5. Mô tả đề mẫu de-1, de-2 trỏ tới đề đầy đủ số 3 (giống supabase/seed-exam-mau.sql).
update public.exam_sets
   set description = 'Đề mẫu 10 câu trắc nghiệm, 15 phút — làm thử miễn phí. Muốn làm đề đầy đủ (24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút), xem Đề luyện thi số 3.'
 where slug = 'de-1';
update public.exam_sets
   set description = 'Đề mẫu 10 câu trắc nghiệm, 15 phút — thuộc Gói luyện thi. Đề đầy đủ miễn phí (24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút): Đề luyện thi số 3.'
 where slug = 'de-2';

commit;

-- Kiểm tra (chạy sau):
--   Số câu đã công bố theo bài / dạng (Bài 6, 7, 8: mỗi bài 30 mcq + 8 true_false):
--     select split_part(lesson_slug, '-', 1) as bai, kind, count(*) from public.exam_items
--      where workflow_status = 'published' and content_key is not null group by 1, 2 order by nullif(split_part(lesson_slug, '-', 1), '')::int nulls last, 2;
--   Đề 3: published, miễn phí, 24 + 4 câu, mọi câu và tư liệu đã công bố:
--     select s.workflow_status, s.product_id is null as mien_phi, si.section, count(*),
--            count(*) filter (where i.workflow_status = 'published') as cau_cong_bo,
--            count(*) filter (where p.id is not null and p.workflow_status <> 'published') as tu_lieu_chua_cong_bo
--       from public.exam_sets s join public.exam_set_items si on si.set_id = s.id join public.exam_items i on i.id = si.item_id
--       left join public.exam_passages p on p.id = i.passage_id
--      where s.slug = 'de-3' group by 1, 2, 3 order by 3;                    → published · true · 1: 24/24/0 · 2: 4/4/0
--   Câu nháp cũ bị thay đã xóa (→ 0):
--     select count(*) from public.exam_items where content_key is null and stem like 'Năm 1953, Pháp và Mỹ đề ra%';
