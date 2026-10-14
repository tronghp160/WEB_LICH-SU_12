-- Kiểm thử CƠ SỞ DỮ LIỆU của chức năng thanh toán (docs/ke-hoach-thanh-toan.md, mục 12) — ràng buộc, máy trạng thái,
-- các hàm mark_order_paid / activate_license / get_exam_set / expire_stale_orders, và quyền của anon/authenticated.
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration 20261015000000_payments.sql).
-- An toàn: MỘT khối DO, kết thúc bằng `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ (dữ liệu thử biến
-- mất). Báo cáo JSON nằm trong thông báo lỗi "BAO_CAO_KIEM_THU_THANH_TOAN" — đó là kết quả, không phải sự cố.
-- Chạy bằng role postgres (bỏ qua RLS); phần phân quyền kiểm bằng has_table_privilege / has_function_privilege.
--
-- Mã SQLSTATE kỳ vọng: 23514 CHECK · 23505 UNIQUE · 22P02 sai kiểu/enum · P0001 raise exception.

do $test$
declare
  results jsonb := '[]'::jsonb;
  pack uuid;        -- sản phẩm gói luyện thi thử
  don uuid;         -- sản phẩm ủng hộ thử
  free_set uuid;
  paid_set uuid;
  draft_set uuid;
  o1 bigint;        -- đơn gói: trả đúng tiền
  o2 bigint;        -- đơn gói: hết hạn rồi mới trả
  o3 bigint;        -- đơn gói: đã hủy
  o4 bigint;        -- đơn ủng hộ
  o5 bigint;        -- đơn gói: quá hạn, chờ expire_stale_orders
  r jsonb;
  r2 jsonb;
  c record;
  outcome text;
  cnt integer;
  token constant text := repeat('a', 64);
  dev1 constant text := repeat('1', 64);
  dev2 constant text := repeat('2', 64);
  dev3 constant text := repeat('3', 64);
  dev4 constant text := repeat('4', 64);
  code1 constant text := 'LT12-ZZKT-AAAA-BBBB';
  code2 constant text := 'LT12-ZZKT-CCCC-DDDD';
begin
  -- Dữ liệu nền (nằm trong giao dịch, bị hoàn tác ở cuối)
  insert into public.products (slug, kind, name, price_vnd, max_devices)
    values ('zz-kt-goi', 'exam_pack', 'ZZ-KT gói luyện thi', 29000, 3) returning id into pack;
  insert into public.products (slug, kind, name, min_vnd, max_vnd)
    values ('zz-kt-ung-ho', 'donation', 'ZZ-KT ủng hộ', 10000, 2000000) returning id into don;
  insert into public.exam_sets (slug, title, workflow_status) values ('zz-kt-de-mien-phi', 'ZZ-KT đề miễn phí', 'published') returning id into free_set;
  insert into public.exam_sets (slug, title, product_id, workflow_status) values ('zz-kt-de-tra-phi', 'ZZ-KT đề trả phí', pack, 'published') returning id into paid_set;
  insert into public.exam_sets (slug, title, workflow_status) values ('zz-kt-de-nhap', 'ZZ-KT đề nháp', 'draft') returning id into draft_set;
  insert into public.exam_questions (set_id, position, question, choices, correct_index, explanation, source_note) values
    (free_set, 1, 'ZZ-KT câu hỏi 1?', array['A', 'B', 'C', 'D'], 0, 'Giải thích thử', 'SGK thử'),
    (free_set, 2, 'ZZ-KT câu hỏi 2?', array['A', 'B', 'C', 'D'], 1, 'Giải thích thử', 'SGK thử'),
    (paid_set, 1, 'ZZ-KT câu trả phí?', array['A', 'B', 'C', 'D'], 2, 'Giải thích thử', 'SGK thử');

  insert into public.orders (product_id, amount_vnd, provider, access_token_hash) values (pack, 29000, 'mock', token) returning order_code into o1;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, status, expires_at)
    values (pack, 29000, 'mock', token, 'expired', now() - interval '1 hour') returning order_code into o2;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, status)
    values (pack, 29000, 'mock', token, 'cancelled') returning order_code into o3;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, display_name, message, show_on_wall)
    values (don, 50000, 'mock', token, 'ZZ-KT bạn đọc', 'Cảm ơn!', true) returning order_code into o4;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash, expires_at)
    values (pack, 29000, 'mock', token, now() - interval '1 minute') returning order_code into o5;

  -- ===== Ràng buộc "một câu lệnh": (mã, mô tả, câu lệnh, SQLSTATE kỳ vọng — 'OK' = phải chạy được) =====
  for c in
    select * from (values
      ('P1', 'không hợp lệ: gói luyện thi thiếu giá',
        $q$insert into public.products (slug,kind,name) values ('zz-kt-p1','exam_pack','ZZ-KT p1')$q$, '23514'),
      ('P2', 'không hợp lệ: ủng hộ có min > max',
        $q$insert into public.products (slug,kind,name,min_vnd,max_vnd) values ('zz-kt-p2','donation','ZZ-KT p2',50000,10000)$q$, '23514'),
      ('P3', 'không hợp lệ: slug sản phẩm có chữ hoa',
        $q$insert into public.products (slug,kind,name,price_vnd) values ('ZZ-KT','exam_pack','ZZ-KT p3',29000)$q$, '23514'),
      ('P4', 'không hợp lệ: đơn có số tiền 0',
        format($q$insert into public.orders (product_id,amount_vnd,provider,access_token_hash) values (%L,0,'mock',%L)$q$, pack, token), '23514'),
      ('P5', 'không hợp lệ: token đơn không phải sha256 hex',
        format($q$insert into public.orders (product_id,amount_vnd,provider,access_token_hash) values (%L,29000,'mock','abc')$q$, pack), '23514'),
      ('P6', 'không hợp lệ: cổng thanh toán lạ',
        format($q$insert into public.orders (product_id,amount_vnd,provider,access_token_hash) values (%L,29000,'paypal',%L)$q$, pack, token), '23514'),
      ('P7', 'không hợp lệ: duyệt lời nhắn khi người ủng hộ không chọn hiện',
        format($q$insert into public.orders (product_id,amount_vnd,provider,access_token_hash,wall_approved) values (%L,50000,'mock',%L,true)$q$, don, token), '23514'),
      ('P8', 'không hợp lệ: mã kích hoạt sai định dạng (có chữ O)',
        format($q$insert into public.licenses (order_id,product_id,code,max_devices) select id,%L,'LT12-OOOO-AAAA-BBBB',3 from public.orders where order_code=%s$q$, pack, o5), '23514'),
      ('P9', 'không hợp lệ: câu hỏi đề có 2 đáp án trùng nhau',
        format($q$insert into public.exam_questions (set_id,position,question,choices,correct_index,explanation,source_note) values (%L,9,'ZZ-KT trùng?',array['A','a ','C','D'],0,'Giải thích','SGK')$q$, draft_set), 'P0001'),
      ('P10', 'không hợp lệ: câu hỏi đề có đáp án rỗng',
        format($q$insert into public.exam_questions (set_id,position,question,choices,correct_index,explanation,source_note) values (%L,9,'ZZ-KT rỗng?',array['A',' ','C','D'],0,'Giải thích','SGK')$q$, draft_set), 'P0001'),
      ('P11', 'không hợp lệ: trùng vị trí câu trong một đề',
        format($q$insert into public.exam_questions (set_id,position,question,choices,correct_index,explanation,source_note) values (%L,1,'ZZ-KT trùng vị trí?',array['A','B','C','D'],0,'Giải thích','SGK')$q$, free_set), '23505'),
      ('P11v', 'hợp lệ: câu hỏi đề đầy đủ',
        format($q$insert into public.exam_questions (set_id,position,question,choices,correct_index,explanation,source_note) values (%L,9,'ZZ-KT hợp lệ?',array['A','B','C','D'],3,'Giải thích','SGK')$q$, draft_set), 'OK'),
      ('S1', 'không hợp lệ: đơn đã hủy chuyển sang paid bằng UPDATE trực tiếp',
        format($q$update public.orders set status='paid', paid_at=now() where order_code=%s$q$, o3), 'P0001'),
      ('S2', 'không hợp lệ: sửa số tiền của đơn sau khi tạo',
        format($q$update public.orders set amount_vnd=1000 where order_code=%s$q$, o5), 'P0001'),
      ('S3', 'không hợp lệ: đơn pending chuyển thẳng sang refunded',
        format($q$update public.orders set status='refunded', paid_at=now() where order_code=%s$q$, o5), 'P0001'),
      ('S4', 'không hợp lệ: đơn paid thiếu paid_at',
        format($q$insert into public.orders (product_id,amount_vnd,provider,access_token_hash,status) values (%L,29000,'mock',%L,'paid')$q$, pack, token), '23514')
    ) as t(ca, mo_ta, stmt, ky_vong)
  loop
    begin
      execute c.stmt;
      outcome := 'OK';
    exception when others then
      outcome := sqlstate;
    end;
    results := results || jsonb_build_object('ca', c.ca, 'mo_ta', c.mo_ta, 'ky_vong', c.ky_vong, 'ket_qua', outcome, 'dat', outcome = c.ky_vong);
  end loop;

  -- ===== mark_order_paid =====
  r := public.mark_order_paid(o1, 1000, 'mock', 'ref-sai-tien', code1);
  results := results || jsonb_build_object('ca','M1','mo_ta','sai số tiền → từ chối, đơn vẫn pending, có ghi nhật ký',
    'ky_vong','amount_mismatch / pending / 1 nhật ký',
    'ket_qua', (r->>'reason') || ' / ' || (select status::text from public.orders where order_code = o1) || ' / '
               || (select count(*) from public.payment_events where order_code = o1 and note = 'amount_mismatch') || ' nhật ký',
    'dat', r->>'reason' = 'amount_mismatch' and (select status from public.orders where order_code = o1) = 'pending'
           and (select count(*) from public.payment_events where order_code = o1 and note = 'amount_mismatch') = 1);

  r := public.mark_order_paid(o1, 29000, 'mock', 'ref-1', code1);
  results := results || jsonb_build_object('ca','M2','mo_ta','đúng số tiền → paid, cấp mã kích hoạt',
    'ky_vong','ok / paid / ' || code1,
    'ket_qua', (r->>'ok') || ' / ' || (select status::text from public.orders where order_code = o1) || ' / ' || coalesce(r->>'license_code', 'null'),
    'dat', (r->>'ok')::boolean and (select status from public.orders where order_code = o1) = 'paid' and r->>'license_code' = code1
           and (select paid_at is not null from public.orders where order_code = o1));

  r2 := public.mark_order_paid(o1, 29000, 'mock', 'ref-1', code2);
  select count(*) into cnt from public.licenses l join public.orders o on o.id = l.order_id where o.order_code = o1;
  results := results || jsonb_build_object('ca','M3','mo_ta','gọi lại (webhook gửi lại) → idempotent, không cấp mã thứ hai',
    'ky_vong','already / mã cũ / 1 mã', 'ket_qua', (r2->>'already') || ' / ' || coalesce(r2->>'license_code', 'null') || ' / ' || cnt || ' mã',
    'dat', (r2->>'already')::boolean and r2->>'license_code' = code1 and cnt = 1);

  r := public.mark_order_paid(o2, 29000, 'mock', 'ref-2', code2);
  results := results || jsonb_build_object('ca','M4','mo_ta','đơn hết hạn nhưng tiền vẫn về → vẫn paid (không nuốt tiền)',
    'ky_vong','ok / paid', 'ket_qua', (r->>'ok') || ' / ' || (select status::text from public.orders where order_code = o2),
    'dat', (r->>'ok')::boolean and (select status from public.orders where order_code = o2) = 'paid');

  r := public.mark_order_paid(o3, 29000, 'mock', 'ref-3', 'LT12-ZZKT-EEEE-FFFF');
  results := results || jsonb_build_object('ca','M5','mo_ta','đơn đã hủy → từ chối, ghi nhật ký để quản trị viên xử lý',
    'ky_vong','invalid_status / cancelled / có nhật ký',
    'ket_qua', (r->>'reason') || ' / ' || (select status::text from public.orders where order_code = o3) || ' / '
               || (select count(*) from public.payment_events where order_code = o3 and note = 'paid_after_cancelled') || ' nhật ký',
    'dat', r->>'reason' = 'invalid_status' and (select status from public.orders where order_code = o3) = 'cancelled'
           and (select count(*) from public.payment_events where order_code = o3 and note = 'paid_after_cancelled') = 1);

  r := public.mark_order_paid(o4, 50000, 'mock', 'ref-4', 'LT12-ZZKT-GGGG-HHHH');
  select count(*) into cnt from public.licenses l join public.orders o on o.id = l.order_id where o.order_code = o4;
  results := results || jsonb_build_object('ca','M6','mo_ta','ủng hộ → paid, KHÔNG sinh mã kích hoạt',
    'ky_vong','ok / 0 mã', 'ket_qua', (r->>'ok') || ' / ' || cnt || ' mã', 'dat', (r->>'ok')::boolean and cnt = 0 and r->'license_code' = 'null'::jsonb);

  r := public.mark_order_paid(999999999, 29000, 'mock', 'ref-x', 'LT12-ZZKT-JJJJ-KKKK');
  results := results || jsonb_build_object('ca','M7','mo_ta','mã đơn không tồn tại → not_found',
    'ky_vong','not_found', 'ket_qua', r->>'reason', 'dat', r->>'reason' = 'not_found');

  r := public.mark_order_paid(o5, 29000, 'payos', 'ref-5', 'LT12-ZZKT-LLLL-MMMM');
  results := results || jsonb_build_object('ca','M8','mo_ta','cổng báo trả khác cổng của đơn → từ chối',
    'ky_vong','invalid_status / pending', 'ket_qua', (r->>'reason') || ' / ' || (select status::text from public.orders where order_code = o5),
    'dat', r->>'reason' = 'invalid_status' and (select status from public.orders where order_code = o5) = 'pending');

  -- ===== Bức tường cảm ơn =====
  select count(*) into cnt from public.donation_wall where display_name = 'ZZ-KT bạn đọc';
  results := results || jsonb_build_object('ca','W1','mo_ta','lời nhắn chưa duyệt → chưa lên bức tường','ky_vong','0','ket_qua',cnt::text,'dat',cnt = 0);
  update public.orders set wall_approved = true where order_code = o4;
  select count(*) into cnt from public.donation_wall where display_name = 'ZZ-KT bạn đọc' and tier = 'Ủng hộ nhiệt tình';
  results := results || jsonb_build_object('ca','W2','mo_ta','đã duyệt → hiện tên + mức (không hiện số tiền)','ky_vong','1','ket_qua',cnt::text,'dat',cnt = 1);
  select count(*) into cnt from information_schema.columns where table_schema = 'public' and table_name = 'donation_wall'
    and column_name in ('amount_vnd', 'buyer_email', 'access_token_hash', 'client_ip_hash');
  results := results || jsonb_build_object('ca','W3','mo_ta','view bức tường không có cột nhạy cảm','ky_vong','0 cột','ket_qua',cnt || ' cột','dat',cnt = 0);

  -- ===== activate_license =====
  r := public.activate_license(lower(code1), dev1);
  results := results || jsonb_build_object('ca','A1','mo_ta','kích hoạt máy 1 (mã gõ chữ thường)','ky_vong','ok 1/3',
    'ket_qua', (r->>'ok') || ' ' || (r->>'devices_used') || '/' || (r->>'max_devices'), 'dat', (r->>'ok')::boolean and (r->>'devices_used')::int = 1);
  r := public.activate_license(code1, dev1);
  results := results || jsonb_build_object('ca','A2','mo_ta','kích hoạt lại cùng máy → không tốn thêm lượt','ky_vong','ok 1/3',
    'ket_qua', (r->>'ok') || ' ' || (r->>'devices_used') || '/' || (r->>'max_devices'), 'dat', (r->>'ok')::boolean and (r->>'devices_used')::int = 1);
  perform public.activate_license(code1, dev2);
  r := public.activate_license(code1, dev3);
  results := results || jsonb_build_object('ca','A3','mo_ta','máy thứ 3 vẫn được','ky_vong','ok 3/3',
    'ket_qua', (r->>'ok') || ' ' || (r->>'devices_used') || '/' || (r->>'max_devices'), 'dat', (r->>'ok')::boolean and (r->>'devices_used')::int = 3);
  r := public.activate_license(code1, dev4);
  results := results || jsonb_build_object('ca','A4','mo_ta','máy thứ 4 → device_limit','ky_vong','device_limit',
    'ket_qua', coalesce(r->>'reason', 'ok'), 'dat', r->>'reason' = 'device_limit');
  r := public.activate_license('LT12-ZZKT-ZZZZ-ZZZZ', dev1);
  results := results || jsonb_build_object('ca','A5','mo_ta','mã không tồn tại → invalid_code','ky_vong','invalid_code',
    'ket_qua', coalesce(r->>'reason', 'ok'), 'dat', r->>'reason' = 'invalid_code');

  -- ===== get_exam_set =====
  r := public.get_exam_set('zz-kt-de-mien-phi', null, null);
  results := results || jsonb_build_object('ca','E1','mo_ta','đề miễn phí → trả câu hỏi không cần mã','ky_vong','ok, 2 câu',
    'ket_qua', (r->>'ok') || ', ' || jsonb_array_length(r->'questions') || ' câu', 'dat', (r->>'ok')::boolean and jsonb_array_length(r->'questions') = 2);
  r := public.get_exam_set('zz-kt-de-tra-phi', null, null);
  results := results || jsonb_build_object('ca','E2','mo_ta','đề trả phí, không có mã → invalid_code','ky_vong','invalid_code',
    'ket_qua', coalesce(r->>'reason', 'ok'), 'dat', r->>'reason' = 'invalid_code' and r->'questions' is null);
  r := public.get_exam_set('zz-kt-de-tra-phi', code1, dev4);
  results := results || jsonb_build_object('ca','E3','mo_ta','mã đúng nhưng máy chưa kích hoạt → not_activated','ky_vong','not_activated',
    'ket_qua', coalesce(r->>'reason', 'ok'), 'dat', r->>'reason' = 'not_activated');
  r := public.get_exam_set('zz-kt-de-tra-phi', code1, dev2);
  results := results || jsonb_build_object('ca','E4','mo_ta','mã đúng, máy đã kích hoạt → trả câu hỏi','ky_vong','ok, 1 câu',
    'ket_qua', (r->>'ok') || ', ' || coalesce(jsonb_array_length(r->'questions'), 0) || ' câu', 'dat', (r->>'ok')::boolean and jsonb_array_length(r->'questions') = 1);
  r := public.get_exam_set('zz-kt-de-nhap', null, null);
  results := results || jsonb_build_object('ca','E5','mo_ta','đề chưa công bố → not_found','ky_vong','not_found',
    'ket_qua', coalesce(r->>'reason', 'ok'), 'dat', r->>'reason' = 'not_found');

  update public.licenses set status = 'revoked' where code = code1;
  r := public.get_exam_set('zz-kt-de-tra-phi', code1, dev2);
  r2 := public.activate_license(code1, dev1);
  results := results || jsonb_build_object('ca','E6','mo_ta','thu hồi mã → không lấy được đề, không kích hoạt được','ky_vong','revoked / revoked',
    'ket_qua', coalesce(r->>'reason', 'ok') || ' / ' || coalesce(r2->>'reason', 'ok'), 'dat', r->>'reason' = 'revoked' and r2->>'reason' = 'revoked');

  update public.licenses set status = 'active', valid_until = now() - interval '1 day' where code = code1;
  r := public.get_exam_set('zz-kt-de-tra-phi', code1, dev2);
  results := results || jsonb_build_object('ca','E7','mo_ta','mã hết hạn → expired','ky_vong','expired',
    'ket_qua', coalesce(r->>'reason', 'ok'), 'dat', r->>'reason' = 'expired');

  -- ===== expire_stale_orders + hoàn tiền =====
  perform public.expire_stale_orders();
  results := results || jsonb_build_object('ca','X1','mo_ta','đơn pending quá hạn → expired','ky_vong','expired',
    'ket_qua', (select status::text from public.orders where order_code = o5), 'dat', (select status from public.orders where order_code = o5) = 'expired');
  begin
    update public.orders set status = 'refunded' where order_code = o1;
    outcome := 'OK';
  exception when others then outcome := sqlstate; end;
  results := results || jsonb_build_object('ca','X2','mo_ta','paid → refunded được (quản trị viên ghi nhận hoàn tiền)','ky_vong','OK','ket_qua',outcome,'dat',outcome = 'OK');

  -- ===== Phân quyền: khách không chạm được dữ liệu thanh toán =====
  select count(*) into cnt from (values
    (has_table_privilege('anon', 'public.orders', 'select')),
    (has_table_privilege('anon', 'public.payment_events', 'select')),
    (has_table_privilege('anon', 'public.licenses', 'select')),
    (has_table_privilege('anon', 'public.license_activations', 'select')),
    (has_table_privilege('anon', 'public.exam_questions', 'select')),
    (has_table_privilege('anon', 'public.orders', 'insert')),
    (has_table_privilege('anon', 'public.products', 'insert')),
    (has_table_privilege('authenticated', 'public.orders', 'insert')),
    (has_table_privilege('authenticated', 'public.orders', 'update')),
    (has_table_privilege('authenticated', 'public.licenses', 'update'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','R1','mo_ta','anon/authenticated không có quyền đọc/ghi bảng thanh toán, anon không đọc câu hỏi đề',
    'ky_vong','0 quyền', 'ket_qua', cnt || ' quyền', 'dat', cnt = 0);

  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.mark_order_paid(bigint, integer, text, text, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.mark_order_paid(bigint, integer, text, text, text)', 'execute')),
    (has_function_privilege('anon', 'public.activate_license(text, text)', 'execute')),
    -- Mọi bản get_exam_set (migration 20261020000000 thêm tham số p_user_id).
    (exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'get_exam_set'
              and has_function_privilege('anon', oid, 'execute'))),
    (has_function_privilege('authenticated', 'public.expire_stale_orders()', 'execute'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','R2','mo_ta','chỉ service_role gọi được các hàm thanh toán','ky_vong','0 quyền',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 0 and has_function_privilege('service_role', 'public.mark_order_paid(bigint, integer, text, text, text)', 'execute'));

  select count(*) into cnt from (values
    (has_table_privilege('anon', 'public.products', 'select')),
    (has_table_privilege('anon', 'public.exam_sets', 'select')),
    (has_table_privilege('anon', 'public.donation_wall', 'select'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','R3','mo_ta','khách vẫn xem được giá, danh sách đề, bức tường cảm ơn','ky_vong','3 quyền',
    'ket_qua', cnt || ' quyền', 'dat', cnt = 3);

  -- ===== Hoàn tác toàn bộ và trả báo cáo trong thông báo lỗi =====
  raise exception E'BAO_CAO_KIEM_THU_THANH_TOAN\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
