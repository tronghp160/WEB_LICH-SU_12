-- SINH TỰ ĐỘNG bởi scripts/build-exam-set-sql.mjs từ supabase/content/de-thi/de-3.json — không sửa tay.
-- Chạy SAU migration 20261101000000_exam_item_explain.sql và supabase/seed-ngan-hang.sql (câu phải có sẵn, tra theo
-- content_key). Đề vẫn ở trạng thái hiện tại (nháp); công bố đề ở bước sau (seed demo hoặc giao diện duyệt).
-- 24 câu Phần I + 4 câu Phần II. Chạy lại được.

begin;

do $$
begin
  if not exists (select 1 from public.exam_sets where slug = 'de-3') then
    raise exception 'Chưa có đề de-3 (seed-payments.sql tạo sẵn de-1 … de-10).';
  end if;
  if exists (select 1 from public.exam_sets where slug = 'de-3' and workflow_status = 'published') then
    raise exception 'Đề de-3 đã công bố — không xếp lại câu của đề đang có người làm.';
  end if;
end
$$;

update public.exam_sets
   set title = 'Đề luyện thi số 3 (đầy đủ, cấu trúc thi tốt nghiệp từ 2025)',
       description = 'Đề đầy đủ 24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút, thang 10 điểm — đúng cấu trúc đề thi tốt nghiệp THPT môn Lịch sử từ năm 2025. Có lời giải từng phương án và chỉ ra kiến thức nằm ở bài, mục nào.',
       format = 'thpt_2025',
       duration_min = 50,
       difficulty = 2,
       product_id = null
 where slug = 'de-3';

delete from public.exam_set_items where set_id = (select id from public.exam_sets where slug = 'de-3');

insert into public.exam_set_items (set_id, item_id, section, position, choice_shift)
select s.id, i.id, v.section, v.position, v.shift
  from (values
    ('b1-m2-tn-01', 1, 1, 3),
    ('b2-m1-tn-01', 1, 2, 1),
    ('b3-m2-tn-01', 1, 3, 1),
    ('b4-m1-tn-01', 1, 4, 2),
    ('b5-m3-tn-01', 1, 5, 0),
    ('b6-m1-tn-04', 1, 6, 0),
    ('b7-m3-tn-05', 1, 7, 1),
    ('b7-m3-tn-07', 1, 8, 2),
    ('b8-m1-tn-02', 1, 9, 1),
    ('b8-m4-tn-04', 1, 10, 0),
    ('b10-m1-tn-01', 1, 11, 1),
    ('b10-m1-tn-02', 1, 12, 2),
    ('b11-m1-tn-01', 1, 13, 3),
    ('b12-m2-tn-01', 1, 14, 2),
    ('b13-m1-tn-01', 1, 15, 0),
    ('b14-m1-tn-01', 1, 16, 0),
    ('b15-m1-tn-01', 1, 17, 2),
    ('b16-m1-tn-01', 1, 18, 3),
    ('b16-m1-tn-02', 1, 19, 1),
    ('b17-m2-tn-01', 1, 20, 2),
    ('l11-lam-son-01', 1, 21, 3),
    ('l11-mong-nguyen-01', 1, 22, 1),
    ('l11-cai-cach-01', 1, 23, 2),
    ('l11-bien-dong-01', 1, 24, 0),
    ('de3-ds-01', 2, 1, 0),
    ('de3-ds-02', 2, 2, 0),
    ('de3-ds-03', 2, 3, 0),
    ('de3-ds-04', 2, 4, 0)
  ) as v(content_key, section, position, shift)
  join public.exam_items i on i.content_key = v.content_key
 cross join (select id from public.exam_sets where slug = 'de-3') as s;

do $$
declare
  n integer;
begin
  select count(*) into n from public.exam_set_items where set_id = (select id from public.exam_sets where slug = 'de-3');
  if n <> 28 then
    raise exception 'Đề de-3 chỉ ghép được % / 28 câu — thiếu câu trong ngân hàng (chạy seed-ngan-hang.sql trước).', n;
  end if;
end
$$;

commit;

-- Kiểm tra:
--   select section, count(*), sum(choice_shift) from public.exam_set_items
--    where set_id = (select id from public.exam_sets where slug = 'de-3') group by section order by section;   → 1: 24 câu · 2: 4 câu
