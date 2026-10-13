-- Giới hạn số lần thử cho chức năng thanh toán (docs/ke-hoach-thanh-toan.md, mục 11): tra cứu đơn bằng email + mã đơn,
-- và kích hoạt mã. Đếm trong database (không đếm trong bộ nhớ máy chủ) để đúng cả khi web chạy nhiều tiến trình
-- (Vercel). Chỉ lưu bản băm có muối của IP — không lưu IP thô. Chỉ server (service_role) gọi được.
-- Không sửa / xóa dữ liệu hiện có.

begin;

create table public.rate_limit_hits (
  id         bigint generated always as identity primary key,
  bucket     text not null constraint rate_limit_hits_bucket_check check (bucket in ('order_lookup', 'license_activation')),
  key_hash   text not null constraint rate_limit_hits_key_check check (key_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
create index idx_rate_limit_hits_lookup on public.rate_limit_hits (bucket, key_hash, created_at desc);

alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Ghi một lượt thử nếu còn trong hạn mức; trả true = được phép, false = đã vượt (không ghi thêm).
-- Khóa theo (bucket, key) trong giao dịch để hai yêu cầu đồng thời không cùng lọt qua ngưỡng.
create or replace function public.consume_rate_limit(p_bucket text, p_key_hash text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  if p_window_seconds not between 1 and 86400 or p_max not between 1 and 1000 then
    raise exception 'Tham số giới hạn không hợp lệ.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_bucket || ':' || p_key_hash, 0));

  select count(*) into used
    from public.rate_limit_hits
   where bucket = p_bucket and key_hash = p_key_hash
     and created_at > now() - make_interval(secs => p_window_seconds);
  if used >= p_max then
    return false;
  end if;

  insert into public.rate_limit_hits (bucket, key_hash) values (p_bucket, p_key_hash);
  -- Dọn dần bản ghi cũ hơn 1 ngày (giữ bảng nhỏ, không cần pg_cron).
  delete from public.rate_limit_hits
   where id in (select id from public.rate_limit_hits where created_at < now() - interval '1 day' limit 200);
  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

commit;

-- Kiểm tra sau khi chạy:
--   select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'rate_limit_hits';   → true
--   select has_table_privilege('anon', 'public.rate_limit_hits', 'select'),
--          has_function_privilege('anon', 'public.consume_rate_limit(text, text, integer, integer)', 'execute'),
--          has_function_privilege('service_role', 'public.consume_rate_limit(text, text, integer, integer)', 'execute');
--     → false, false, true
