-- Tài khoản học sinh — giai đoạn B1 (docs/ke-hoach-tai-khoan.md, mục 4, 5, 10).
--
-- Thêm hồ sơ học sinh, tiến độ học đồng bộ và gắn đơn hàng / mã kích hoạt với tài khoản. Không xóa dữ liệu cũ:
--   1. Bảng `learner_profiles` (hồ sơ) và `learner_progress` (tiến độ JSON như localStorage `ls12:tien-do`). Bật RLS,
--      thu hồi quyền mặc định rồi chỉ cấp phần cần: mỗi người chỉ đọc / ghi dòng của chính mình; quản trị viên chỉ đọc hồ sơ.
--   2. Cột `orders.user_id`, `licenses.user_id` (null = mua không đăng nhập, như trước). Trigger `order_integrity` cấm gán
--      lại tài khoản của đơn; chỉ cho về null (khi xóa tài khoản: FK `on delete set null`).
--   3. Hàm (CHỈ service_role, server gọi bằng khóa bí mật sau khi tự xác minh phiên):
--        claim_license            — gắn mã đã mua (không đăng nhập) vào tài khoản
--        get_exam_set             — thêm p_user_id: gói thuộc tài khoản thì mở đề luôn, không tốn lượt thiết bị
--        mark_order_paid,
--        admin_resolve_late_payment — khi cấp mã thì chép orders.user_id sang licenses.user_id
--        find_auth_user_by_email  — trang Nhân sự cấp quyền cho tài khoản đã có (mục 7.4)
--   4. Thêm loại giới hạn `license_claim`, `progress_write` cho `consume_rate_limit`.
--
-- Hồ sơ KHÔNG tạo bằng trigger trên auth.users: server tạo "lười" sau khi xác nhận email / đăng nhập (mục 5).
-- Chạy một lần trong SQL Editor; kiểm thử: supabase/tests/learner_accounts.sql (tự hoàn tác).

begin;

-- ============================================================
-- 1. Bảng mới
-- ============================================================
create table public.learner_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null constraint learner_profiles_name_check check (char_length(btrim(display_name)) between 1 and 60),
  avatar_url    text constraint learner_profiles_avatar_check check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)),
  school        text constraint learner_profiles_school_check check (school is null or char_length(school) <= 120),
  -- Bằng chứng đồng ý Điều khoản và Chính sách (mục 11): phiên bản + thời điểm.
  terms_version text not null constraint learner_profiles_terms_check check (char_length(terms_version) between 1 and 20),
  agreed_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_learner_profiles_updated_at before update on public.learner_profiles
  for each row execute function public.set_updated_at();

create table public.learner_progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null constraint learner_progress_data_check check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 65536),
  updated_at timestamptz not null default now()
);
create trigger trg_learner_progress_updated_at before update on public.learner_progress
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. Gắn đơn hàng và mã kích hoạt với tài khoản
-- ============================================================
alter table public.orders   add column user_id uuid references auth.users(id) on delete set null;
alter table public.licenses add column user_id uuid references auth.users(id) on delete set null;
create index idx_orders_user   on public.orders (user_id, created_at desc) where user_id is not null;
create index idx_licenses_user on public.licenses (user_id) where user_id is not null;

-- Như 20261017000000_late_payment.sql, thêm: không gán lại tài khoản của đơn (chỉ cho về null khi tài khoản bị xóa).
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
  if new.user_id is distinct from old.user_id and new.user_id is not null then
    raise exception 'Không được gán lại tài khoản của đơn hàng.';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'pending' and new.status in ('paid', 'cancelled', 'expired'))
    or (old.status = 'expired' and new.status = 'paid')
    or (old.status = 'paid'    and new.status = 'refunded')
    -- Chỉ qua admin_resolve_late_payment. coalesce bắt buộc: cờ chưa đặt thì current_setting trả NULL và IF không chặn.
    or (old.status = 'cancelled' and new.status = 'paid' and coalesce(current_setting('app.late_payment', true), '') = 'on')
  ) then
    raise exception 'Không thể chuyển đơn hàng từ "%" sang "%".', old.status, new.status;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 3. RLS và quyền
-- ============================================================
alter table public.learner_profiles enable row level security;
alter table public.learner_progress enable row level security;

-- Supabase mặc định cấp quyền bảng mới cho anon/authenticated → thu hồi hết rồi cấp lại đúng phần cần.
revoke all on public.learner_profiles, public.learner_progress from anon, authenticated;
grant select, insert, update on public.learner_profiles to authenticated;
grant select, insert, update on public.learner_progress to authenticated;

create policy "own_select" on public.learner_profiles for select to authenticated using (id = (select auth.uid()));
create policy "own_insert" on public.learner_profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "own_update" on public.learner_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "admin_read" on public.learner_profiles for select to authenticated
  using (public.current_staff_role() = 'system_admin');

create policy "own_select" on public.learner_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "own_insert" on public.learner_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own_update" on public.learner_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Không có policy delete: dữ liệu xóa theo tài khoản (cascade).
-- orders / licenses GIỮ ĐÓNG như cũ: server đọc "đơn của tôi" bằng khóa bí mật, lọc theo user id đã xác minh (bảng có cột
-- nhạy cảm như access_token_hash, client_ip_hash nên không mở policy cho chủ đơn).

-- ============================================================
-- 4. Giới hạn số lần thử: thêm loại mới
-- ============================================================
alter table public.rate_limit_hits drop constraint rate_limit_hits_bucket_check;
alter table public.rate_limit_hits add constraint rate_limit_hits_bucket_check
  check (bucket in ('order_lookup', 'license_activation', 'license_claim', 'progress_write'));

