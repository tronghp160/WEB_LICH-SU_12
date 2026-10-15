-- Kiểm thử GĐ5 luyện thi — đề tự sinh, mục tiêu điểm, lộ trình (migration 20261028000000_exam_generated.sql).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Một khối DO kết thúc bằng
-- `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ. Báo cáo JSON nằm trong thông báo lỗi
-- "BAO_CAO_KIEM_THU_DE_TU_SINH" — đó là kết quả, không phải sự cố.

do $test$
declare
  results jsonb := '[]'::jsonb;
  u1 uuid := gen_random_uuid();   -- có gói gắn tài khoản
  u2 uuid := gen_random_uuid();   -- chưa có gói
  pack uuid;
  o_acc bigint;
  m1 uuid; m2 uuid; t1 uuid; d1 uuid;
  r jsonb; r2 jsonb;
  att uuid;
  cnt integer;
  outcome text;
  dev constant text := repeat('7', 64);
  token constant text := repeat('a', 64);
begin
  insert into auth.users (id, email, aud, role, created_at, updated_at) values
    (u1, 'zz-kt-ds-1-' || replace(u1::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (u2, 'zz-kt-ds-2-' || replace(u2::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now());
  insert into public.learner_profiles (id, display_name, terms_version) values (u1, 'ZZ-KT Học sinh 1', '2026-10'), (u2, 'ZZ-KT Học sinh 2', '2026-10');
  insert into public.products (slug, kind, name, price_vnd, max_devices) values ('zz-kt-goi-ds', 'exam_pack', 'ZZ-KT gói đề tự sinh', 29000, 3) returning id into pack;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, user_id) values (pack, 29000, 'mock', token, u1) returning order_code into o_acc;
  perform public.mark_order_paid(o_acc, 29000, 'mock', 'TX-DS-1', 'LT12-ZZKT-DSAA-AAAA');

  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT đề tự sinh câu một?', array['Đúng', 'Sai a', 'Sai b', 'Sai c'], 0, 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT đề tự sinh câu hai?', array['X', 'Đúng', 'Y', 'Z'], 1, 'Giải thích', 'thong_hieu', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m2;
  insert into public.exam_items (kind, stem, statements, explanation, level, competency, source_note, workflow_status)
    values ('true_false', 'ZZ-KT đề tự sinh Đúng/Sai:', '[{"text":"Ý a tự sinh","is_true":true,"explanation":"Giải a"},{"text":"Ý b tự sinh","is_true":false,"explanation":"Giải b"},{"text":"Ý c tự sinh","is_true":true,"explanation":"Giải c"},{"text":"Ý d tự sinh","is_true":false,"explanation":"Giải d"}]',
            'Nhận xét', 'van_dung', 'van_dung_kien_thuc', 'SGK', 'published') returning id into t1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note)
    values ('mcq', 'ZZ-KT đề tự sinh câu nháp?', array['A', 'B', 'C', 'D'], 0, 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK') returning id into d1;

  -- ---------- Quyền mở ----------
  r := public.get_generated_intro(u2, null, null, 'quick_15');
  r2 := public.start_generated_attempt(u2, null, null, 'quick_15', array[m1, m2, t1], array[1, 1, 2]::smallint[], array[0, 0, 0]::smallint[], 15);
  results := results || jsonb_build_object('ca','A1','mo_ta','chưa có gói → pack_required (trang đề và bắt đầu); chưa đăng nhập, không thiết bị → no_device','ky_vong','pack_required ×2, no_device',
    'ket_qua', (r ->> 'reason') || ', ' || (r2 ->> 'reason') || ', ' || (public.start_generated_attempt(null, null, null, 'quick_15', array[m1], array[1]::smallint[], array[0]::smallint[], 15) ->> 'reason'),
    'dat', r ->> 'reason' = 'pack_required' and r2 ->> 'reason' = 'pack_required'
           and public.start_generated_attempt(null, null, null, 'quick_15', array[m1], array[1]::smallint[], array[0]::smallint[], 15) ->> 'reason' = 'no_device');

  results := results || jsonb_build_object('ca','A2','mo_ta','danh sách câu không hợp lệ (câu nháp, lặp câu, độ dài lệch, phần lạ) → invalid_items; ma trận lạ → unsupported_mode','ky_vong','invalid_items ×4, unsupported_mode',
    'ket_qua', (public.start_generated_attempt(u1, null, null, 'quick_15', array[m1, d1], array[1, 1]::smallint[], array[0, 0]::smallint[], 15) ->> 'reason') || ', '
               || (public.start_generated_attempt(u1, null, null, 'quick_15', array[m1, m1], array[1, 1]::smallint[], array[0, 0]::smallint[], 15) ->> 'reason') || ', '
               || (public.start_generated_attempt(u1, null, null, 'quick_15', array[m1, m2], array[1]::smallint[], array[0, 0]::smallint[], 15) ->> 'reason') || ', '
               || (public.start_generated_attempt(u1, null, null, 'quick_15', array[m1], array[3]::smallint[], array[0]::smallint[], 15) ->> 'reason') || ', '
               || (public.start_generated_attempt(u1, null, null, 'de-la', array[m1], array[1]::smallint[], array[0]::smallint[], 15) ->> 'reason'),
    'dat', public.start_generated_attempt(u1, null, null, 'quick_15', array[m1, d1], array[1, 1]::smallint[], array[0, 0]::smallint[], 15) ->> 'reason' = 'invalid_items'
           and public.start_generated_attempt(u1, null, null, 'quick_15', array[m1, m1], array[1, 1]::smallint[], array[0, 0]::smallint[], 15) ->> 'reason' = 'invalid_items'
           and public.start_generated_attempt(u1, null, null, 'quick_15', array[m1, m2], array[1]::smallint[], array[0, 0]::smallint[], 15) ->> 'reason' = 'invalid_items'
           and public.start_generated_attempt(u1, null, null, 'quick_15', array[m1], array[3]::smallint[], array[0]::smallint[], 15) ->> 'reason' = 'invalid_items'
           and public.start_generated_attempt(u1, null, null, 'de-la', array[m1], array[1]::smallint[], array[0]::smallint[], 15) ->> 'reason' = 'unsupported_mode');

  -- ---------- Tạo, làm tiếp, chấm ----------
  r := public.start_generated_attempt(u1, null, null, 'quick_15', array[m1, m2, t1], array[1, 1, 2]::smallint[], array[1, 0, 0]::smallint[], 15);
  att := (r -> 'attempt' ->> 'id')::uuid;
  results := results || jsonb_build_object('ca','G1','mo_ta','có gói: tạo lượt thi bấm giờ, ghi ma trận, xoay lựa chọn như server chọn, không lộ đáp án; access = account','ky_vong','exam, quick_15, có hạn, B=Đúng, không lộ, account',
    'ket_qua', (r -> 'attempt' ->> 'mode') || ', ' || (r -> 'attempt' ->> 'blueprint') || ', hạn=' || ((r -> 'attempt' ->> 'deadline_at') is not null)::text
               || ', B=' || (r -> 'questions' -> 0 -> 'choices' ->> 1) || ', lộ=' || (r::text ~ '"(correct_index|truths|explanation)"')::text || ', ' || (r ->> 'access'),
    'dat', r -> 'attempt' ->> 'mode' = 'exam' and r -> 'attempt' ->> 'blueprint' = 'quick_15' and (r -> 'attempt' ->> 'deadline_at') is not null
           and (r -> 'questions' -> 0 -> 'choices' ->> 1) = 'Đúng' and r::text !~ '"(correct_index|truths|explanation)"' and r ->> 'access' = 'account');
  r2 := public.start_generated_attempt(u1, null, null, 'quick_15', array[m2], array[1]::smallint[], array[0]::smallint[], 15);
  results := results || jsonb_build_object('ca','G2','mo_ta','bắt đầu lại khi đang làm dở cùng ma trận → trả lượt cũ (bỏ qua danh sách mới); trang đề thấy lượt dở','ky_vong','cùng id, 3 câu, lượt dở',
    'ket_qua', ((r2 -> 'attempt' ->> 'id')::uuid = att)::text || ', ' || jsonb_array_length(r2 -> 'questions') || ' câu, ' || coalesce(public.get_generated_intro(u1, null, null, 'quick_15') -> 'in_progress' ->> 'id', 'null'),
    'dat', (r2 -> 'attempt' ->> 'id')::uuid = att and jsonb_array_length(r2 -> 'questions') = 3
           and (public.get_generated_intro(u1, null, null, 'quick_15') -> 'in_progress' ->> 'id')::uuid = att
           and public.get_generated_intro(u1, null, null, 'thpt_2025') ->> 'in_progress' is null);
  r := public.submit_exam_attempt(att, u1, null, jsonb_build_object(m1::text, '{"choice": 1}'::jsonb, m2::text, '{"choice": 1}'::jsonb, t1::text, '{"tf": [true, false, true, false]}'::jsonb));
  results := results || jsonb_build_object('ca','G3','mo_ta','nộp: chấm như đề thường (0,25 + 0,25 + 1 / 1,5 → 10), kết quả có blueprint','ky_vong','10.00, quick_15',
    'ket_qua', (r -> 'attempt' ->> 'score10') || ', ' || (r -> 'attempt' ->> 'blueprint'),
    'dat', (r -> 'attempt' ->> 'score10')::numeric = 10 and r -> 'attempt' ->> 'blueprint' = 'quick_15');

  r := public.start_generated_attempt(u1, null, null, 'tf_only', array[t1], array[2]::smallint[], array[0]::smallint[], 10);
  update public.exam_attempts set deadline_at = now() - interval '1 minute' where id = (r -> 'attempt' ->> 'id')::uuid;
  r2 := public.start_generated_attempt(u1, null, null, 'tf_only', array[t1], array[2]::smallint[], array[0]::smallint[], 10);
  results := results || jsonb_build_object('ca','G4','mo_ta','lượt dở đã hết giờ → được chấm, bắt đầu tạo lượt mới','ky_vong','cũ submitted, id mới',
    'ket_qua', (select status::text from public.exam_attempts where id = (r -> 'attempt' ->> 'id')::uuid) || ', mới khác=' || ((r2 -> 'attempt' ->> 'id') <> (r -> 'attempt' ->> 'id'))::text,
    'dat', (select status from public.exam_attempts where id = (r -> 'attempt' ->> 'id')::uuid) = 'submitted' and (r2 -> 'attempt' ->> 'id') <> (r -> 'attempt' ->> 'id'));

  begin
    insert into public.exam_attempts (user_id, item_ids, sections, choice_shifts, blueprint) values (u1, array[m1], array[1]::smallint[], array[0]::smallint[], 'khac');
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','C1','mo_ta','cột blueprint chỉ nhận ma trận đã định','ky_vong','23514','ket_qua', outcome, 'dat', outcome = '23514');

  -- ---------- Mục tiêu điểm, lộ trình (RLS own_update sẵn có) ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u1, 'role', 'authenticated')::text, true);
  begin
    update public.learner_profiles set exam_goal = 8, study_plan = '{"v":1,"weeks":[]}' where id = u1;
    get diagnostics cnt = row_count;
    outcome := 'OK ' || cnt;
  exception when others then outcome := sqlstate;
  end;
  update public.learner_profiles set exam_goal = 9 where id = u2;
  get diagnostics cnt = row_count;
  results := results || jsonb_build_object('ca','P1','mo_ta','học sinh tự đặt mục tiêu + lộ trình của mình; không sửa được hồ sơ người khác','ky_vong','OK 1, 0 dòng',
    'ket_qua', outcome || ', ' || cnt || ' dòng', 'dat', outcome = 'OK 1' and cnt = 0);
  begin
    update public.learner_profiles set exam_goal = 11 where id = u1;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','P2','mo_ta','mục tiêu ngoài 1–10 → CHECK','ky_vong','23514','ket_qua', outcome, 'dat', outcome = '23514');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.start_generated_attempt(uuid, text, text, text, uuid[], smallint[], smallint[], integer)', 'execute')),
    (has_function_privilege('authenticated', 'public.start_generated_attempt(uuid, text, text, text, uuid[], smallint[], smallint[], integer)', 'execute')),
    (has_function_privilege('authenticated', 'public.get_generated_intro(uuid, text, text, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.exam_open_generated(text, uuid, text)', 'execute'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','Q1','mo_ta','chỉ service_role gọi hàm đề tự sinh','ky_vong','0 quyền',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 0 and has_function_privilege('service_role', 'public.get_generated_intro(uuid, text, text, text)', 'execute'));

  raise exception E'BAO_CAO_KIEM_THU_DE_TU_SINH\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
