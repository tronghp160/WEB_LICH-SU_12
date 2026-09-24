-- Phần 4: GRANT và RLS (36 policy)
-- ĐÃ CHẠY THÀNH CÔNG trên Supabase qua pgAdmin 4. File này chỉ để đồng bộ
-- mã nguồn với database thật — KHÔNG chạy lại (sẽ lỗi "already exists").

create or replace function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.staff_profiles
  where id = (select auth.uid())
    and account_status = 'active'
$$;

grant usage on schema public to anon, authenticated;

revoke insert, update, delete on all tables in schema public from anon;
grant select on
  public.curriculum_topics, public.historical_events, public.historical_figures,
  public.historical_locations, public.event_figures, public.event_locations,
  public.event_sources, public.sources, public.media_assets
to anon;
revoke all on public.staff_profiles from anon;

grant select, insert, update, delete on all tables in schema public to authenticated;

grant execute on function public.find_published_locations_within_radius(double precision, double precision, double precision)
  to anon, authenticated;
grant execute on function public.current_staff_role() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['curriculum_topics', 'historical_events',
                           'historical_figures', 'historical_locations']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format($p$
      create policy "public_read_published" on public.%I
      for select to anon, authenticated
      using (workflow_status = 'published')
    $p$, t);

    execute format($p$
      create policy "staff_read_all" on public.%I
      for select to authenticated
      using (public.current_staff_role() is not null)
    $p$, t);

    execute format($p$
      create policy "editor_insert_draft" on public.%I
      for insert to authenticated
      with check (public.current_staff_role() = 'editor'
                  and workflow_status = 'draft')
    $p$, t);

    execute format($p$
      create policy "editor_update_draft" on public.%I
      for update to authenticated
      using (public.current_staff_role() = 'editor'
             and workflow_status in ('draft', 'needs_revision'))
      with check (public.current_staff_role() = 'editor'
                  and workflow_status in ('draft', 'needs_revision', 'pending_review'))
    $p$, t);

    execute format($p$
      create policy "reviewer_update_status" on public.%I
      for update to authenticated
      using (public.current_staff_role() = 'reviewer'
             and workflow_status in ('pending_review', 'published', 'hidden'))
      with check (public.current_staff_role() = 'reviewer'
                  and workflow_status in ('needs_revision', 'published', 'hidden'))
    $p$, t);

    execute format($p$
      create policy "admin_all" on public.%I
      for all to authenticated
      using (public.current_staff_role() = 'system_admin')
      with check (public.current_staff_role() = 'system_admin')
    $p$, t);
  end loop;
end $$;

alter table public.event_figures   enable row level security;
alter table public.event_locations enable row level security;
alter table public.event_sources   enable row level security;
alter table public.sources         enable row level security;
alter table public.media_assets    enable row level security;

create policy "public_read_published" on public.event_figures
  for select to anon, authenticated
  using (
    exists (select 1 from public.historical_events e
            where e.id = event_id and e.workflow_status = 'published')
    and exists (select 1 from public.historical_figures f
                where f.id = figure_id and f.workflow_status = 'published')
  );

create policy "public_read_published" on public.event_locations
  for select to anon, authenticated
  using (
    exists (select 1 from public.historical_events e
            where e.id = event_id and e.workflow_status = 'published')
    and exists (select 1 from public.historical_locations l
                where l.id = location_id and l.workflow_status = 'published')
  );

create policy "public_read_published" on public.event_sources
  for select to anon, authenticated
  using (exists (select 1 from public.historical_events e
                 where e.id = event_id and e.workflow_status = 'published'));

create policy "public_read_published" on public.media_assets
  for select to anon, authenticated
  using (exists (select 1 from public.historical_events e
                 where e.id = event_id and e.workflow_status = 'published'));

create policy "public_read_published" on public.sources
  for select to anon, authenticated
  using (exists (select 1
                 from public.event_sources es
                 join public.historical_events e on e.id = es.event_id
                 where es.source_id = sources.id
                   and e.workflow_status = 'published'));

create policy "staff_manage" on public.event_figures
  for all to authenticated
  using (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

create policy "staff_manage" on public.event_locations
  for all to authenticated
  using (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

create policy "staff_manage" on public.event_sources
  for all to authenticated
  using (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

create policy "staff_manage" on public.sources
  for all to authenticated
  using (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

create policy "staff_manage" on public.media_assets
  for all to authenticated
  using (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

alter table public.staff_profiles enable row level security;

create policy "staff_read_own" on public.staff_profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "admin_manage_staff" on public.staff_profiles
  for all to authenticated
  using (public.current_staff_role() = 'system_admin')
  with check (public.current_staff_role() = 'system_admin');
