-- Chức năng THANH TOÁN — giai đoạn 1 (docs/ke-hoach-thanh-toan.md, mục 6): gói Luyện thi THPT + Ủng hộ dự án.
--
-- Nguyên tắc:
--   • Giá ở bảng `products` là nguồn DUY NHẤT; form không gửi giá.
--   • Đơn hàng, nhật ký thanh toán, mã kích hoạt: KHÁCH KHÔNG CÓ QUYỀN GÌ (RLS chặn + thu hồi GRANT). Server ghi bằng
--     khóa bí mật (lib/supabase/admin.ts); quản trị viên chỉ ĐỌC bằng phiên của mình.
--   • Mọi lần chuyển đơn sang `paid` đi qua MỘT hàm `mark_order_paid` (khóa dòng, đối chiếu số tiền, idempotent).
--   • Trigger chặn mọi chuyển trạng thái đơn ngoài bảng ORDER_TRANSITIONS (lib/payments/order-status.ts) và chặn sửa
--     số tiền / sản phẩm / mã đơn sau khi tạo — kể cả khi ghi bằng khóa bí mật.
--   • Câu hỏi đề luyện thi KHÔNG đọc trực tiếp được; chỉ lấy qua hàm `get_exam_set` (kiểm mã + thiết bị).
--   • Mã kích hoạt `LT12-…` sinh ở server (lib/payments/license.ts, crypto.getRandomValues) rồi truyền vào
--     `mark_order_paid`; trùng mã (xác suất ~0) thì hàm lỗi 23505, server sinh mã khác và gọi lại.
--   • Không lưu IP thô, không lưu dữ liệu thẻ; token xem đơn và mã thiết bị chỉ lưu dạng băm sha256 (băm ở server).
--
-- Điều chỉnh so với bản kế hoạch: enum trạng thái nội dung tên là `content_workflow_status`; câu hỏi đề luyện thi lưu
-- `choices text[]` + `correct_index` giống `quiz_questions` để dùng lại trình chơi trắc nghiệm; bỏ unique index trên
-- `payment_events` (mọi lần webhook gửi lại đều được GHI LẠI để đối soát; chống xử lý trùng nằm ở `mark_order_paid`).
--
-- Không sửa / xóa dữ liệu hiện có. Chạy sau đó: supabase/seed-payments.sql, rồi kiểm thử supabase/tests/payments.sql.

begin;

-- ============================================================
-- 1. Kiểu dữ liệu
-- ============================================================
create type public.order_status as enum ('pending', 'paid', 'cancelled', 'expired', 'refunded');
create type public.product_kind as enum ('exam_pack', 'donation');

-- ============================================================
-- 2. Bảng
-- ============================================================
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique constraint products_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind        public.product_kind not null,
  name        text not null constraint products_name_check check (char_length(btrim(name)) between 3 and 120),
  description text,
  price_vnd   integer constraint products_price_check check (price_vnd is null or price_vnd between 1000 and 10000000),
  min_vnd     integer constraint products_min_check check (min_vnd is null or min_vnd >= 1000),
  max_vnd     integer constraint products_max_check check (max_vnd is null or max_vnd <= 10000000),
  max_devices smallint not null default 3 constraint products_devices_check check (max_devices between 1 and 20),
  valid_until timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint products_price_rule check (
    (kind = 'exam_pack' and price_vnd is not null and min_vnd is null and max_vnd is null) or
    (kind = 'donation' and price_vnd is null and min_vnd is not null and max_vnd is not null and min_vnd <= max_vnd)
  )
);

