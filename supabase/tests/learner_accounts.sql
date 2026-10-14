-- Kiểm thử B1 — tài khoản học sinh (migration 20261020000000_learner_accounts.sql; docs/ke-hoach-tai-khoan.md, mục 12).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Giống supabase/tests/payments.sql:
-- một khối DO kết thúc bằng `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ (tài khoản thử, đơn, mã đều biến
-- mất). Báo cáo JSON nằm trong thông báo lỗi "BAO_CAO_KIEM_THU_TAI_KHOAN_HOC_SINH" — đó là kết quả, không phải sự cố.
--
-- Phần RLS chạy THẬT bằng role `authenticated` với `request.jwt.claims` của từng người (như PostgREST làm), rồi trả về
-- role postgres. Mã SQLSTATE kỳ vọng: 42501 RLS/quyền · 23514 CHECK · P0001 raise exception.

do $test$
declare
  results jsonb := '[]'::jsonb;
  a uuid := gen_random_uuid();      -- học sinh A
  b uuid := gen_random_uuid();      -- học sinh B
  adm uuid := gen_random_uuid();    -- quản trị viên thử
  ed uuid := gen_random_uuid();     -- biên tập viên thử
  pack uuid;
  o_a bigint;        -- đơn gói của A (đăng nhập khi mua)
  o_guest bigint;    -- đơn gói không đăng nhập
  o_rev bigint;      -- đơn gói, mã bị thu hồi
  r jsonb;
  outcome text;
  cnt integer;
  name_b text;
  token constant text := repeat('a', 64);
  dev1 constant text := repeat('1', 64);
  code_a constant text := 'LT12-ZZKT-HSAA-AAAA';
  code_guest constant text := 'LT12-ZZKT-HSBB-BBBB';
  code_rev constant text := 'LT12-ZZKT-HSCC-CCCC';
  mail_a constant text := 'zz-kt-hs-a-' || replace(gen_random_uuid()::text, '-', '') || '@test.local';
begin
  -- ---------- Dữ liệu thử ----------
  insert into auth.users (id, email, aud, role, created_at, updated_at) values
    (a,   mail_a, 'authenticated', 'authenticated', now(), now()),
    (b,   'zz-kt-hs-b-' || replace(b::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (adm, 'zz-kt-hs-adm-' || replace(adm::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (ed,  'zz-kt-hs-ed-' || replace(ed::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now());
  insert into public.staff_profiles (id, full_name, role, account_status) values
    (adm, 'ZZ-KT quản trị', 'system_admin', 'active'),
    (ed,  'ZZ-KT biên tập', 'editor', 'active');
  insert into public.learner_profiles (id, display_name, terms_version) values (b, 'ZZ-KT Học sinh B', '2026-10');
  insert into public.learner_progress (user_id, data) values (b, '{"v":1}');

  insert into public.products (slug, kind, name, price_vnd, max_devices)
    values ('zz-kt-goi-hs', 'exam_pack', 'ZZ-KT gói (tài khoản)', 29000, 3) returning id into pack;
  insert into public.exam_sets (slug, title, product_id, duration_min, workflow_status) values
    ('zz-kt-de-hs-tra-phi', 'ZZ-KT đề trả phí (tài khoản)', pack, 15, 'published'),
    ('zz-kt-de-hs-mien-phi', 'ZZ-KT đề miễn phí (tài khoản)', null, 15, 'published');

  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, user_id)
    values (pack, 29000, 'mock', token, a) returning order_code into o_a;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash)
    values (pack, 29000, 'mock', token) returning order_code into o_guest;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash)
    values (pack, 29000, 'mock', token) returning order_code into o_rev;
  perform public.mark_order_paid(o_a, 29000, 'mock', 'TX-HS-A', code_a);
  perform public.mark_order_paid(o_guest, 29000, 'mock', 'TX-HS-G', code_guest);
  perform public.mark_order_paid(o_rev, 29000, 'mock', 'TX-HS-R', code_rev);
  update public.licenses set status = 'revoked' where code = code_rev;

  -- ---------- Quyền bảng ----------
  -- H1: khách (anon) không có quyền gì trên hai bảng mới.
  select count(*) into cnt from (values
    (has_table_privilege('anon', 'public.learner_profiles', 'select')),
    (has_table_privilege('anon', 'public.learner_profiles', 'insert')),
    (has_table_privilege('anon', 'public.learner_progress', 'select')),
    (has_table_privilege('anon', 'public.learner_progress', 'update')),
    (has_table_privilege('authenticated', 'public.learner_profiles', 'delete')),
    (has_table_privilege('authenticated', 'public.learner_progress', 'delete'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','H1','mo_ta','anon không có quyền; authenticated không xóa được','ky_vong','0 quyền',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 0);

  -- H2: cả hai bảng bật RLS.
  select count(*) into cnt from pg_tables
   where schemaname = 'public' and tablename in ('learner_profiles', 'learner_progress') and rowsecurity;
  results := results || jsonb_build_object('ca','H2','mo_ta','learner_profiles, learner_progress bật RLS','ky_vong','2',
    'ket_qua', cnt, 'dat', cnt = 2);

  -- ---------- RLS: đăng nhập là A ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- H3: A tạo hồ sơ của chính mình.
  begin
    insert into public.learner_profiles (id, display_name, terms_version) values (a, 'ZZ-KT Học sinh A', '2026-10');
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','H3','mo_ta','học sinh tạo hồ sơ của mình','ky_vong','OK',
    'ket_qua', outcome, 'dat', outcome = 'OK');

  -- H4: A không tạo được hồ sơ mang id người khác.
  begin
    insert into public.learner_profiles (id, display_name, terms_version) values (gen_random_uuid(), 'ZZ-KT giả', '2026-10');
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','H4','mo_ta','không tạo hồ sơ cho id khác','ky_vong','42501',
    'ket_qua', outcome, 'dat', outcome = '42501');

  -- H5: A chỉ thấy hồ sơ của mình (không thấy B).
  select count(*) into cnt from public.learner_profiles;
  results := results || jsonb_build_object('ca','H5','mo_ta','học sinh chỉ đọc được hồ sơ của mình','ky_vong','1',
    'ket_qua', cnt, 'dat', cnt = 1);

  -- H6: A sửa hồ sơ của B → không dòng nào bị đổi.
  update public.learner_profiles set display_name = 'ZZ-KT bị sửa' where id = b;
  -- H7: A không đổi id hồ sơ của mình sang id khác.
  begin
    update public.learner_profiles set id = gen_random_uuid() where id = a;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','H7','mo_ta','không đổi id hồ sơ sang người khác','ky_vong','lỗi (42501/23503)',
    'ket_qua', outcome, 'dat', outcome in ('42501', '23503'));

  -- H8: tiến độ — A ghi của mình, không thấy của B.
  begin
    insert into public.learner_progress (user_id, data) values (a, '{"v":1,"lessons":{}}');
    update public.learner_progress set data = '{"v":1,"lessons":{"bai-1":{}}}' where user_id = a;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  select count(*) into cnt from public.learner_progress;
  results := results || jsonb_build_object('ca','H8','mo_ta','ghi tiến độ của mình; chỉ thấy 1 dòng (của mình)','ky_vong','OK, 1',
    'ket_qua', outcome || ', ' || cnt, 'dat', outcome = 'OK' and cnt = 1);

  -- H9: A không ghi tiến độ thay B; sửa tiến độ B không đổi gì.
  begin
    insert into public.learner_progress (user_id, data) values (gen_random_uuid(), '{}');
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  update public.learner_progress set data = '{"hack":true}' where user_id = b;
  results := results || jsonb_build_object('ca','H9','mo_ta','không ghi tiến độ cho id khác','ky_vong','42501',
    'ket_qua', outcome, 'dat', outcome = '42501');

  -- H10: tiến độ phải là object JSON.
  begin
    insert into public.learner_progress (user_id, data) values (a, '[]')
      on conflict (user_id) do update set data = excluded.data;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','H10','mo_ta','tiến độ không phải object → CHECK','ky_vong','23514',
    'ket_qua', outcome, 'dat', outcome = '23514');

  -- H11: học sinh không thấy đơn hàng / mã nào — kể cả đơn và mã của chính mình (server đọc hộ bằng khóa bí mật).
  -- Bảng có GRANT select cho authenticated (để policy của quản trị viên chạy) nên kết quả là 0 dòng, hoặc bị từ chối.
  begin
    select (select count(*) from public.orders) + (select count(*) from public.licenses) into cnt;
    outcome := cnt || ' dòng';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','H11','mo_ta','học sinh không đọc được orders, licenses','ky_vong','0 dòng hoặc 42501',
    'ket_qua', outcome, 'dat', outcome in ('0 dòng', '42501'));
  begin
    r := public.claim_license(code_guest, a);
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','H12','mo_ta','học sinh không tự gọi claim_license','ky_vong','42501',
    'ket_qua', outcome, 'dat', outcome = '42501');

  -- ---------- RLS: biên tập viên, quản trị viên ----------
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ed, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.learner_profiles;
  results := results || jsonb_build_object('ca','H13','mo_ta','biên tập viên không đọc hồ sơ học sinh','ky_vong','0',
    'ket_qua', cnt, 'dat', cnt = 0);

  perform set_config('request.jwt.claims', jsonb_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.learner_profiles where id in (a, b);
  update public.learner_profiles set display_name = 'ZZ-KT admin sửa' where id = b;
  results := results || jsonb_build_object('ca','H14','mo_ta','quản trị viên đọc được hồ sơ học sinh (chỉ đọc)','ky_vong','2',
    'ket_qua', cnt, 'dat', cnt = 2);
  select count(*) into cnt from public.learner_progress;
  results := results || jsonb_build_object('ca','H15','mo_ta','quản trị viên không đọc tiến độ học sinh','ky_vong','0',
    'ket_qua', cnt, 'dat', cnt = 0);

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  select display_name into name_b from public.learner_profiles where id = b;
  select count(*) into cnt from public.learner_progress where user_id = b and data = '{"v":1}'::jsonb;
  results := results || jsonb_build_object('ca','H6','mo_ta','A / quản trị viên sửa hồ sơ, tiến độ của B không có tác dụng','ky_vong','tên, tiến độ B giữ nguyên',
    'ket_qua', name_b || ', ' || cnt, 'dat', name_b = 'ZZ-KT Học sinh B' and cnt = 1);

  -- ---------- Đơn hàng / mã theo tài khoản ----------
  -- M1: mark_order_paid chép user_id của đơn sang mã.
  select count(*) into cnt from public.licenses where code = code_a and user_id = a;
  results := results || jsonb_build_object('ca','M1','mo_ta','mua khi đăng nhập → mã thuộc tài khoản','ky_vong','1',
    'ket_qua', cnt, 'dat', cnt = 1);

  -- M2: không gán lại tài khoản của đơn.
  begin
    update public.orders set user_id = b where order_code = o_a;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','M2','mo_ta','trigger chặn đổi orders.user_id sang người khác','ky_vong','P0001',
    'ket_qua', outcome, 'dat', outcome = 'P0001');
  begin
    update public.orders set user_id = a where order_code = o_guest;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','M3','mo_ta','trigger chặn gán tài khoản cho đơn mua không đăng nhập','ky_vong','P0001',
    'ket_qua', outcome, 'dat', outcome = 'P0001');

  -- ---------- claim_license ----------
  r := public.claim_license(lower(code_guest), b);
  results := results || jsonb_build_object('ca','C1','mo_ta','mã chưa có chủ (gõ thường) → gắn vào B','ky_vong','ok',
    'ket_qua', r, 'dat', (r->>'ok')::boolean and not (r->>'already')::boolean
      and exists (select 1 from public.licenses where code = code_guest and user_id = b));
  r := public.claim_license(code_guest, b);
  results := results || jsonb_build_object('ca','C2','mo_ta','B gắn lại mã của mình → already','ky_vong','ok, already',
    'ket_qua', r, 'dat', (r->>'ok')::boolean and (r->>'already')::boolean);
  r := public.claim_license(code_guest, a);
  results := results || jsonb_build_object('ca','C3','mo_ta','A lấy mã đã thuộc B → từ chối','ky_vong','owned_by_other',
    'ket_qua', r, 'dat', r->>'reason' = 'owned_by_other'
      and exists (select 1 from public.licenses where code = code_guest and user_id = b));
  r := public.claim_license(code_rev, a);
  results := results || jsonb_build_object('ca','C4','mo_ta','mã bị thu hồi → từ chối','ky_vong','revoked',
    'ket_qua', r, 'dat', r->>'reason' = 'revoked');
  r := public.claim_license('LT12-ZZKT-KHON-GCOO', a);
  results := results || jsonb_build_object('ca','C5','mo_ta','mã không tồn tại','ky_vong','invalid_code',
    'ket_qua', r, 'dat', r->>'reason' = 'invalid_code');
  r := public.claim_license(code_guest, gen_random_uuid());
  results := results || jsonb_build_object('ca','C6','mo_ta','tài khoản không tồn tại','ky_vong','invalid_user',
    'ket_qua', r, 'dat', r->>'reason' = 'invalid_user');

  -- ---------- get_exam_set theo tài khoản ----------
  r := public.get_exam_set('zz-kt-de-hs-tra-phi', null, null, a);
  results := results || jsonb_build_object('ca','G1','mo_ta','A có gói theo tài khoản → mở đề, không cần mã / thiết bị','ky_vong','ok, account',
    'ket_qua', r - 'questions' - 'set', 'dat', (r->>'ok')::boolean and r->>'access' = 'account'
      and not exists (select 1 from public.license_activations la join public.licenses l on l.id = la.license_id where l.code = code_a));
  r := public.get_exam_set('zz-kt-de-hs-tra-phi', null, null, ed);
  results := results || jsonb_build_object('ca','G2','mo_ta','tài khoản không có gói, không mã → khóa','ky_vong','invalid_code',
    'ket_qua', r, 'dat', r->>'reason' = 'invalid_code');
  update public.licenses set status = 'revoked' where code = code_a;
  r := public.get_exam_set('zz-kt-de-hs-tra-phi', null, null, a);
  results := results || jsonb_build_object('ca','G3','mo_ta','gói của tài khoản bị thu hồi → khóa','ky_vong','không ok',
    'ket_qua', r, 'dat', not (r->>'ok')::boolean);
  update public.licenses set status = 'active' where code = code_a;
  perform public.activate_license(code_guest, dev1);
  r := public.get_exam_set('zz-kt-de-hs-tra-phi', code_guest, dev1);
  results := results || jsonb_build_object('ca','G4','mo_ta','lời gọi 3 tham số cũ (mã + thiết bị) vẫn chạy','ky_vong','ok, code',
    'ket_qua', r - 'questions' - 'set', 'dat', (r->>'ok')::boolean and r->>'access' = 'code');
  r := public.get_exam_set('zz-kt-de-hs-mien-phi', null, null, null);
  results := results || jsonb_build_object('ca','G5','mo_ta','đề miễn phí','ky_vong','ok, free',
    'ket_qua', r - 'questions' - 'set', 'dat', (r->>'ok')::boolean and r->>'access' = 'free');

  -- ---------- find_auth_user_by_email ----------
  results := results || jsonb_build_object('ca','F1','mo_ta','tìm tài khoản theo email (không phân biệt hoa thường)','ky_vong','= A; email lạ → null',
    'ket_qua', coalesce(public.find_auth_user_by_email('  ' || upper(mail_a) || ' ')::text, 'null'),
    'dat', public.find_auth_user_by_email('  ' || upper(mail_a) || ' ') = a
      and public.find_auth_user_by_email('khong-co-ai-' || a || '@test.local') is null);

  -- ---------- Quyền hàm ----------
  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.claim_license(text, uuid)', 'execute')),
    (has_function_privilege('authenticated', 'public.claim_license(text, uuid)', 'execute')),
    (has_function_privilege('anon', 'public.get_exam_set(text, text, text, uuid)', 'execute')),
    (has_function_privilege('authenticated', 'public.get_exam_set(text, text, text, uuid)', 'execute')),
    (has_function_privilege('anon', 'public.find_auth_user_by_email(text)', 'execute')),
    (has_function_privilege('authenticated', 'public.find_auth_user_by_email(text)', 'execute')),
    (has_function_privilege('authenticated', 'public.mark_order_paid(bigint, integer, text, text, text)', 'execute'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','P1','mo_ta','chỉ service_role gọi được các hàm tài khoản','ky_vong','0 quyền',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 0
      and has_function_privilege('service_role', 'public.claim_license(text, uuid)', 'execute')
      and has_function_privilege('service_role', 'public.get_exam_set(text, text, text, uuid)', 'execute')
      and has_function_privilege('service_role', 'public.find_auth_user_by_email(text)', 'execute'));
  select count(*) into cnt from pg_proc where pronamespace = 'public'::regnamespace and proname = 'get_exam_set';
  results := results || jsonb_build_object('ca','P2','mo_ta','chỉ còn một bản get_exam_set (đã xóa bản 3 tham số)','ky_vong','1',
    'ket_qua', cnt, 'dat', cnt = 1);

  -- ---------- Giới hạn số lần thử ----------
  begin
    perform public.consume_rate_limit('license_claim', repeat('c', 64), 60, 5);
    perform public.consume_rate_limit('progress_write', repeat('c', 64), 60, 5);
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','R1','mo_ta','loại giới hạn mới license_claim, progress_write','ky_vong','OK',
    'ket_qua', outcome, 'dat', outcome = 'OK');

  -- ---------- Xóa tài khoản ----------
  delete from auth.users where id = a;
  select count(*) into cnt from public.orders where order_code = o_a and user_id is null;
  results := results || jsonb_build_object('ca','D1','mo_ta','xóa tài khoản → đơn, mã còn nhưng bỏ gắn; hồ sơ, tiến độ bị xóa','ky_vong','đơn 1, mã 1, hồ sơ 0, tiến độ 0',
    'ket_qua', 'đơn ' || cnt
      || ', mã ' || (select count(*) from public.licenses where code = code_a and user_id is null)
      || ', hồ sơ ' || (select count(*) from public.learner_profiles where id = a)
      || ', tiến độ ' || (select count(*) from public.learner_progress where user_id = a),
    'dat', cnt = 1
      and exists (select 1 from public.licenses where code = code_a and user_id is null and status = 'active')
      and not exists (select 1 from public.learner_profiles where id = a)
      and not exists (select 1 from public.learner_progress where user_id = a));

  raise exception E'BAO_CAO_KIEM_THU_TAI_KHOAN_HOC_SINH\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
