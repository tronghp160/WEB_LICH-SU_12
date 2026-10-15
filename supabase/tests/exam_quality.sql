-- Kiểm thử GĐ7 luyện thi — báo lỗi câu hỏi, chấm lại, thống kê câu, tổng quan quản trị
-- (migration 20261029000000_exam_quality.sql).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Một khối DO kết thúc bằng
-- `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ. Báo cáo JSON nằm trong thông báo lỗi
-- "BAO_CAO_KIEM_THU_CHAT_LUONG" — đó là kết quả, không phải sự cố.

do $test$
declare
  results jsonb := '[]'::jsonb;
  u1 uuid := gen_random_uuid();   -- học sinh
  ed uuid := gen_random_uuid();   -- biên tập viên
  rv uuid := gen_random_uuid();   -- kiểm duyệt viên
  m1 uuid; m2 uuid; t1 uuid;
  a1 uuid; a2 uuid; a_open uuid; a_practice uuid;
  r jsonb; r2 jsonb;
  cnt integer;
  outcome text;
  dev constant text := repeat('8', 64);
  tf_all_right constant jsonb := '{"tf": [true, false, true, false]}';
begin
  insert into auth.users (id, email, aud, role, created_at, updated_at) values
    (u1, 'zz-kt-cl-hs-' || replace(u1::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (ed, 'zz-kt-cl-ed-' || replace(ed::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (rv, 'zz-kt-cl-rv-' || replace(rv::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now());
  insert into public.learner_profiles (id, display_name, terms_version) values (u1, 'ZZ-KT Học sinh', '2026-10');
  insert into public.staff_profiles (id, full_name, role, account_status) values (ed, 'ZZ-KT biên tập', 'editor', 'active'), (rv, 'ZZ-KT kiểm duyệt', 'reviewer', 'active');

  -- m1: đáp án gốc A (0) — sẽ "sửa" thành B (1). m2: đáp án B. t1: ý đúng [Đ, S, Đ, S].
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, lesson_slug, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT chất lượng câu một?', array['Nhầm', 'Thật', 'Sai b', 'Sai c'], 0, 'Giải thích', '7-khang-chien-chong-phap', 'nhan_biet', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, lesson_slug, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT chất lượng câu hai?', array['X', 'Đúng', 'Y', 'Z'], 1, 'Giải thích', '7-khang-chien-chong-phap', 'thong_hieu', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m2;
  insert into public.exam_items (kind, stem, statements, explanation, lesson_slug, level, competency, source_note, workflow_status)
    values ('true_false', 'ZZ-KT chất lượng Đúng/Sai:', '[{"text":"Ý a chất lượng","is_true":true,"explanation":"Giải ý a"},{"text":"Ý b chất lượng","is_true":false,"explanation":"Giải ý b"},{"text":"Ý c chất lượng","is_true":true,"explanation":"Giải ý c"},{"text":"Ý d chất lượng","is_true":false,"explanation":"Giải ý d"}]',
            'Nhận xét', '8-khang-chien-chong-my-cuu-nuoc', 'van_dung', 'van_dung_kien_thuc', 'SGK', 'published') returning id into t1;

  -- Lượt thi 1 (tài khoản, không xoay): m1 chọn B (đang sai), m2 chọn B (đúng), t1 đúng cả 4 ý → 1,25 / 1,5.
  insert into public.exam_attempts (user_id, item_ids, sections, choice_shifts, answers)
    values (u1, array[m1, m2, t1], array[1, 1, 2]::smallint[], array[0, 0, 0]::smallint[],
            jsonb_build_object(m1::text, '{"choice": 1}'::jsonb, m2::text, '{"choice": 1}'::jsonb, t1::text, tf_all_right)) returning id into a1;
  perform public.exam_grade_attempt(a1);
  -- Lượt thi 2 (thiết bị, m1 xoay 1): chọn hiển thị C = gốc B; t1 chọn Đúng cả 4 ý (đúng 2 ý).
  insert into public.exam_attempts (device_hash, item_ids, sections, choice_shifts, answers)
    values (dev, array[m1, t1], array[1, 2]::smallint[], array[1, 0]::smallint[],
            jsonb_build_object(m1::text, '{"choice": 2}'::jsonb, t1::text, '{"tf": [true, true, true, true]}'::jsonb)) returning id into a2;
  perform public.exam_grade_attempt(a2);
  -- Lượt đang làm (chưa nộp) và lượt luyện tập đã nộp nhưng CHƯA kiểm tra câu m1.
  insert into public.exam_attempts (user_id, item_ids, sections, choice_shifts) values (u1, array[m1], array[1]::smallint[], array[0]::smallint[]) returning id into a_open;
  insert into public.exam_attempts (user_id, mode, item_ids, sections, choice_shifts, answers)
    values (u1, 'practice', array[m1], array[1]::smallint[], array[0]::smallint[], jsonb_build_object(m1::text, '{"choice": 1}'::jsonb)) returning id into a_practice;
  perform public.exam_grade_attempt(a_practice);

  -- ---------- Báo lỗi ----------
  results := results || jsonb_build_object('ca','B1','mo_ta','báo lỗi: lượt chưa nộp / máy khác / câu ngoài lượt → not_found; lý do lạ → invalid','ky_vong','not_found ×3, invalid',
    'ket_qua', (public.report_exam_item(u1, null, a_open, m1, 'sai_dap_an', null) ->> 'reason') || ', '
               || (public.report_exam_item(null, repeat('9', 64), a2, m1, 'sai_dap_an', null) ->> 'reason') || ', '
               || (public.report_exam_item(u1, null, a1, gen_random_uuid(), 'sai_dap_an', null) ->> 'reason') || ', '
               || (public.report_exam_item(u1, null, a1, m1, 'linh-tinh', null) ->> 'reason'),
    'dat', public.report_exam_item(u1, null, a_open, m1, 'sai_dap_an', null) ->> 'reason' = 'not_found'
           and public.report_exam_item(null, repeat('9', 64), a2, m1, 'sai_dap_an', null) ->> 'reason' = 'not_found'
           and public.report_exam_item(u1, null, a1, gen_random_uuid(), 'sai_dap_an', null) ->> 'reason' = 'not_found'
           and public.report_exam_item(u1, null, a1, m1, 'linh-tinh', null) ->> 'reason' = 'invalid');

  r := public.report_exam_item(u1, null, a1, m1, 'sai_dap_an', ' Đáp án đúng phải là B. ');
  r2 := public.report_exam_item(u1, null, a1, m1, 'khac', 'Báo lại');
  perform public.report_exam_item(null, dev, a2, m1, 'sai_dap_an', null);
  select count(*) into cnt from public.exam_item_reports where item_id = m1;
  results := results || jsonb_build_object('ca','B2','mo_ta','lượt đã nộp → ghi báo cáo (cắt khoảng trắng); báo lại cùng câu khi còn mở → không thêm dòng; thiết bị khác báo được','ky_vong','ok, ok, 2 dòng, ghi chú gọn',
    'ket_qua', (r ->> 'ok') || ', ' || (r2 ->> 'ok') || ', ' || cnt || ' dòng, "' || (select note from public.exam_item_reports where item_id = m1 and user_id = u1) || '"',
    'dat', (r ->> 'ok')::boolean and (r2 ->> 'ok')::boolean and cnt = 2
           and (select note from public.exam_item_reports where item_id = m1 and user_id = u1) = 'Đáp án đúng phải là B.');

  -- RLS: học sinh không đọc; biên tập viên đọc nhưng không đổi trạng thái; kiểm duyệt viên đổi được.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u1, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.exam_item_reports;
  outcome := 'hs đọc ' || cnt;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ed, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.exam_item_reports where item_id = m1;
  outcome := outcome || ', bt đọc ' || cnt;
  update public.exam_item_reports set status = 'fixed' where item_id = m1;
  get diagnostics cnt = row_count;
  outcome := outcome || ', bt sửa ' || cnt;
  begin
    insert into public.exam_item_reports (item_id, reason) values (m1, 'khac');
    outcome := outcome || ', bt thêm OK';
  exception when others then outcome := outcome || ', bt thêm ' || sqlstate;
  end;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', rv, 'role', 'authenticated')::text, true);
  update public.exam_item_reports set status = 'rejected', admin_note = 'Đáp án A đúng', handled_by = rv, handled_at = now() where item_id = m1 and device_hash = dev;
  get diagnostics cnt = row_count;
  outcome := outcome || ', kd sửa ' || cnt;
  begin
    update public.exam_item_reports set note = 'đổi lời học sinh' where item_id = m1;
    outcome := outcome || ', kd sửa ghi chú OK';
  exception when others then outcome := outcome || ', kd sửa ghi chú ' || sqlstate;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  results := results || jsonb_build_object('ca','B3','mo_ta','RLS báo cáo: học sinh 0 dòng; biên tập viên đọc, không đổi trạng thái, không tự thêm; kiểm duyệt viên xử lý được, không sửa lời học sinh','ky_vong','hs đọc 0, bt đọc 2, bt sửa 0, bt thêm 42501, kd sửa 1, kd sửa ghi chú 42501',
    'ket_qua', outcome,
    'dat', outcome = 'hs đọc 0, bt đọc 2, bt sửa 0, bt thêm 42501, kd sửa 1, kd sửa ghi chú 42501');

  -- ---------- Thống kê (trước khi sửa đáp án) ----------
  r := public.exam_item_stats(array[m1, t1]);
  results := results || jsonb_build_object('ca','S1','mo_ta','thống kê chỉ lượt thi đã nộp: m1 2 lượt, cả hai chọn B gốc (xoay đã quy về gốc), p = 0; t1: tỉ lệ đúng từng ý','ky_vong','n=2, choices [0,2,0,0], p 0, ý [1, 0.5, 1, 0.5]',
    'ket_qua', (r -> m1::text)::text || ' | ' || (r -> t1::text -> 'statements')::text,
    'dat', (r -> m1::text ->> 'n')::int = 2 and r -> m1::text -> 'choices' = '[0, 2, 0, 0]'::jsonb and (r -> m1::text ->> 'p')::numeric = 0
           and r -> t1::text -> 'statements' = '[1.000, 0.500, 1.000, 0.500]'::jsonb);

  -- ---------- Chấm lại sau khi sửa đáp án m1 thành B ----------
  update public.exam_items set correct_index = 1 where id = m1;
  r := public.regrade_item(m1, rv);
  results := results || jsonb_build_object('ca','G1','mo_ta','chấm lại: 2 lượt thi đổi điểm, lượt luyện chưa kiểm tra câu bị bỏ qua, lượt chưa nộp không đụng','ky_vong','attempts 2, changed 2',
    'ket_qua', r::text,
    'dat', (r ->> 'attempts')::int = 2 and (r ->> 'changed')::int = 2
           and (select status from public.exam_attempts where id = a_open) = 'in_progress'
           and (select score10 from public.exam_attempts where id = a_practice) = 0);

  results := results || jsonb_build_object('ca','G2','mo_ta','lượt 1: 8,33 → 10; câu 1 = 250, đúng 3, nhóm bài 7 và mức nhận biết cộng 250; nhật ký đủ','ky_vong','10.00, 250, 3, 500, 250, log 8.33→10.00',
    'ket_qua', (select score10 || ', ' || (breakdown -> 'items' ->> 0) || ', ' || (breakdown ->> 'correct') || ', ' || (breakdown -> 'lessons' -> '7-khang-chien-chong-phap' ->> 'earned')
                       || ', ' || (breakdown -> 'levels' -> 'nhan_biet' ->> 'earned') from public.exam_attempts where id = a1)
               || ', log ' || (select old_score10 || '→' || new_score10 from public.exam_regrade_log where attempt_id = a1),
    'dat', (select score10 = 10 and (breakdown -> 'items' ->> 0)::int = 250 and (breakdown ->> 'correct')::int = 3
                   and (breakdown -> 'lessons' -> '7-khang-chien-chong-phap' ->> 'earned')::int = 500 and (breakdown -> 'levels' -> 'nhan_biet' ->> 'earned')::int = 250
                   and (breakdown -> 'sections' -> '1' ->> 'earned')::int = 500 and (breakdown ->> 'raw_milli')::int = 1500 and raw_score = 1.5
              from public.exam_attempts where id = a1)
           and (select old_score10 = 8.33 and new_score10 = 10 and actor = rv and old_earned = 0 and new_earned = 250 from public.exam_regrade_log where attempt_id = a1));

  r := public.get_attempt_result(a1, u1, null);
  r2 := public.regrade_item(m1, rv);
  results := results || jsonb_build_object('ca','G3','mo_ta','kết quả của học sinh ghi câu đã chấm lại; chấm lại lần nữa không đổi gì; lượt 2 (xoay) cũng đúng','ky_vong','[m1], changed 0, lượt 2 = 4.00 (250 + 250 / 1250)',
    'ket_qua', (r -> 'attempt' -> 'regraded_items')::text || ', changed ' || (r2 ->> 'changed') || ', lượt 2 = ' || (select score10 from public.exam_attempts where id = a2),
    'dat', r -> 'attempt' -> 'regraded_items' = jsonb_build_array(m1) and (r2 ->> 'changed')::int = 0
           and (select score10 from public.exam_attempts where id = a2) = 4
           and public.get_attempt_result(a_practice, u1, null) -> 'attempt' -> 'regraded_items' is null);

  -- ---------- Tổng quan quản trị ----------
  r := public.exam_admin_overview(30);
  results := results || jsonb_build_object('ca','O1','mo_ta','tổng quan: có ngày hôm nay, đếm lượt thi đã nộp, phân bố điểm 10 cột, báo lỗi đang mở','ky_vong','≥1 ngày, ≥2 lượt nộp, 10 cột, ≥1 báo lỗi mở',
    'ket_qua', jsonb_array_length(r -> 'days') || ' ngày, ' || (r ->> 'submitted_exams') || ' lượt, ' || jsonb_array_length(r -> 'scores') || ' cột, ' || (r ->> 'reports_open') || ' mở',
    'dat', jsonb_array_length(r -> 'days') >= 1 and (r ->> 'submitted_exams')::int >= 2 and jsonb_array_length(r -> 'scores') = 10 and (r ->> 'reports_open')::int >= 1
           and (r ->> 'active_period')::int >= 2 and r::text !~ 'zz-kt-cl');

  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.report_exam_item(uuid, text, uuid, uuid, text, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.report_exam_item(uuid, text, uuid, uuid, text, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.regrade_item(uuid, uuid)', 'execute')),
    (has_function_privilege('authenticated', 'public.exam_item_stats(uuid[])', 'execute')),
    (has_function_privilege('authenticated', 'public.exam_admin_overview(integer)', 'execute')),
    (has_table_privilege('anon', 'public.exam_item_reports', 'select')),
    (has_table_privilege('authenticated', 'public.exam_regrade_log', 'insert'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','Q1','mo_ta','chỉ service_role gọi hàm; khách không đọc báo cáo; không ai ghi nhật ký trực tiếp','ky_vong','0 quyền',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 0 and has_function_privilege('service_role', 'public.regrade_item(uuid, uuid)', 'execute'));

  raise exception E'BAO_CAO_KIEM_THU_CHAT_LUONG\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
