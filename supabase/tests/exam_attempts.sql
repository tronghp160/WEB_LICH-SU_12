-- Kiểm thử GĐ2 luyện thi — lượt làm bài, chấm phía server (migration 20261026000000_exam_attempts.sql).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Một khối DO kết thúc bằng
-- `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ. Báo cáo JSON nằm trong thông báo lỗi
-- "BAO_CAO_KIEM_THU_LUOT_LAM_BAI" — đó là kết quả, không phải sự cố.
-- Ca chấm điểm C1 giống hệt tests/unit/exam-scoring.test.ts ("ca chung với SQL") — hai bên phải ra cùng con số.

do $test$
declare
  results jsonb := '[]'::jsonb;
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  pack uuid;
  free_set uuid;
  paid_set uuid;
  m1 uuid; m2 uuid; t1 uuid; t2 uuid; d1 uuid; pm uuid;
  o_paid bigint; o_acc bigint;
  r jsonb; r2 jsonb;
  att uuid; att2 uuid; att3 uuid; att4 uuid;
  cnt integer;
  outcome text;
  dev1 constant text := repeat('1', 64);
  dev2 constant text := repeat('2', 64);
  dev3 constant text := repeat('3', 64);
  dev4 constant text := repeat('4', 64);
  dev5 constant text := repeat('5', 64);
  token constant text := repeat('a', 64);
  code constant text := 'LT12-ZZKT-LVAA-AAAA';
  code_acc constant text := 'LT12-ZZKT-LVBB-BBBB';
  saved jsonb;
begin
  -- ---------- Dữ liệu nền ----------
  insert into auth.users (id, email, aud, role, created_at, updated_at) values
    (u1, 'zz-kt-luot-1-' || replace(u1::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (u2, 'zz-kt-luot-2-' || replace(u2::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now());
  insert into public.products (slug, kind, name, price_vnd, max_devices) values ('zz-kt-goi-luot', 'exam_pack', 'ZZ-KT gói lượt', 29000, 3) returning id into pack;
  insert into public.exam_sets (slug, title, format, duration_min, workflow_status) values ('zz-kt-luot-mien-phi', 'ZZ-KT đề miễn phí', 'mini', 15, 'published') returning id into free_set;
  insert into public.exam_sets (slug, title, format, duration_min, product_id, workflow_status) values ('zz-kt-luot-tra-phi', 'ZZ-KT đề trả phí', 'mini', 15, pack, 'published') returning id into paid_set;

  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT lượt câu một?', array['Đúng một', 'Sai a', 'Sai b', 'Sai c'], 0, 'Giải thích một', 'nhan_biet', 'tim_hieu_lich_su', 'SGK', 'published') returning id into m1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status, lesson_slug)
    values ('mcq', 'ZZ-KT lượt câu hai?', array['X', 'Y', 'Đúng hai', 'Z'], 2, 'Giải thích hai', 'thong_hieu', 'tim_hieu_lich_su', 'SGK', 'published', '7-khang-chien-chong-phap') returning id into m2;
  insert into public.exam_items (kind, stem, statements, explanation, level, competency, source_note, workflow_status)
    values ('true_false', 'ZZ-KT lượt Đúng/Sai một:', '[{"text":"Ý a thử một","is_true":true,"explanation":"Giải a"},{"text":"Ý b thử một","is_true":false,"explanation":"Giải b"},{"text":"Ý c thử một","is_true":false,"explanation":"Giải c"},{"text":"Ý d thử một","is_true":true,"explanation":"Giải d"}]',
            'Nhận xét một', 'van_dung', 'van_dung_kien_thuc', 'SGK', 'published') returning id into t1;
  insert into public.exam_items (kind, stem, statements, explanation, level, competency, source_note, workflow_status)
    values ('true_false', 'ZZ-KT lượt Đúng/Sai hai:', '[{"text":"Ý a thử hai","is_true":true,"explanation":"Giải a"},{"text":"Ý b thử hai","is_true":true,"explanation":"Giải b"},{"text":"Ý c thử hai","is_true":false,"explanation":"Giải c"},{"text":"Ý d thử hai","is_true":false,"explanation":"Giải d"}]',
            'Nhận xét hai', 'van_dung', 'van_dung_kien_thuc', 'SGK', 'published') returning id into t2;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note)
    values ('mcq', 'ZZ-KT lượt câu nháp?', array['A', 'B', 'C', 'D'], 0, 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK') returning id into d1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT lượt câu trả phí?', array['A', 'B', 'C', 'D'], 3, 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK', 'published') returning id into pm;
  insert into public.exam_set_items (set_id, item_id, section, position, choice_shift) values
    (free_set, m1, 1, 1, 1), (free_set, m2, 1, 2, 0), (free_set, d1, 1, 3, 0), (free_set, t1, 2, 1, 0), (free_set, t2, 2, 2, 0),
    (paid_set, pm, 1, 1, 0);

  insert into public.orders (product_id, amount_vnd, provider, access_token_hash) values (pack, 29000, 'mock', token) returning order_code into o_paid;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, user_id) values (pack, 29000, 'mock', token, u2) returning order_code into o_acc;
  perform public.mark_order_paid(o_paid, 29000, 'mock', 'TX-LUOT-1', code);
  perform public.mark_order_paid(o_acc, 29000, 'mock', 'TX-LUOT-2', code_acc);
  perform public.activate_license(code, dev1);

  -- ---------- Bắt đầu, không lộ đáp án ----------
  r := public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev1, null, 'exam');
  att := (r -> 'attempt' ->> 'id')::uuid;
  results := results || jsonb_build_object('ca','A1','mo_ta','khách (chỉ có thiết bị) bắt đầu đề miễn phí: 4 câu đã công bố, KHÔNG có đáp án / ý đúng / lời giải',
    'ky_vong','ok, 4 câu, không lộ',
    'ket_qua', (r ->> 'ok') || ', ' || jsonb_array_length(r -> 'questions') || ' câu, lộ=' || (r::text ~ '"(correct_index|truths|explanation|statement_explanations|is_true)"')::text,
    'dat', (r ->> 'ok')::boolean and jsonb_array_length(r -> 'questions') = 4 and r::text !~ '"(correct_index|truths|explanation|statement_explanations|is_true)"');
  results := results || jsonb_build_object('ca','A2','mo_ta','thứ tự Phần I rồi Phần II; lựa chọn đã xoay (câu 1 xoay 1 → đáp án gốc ở vị trí B); có hạn nộp theo server',
    'ky_vong','m1,m2,t1,t2 · B=Đúng một · có deadline',
    'ket_qua', (select string_agg(q ->> 'kind', ',' order by (q ->> 'n')::int) from jsonb_array_elements(r -> 'questions') q) || ' · B=' || (r -> 'questions' -> 0 -> 'choices' ->> 1),
    'dat', (r -> 'questions' -> 0 ->> 'item_id')::uuid = m1 and (r -> 'questions' -> 3 ->> 'item_id')::uuid = t2
           and (r -> 'questions' -> 0 -> 'choices' ->> 1) = 'Đúng một' and (r -> 'attempt' ->> 'deadline_at') is not null
           and jsonb_array_length(r -> 'questions' -> 2 -> 'statements') = 4);

  r2 := public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev1, null, 'exam');
  results := results || jsonb_build_object('ca','A3','mo_ta','bắt đầu lại khi đang làm dở → trả đúng lượt cũ (làm tiếp)','ky_vong','cùng id',
    'ket_qua', ((r2 -> 'attempt' ->> 'id')::uuid = att)::text, 'dat', (r2 -> 'attempt' ->> 'id')::uuid = att);
  r2 := public.get_exam_intro('zz-kt-luot-mien-phi', null, dev1, null);
  results := results || jsonb_build_object('ca','A4','mo_ta','trang đề: số câu + lượt đang làm dở, không có câu hỏi','ky_vong','4 câu, lượt dở = lượt cũ',
    'ket_qua', (r2 ->> 'question_count') || ' câu, ' || coalesce(r2 -> 'in_progress' ->> 'id', 'null'),
    'dat', (r2 ->> 'question_count')::int = 4 and (r2 -> 'in_progress' ->> 'id')::uuid = att and not (r2 ? 'questions'));

  -- ---------- Chủ lượt ----------
  r2 := public.save_attempt_answers(att, null, dev2, jsonb_build_object(m1::text, '{"choice":1}'::jsonb));
  results := results || jsonb_build_object('ca','O1','mo_ta','máy khác không lưu / xem / nộp được lượt của máy này','ky_vong','not_found ×3',
    'ket_qua', (r2 ->> 'reason') || ', ' || (public.get_attempt_result(att, null, dev2) ->> 'reason') || ', ' || (public.submit_exam_attempt(att, null, dev2, null) ->> 'reason'),
    'dat', r2 ->> 'reason' = 'not_found' and public.get_attempt_result(att, null, dev2) ->> 'reason' = 'not_found'
           and (select status::text from public.exam_attempts where id = att) = 'in_progress');

  -- ---------- Lưu: chỉ giữ dữ liệu hợp lệ ----------
  r2 := public.save_attempt_answers(att, null, dev1, jsonb_build_object(
    m1::text, '{"choice": 1, "hack": "x", "flagged": true, "ms": 1500}'::jsonb,
    gen_random_uuid()::text, '{"choice": 1}'::jsonb,
    m2::text, '{"choice": 7}'::jsonb,
    t1::text, '{"tf": [true, false, true, null, true]}'::jsonb,
    t2::text, '{"tf": [true, "x", false, null]}'::jsonb));
  select a.answers into saved from public.exam_attempts a where a.id = att;
  results := results || jsonb_build_object('ca','S1','mo_ta','lưu: bỏ câu lạ, khóa lạ, lựa chọn ngoài 0–3, tf sai độ dài; phần tử tf sai kiểu → null',
    'ky_vong','m1 {choice,flagged,ms}, t2 [true,null,false,null], không có m2 / t1',
    'ket_qua', saved::text,
    'dat', (r2 ->> 'ok')::boolean and saved = jsonb_build_object(m1::text, '{"choice": 1, "flagged": true, "ms": 1500}'::jsonb, t2::text, '{"tf": [true, null, false, null]}'::jsonb));
  perform public.save_attempt_answers(att, null, dev1, jsonb_build_object(m1::text, '{"choice": null}'::jsonb));
  results := results || jsonb_build_object('ca','S2','mo_ta','bỏ chọn (choice null) thay câu trả lời cũ của câu đó','ky_vong','{"choice": null}',
    'ket_qua', (select answers -> m1::text from public.exam_attempts where id = att)::text,
    'dat', (select answers -> m1::text from public.exam_attempts where id = att) = '{"choice": null}'::jsonb);

  -- ---------- Nộp + chấm (ca chung với unit test) ----------
  r := public.submit_exam_attempt(att, null, dev1, jsonb_build_object(
    m1::text, '{"choice": 1}'::jsonb, m2::text, '{"choice": 0}'::jsonb,
    t1::text, '{"tf": [true, false, true, null]}'::jsonb, t2::text, '{"tf": [true, true, false, false]}'::jsonb));
  results := results || jsonb_build_object('ca','C1','mo_ta','chấm: TN đúng (sau xoay) 0,25 + TN sai 0 + Đ/S 2 ý 0,25 + Đ/S 4 ý 1 = 1,5 / 2,5 → 6 điểm',
    'ky_vong','6.00 · 1.50/2.50 · items 250,0,250,1000 · đúng 2 · trống 0',
    'ket_qua', (r -> 'attempt' ->> 'score10') || ' · ' || (r -> 'attempt' ->> 'raw_score') || '/' || (r -> 'attempt' ->> 'max_score') || ' · items '
               || (r -> 'attempt' -> 'breakdown' -> 'items')::text || ' · đúng ' || (r -> 'attempt' -> 'breakdown' ->> 'correct')
               || ' · trống ' || (r -> 'attempt' -> 'breakdown' ->> 'unanswered'),
    'dat', (r -> 'attempt' ->> 'score10')::numeric = 6 and (r -> 'attempt' ->> 'raw_score')::numeric = 1.5 and (r -> 'attempt' ->> 'max_score')::numeric = 2.5
           and (r -> 'attempt' -> 'breakdown' -> 'items') = '[250, 0, 250, 1000]'::jsonb
           and (r -> 'attempt' -> 'breakdown' ->> 'correct')::int = 2 and (r -> 'attempt' -> 'breakdown' ->> 'unanswered')::int = 0);
  results := results || jsonb_build_object('ca','C2','mo_ta','phân tích theo phần / dạng / bài / mức độ','ky_vong','Phần I 250/500, Phần II 1250/2000, Đ/S 1250, bài 7 0/250, vận dụng 1250/2000',
    'ket_qua', (r -> 'attempt' -> 'breakdown' -> 'sections')::text,
    'dat', (r -> 'attempt' -> 'breakdown' -> 'sections' -> '1' ->> 'earned')::int = 250 and (r -> 'attempt' -> 'breakdown' -> 'sections' -> '1' ->> 'max')::int = 500
           and (r -> 'attempt' -> 'breakdown' -> 'sections' -> '2' ->> 'earned')::int = 1250
           and (r -> 'attempt' -> 'breakdown' -> 'kinds' -> 'true_false' ->> 'earned')::int = 1250
           and (r -> 'attempt' -> 'breakdown' -> 'lessons' -> '7-khang-chien-chong-phap' ->> 'earned')::int = 0
           and (r -> 'attempt' -> 'breakdown' -> 'levels' -> 'van_dung' ->> 'max')::int = 2000);
  results := results || jsonb_build_object('ca','C3','mo_ta','sau khi nộp mới có đáp án đúng (đã xoay), ý đúng, lời giải, điểm từng câu','ky_vong','1 · [true,false,false,true] · có lời giải',
    'ket_qua', (r -> 'questions' -> 0 ->> 'correct_index') || ' · ' || (r -> 'questions' -> 2 -> 'truths')::text || ' · ' || coalesce(r -> 'questions' -> 1 ->> 'explanation', 'null'),
    'dat', (r -> 'questions' -> 0 ->> 'correct_index')::int = 1 and (r -> 'questions' -> 2 -> 'truths') = '[true, false, false, true]'::jsonb
           and (r -> 'questions' -> 1 ->> 'explanation') = 'Giải thích hai' and (r -> 'questions' -> 3 ->> 'earned_milli')::int = 1000);
  r2 := public.submit_exam_attempt(att, null, dev1, jsonb_build_object(m2::text, '{"choice": 2}'::jsonb));
  results := results || jsonb_build_object('ca','C4','mo_ta','nộp lại → trả kết quả cũ, không chấm lại với câu trả lời mới; lưu sau khi nộp bị từ chối','ky_vong','6.00, submitted',
    'ket_qua', (r2 -> 'attempt' ->> 'score10') || ', ' || (public.save_attempt_answers(att, null, dev1, '{}'::jsonb) ->> 'reason'),
    'dat', (r2 -> 'attempt' ->> 'score10')::numeric = 6 and public.save_attempt_answers(att, null, dev1, '{}'::jsonb) ->> 'reason' = 'submitted');

  -- ---------- Hết giờ ----------
  r := public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev3, null, 'exam');
  att3 := (r -> 'attempt' ->> 'id')::uuid;
  update public.exam_attempts set deadline_at = now() - interval '1 minute' where id = att3;
  r2 := public.save_attempt_answers(att3, null, dev3, jsonb_build_object(m1::text, '{"choice": 1}'::jsonb));
  r := public.submit_exam_attempt(att3, null, dev3, jsonb_build_object(m1::text, '{"choice": 1}'::jsonb));
  results := results || jsonb_build_object('ca','T1','mo_ta','quá hạn + 30 giây: lưu bị từ chối, nộp chỉ chấm phần đã lưu trước hạn','ky_vong','time_up, 0 điểm, trống 4',
    'ket_qua', (r2 ->> 'reason') || ', ' || (r -> 'attempt' ->> 'score10') || ' điểm, trống ' || (r -> 'attempt' -> 'breakdown' ->> 'unanswered'),
    'dat', r2 ->> 'reason' = 'time_up' and (r -> 'attempt' ->> 'score10')::numeric = 0 and (r -> 'attempt' -> 'breakdown' ->> 'unanswered')::int = 4);

  r := public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev4, null, 'exam');
  att4 := (r -> 'attempt' ->> 'id')::uuid;
  perform public.save_attempt_answers(att4, null, dev4, jsonb_build_object(m1::text, '{"choice": 1}'::jsonb));
  update public.exam_attempts set deadline_at = now() - interval '1 minute' where id = att4;
  r := public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev4, null, 'exam');
  results := results || jsonb_build_object('ca','T2','mo_ta','bắt đầu khi lượt cũ đã hết giờ → lượt cũ được chấm theo phần đã lưu, tạo lượt mới','ky_vong','cũ submitted 1.00 (đúng 1 câu TN = 0,25 / 2,5), lượt mới khác id',
    'ket_qua', (select status::text || ' ' || score10 from public.exam_attempts where id = att4) || ', mới khác=' || ((r -> 'attempt' ->> 'id')::uuid <> att4)::text,
    'dat', (select status = 'submitted' and score10 = 1 from public.exam_attempts where id = att4) and (r -> 'attempt' ->> 'id')::uuid <> att4);

  -- ---------- Tài khoản ----------
  r := public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev5, u1, 'exam');
  att2 := (r -> 'attempt' ->> 'id')::uuid;
  results := results || jsonb_build_object('ca','U1','mo_ta','lượt tạo khi đăng nhập: chỉ đúng tài khoản xem được (cùng máy nhưng đã đăng xuất → không)','ky_vong','not_found, ok',
    'ket_qua', (public.get_attempt_result(att2, null, dev5) ->> 'reason') || ', ' || (public.get_attempt_result(att2, u1, null) ->> 'ok'),
    'dat', public.get_attempt_result(att2, null, dev5) ->> 'reason' = 'not_found' and (public.get_attempt_result(att2, u1, null) ->> 'ok')::boolean
           and public.get_attempt_result(att2, u2, dev5) ->> 'reason' = 'not_found');
  r2 := public.get_attempt_result(att2, u1, null);
  results := results || jsonb_build_object('ca','U2','mo_ta','xem lượt đang làm → không có đáp án','ky_vong','in_progress, không lộ',
    'ket_qua', (r2 -> 'attempt' ->> 'status') || ', lộ=' || (r2::text ~ '"(correct_index|truths|explanation)"')::text,
    'dat', r2 -> 'attempt' ->> 'status' = 'in_progress' and r2::text !~ '"(correct_index|truths|explanation)"');
  r := public.start_exam_attempt('zz-kt-luot-mien-phi', null, null, null, 'exam');
  results := results || jsonb_build_object('ca','U3','mo_ta','không có tài khoản lẫn thiết bị → từ chối; chế độ lạ → từ chối','ky_vong','no_device, unsupported_mode',
    'ket_qua', (r ->> 'reason') || ', ' || (public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev1, null, 'practice') ->> 'reason'),
    'dat', r ->> 'reason' = 'no_device' and public.start_exam_attempt('zz-kt-luot-mien-phi', null, dev1, null, 'practice') ->> 'reason' = 'unsupported_mode');

  -- ---------- Đề trả phí ----------
  results := results || jsonb_build_object('ca','P1','mo_ta','đề trả phí: không mã → invalid_code; mã + máy đã kích hoạt → code; máy chưa kích hoạt → not_activated; gói của tài khoản → account',
    'ky_vong','invalid_code, code, not_activated, account',
    'ket_qua', (public.start_exam_attempt('zz-kt-luot-tra-phi', null, dev2, null, 'exam') ->> 'reason') || ', '
               || (public.start_exam_attempt('zz-kt-luot-tra-phi', code, dev1, null, 'exam') ->> 'access') || ', '
               || (public.start_exam_attempt('zz-kt-luot-tra-phi', code, dev2, null, 'exam') ->> 'reason') || ', '
               || (public.start_exam_attempt('zz-kt-luot-tra-phi', null, dev2, u2, 'exam') ->> 'access'),
    'dat', public.start_exam_attempt('zz-kt-luot-tra-phi', null, dev2, null, 'exam') ->> 'reason' = 'invalid_code'
           and public.start_exam_attempt('zz-kt-luot-tra-phi', code, dev1, null, 'exam') ->> 'access' = 'code'
           and public.start_exam_attempt('zz-kt-luot-tra-phi', code, dev2, null, 'exam') ->> 'reason' = 'not_activated'
           and public.start_exam_attempt('zz-kt-luot-tra-phi', null, dev2, u2, 'exam') ->> 'access' = 'account');
  select license_id is not null into outcome from public.exam_attempts where set_id = paid_set and device_hash = dev1 limit 1;
  results := results || jsonb_build_object('ca','P2','mo_ta','lượt mở bằng mã ghi license_id','ky_vong','true','ket_qua', outcome, 'dat', outcome = 'true');

  -- ---------- Quyền ----------
  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.start_exam_attempt(text, text, text, uuid, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.start_exam_attempt(text, text, text, uuid, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.submit_exam_attempt(uuid, uuid, text, jsonb)', 'execute')),
    (has_function_privilege('authenticated', 'public.save_attempt_answers(uuid, uuid, text, jsonb)', 'execute')),
    (has_function_privilege('authenticated', 'public.get_attempt_result(uuid, uuid, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.get_exam_intro(text, text, text, uuid)', 'execute')),
    (has_function_privilege('authenticated', 'public.exam_access(text, text, text, uuid)', 'execute')),
    (has_function_privilege('authenticated', 'public.exam_grade_attempt(uuid)', 'execute')),
    (has_function_privilege('anon', 'public.exam_attempt_view(public.exam_attempts, boolean)', 'execute')),
    (has_table_privilege('anon', 'public.exam_attempts', 'select')),
    (has_table_privilege('authenticated', 'public.exam_attempts', 'insert')),
    (has_table_privilege('authenticated', 'public.exam_attempts', 'update'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','Q1','mo_ta','khách / người đăng nhập không gọi được hàm nào, không ghi được bảng; chỉ service_role','ky_vong','0 quyền, service_role có',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 0 and has_function_privilege('service_role', 'public.submit_exam_attempt(uuid, uuid, text, jsonb)', 'execute'));
  results := results || jsonb_build_object('ca','Q2','mo_ta','giới hạn tần suất nhận loại exam_start, exam_save','ky_vong','true, true',
    'ket_qua', public.consume_rate_limit('exam_start', repeat('e', 64), 60, 100)::text || ', ' || public.consume_rate_limit('exam_save', repeat('e', 64), 60, 100)::text,
    'dat', public.consume_rate_limit('exam_start', repeat('f', 64), 60, 100) and public.consume_rate_limit('exam_save', repeat('f', 64), 60, 100));

  -- ---------- RLS: học sinh chỉ đọc lượt của mình ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', u1, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.exam_attempts;
  begin
    update public.exam_attempts set score10 = 10 where id = att2;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','R1','mo_ta','học sinh chỉ thấy lượt của mình (không thấy lượt theo thiết bị), không sửa được điểm','ky_vong','1 dòng, 42501',
    'ket_qua', cnt || ' dòng, ' || outcome, 'dat', cnt = 1 and outcome = '42501');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  raise exception E'BAO_CAO_KIEM_THU_LUOT_LAM_BAI\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
