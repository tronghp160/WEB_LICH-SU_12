-- Gói luyện thi theo THÁNG và theo NĂM (thay gói cố định "năm học 2026–2027").
--
-- • products thêm 2 cột:
--     duration_days     — mã cấp ra dùng được bấy nhiêu ngày KỂ TỪ LÚC THANH TOÁN (null = dùng valid_until cố định như cũ);
--     grants_product_id — mã cấp ra mở đề của sản phẩm nào (null = chính nó). Đề (exam_sets.product_id) vẫn gắn với gói
--                         gốc 'goi-luyen-thi-2027', nên mọi hàm kiểm quyền mở đề giữ nguyên, không phải sửa.
-- • 2 sản phẩm mới: 'goi-luyen-thi-thang' 29.000đ / 30 ngày, 'goi-luyen-thi-nam' 199.000đ / 365 ngày, cùng mở đề của gói gốc.
-- • Gói gốc vẫn is_active (biên tập viên cần đọc để gắn đề) nhưng server KHÔNG bán nữa (lib/payments/orders.ts: gói luyện
--   thi không có duration_days thì không tạo đơn). Mã đã bán trước đây giữ nguyên hạn cũ.
-- • mark_order_paid / admin_resolve_late_payment: cấp mã theo 2 cột mới (bản trước: 20261020000000_learner_accounts.sql).

begin;

alter table public.products
  add column duration_days smallint constraint products_duration_check check (duration_days is null or duration_days between 1 and 400),
  add column grants_product_id uuid references public.products(id);

update public.products set name = 'Gói Luyện thi tốt nghiệp THPT – Lịch sử' where slug = 'goi-luyen-thi-2027';

insert into public.products (slug, kind, name, description, price_vnd, max_devices, duration_days, grants_product_id)
select v.slug, 'exam_pack', v.name, v.description, v.price, 3, v.days, base.id
  from public.products base
 cross join (values
   ('goi-luyen-thi-thang', 'Gói Luyện thi THPT – Lịch sử (1 tháng)',
    'Mở toàn bộ đề luyện thi trả phí, đề tự sinh, luyện tập không giới hạn, sổ tay ôn thi trong 30 ngày kể từ lúc thanh toán.',
    29000, 30::smallint),
   ('goi-luyen-thi-nam', 'Gói Luyện thi THPT – Lịch sử (1 năm)',
    'Mở toàn bộ đề luyện thi trả phí, đề tự sinh, luyện tập không giới hạn, sổ tay ôn thi trong 365 ngày kể từ lúc thanh toán.',
    199000, 365::smallint)
 ) as v(slug, name, description, price, days)
 where base.slug = 'goi-luyen-thi-2027'
on conflict (slug) do nothing;

create or replace function public.mark_order_paid(
  p_order_code bigint,
  p_amount integer,
  p_provider text,
  p_provider_ref text,
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

  if o.provider <> p_provider then
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', o.status);
  end if;

  if o.status not in ('pending', 'expired') then
    insert into public.payment_events (order_code, provider, source, signature_ok, status, amount_vnd, provider_ref, note)
      values (p_order_code, p_provider, 'reconcile', true, 'paid', p_amount, p_provider_ref, 'paid_after_' || o.status);
    return jsonb_build_object('ok', false, 'reason', 'invalid_status', 'status', o.status);
  end if;

  if p_amount is distinct from o.amount_vnd then
    insert into public.payment_events (order_code, provider, source, signature_ok, status, amount_vnd, provider_ref, note)
      values (p_order_code, p_provider, 'reconcile', true, 'paid', p_amount, p_provider_ref, 'amount_mismatch');
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'status', o.status);
  end if;

  update public.orders
     set status = 'paid', paid_at = now(), provider_ref = p_provider_ref
   where id = o.id;

  if p.kind = 'exam_pack' then
    insert into public.licenses (order_id, product_id, code, max_devices, valid_until, user_id)
      values (o.id, coalesce(p.grants_product_id, p.id), p_license_code, p.max_devices,
              case when p.duration_days is not null then now() + make_interval(days => p.duration_days) else p.valid_until end,
              o.user_id);
    return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', p_license_code);
  end if;

  return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', null);
end;
$$;

-- Chuyển khoản muộn được quản trị viên xác nhận: hạn tính từ lúc xác nhận (người mua chưa dùng được trước đó).
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
    insert into public.licenses (order_id, product_id, code, max_devices, valid_until, user_id)
      values (o.id, coalesce(p.grants_product_id, p.id), p_license_code, p.max_devices,
              case when p.duration_days is not null then now() + make_interval(days => p.duration_days) else p.valid_until end,
              o.user_id);
    return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', p_license_code);
  end if;
  return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', null);
end;
$$;

-- create or replace giữ nguyên quyền cũ; nhắc lại cho chắc: chỉ server (khóa bí mật) gọi.
revoke all on function public.mark_order_paid(bigint, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_resolve_late_payment(bigint, uuid, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(bigint, integer, text, text, text) to service_role;
grant execute on function public.admin_resolve_late_payment(bigint, uuid, text, text) to service_role;

commit;
