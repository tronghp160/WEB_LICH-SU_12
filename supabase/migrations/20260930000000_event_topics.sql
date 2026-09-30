-- Giai đoạn 3 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md, mục 3.3 / N3): một sự kiện thuộc NHIỀU chủ đề.
--
-- historical_events.topic_id vẫn là CHỦ ĐỀ CHÍNH (không đổi code cũ). Bảng mới event_topics chỉ chứa các CHỦ ĐỀ PHỤ,
-- ví dụ Hiệp định Genève (chính: kháng chiến chống Pháp) còn hiện ở chủ đề "Lịch sử đối ngoại của Việt Nam".
--
-- Thiết kế cố ý dùng khóa chính riêng (id) + UNIQUE(event_id, topic_id) thay vì khóa chính ghép: nếu khóa chính gồm
-- hai khóa ngoại, PostgREST coi bảng là "bảng nối nhiều–nhiều" và sẽ thấy HAI quan hệ historical_events ↔
-- curriculum_topics (qua topic_id và qua bảng nối) → mọi truy vấn nhúng `curriculum_topics(...)` đang có báo lỗi
-- "more than one relationship" (PGRST201).
--
-- RLS theo đúng mẫu các bảng liên kết khác (migration 20260925000002): khách đọc liên kết của sự kiện đã công bố;
-- nhân sự đọc hết; reviewer/admin ghi; editor chỉ ghi khi sự kiện đang draft/needs_revision.
-- Không xóa dữ liệu nào.

begin;

create table public.event_topics (
  id       uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.historical_events(id) on delete cascade,
  topic_id uuid not null references public.curriculum_topics(id) on delete cascade,
  constraint event_topics_unique unique (event_id, topic_id)
);

create index idx_event_topics_topic on public.event_topics (topic_id);

-- Chủ đề phụ không được trùng chủ đề chính.
create or replace function public.event_topics_not_primary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.historical_events e where e.id = new.event_id and e.topic_id = new.topic_id) then
    raise exception 'Chủ đề phụ trùng với chủ đề chính của sự kiện.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger event_topics_not_primary
  before insert or update on public.event_topics
  for each row execute function public.event_topics_not_primary();

alter table public.event_topics enable row level security;

create policy "public_read_published" on public.event_topics
  for select to anon, authenticated
  using (exists (select 1 from public.historical_events e where e.id = event_id and e.workflow_status = 'published'));

create policy "staff_read_all" on public.event_topics
  for select to authenticated
  using (public.current_staff_role() is not null);

create policy "reviewer_admin_manage" on public.event_topics
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));

create policy "editor_manage_editable" on public.event_topics
  for all to authenticated
  using (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.historical_events e where e.id = event_id and e.workflow_status in ('draft', 'needs_revision'))
  )
  with check (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.historical_events e where e.id = event_id and e.workflow_status in ('draft', 'needs_revision'))
  );

grant select on public.event_topics to anon, authenticated;
grant insert, update, delete on public.event_topics to authenticated;

commit;

-- Kiểm tra sau khi chạy:
--   select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'event_topics' order by 1;
--     → editor_manage_editable, public_read_published, reviewer_admin_manage, staff_read_all
