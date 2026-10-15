-- Kiểm thử GĐ4 luyện thi — luyện tập, sổ câu sai, ôn ngắt quãng (migration 20261027000000_exam_practice.sql).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Một khối DO kết thúc bằng
-- `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ. Báo cáo JSON nằm trong thông báo lỗi
-- "BAO_CAO_KIEM_THU_LUYEN_TAP" — đó là kết quả, không phải sự cố.
-- Ca Leitner L1–L3 giống tests/unit/exam-leitner.test.ts.

do $test$
declare
  results jsonb := '[]'::jsonb;
  u1 uuid := gen_random_uuid();   -- học sinh chưa có gói
  u2 uuid := gen_random_uuid();   -- học sinh có gói gắn tài khoản
  pack uuid;
  free_set uuid;
  m1 uuid; m2 uuid; m3 uuid; t1 uuid; d1 uuid;
  o_acc bigint;
  r jsonb; r2 jsonb;
  att uuid; att2 uuid; exam_att uuid;
  correct integer;
  st public.learner_item_state%rowtype;
  cnt integer;
  outcome text;
  dev1 constant text := repeat('1', 64);
  dev2 constant text := repeat('2', 64);
  token constant text := repeat('a', 64);
  lesson constant text := 'zz-kt-bai-luyen-tap';
begin
  insert into auth.users (id, email, aud, role, created_at, updated_at) values
    (u1, 'zz-kt-lt-1-' || replace(u1::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (u2, 'zz-kt-lt-2-' || replace(u2::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now());
  insert into public.products (slug, kind, name, price_vnd, max_devices) values ('zz-kt-goi-lt', 'exam_pack', 'ZZ-KT gói luyện tập', 29000, 3) returning id into pack;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, user_id) values (pack, 29000, 'mock', token, u2) returning order_code into o_acc;
  perform public.mark_order_paid(o_acc, 29000, 'mock', 'TX-LT-2', 'LT12-ZZKT-LTAA-AAAA');

  insert into public.exam_items (kind, stem, choices, correct_index, explanation, lesson_slug, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT luyện tập câu một?', array['Đúng một', 'Sai a', 'Sai b', 'Sai c'], 0, 'Giải thích một', lesson, 'nhan_biet', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, lesson_slug, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT luyện tập câu hai?', array['X', 'Đúng hai', 'Y', 'Z'], 1, 'Giải thích hai', lesson, 'thong_hieu', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m2;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, lesson_slug, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT luyện tập câu ba?', array['P', 'Q', 'R', 'Đúng ba'], 3, 'Giải thích ba', lesson, 'van_dung', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m3;
  insert into public.exam_items (kind, stem, statements, explanation, lesson_slug, level, competency, source_note, workflow_status)
    values ('true_false', 'ZZ-KT luyện tập Đúng/Sai:', '[{"text":"Ý a luyện tập","is_true":true,"explanation":"Giải a"},{"text":"Ý b luyện tập","is_true":false,"explanation":"Giải b"},{"text":"Ý c luyện tập","is_true":true,"explanation":"Giải c"},{"text":"Ý d luyện tập","is_true":false,"explanation":"Giải d"}]',
            'Nhận xét', lesson, 'van_dung', 'van_dung_kien_thuc', 'SGK', 'published') returning id into t1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, lesson_slug, level, competency, source_note)
    values ('mcq', 'ZZ-KT luyện tập câu nháp?', array['A', 'B', 'C', 'D'], 0, 'Giải thích', lesson, 'nhan_biet', 'tim_hieu_lich_su', 'SGK') returning id into d1;
  insert into public.exam_sets (slug, title, format, duration_min, workflow_status) values ('zz-kt-lt-de', 'ZZ-KT đề luyện tập', 'mini', 15, 'published') returning id into free_set;
  insert into public.exam_set_items (set_id, item_id, section, position, choice_shift) values (free_set, m1, 1, 1, 0), (free_set, m2, 1, 2, 0), (free_set, t1, 2, 1, 0);

  -- ---------- Bắt đầu luyện tập ----------
  r := public.start_practice_attempt(null, null, dev1, jsonb_build_object('mode', 'practice', 'lessons', jsonb_build_array(lesson), 'count', 10));
  att := (r -> 'attempt' ->> 'id')::uuid;
  results := results || jsonb_build_object('ca','P1','mo_ta','khách (thiết bị) luyện theo bài: chỉ câu đã công bố, chế độ practice, không bấm giờ, không lộ đáp án',
    'ky_vong','4 câu, practice, không hạn, không lộ',
    'ket_qua', jsonb_array_length(r -> 'questions') || ' câu, ' || (r -> 'attempt' ->> 'mode') || ', hạn=' || coalesce(r -> 'attempt' ->> 'deadline_at', 'không') || ', lộ=' || (r::text ~ '"(correct_index|truths|explanation)"')::text,
    'dat', jsonb_array_length(r -> 'questions') = 4 and r -> 'attempt' ->> 'mode' = 'practice' and (r -> 'attempt' ->> 'deadline_at') is null
           and r::text !~ '"(correct_index|truths|explanation)"' and not (r::text like '%' || d1::text || '%'));

  -- ---------- Kiểm tra từng câu ----------
  select (i.correct_index + a.choice_shifts[array_position(a.item_ids, i.id)]) % 4 into correct
    from public.exam_attempts a, public.exam_items i where a.id = att and i.id = m1;
  r := public.check_attempt_item(att, null, dev1, m1, jsonb_build_object('choice', correct));
  results := results || jsonb_build_object('ca','K1','mo_ta','kiểm tra câu đúng: 250 điểm; CHỈ câu đó lộ đáp án + lời giải; câu bị khóa','ky_vong','250, lộ 1 câu, checked',
    'ket_qua', (r ->> 'earned_milli') || ', lộ ' || (select count(*) from jsonb_array_elements(r -> 'questions') q where q ? 'explanation') || ' câu, '
               || coalesce((select a.answers -> m1::text ->> 'checked' from public.exam_attempts a where a.id = att), 'null'),
    'dat', (r ->> 'earned_milli')::int = 250 and (select count(*) from jsonb_array_elements(r -> 'questions') q where q ? 'explanation') = 1
           and (select q ->> 'explanation' from jsonb_array_elements(r -> 'questions') q where (q ->> 'item_id')::uuid = m1) = 'Giải thích một');
  r := public.check_attempt_item(att, null, dev1, m1, jsonb_build_object('choice', (correct + 1) % 4));
  perform public.save_attempt_answers(att, null, dev1, jsonb_build_object(m1::text, jsonb_build_object('choice', (correct + 1) % 4)));
  results := results || jsonb_build_object('ca','K2','mo_ta','câu đã kiểm tra: kiểm tra lại / lưu không đổi được câu trả lời','ky_vong','already, giữ đáp án đúng',
    'ket_qua', coalesce(r ->> 'already', 'null') || ', ' || (select a.answers -> m1::text ->> 'choice' from public.exam_attempts a where a.id = att),
    'dat', (r ->> 'already')::boolean and (select (a.answers -> m1::text ->> 'choice')::int from public.exam_attempts a where a.id = att) = correct);
  r := public.check_attempt_item(att, null, dev2, m2, '{"choice": 0}'::jsonb);
  r2 := public.check_attempt_item(att, null, dev1, d1, '{"choice": 0}'::jsonb);
  results := results || jsonb_build_object('ca','K3','mo_ta','máy khác / câu không thuộc lượt → not_found','ky_vong','not_found, not_found',
    'ket_qua', (r ->> 'reason') || ', ' || (r2 ->> 'reason'), 'dat', r ->> 'reason' = 'not_found' and r2 ->> 'reason' = 'not_found');

  -- ---------- Hạn mức miễn phí ----------
  insert into public.rate_limit_hits (bucket, key_hash) select 'practice_free', dev1 from generate_series(1, 8);
  -- Lựa chọn của lượt luyện tập xoay ngẫu nhiên → tính đáp án hiển thị rồi cố ý chọn sai.
  select (i.correct_index + a.choice_shifts[array_position(a.item_ids, i.id)]) % 4 into correct
    from public.exam_attempts a, public.exam_items i where a.id = att and i.id = m2;
  r := public.check_attempt_item(att, null, dev1, m2, jsonb_build_object('choice', (correct + 1) % 4));
  r2 := public.check_attempt_item(att, null, dev1, m3, '{"choice": 0}'::jsonb);
  results := results || jsonb_build_object('ca','Q1','mo_ta','chưa có gói: câu kiểm tra thứ 10 trong ngày được, thứ 11 → quota (câu đó không bị khóa)','ky_vong','ok, quota, chưa khóa',
    'ket_qua', (r ->> 'ok') || ', ' || coalesce(r2 ->> 'reason', 'ok') || ', ' || coalesce((select a.answers -> m3::text ->> 'checked' from public.exam_attempts a where a.id = att), 'chưa khóa'),
    'dat', (r ->> 'ok')::boolean and r2 ->> 'reason' = 'quota' and (select a.answers -> m3::text ->> 'checked' from public.exam_attempts a where a.id = att) is null);

  r := public.start_practice_attempt(u2, null, null, jsonb_build_object('lessons', jsonb_build_array(lesson)));
  att2 := (r -> 'attempt' ->> 'id')::uuid;
  insert into public.rate_limit_hits (bucket, key_hash) select 'practice_free', encode(sha256(convert_to('user:' || u2::text, 'UTF8')), 'hex') from generate_series(1, 20);
  r2 := public.check_attempt_item(att2, u2, null, m3, '{"choice": 0}'::jsonb);
  results := results || jsonb_build_object('ca','Q2','mo_ta','có gói (của tài khoản): không giới hạn; lượt ghi license_id','ky_vong','pack=true, ok',
    'ket_qua', 'pack=' || (r ->> 'pack') || ', ' || coalesce(r2 ->> 'reason', 'ok'),
    'dat', (r ->> 'pack')::boolean and (r2 ->> 'ok')::boolean);

  -- ---------- Nộp lượt luyện tập: chỉ tính câu đã kiểm tra ----------
  r := public.submit_exam_attempt(att, null, dev1, jsonb_build_object(m3::text, '{"choice": 3}'::jsonb));
  results := results || jsonb_build_object('ca','N1','mo_ta','nộp luyện tập: điểm theo 2 câu đã kiểm tra (đúng 1, sai 1) → 5; sau khi nộp vẫn chỉ lộ 2 câu đó','ky_vong','5.00, 2 câu tính, lộ 2',
    'ket_qua', (r -> 'attempt' ->> 'score10') || ', ' || (r -> 'attempt' -> 'breakdown' ->> 'total') || ' câu tính, lộ ' || (select count(*) from jsonb_array_elements(r -> 'questions') q where q ? 'explanation'),
    'dat', (r -> 'attempt' ->> 'score10')::numeric = 5 and (r -> 'attempt' -> 'breakdown' ->> 'total')::int = 2
           and (select count(*) from jsonb_array_elements(r -> 'questions') q where q ? 'explanation') = 2);

  -- ---------- Sổ câu sai (Leitner) ----------
  r := public.start_practice_attempt(u1, null, null, jsonb_build_object('lessons', jsonb_build_array(lesson)));
  att := (r -> 'attempt' ->> 'id')::uuid;
  select (i.correct_index + a.choice_shifts[array_position(a.item_ids, i.id)]) % 4 into correct from public.exam_attempts a, public.exam_items i where a.id = att and i.id = m2;
  perform public.check_attempt_item(att, u1, null, m2, jsonb_build_object('choice', (correct + 1) % 4));
  select * into st from public.learner_item_state where user_id = u1 and item_id = m2;
  results := results || jsonb_build_object('ca','L1','mo_ta','sai → vào sổ, hộp 1, hạn ôn 0 giờ ngày mai (giờ Việt Nam)','ky_vong','true, 1, mai, sai 1',
    'ket_qua', st.in_notebook::text || ', ' || st.box || ', ' || st.due_at::text || ', sai ' || st.wrong_count,
    'dat', st.in_notebook and st.box = 1 and st.due_at = public.exam_vn_day(1) and st.wrong_count = 1);

  update public.learner_item_state set due_at = now() - interval '1 minute' where user_id = u1 and item_id = m2;
  perform public.exam_leitner_apply(u1, m2, true);
  select * into st from public.learner_item_state where user_id = u1 and item_id = m2;
  results := results || jsonb_build_object('ca','L2','mo_ta','đúng khi đang trong sổ → lên hộp 2, hạn sau 3 ngày','ky_vong','2, +3 ngày',
    'ket_qua', st.box || ', ' || st.due_at::text, 'dat', st.box = 2 and st.in_notebook and st.due_at = public.exam_vn_day(3));
  update public.learner_item_state set box = 5 where user_id = u1 and item_id = m2;
  perform public.exam_leitner_apply(u1, m2, true);
  select * into st from public.learner_item_state where user_id = u1 and item_id = m2;
  results := results || jsonb_build_object('ca','L3','mo_ta','đúng ở hộp 5 → ra khỏi sổ (giữ lịch sử)','ky_vong','false, đúng 2',
    'ket_qua', st.in_notebook::text || ', đúng ' || st.right_count, 'dat', not st.in_notebook and st.right_count = 2 and st.due_at is null);

  -- Lượt THI của tài khoản: câu sai vào sổ, câu bỏ trống không tính.
  r := public.start_exam_attempt('zz-kt-lt-de', null, null, u1, 'exam');
  exam_att := (r -> 'attempt' ->> 'id')::uuid;
  r := public.submit_exam_attempt(exam_att, u1, null, jsonb_build_object(m1::text, '{"choice": 2}'::jsonb, m2::text, '{"choice": 1}'::jsonb));
  results := results || jsonb_build_object('ca','L4','mo_ta','nộp bài thi (tài khoản): câu sai vào sổ, câu đúng không, câu bỏ trống không có dòng','ky_vong','m1 trong sổ, m2 ngoài sổ, t1 không có',
    'ket_qua', coalesce((select in_notebook::text from public.learner_item_state where user_id = u1 and item_id = m1), 'null') || ', '
               || coalesce((select in_notebook::text from public.learner_item_state where user_id = u1 and item_id = m2), 'null') || ', '
               || coalesce((select in_notebook::text from public.learner_item_state where user_id = u1 and item_id = t1), 'không có'),
    'dat', (select in_notebook from public.learner_item_state where user_id = u1 and item_id = m1)
           and not (select in_notebook from public.learner_item_state where user_id = u1 and item_id = m2)
           and not exists (select 1 from public.learner_item_state where user_id = u1 and item_id = t1));

  -- ---------- Ôn đến hạn, làm lại câu sai, sổ câu sai ----------
  results := results || jsonb_build_object('ca','R1','mo_ta','ôn đến hạn: chưa đăng nhập → login_required; chưa có gói → pack_required','ky_vong','login_required, pack_required',
    'ket_qua', (public.start_practice_attempt(null, null, dev1, '{"mode":"review"}') ->> 'reason') || ', ' || (public.start_practice_attempt(u1, null, null, '{"mode":"review"}') ->> 'reason'),
    'dat', public.start_practice_attempt(null, null, dev1, '{"mode":"review"}') ->> 'reason' = 'login_required'
           and public.start_practice_attempt(u1, null, null, '{"mode":"review"}') ->> 'reason' = 'pack_required');
  perform public.exam_leitner_apply(u2, m1, false);
  update public.learner_item_state set due_at = now() - interval '1 minute' where user_id = u2 and item_id = m1;
  perform public.exam_leitner_apply(u2, m2, false);
  r := public.start_practice_attempt(u2, null, null, '{"mode":"review"}');
  results := results || jsonb_build_object('ca','R2','mo_ta','có gói: ôn chỉ gồm câu ĐẾN HẠN (câu mới sai hôm nay hạn mai — chưa ôn)','ky_vong','review, 1 câu (m1)',
    'ket_qua', (r -> 'attempt' ->> 'mode') || ', ' || jsonb_array_length(r -> 'questions') || ' câu',
    'dat', r -> 'attempt' ->> 'mode' = 'review' and jsonb_array_length(r -> 'questions') = 1 and (r -> 'questions' -> 0 ->> 'item_id')::uuid = m1);

  r := public.start_practice_attempt(u1, null, null, jsonb_build_object('mode', 'retry', 'from_attempt', exam_att));
  r2 := public.start_practice_attempt(u2, null, null, jsonb_build_object('mode', 'retry', 'from_attempt', exam_att));
  results := results || jsonb_build_object('ca','R3','mo_ta','làm lại câu chưa đạt của lượt thi: m1 (sai) + t1 (bỏ trống); người khác → not_found','ky_vong','2 câu, not_found',
    'ket_qua', jsonb_array_length(r -> 'questions') || ' câu, ' || (r2 ->> 'reason'),
    'dat', jsonb_array_length(r -> 'questions') = 2 and r2 ->> 'reason' = 'not_found');

  r := public.get_notebook(u1);
  results := results || jsonb_build_object('ca','B1','mo_ta','sổ câu sai: đếm câu trong sổ / đến hạn, danh sách KHÔNG có đáp án','ky_vong','1 trong sổ, 0 đến hạn, không lộ',
    'ket_qua', (r ->> 'total') || ' trong sổ, ' || (r ->> 'due') || ' đến hạn, lộ=' || (r::text ~ '"(correct_index|choices|statements|explanation)"')::text,
    'dat', (r ->> 'total')::int = 1 and (r ->> 'due')::int = 0 and r::text !~ '"(correct_index|choices|statements|explanation)"');

  results := results || jsonb_build_object('ca','E1','mo_ta','bộ lọc không khớp câu nào → empty; chế độ lạ → unsupported_mode','ky_vong','empty, unsupported_mode',
    'ket_qua', (public.start_practice_attempt(null, null, dev1, '{"lessons":["khong-co-bai-nay"]}') ->> 'reason') || ', ' || (public.start_practice_attempt(null, null, dev1, '{"mode":"exam"}') ->> 'reason'),
    'dat', public.start_practice_attempt(null, null, dev1, '{"lessons":["khong-co-bai-nay"]}') ->> 'reason' = 'empty'
           and public.start_practice_attempt(null, null, dev1, '{"mode":"exam"}') ->> 'reason' = 'unsupported_mode');

  -- ---------- Quyền ----------
  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.start_practice_attempt(uuid, text, text, jsonb)', 'execute')),
    (has_function_privilege('authenticated', 'public.check_attempt_item(uuid, uuid, text, uuid, jsonb)', 'execute')),
    (has_function_privilege('authenticated', 'public.get_notebook(uuid)', 'execute')),
    (has_function_privilege('authenticated', 'public.exam_leitner_apply(uuid, uuid, boolean)', 'execute')),
    (has_table_privilege('anon', 'public.learner_item_state', 'select')),
    (has_table_privilege('authenticated', 'public.learner_item_state', 'insert')),
    (has_table_privilege('authenticated', 'public.learner_item_state', 'update'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','Q3','mo_ta','khách / người đăng nhập không gọi hàm, không ghi sổ; chỉ service_role','ky_vong','0 quyền',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 0 and has_function_privilege('service_role', 'public.check_attempt_item(uuid, uuid, text, uuid, jsonb)', 'execute'));

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u1, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.learner_item_state;
  begin
    update public.learner_item_state set in_notebook = false where user_id = u1;
    get diagnostics cnt = row_count;
    outcome := 'OK ' || cnt;
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','R4','mo_ta','học sinh chỉ đọc sổ của mình, không tự sửa','ky_vong','chỉ dòng của u1, 42501',
    'ket_qua', (select count(*) from public.learner_item_state) || ' dòng, ' || outcome,
    'dat', (select count(*) from public.learner_item_state where user_id <> u1) = 0 and outcome = '42501');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  raise exception E'BAO_CAO_KIEM_THU_LUYEN_TAP\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
