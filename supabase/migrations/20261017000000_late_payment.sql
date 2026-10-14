-- Hoàn thiện thanh toán — T5 (docs/ke-hoach-tai-khoan.md, mục 3): TIỀN VỀ SAU KHI ĐƠN ĐÃ HỦY.
--
-- Trước đây `mark_order_paid` chỉ ghi nhật ký `paid_after_cancelled`, còn trigger `order_integrity` cấm cancelled → paid
-- nên quản trị viên không có cách cấp mã cho người đã chuyển tiền thật. Migration này:
--   1. Cho trigger phép ĐÚNG MỘT đường cancelled → paid khi cờ phiên `app.late_payment = 'on'`. Cờ chỉ đặt được bên trong
--      hàm dưới đây (khách / nhân sự không ghi được bảng orders — đã thu hồi GRANT; PostgREST không cho gọi set_config).
--   2. Thêm hàm `admin_resolve_late_payment` (CHỈ service_role; server gọi sau requireRole(["system_admin"])): kiểm có
--      nhật ký `paid_after_cancelled` chữ ký đúng và ĐÚNG SỐ TIỀN, chuyển đơn sang paid, cấp mã như `mark_order_paid`,
--      ghi nhật ký quản trị. Gọi lặp lại vô hại (đơn đã paid → trả mã cũ).
--   3. Sửa mô tả gói luyện thi trong `products` cho khỏi hứa "10 đề × 40 câu" (T1) — trang /luyen-thi tự ghi số đề thật.
--
-- Không xóa dữ liệu. Chạy một lần trong SQL Editor; kiểm thử: supabase/tests/late_payment.sql (tự hoàn tác).

begin;

-- 1. Trigger: thêm đường cancelled → paid có điều kiện (còn lại giữ nguyên như 20261015000000_payments.sql).
create or replace function public.order_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_code <> old.order_code or new.product_id <> old.product_id
     or new.amount_vnd <> old.amount_vnd or new.provider <> old.provider
     or new.access_token_hash <> old.access_token_hash then
    raise exception 'Không được sửa mã đơn, sản phẩm, số tiền, cổng thanh toán hoặc token của đơn hàng.';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'pending' and new.status in ('paid', 'cancelled', 'expired'))
    or (old.status = 'expired' and new.status = 'paid')
    or (old.status = 'paid'    and new.status = 'refunded')
    -- Chỉ qua admin_resolve_late_payment (đặt cờ phiên trong giao dịch của chính nó). coalesce bắt buộc: cờ chưa đặt
    -- thì current_setting trả NULL, `not (… or NULL)` là NULL và IF sẽ KHÔNG chặn.
    or (old.status = 'cancelled' and new.status = 'paid' and coalesce(current_setting('app.late_payment', true), '') = 'on')
  ) then
    raise exception 'Không thể chuyển đơn hàng từ "%" sang "%".', old.status, new.status;
  end if;
  return new;
end;
$$;

-- 2. Quản trị viên xác nhận đã nhận tiền cho đơn đã hủy và cấp mã.
-- Trả jsonb: { ok, already?, reason?, status?, kind?, license_code? }
--   reason: not_found | invalid_status | no_late_payment | amount_mismatch
create or replace function public.admin_resolve_late_payment(
  p_order_code bigint,
  p_staff_id uuid,
  p_note text,
  p_license_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders%rowtype;
  p public.products%rowtype;
  e public.payment_events%rowtype;
  existing_code text;
begin
  select * into o from public.orders where order_code = p_order_code for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  select * into p from public.products where id = o.product_id;

  if o.status = 'paid' then
    select code into existing_code from public.licenses where order_id = o.id;
    return jsonb_build_object('ok', true, 'already', true, 'kind', p.kind, 'license_code', existing_code);
  end if;
  if o.status <> 'cancelled' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', o.status);
  end if;

  -- Bằng chứng tiền đã về: nhật ký do cổng gửi (chữ ký đúng) ghi lúc đơn đã hủy — lấy lần gần nhất.
  select * into e from public.payment_events
   where order_code = p_order_code and note = 'paid_after_cancelled' and signature_ok
   order by received_at desc, id desc
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_late_payment', 'status', o.status);
  end if;
  if e.amount_vnd is distinct from o.amount_vnd then
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'status', o.status);
  end if;

  perform set_config('app.late_payment', 'on', true);
  update public.orders
     set status = 'paid', paid_at = e.received_at, provider_ref = coalesce(e.provider_ref, o.provider_ref)
   where id = o.id;
  perform set_config('app.late_payment', 'off', true);

  insert into public.payment_events (order_code, provider, source, signature_ok, status, amount_vnd, provider_ref, note, payload)
    values (p_order_code, o.provider, 'admin', true, 'paid', e.amount_vnd, e.provider_ref, 'resolve_late_payment',
            jsonb_build_object('action', 'resolve_late_payment', 'by', p_staff_id, 'evidence_event', e.id,
                               'note', left(coalesce(p_note, ''), 200)));

  if p.kind = 'exam_pack' then
    insert into public.licenses (order_id, product_id, code, max_devices, valid_until)
      values (o.id, p.id, p_license_code, p.max_devices, p.valid_until);
    return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', p_license_code);
  end if;
  return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', null);
end;
$$;

revoke all on function public.admin_resolve_late_payment(bigint, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_resolve_late_payment(bigint, uuid, text, text) to service_role;

-- 3. Mô tả gói: không nêu số đề cố định (trang /luyen-thi đếm số đề đã công bố).
update public.products
   set description = 'Đề luyện thi tốt nghiệp THPT môn Lịch sử bấm giờ theo cấu trúc đề thi, có giải thích từng câu và liên kết về bài SGK. Gói cập nhật dần đến 10 đề; đề mới thêm vào tự mở cho người đã mua.'
 where slug = 'goi-luyen-thi-2027';

commit;

-- Kiểm tra sau khi chạy:
--   select proname from pg_proc where pronamespace = 'public'::regnamespace and proname = 'admin_resolve_late_payment';  → 1 dòng
--   select has_function_privilege('anon', 'public.admin_resolve_late_payment(bigint, uuid, text, text)', 'execute'),
--          has_function_privilege('authenticated', 'public.admin_resolve_late_payment(bigint, uuid, text, text)', 'execute'),
--          has_function_privilege('service_role', 'public.admin_resolve_late_payment(bigint, uuid, text, text)', 'execute');
--     → false, false, true
--   select description from public.products where slug = 'goi-luyen-thi-2027';  → không còn "10 đề luyện 40 câu"
--   Rồi chạy supabase/tests/late_payment.sql (tự hoàn tác).