create sequence public.order_code_seq start 100001;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_code        bigint not null unique default nextval('public.order_code_seq'),
  product_id        uuid not null references public.products(id),
  amount_vnd        integer not null constraint orders_amount_check check (amount_vnd between 1000 and 10000000),
  provider          text not null constraint orders_provider_check check (provider in ('payos', 'vnpay', 'mock')),
  provider_ref      text,
  checkout_url      text,
  status            public.order_status not null default 'pending',
  buyer_email       text constraint orders_email_check check (buyer_email is null or (char_length(buyer_email) <= 254 and buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  display_name      text constraint orders_display_name_check check (display_name is null or char_length(display_name) <= 60),
  message           text constraint orders_message_check check (message is null or char_length(message) <= 200),
  show_on_wall      boolean not null default false,
  wall_approved     boolean not null default false,
  access_token_hash text not null constraint orders_token_hash_check check (access_token_hash ~ '^[0-9a-f]{64}$'),
  client_ip_hash    text constraint orders_ip_hash_check check (client_ip_hash is null or client_ip_hash ~ '^[0-9a-f]{64}$'),
  expires_at        timestamptz not null default now() + interval '15 minutes',
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_paid_has_time check (status not in ('paid', 'refunded') or paid_at is not null),
  constraint orders_wall_needs_opt_in check (not wall_approved or show_on_wall)
);
alter sequence public.order_code_seq owned by public.orders.order_code;

create index idx_orders_status_created on public.orders (status, created_at desc);
create index idx_orders_ip_recent on public.orders (client_ip_hash, created_at desc) where client_ip_hash is not null;
create index idx_orders_product on public.orders (product_id);
create index idx_orders_email on public.orders (lower(buyer_email)) where buyer_email is not null;

-- Nhật ký MỌI lần webhook / quay về / đối soát / thao tác quản trị (kể cả chữ ký sai) — để điều tra và đối soát.
create table public.payment_events (
  id           bigint generated always as identity primary key,
  order_code   bigint,
  provider     text not null,
  source       text not null constraint payment_events_source_check check (source in ('webhook', 'return', 'reconcile', 'admin')),
  signature_ok boolean not null,
  status       text,
  amount_vnd   integer,
  provider_ref text,
  payload      jsonb not null default '{}'::jsonb,
  note         text,
  received_at  timestamptz not null default now()
);
create index idx_payment_events_order on public.payment_events (order_code, received_at desc);
create index idx_payment_events_recent on public.payment_events (received_at desc);

create table public.licenses (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references public.orders(id),
  product_id  uuid not null references public.products(id),
  code        text not null unique constraint licenses_code_check check (code ~ '^LT12-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  status      text not null default 'active' constraint licenses_status_check check (status in ('active', 'revoked')),
  max_devices smallint not null constraint licenses_devices_check check (max_devices between 1 and 20),
  valid_until timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_licenses_product on public.licenses (product_id);

create table public.license_activations (
  license_id   uuid not null references public.licenses(id) on delete cascade,
  device_hash  text not null constraint license_activations_hash_check check (device_hash ~ '^[0-9a-f]{64}$'),
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (license_id, device_hash)
);

-- Đề luyện thi: đi theo quy trình biên tập → kiểm duyệt như nội dung khác. product_id null = đề miễn phí (dùng thử).
create table public.exam_sets (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique constraint exam_sets_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null constraint exam_sets_title_check check (char_length(btrim(title)) between 3 and 160),
  description     text,
  product_id      uuid references public.products(id),
  duration_min    smallint not null default 50 constraint exam_sets_duration_check check (duration_min between 5 and 180),
  sort_order      integer not null default 0,
  workflow_status public.content_workflow_status not null default 'draft',
  review_note     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_exam_sets_status_order on public.exam_sets (workflow_status, sort_order);

create table public.exam_questions (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid not null references public.exam_sets(id) on delete cascade,
  position      smallint not null constraint exam_questions_position_check check (position between 1 and 200),
  question      text not null constraint exam_questions_question_check check (char_length(btrim(question)) between 5 and 600),
  choices       text[] not null constraint exam_questions_choices_check check (cardinality(choices) = 4),
  correct_index smallint not null constraint exam_questions_correct_check check (correct_index between 0 and 3),
  explanation   text not null constraint exam_questions_explanation_check check (char_length(btrim(explanation)) between 5 and 1500),
  lesson_slug   text constraint exam_questions_lesson_check check (lesson_slug is null or lesson_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  event_id      uuid references public.historical_events(id) on delete set null,
  source_note   text not null constraint exam_questions_source_check check (char_length(btrim(source_note)) between 3 and 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (set_id, position)
);
create index idx_exam_questions_event on public.exam_questions (event_id) where event_id is not null;

-- ============================================================
-- 3. Trigger
-- ============================================================
create trigger trg_products_updated_at       before update on public.products       for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at         before update on public.orders         for each row execute function public.set_updated_at();
create trigger trg_exam_sets_updated_at      before update on public.exam_sets      for each row execute function public.set_updated_at();
create trigger trg_exam_questions_updated_at before update on public.exam_questions for each row execute function public.set_updated_at();

-- Đơn hàng: chỉ chuyển trạng thái theo bảng cho phép; không sửa số tiền / sản phẩm / mã đơn / cổng sau khi tạo.
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
  ) then
    raise exception 'Không thể chuyển đơn hàng từ "%" sang "%".', old.status, new.status;
  end if;
  return new;
end;
$$;

create trigger trg_order_integrity
  before update on public.orders
  for each row execute function public.order_integrity();

-- Câu hỏi đề: 4 đáp án có nội dung, không trùng nhau (không viết được bằng CHECK) — giống quiz_question_integrity.
create or replace function public.exam_question_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.choices) as c where c is null or btrim(c) = '' or char_length(c) > 300) then
    raise exception 'Mỗi đáp án phải có nội dung (tối đa 300 ký tự).';
  end if;
  if (select count(distinct lower(btrim(c))) from unnest(new.choices) as c) <> 4 then
    raise exception 'Bốn đáp án không được trùng nhau.';
  end if;
  return new;
end;
$$;

create trigger trg_exam_question_integrity
  before insert or update on public.exam_questions
  for each row execute function public.exam_question_integrity();

-- ============================================================
-- 4. Hàm nghiệp vụ (security definer, search_path rỗng; CHỈ server gọi bằng khóa bí mật)
-- ============================================================

-- Chuyển đơn sang `paid` sau khi server ĐÃ xác thực chữ ký của cổng. Gọi lặp lại vô hại.
-- Trả jsonb: { ok, already?, status?, reason?, kind?, license_code? }
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
    insert into public.licenses (order_id, product_id, code, max_devices, valid_until)
      values (o.id, p.id, p_license_code, p.max_devices, p.valid_until);
    return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', p_license_code);
  end if;

  return jsonb_build_object('ok', true, 'already', false, 'kind', p.kind, 'license_code', null);
end;
$$;

-- Kích hoạt mã trên một thiết bị (device_hash = sha256 của mã thiết bị ngẫu nhiên trong localStorage, băm ở server).
-- Trả jsonb: { ok, reason?, devices_used, max_devices, valid_until, product_slug }
create or replace function public.activate_license(p_code text, p_device_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.licenses%rowtype;
  used integer;
  slug text;
begin
  select * into l from public.licenses where code = upper(btrim(p_code)) for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if l.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;
  if l.valid_until is not null and l.valid_until < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select count(*) into used from public.license_activations where license_id = l.id;
  if exists (select 1 from public.license_activations where license_id = l.id and device_hash = p_device_hash) then
    update public.license_activations set last_seen_at = now() where license_id = l.id and device_hash = p_device_hash;
  elsif used >= l.max_devices then
    return jsonb_build_object('ok', false, 'reason', 'device_limit', 'devices_used', used, 'max_devices', l.max_devices);
  else
    insert into public.license_activations (license_id, device_hash) values (l.id, p_device_hash);
    used := used + 1;
  end if;

  select pr.slug into slug from public.products pr where pr.id = l.product_id;
  return jsonb_build_object('ok', true, 'devices_used', used, 'max_devices', l.max_devices,
                            'valid_until', l.valid_until, 'product_slug', slug);
end;
$$;

-- Lấy câu hỏi một đề đã công bố. Đề miễn phí → trả luôn; đề trả phí → mã còn hiệu lực, đúng sản phẩm, thiết bị đã
-- kích hoạt. Trả jsonb: { ok, reason?, set: {...}, questions: [...] }
create or replace function public.get_exam_set(p_slug text, p_code text, p_device_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.exam_sets%rowtype;
  l public.licenses%rowtype;
begin
  select * into s from public.exam_sets where slug = p_slug and workflow_status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if s.product_id is not null then
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
  end if;

  return jsonb_build_object(
    'ok', true,
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

-- Đơn `pending` quá hạn → `expired`. Gọi "lười" mỗi khi tạo đơn mới (hoặc bằng pg_cron nếu bật).
create or replace function public.expire_stale_orders()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.orders set status = 'expired'
     where status = 'pending' and expires_at < now()
    returning 1
  )
  select count(*)::integer from expired;
$$;

revoke all on function public.mark_order_paid(bigint, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.activate_license(text, text)                     from public, anon, authenticated;
revoke all on function public.get_exam_set(text, text, text)                   from public, anon, authenticated;
revoke all on function public.expire_stale_orders()                            from public, anon, authenticated;
grant execute on function public.mark_order_paid(bigint, integer, text, text, text) to service_role;
grant execute on function public.activate_license(text, text)                     to service_role;
grant execute on function public.get_exam_set(text, text, text)                   to service_role;
grant execute on function public.expire_stale_orders()                            to service_role;

-- ============================================================
-- 5. RLS và quyền
-- ============================================================
alter table public.products            enable row level security;
alter table public.orders              enable row level security;
alter table public.payment_events      enable row level security;
alter table public.licenses            enable row level security;
alter table public.license_activations enable row level security;
alter table public.exam_sets           enable row level security;
alter table public.exam_questions      enable row level security;

-- Supabase mặc định cấp quyền bảng mới cho anon/authenticated → thu hồi hết rồi cấp lại đúng phần cần.
revoke all on public.products, public.orders, public.payment_events, public.licenses,
              public.license_activations, public.exam_sets, public.exam_questions
  from anon, authenticated;
revoke all on sequence public.order_code_seq from anon, authenticated;

-- Sản phẩm: khách xem sản phẩm đang bán (để hiện giá); quản trị viên quản lý.
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
create policy "public_read_active" on public.products
  for select to anon, authenticated using (is_active);
create policy "admin_manage" on public.products
  for all to authenticated
  using (public.current_staff_role() = 'system_admin')
  with check (public.current_staff_role() = 'system_admin');

-- Đơn hàng / nhật ký / mã / thiết bị: chỉ quản trị viên ĐỌC. Mọi thao tác ghi đi qua server (khóa bí mật) sau khi
-- đã kiểm requireRole(["system_admin"]) — giống mẫu tạo tài khoản nhân sự (UC13).
grant select on public.orders, public.payment_events, public.licenses, public.license_activations to authenticated;
create policy "admin_read" on public.orders              for select to authenticated using (public.current_staff_role() = 'system_admin');
create policy "admin_read" on public.payment_events      for select to authenticated using (public.current_staff_role() = 'system_admin');
create policy "admin_read" on public.licenses            for select to authenticated using (public.current_staff_role() = 'system_admin');
create policy "admin_read" on public.license_activations for select to authenticated using (public.current_staff_role() = 'system_admin');

-- Đề luyện thi: khách chỉ thấy DANH SÁCH đề đã công bố; nhân sự theo mẫu quiz_questions.
grant select on public.exam_sets to anon, authenticated;
grant insert, update, delete on public.exam_sets to authenticated;
create policy "public_read_published" on public.exam_sets
  for select to anon, authenticated using (workflow_status = 'published');
create policy "staff_read_all" on public.exam_sets
  for select to authenticated using (public.current_staff_role() is not null);
create policy "reviewer_admin_manage" on public.exam_sets
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));
-- Biên tập viên: chỉ sửa đề đang nháp / cần chỉnh sửa, và chỉ đưa về nháp hoặc gửi duyệt (không tự công bố).
create policy "editor_manage_editable" on public.exam_sets
  for all to authenticated
  using (public.current_staff_role() = 'editor' and workflow_status in ('draft', 'needs_revision'))
  with check (public.current_staff_role() = 'editor' and workflow_status in ('draft', 'needs_revision', 'pending_review'));

-- Câu hỏi đề: KHÔNG cấp cho anon (khách chỉ lấy qua get_exam_set).
grant select, insert, update, delete on public.exam_questions to authenticated;
create policy "staff_read_all" on public.exam_questions
  for select to authenticated using (public.current_staff_role() is not null);
create policy "reviewer_admin_manage" on public.exam_questions
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));
create policy "editor_manage_editable" on public.exam_questions
  for all to authenticated
  using (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.exam_sets s where s.id = set_id and s.workflow_status in ('draft', 'needs_revision'))
  )
  with check (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.exam_sets s where s.id = set_id and s.workflow_status in ('draft', 'needs_revision'))
  );

