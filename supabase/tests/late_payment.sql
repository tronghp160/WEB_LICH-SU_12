-- Kiểm thử T5 — tiền về sau khi đơn đã hủy (migration 20261017000000_late_payment.sql).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Giống supabase/tests/payments.sql:
-- một khối DO kết thúc bằng `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ. Báo cáo JSON nằm trong thông
-- báo lỗi "BAO_CAO_KIEM_THU_TIEN_VE_MUON" — đó là kết quả, không phải sự cố.

do $test$
declare
  results jsonb := '[]'::jsonb;
  pack uuid;
  don uuid;
  o_late bigint;      -- gói: hủy rồi tiền về đúng số tiền
  o_wrong bigint;     -- gói: hủy rồi tiền về SAI số tiền
  o_noevt bigint;     -- gói: hủy, chưa có tiền về
  o_pending bigint;   -- gói: đang chờ
  o_don bigint;       -- ủng hộ: hủy rồi tiền về
  r jsonb;
  r2 jsonb;
  outcome text;
  cnt integer;
  staff constant uuid := '00000000-0000-0000-0000-00000000abcd';
  token constant text := repeat('a', 64);
  code1 constant text := 'LT12-ZZKT-EEEE-FFFF';
  code2 constant text := 'LT12-ZZKT-GGGG-HHHH';
begin
  insert into public.products (slug, kind, name, price_vnd, max_devices)
    values ('zz-kt-goi-muon', 'exam_pack', 'ZZ-KT gói (tiền về muộn)', 29000, 3) returning id into pack;
  insert into public.products (slug, kind, name, min_vnd, max_vnd)
    values ('zz-kt-ung-ho-muon', 'donation', 'ZZ-KT ủng hộ (tiền về muộn)', 10000, 2000000) returning id into don;

  insert into public.orders (product_id, amount_vnd, provider, access_token_hash) values (pack, 29000, 'mock', token) returning order_code into o_late;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash) values (pack, 29000, 'mock', token) returning order_code into o_wrong;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash) values (pack, 29000, 'mock', token) returning order_code into o_noevt;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash) values (pack, 29000, 'mock', token) returning order_code into o_pending;
  insert into public.orders (product_id, amount_vnd, provider, access_token_hash) values (don, 50000, 'mock', token) returning order_code into o_don;
  update public.orders set status = 'cancelled' where order_code in (o_late, o_wrong, o_noevt, o_don);

  -- Tiền về sau khi hủy: đi đúng đường thật (mark_order_paid ghi nhật ký paid_after_cancelled).
  perform public.mark_order_paid(o_late, 29000, 'mock', 'TX-LATE', 'LT12-ZZKT-XXXX-XXXX');
  perform public.mark_order_paid(o_wrong, 28000, 'mock', 'TX-WRONG', 'LT12-ZZKT-YYYY-YYYY');
  perform public.mark_order_paid(o_don, 50000, 'mock', 'TX-DON', 'LT12-ZZKT-ZZZZ-ZZZZ');

  -- L1: trigger vẫn chặn cancelled → paid khi sửa thẳng (không qua hàm).
  begin
    update public.orders set status = 'paid', paid_at = now() where order_code = o_noevt;
    outcome := 'OK';
  exception when others then
    outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','L1','mo_ta','sửa thẳng cancelled → paid vẫn bị trigger chặn','ky_vong','P0001',
    'ket_qua', outcome, 'dat', outcome = 'P0001');

  -- L2: cờ phiên khác 'on' không mở được đường cancelled → paid.
  perform set_config('app.late_payment', 'yes', true);
  begin
    update public.orders set status = 'paid', paid_at = now() where order_code = o_noevt;
    outcome := 'OK';
  exception when others then
    outcome := sqlstate;
  end;
  perform set_config('app.late_payment', '', true);
  results := results || jsonb_build_object('ca','L2','mo_ta','cờ phiên sai giá trị → vẫn bị chặn','ky_vong','P0001',
    'ket_qua', outcome, 'dat', outcome = 'P0001');

  -- L3: chưa có nhật ký tiền về → từ chối.
  r := public.admin_resolve_late_payment(o_noevt, staff, 'thử', code1);
  results := results || jsonb_build_object('ca','L3','mo_ta','đơn hủy chưa có tiền về → no_late_payment, đơn vẫn hủy',
    'ky_vong','no_late_payment / cancelled', 'ket_qua', (r->>'reason') || ' / ' || (select status from public.orders where order_code = o_noevt),
    'dat', r->>'reason' = 'no_late_payment' and (select status from public.orders where order_code = o_noevt) = 'cancelled');

  -- L4: tiền về đúng số tiền → paid, cấp mã, ghi nhật ký quản trị, cờ phiên tắt lại.
  r := public.admin_resolve_late_payment(o_late, staff, 'Đã đối chiếu sao kê', code1);
  results := results || jsonb_build_object('ca','L4','mo_ta','tiền về đúng số tiền → paid, cấp mã, nhật ký admin, cờ phiên đã tắt',
    'ky_vong','ok / paid / mã / 1 nhật ký / off',
    'ket_qua', (r->>'ok') || ' / ' || (select status from public.orders where order_code = o_late) || ' / ' || coalesce(r->>'license_code', '—')
               || ' / ' || (select count(*) from public.payment_events where order_code = o_late and note = 'resolve_late_payment') || ' nhật ký / '
               || coalesce(current_setting('app.late_payment', true), '(trống)'),
    'dat', (r->>'ok')::boolean and r->>'license_code' = code1
           and (select status from public.orders where order_code = o_late) = 'paid'
           and (select provider_ref from public.orders where order_code = o_late) = 'TX-LATE'
           and exists (select 1 from public.licenses l join public.orders o on o.id = l.order_id where o.order_code = o_late and l.code = code1 and l.status = 'active')
           and (select count(*) from public.payment_events where order_code = o_late and note = 'resolve_late_payment' and source = 'admin') = 1
           and coalesce(current_setting('app.late_payment', true), '') <> 'on');

  -- L5: bấm lại → idempotent, trả mã cũ, không cấp mã thứ hai.
  r2 := public.admin_resolve_late_payment(o_late, staff, 'bấm lại', code2);
  results := results || jsonb_build_object('ca','L5','mo_ta','bấm lại → already, cùng mã, vẫn 1 mã',
    'ky_vong','already / ' || code1 || ' / 1 mã',
    'ket_qua', coalesce(r2->>'already', '?') || ' / ' || coalesce(r2->>'license_code', '—') || ' / '
               || (select count(*) from public.licenses l join public.orders o on o.id = l.order_id where o.order_code = o_late) || ' mã',
    'dat', (r2->>'already')::boolean and r2->>'license_code' = code1
           and (select count(*) from public.licenses l join public.orders o on o.id = l.order_id where o.order_code = o_late) = 1);

  -- L6: tiền về SAI số tiền → không cấp.
  r := public.admin_resolve_late_payment(o_wrong, staff, 'thử', code2);
  results := results || jsonb_build_object('ca','L6','mo_ta','tiền về sai số tiền → amount_mismatch, đơn vẫn hủy, không có mã',
    'ky_vong','amount_mismatch / cancelled', 'ket_qua', (r->>'reason') || ' / ' || (select status from public.orders where order_code = o_wrong),
    'dat', r->>'reason' = 'amount_mismatch' and (select status from public.orders where order_code = o_wrong) = 'cancelled'
           and not exists (select 1 from public.licenses l join public.orders o on o.id = l.order_id where o.order_code = o_wrong));

  -- L7: đơn không ở trạng thái hủy → từ chối.
  r := public.admin_resolve_late_payment(o_pending, staff, 'thử', code2);
  results := results || jsonb_build_object('ca','L7','mo_ta','đơn đang chờ → invalid_status','ky_vong','invalid_status',
    'ket_qua', r->>'reason', 'dat', r->>'reason' = 'invalid_status');

  -- L8: ủng hộ hủy rồi tiền về → paid, không có mã kích hoạt.
  r := public.admin_resolve_late_payment(o_don, staff, 'thử', code2);
  results := results || jsonb_build_object('ca','L8','mo_ta','ủng hộ: tiền về muộn → paid, không cấp mã','ky_vong','ok / paid / không mã',
    'ket_qua', (r->>'ok') || ' / ' || (select status from public.orders where order_code = o_don) || ' / ' || coalesce(r->>'license_code', 'không mã'),
    'dat', (r->>'ok')::boolean and r->>'license_code' is null and (select status from public.orders where order_code = o_don) = 'paid');

  -- L9: đơn không tồn tại.
  r := public.admin_resolve_late_payment(-1, staff, 'thử', code2);
  results := results || jsonb_build_object('ca','L9','mo_ta','mã đơn không tồn tại → not_found','ky_vong','not_found',
    'ket_qua', r->>'reason', 'dat', r->>'reason' = 'not_found');

  -- L10: quyền gọi hàm.
  select count(*) into cnt from (values
    (has_function_privilege('anon', 'public.admin_resolve_late_payment(bigint, uuid, text, text)', 'execute')),
    (has_function_privilege('authenticated', 'public.admin_resolve_late_payment(bigint, uuid, text, text)', 'execute'))
  ) as t(granted) where granted;
  results := results || jsonb_build_object('ca','L10','mo_ta','chỉ service_role gọi được admin_resolve_late_payment','ky_vong','0 quyền',
    'ket_qua', cnt || ' quyền',
    'dat', cnt = 0 and has_function_privilege('service_role', 'public.admin_resolve_late_payment(bigint, uuid, text, text)', 'execute'));

  -- L11: các chuyển trạng thái cũ vẫn bị chặn (refunded → paid, paid → pending).
  begin
    update public.orders set status = 'refunded' where order_code = o_late;
    update public.orders set status = 'paid' where order_code = o_late;
    outcome := 'OK';
  exception when others then
    outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','L11','mo_ta','refunded → paid vẫn bị chặn','ky_vong','P0001',
    'ket_qua', outcome, 'dat', outcome = 'P0001');

  raise exception E'BAO_CAO_KIEM_THU_TIEN_VE_MUON\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