-- ============================================================
-- 5. Hàm nghiệp vụ (security definer, search_path rỗng; CHỈ server gọi bằng khóa bí mật)
-- ============================================================

-- Gắn mã kích hoạt vào tài khoản. Trả jsonb: { ok, already?, reason?, product_slug? }
--   reason: invalid_user | invalid_code | revoked | expired | owned_by_other
create or replace function public.claim_license(p_code text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.licenses%rowtype;
  slug text;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;
  select * into l from public.licenses where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if l.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;
  if l.valid_until is not null and l.valid_until < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if l.user_id is not null and l.user_id <> p_user_id then
    return jsonb_build_object('ok', false, 'reason', 'owned_by_other');
  end if;

  select pr.slug into slug from public.products pr where pr.id = l.product_id;
  if l.user_id = p_user_id then
    return jsonb_build_object('ok', true, 'already', true, 'product_slug', slug);
  end if;
  update public.licenses set user_id = p_user_id where id = l.id;
  return jsonb_build_object('ok', true, 'already', false, 'product_slug', slug);
end;
$$;

-- Lấy câu hỏi một đề đã công bố. Đề trả phí mở khi (a) tài khoản p_user_id có mã còn hiệu lực đúng sản phẩm — không tính
-- thiết bị; HOẶC (b) như cũ: mã + thiết bị đã kích hoạt. Trả thêm 'access': free | account | code.
-- Đổi chữ ký (thêm tham số) nên phải xóa bản cũ trước; p_user_id có mặc định nên lời gọi 3 tham số cũ vẫn chạy.
drop function public.get_exam_set(text, text, text);

create function public.get_exam_set(p_slug text, p_code text, p_device_hash text, p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.exam_sets%rowtype;
  l public.licenses%rowtype;
  access text := 'free';
begin
  select * into s from public.exam_sets where slug = p_slug and workflow_status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if s.product_id is not null then
    if p_user_id is not null and exists (
      select 1 from public.licenses
       where user_id = p_user_id and product_id = s.product_id and status = 'active'
         and (valid_until is null or valid_until >= now())
    ) then
      access := 'account';
    else
      select * into l from public.licenses where code = upper(btrim(coalesce(p_code, '')));
      if not found or l.product_id <> s.product_id then
        return jsonb_build_object('ok', false, 'reason', 'invalid_code');
      end if;
      if l.status <> 'active' then
        return jsonb_build_object('ok', false, 'reason', 'revoked');
      end if;
      if l.valid_until is not null and l.valid_until < now() then
        return jsonb_build_object('ok', false, 'reason', 'expired');
      end if;
      update public.license_activations set last_seen_at = now()
       where license_id = l.id and device_hash = p_device_hash;
      if not found then
        return jsonb_build_object('ok', false, 'reason', 'not_activated');
      end if;
      access := 'code';
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'access', access,
    'set', jsonb_build_object('slug', s.slug, 'title', s.title, 'description', s.description,
                              'duration_min', s.duration_min, 'free', s.product_id is null),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'position', q.position, 'question', q.question, 'choices', to_jsonb(q.choices),
               'correct_index', q.correct_index, 'explanation', q.explanation, 'lesson_slug', q.lesson_slug,
               'event_slug', e.slug, 'event_title', e.title
             ) order by q.position)
      from public.exam_questions q
      left join public.historical_events e on e.id = q.event_id and e.workflow_status = 'published'
      where q.set_id = s.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Như 20261015000000_payments.sql; khi cấp mã thì mã thuộc luôn tài khoản đã đặt đơn (orders.user_id).
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
      values (o.id, p.id, p_license_code, p.max_devices, p.valid_until, o.user_id);
    return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', p_license_code);
  end if;

  return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', null);
end;
$$;

-- Như 20261017000000_late_payment.sql; mã cấp ra thuộc tài khoản đã đặt đơn.
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
      values (o.id, p.id, p_license_code, p.max_devices, p.valid_until, o.user_id);
    return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', p_license_code);
  end if;
  return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', null);
end;
$$;

-- Tìm tài khoản Auth theo email (không phân biệt hoa thường). Trả uuid hoặc null.
create or replace function public.find_auth_user_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) order by created_at limit 1;
$$;

revoke all on function public.claim_license(text, uuid)                     from public, anon, authenticated;
revoke all on function public.get_exam_set(text, text, text, uuid)          from public, anon, authenticated;
revoke all on function public.mark_order_paid(bigint, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_resolve_late_payment(bigint, uuid, text, text) from public, anon, authenticated;
revoke all on function public.find_auth_user_by_email(text)                 from public, anon, authenticated;
grant execute on function public.claim_license(text, uuid)                     to service_role;
grant execute on function public.get_exam_set(text, text, text, uuid)          to service_role;
grant execute on function public.mark_order_paid(bigint, integer, text, text, text) to service_role;
grant execute on function public.admin_resolve_late_payment(bigint, uuid, text, text) to service_role;
grant execute on function public.find_auth_user_by_email(text)                 to service_role;

commit;

-- Kiểm tra sau khi chạy:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public'
--    and tablename in ('learner_profiles', 'learner_progress');                         → 2 dòng, true
--   select count(*) from pg_policies where schemaname = 'public'
--    and tablename in ('learner_profiles', 'learner_progress');                         → 7
--   select has_function_privilege('anon', 'public.claim_license(text, uuid)', 'execute'),
--          has_function_privilege('authenticated', 'public.get_exam_set(text, text, text, uuid)', 'execute'),
--          has_function_privilege('service_role', 'public.find_auth_user_by_email(text)', 'execute');   → false, false, true
--   Rồi chạy supabase/tests/learner_accounts.sql (tự hoàn tác).