-- Bức tường cảm ơn: view chạy bằng quyền chủ sở hữu, CHỈ lộ cột an toàn (tên, lời nhắn đã duyệt, ngày, mức).
create view public.donation_wall with (security_invoker = false) as
  select o.display_name, o.message, o.paid_at,
         case when o.amount_vnd < 50000 then 'Ủng hộ'
              when o.amount_vnd < 200000 then 'Ủng hộ nhiệt tình'
              else 'Nhà hảo tâm' end as tier
    from public.orders o
    join public.products p on p.id = o.product_id
   where p.kind = 'donation' and o.status = 'paid' and o.show_on_wall and o.wall_approved;
revoke all on public.donation_wall from anon, authenticated;
grant select on public.donation_wall to anon, authenticated;

commit;

-- Kiểm tra sau khi chạy:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public'
--     and tablename in ('products','orders','payment_events','licenses','license_activations','exam_sets','exam_questions');
--     → 7 bảng, rowsecurity = true
--   select tablename, policyname from pg_policies where schemaname = 'public'
--     and tablename in ('products','orders','payment_events','licenses','license_activations','exam_sets','exam_questions') order by 1, 2;
--     → 13 policy (products 2, orders/payment_events/licenses/license_activations mỗi bảng 1, exam_sets 4, exam_questions 3)
--   select proname from pg_proc where pronamespace = 'public'::regnamespace
--     and proname in ('mark_order_paid','activate_license','get_exam_set','expire_stale_orders','order_integrity','exam_question_integrity');
--     → 6 hàm
--   Rồi chạy supabase/tests/payments.sql (tự hoàn tác).
