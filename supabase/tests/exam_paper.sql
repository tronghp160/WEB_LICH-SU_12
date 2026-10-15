-- Kiểm thử GĐ8 luyện thi — lượt in đề (migration 20261030000000_exam_paper.sql).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Khối DO kết thúc bằng
-- `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ. Báo cáo nằm trong thông báo lỗi "BAO_CAO_KIEM_THU_BAN_IN".

do $test$
declare
  results jsonb := '[]'::jsonb;
  m1 uuid; m2 uuid;
  free_set uuid; paid_set uuid; pack uuid;
  r jsonb; r2 jsonb;
  att uuid;
  cnt integer;
  dev constant text := repeat('6', 64);
begin
  insert into public.products (slug, kind, name, price_vnd, max_devices) values ('zz-kt-goi-in', 'exam_pack', 'ZZ-KT gói in', 29000, 3) returning id into pack;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT bản in câu một?', array['Đúng', 'Sai a', 'Sai b', 'Sai c'], 0, 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT bản in câu hai?', array['X', 'Đúng', 'Y', 'Z'], 1, 'Giải thích', 'thong_hieu', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m2;
  insert into public.exam_sets (slug, title, format, duration_min, workflow_status, published_at) values ('zz-kt-in-mien-phi', 'ZZ-KT in miễn phí', 'mini', 15, 'published', now()) returning id into free_set;
  insert into public.exam_sets (slug, title, format, duration_min, workflow_status, published_at, product_id) values ('zz-kt-in-tra-phi', 'ZZ-KT in trả phí', 'mini', 15, 'published', now(), pack) returning id into paid_set;
  insert into public.exam_set_items (set_id, item_id, section, position, choice_shift) values (free_set, m1, 1, 1, 1), (free_set, m2, 1, 2, 0), (paid_set, m1, 1, 1, 0);

  r := public.start_paper_attempt('zz-kt-in-mien-phi', null, dev, null);
  att := (r -> 'attempt' ->> 'id')::uuid;
  results := results || jsonb_build_object('ca','P1','mo_ta','đề miễn phí: tạo lượt paper không hạn nộp, câu theo thứ tự + độ xoay của đề, không lộ đáp án','ky_vong','paper, không hạn, 2 câu, A=Sai c (xoay 1), không lộ',
    'ket_qua', (r -> 'attempt' ->> 'mode') || ', hạn=' || coalesce(r -> 'attempt' ->> 'deadline_at', 'không') || ', ' || jsonb_array_length(r -> 'questions') || ' câu, A=' || (r -> 'questions' -> 0 -> 'choices' ->> 0)
               || ', lộ=' || (r::text ~ '"(correct_index|truths|explanation)"')::text,
    'dat', r -> 'attempt' ->> 'mode' = 'paper' and r -> 'attempt' ->> 'deadline_at' is null and jsonb_array_length(r -> 'questions') = 2
           and r -> 'questions' -> 0 -> 'choices' ->> 0 = 'Sai c' and r::text !~ '"(correct_index|truths|explanation)"');

  r2 := public.start_paper_attempt('zz-kt-in-mien-phi', null, dev, null);
  results := results || jsonb_build_object('ca','P2','mo_ta','in lại khi chưa nộp → cùng lượt; trang làm online không thấy lượt in là bài dở','ky_vong','cùng id, intro không có lượt dở',
    'ket_qua', ((r2 -> 'attempt' ->> 'id')::uuid = att)::text || ', ' || coalesce(public.get_exam_intro('zz-kt-in-mien-phi', null, dev, null) ->> 'in_progress', 'không có'),
    'dat', (r2 -> 'attempt' ->> 'id')::uuid = att and public.get_exam_intro('zz-kt-in-mien-phi', null, dev, null) ->> 'in_progress' is null);

  r := public.submit_exam_attempt(att, null, dev, jsonb_build_object(m1::text, '{"choice": 1}'::jsonb, m2::text, '{"choice": 1}'::jsonb));
  results := results || jsonb_build_object('ca','P3','mo_ta','nhập đáp án giấy rồi nộp: chấm theo độ xoay của lượt (A gốc hiện ở vị trí B), có đáp án + lời giải','ky_vong','10.00, có đáp án',
    'ket_qua', (r -> 'attempt' ->> 'score10') || ', ' || ((r -> 'questions' -> 0 ->> 'correct_index') is not null)::text,
    'dat', (r -> 'attempt' ->> 'score10')::numeric = 10 and (r -> 'questions' -> 0 ->> 'correct_index')::int = 1);

  r := public.start_paper_attempt('zz-kt-in-tra-phi', null, dev, null);
  r2 := public.start_paper_attempt('zz-kt-khong-co', null, dev, null);
  results := results || jsonb_build_object('ca','P4','mo_ta','đề trả phí chưa có mã → invalid_code; đề lạ → not_found; không thiết bị → no_device','ky_vong','invalid_code, not_found, no_device',
    'ket_qua', (r ->> 'reason') || ', ' || (r2 ->> 'reason') || ', ' || (public.start_paper_attempt('zz-kt-in-mien-phi', null, null, null) ->> 'reason'),
    'dat', r ->> 'reason' = 'invalid_code' and r2 ->> 'reason' = 'not_found' and public.start_paper_attempt('zz-kt-in-mien-phi', null, null, null) ->> 'reason' = 'no_device');

  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.start_paper_attempt(text, text, text, uuid)', 'execute')),
    (has_function_privilege('authenticated', 'public.start_paper_attempt(text, text, text, uuid)', 'execute'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','Q1','mo_ta','chỉ service_role gọi','ky_vong','0 quyền','ket_qua', cnt || ' quyền',
    'dat', cnt = 0 and has_function_privilege('service_role', 'public.start_paper_attempt(text, text, text, uuid)', 'execute'));

  raise exception E'BAO_CAO_KIEM_THU_BAN_IN\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
