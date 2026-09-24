-- Phần 3: Trigger, index, hàm PostGIS
-- ĐÃ CHẠY THÀNH CÔNG trên Supabase qua pgAdmin 4. File này chỉ để đồng bộ
-- mã nguồn với database thật — KHÔNG chạy lại (sẽ lỗi "already exists").

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_staff_profiles_updated_at
  before update on public.staff_profiles
  for each row execute function public.set_updated_at();

create trigger trg_historical_events_updated_at
  before update on public.historical_events
  for each row execute function public.set_updated_at();

create index idx_events_topic_status_year
  on public.historical_events (topic_id, workflow_status, start_year);
create index idx_event_figures_figure     on public.event_figures (figure_id);
create index idx_event_locations_location on public.event_locations (location_id);
create index idx_event_sources_source     on public.event_sources (source_id);
create index idx_media_assets_event       on public.media_assets (event_id);
create index idx_media_assets_source      on public.media_assets (source_id);

create unique index uq_event_locations_one_primary
  on public.event_locations (event_id)
  where is_primary = true;

create index idx_historical_locations_geom
  on public.historical_locations using gist (geom);

create or replace function public.find_published_locations_within_radius(
  center_lat double precision,
  center_lng double precision,
  radius_m   double precision
)
returns table (
  id             uuid,
  name           text,
  slug           text,
  latitude       numeric,
  longitude      numeric,
  accuracy_level text,
  distance_m     double precision
)
language plpgsql
stable
set search_path = ''
as $$
declare
  center extensions.geography;
begin
  if radius_m is null or radius_m <= 0 or radius_m > 2000000 then
    raise exception 'Bán kính không hợp lệ: phải lớn hơn 0 và không quá 2.000.000 mét';
  end if;

  if center_lat is null or center_lng is null
     or center_lat not between -90 and 90
     or center_lng not between -180 and 180 then
    raise exception 'Tọa độ tâm không hợp lệ';
  end if;

  center := extensions.st_setsrid(
              extensions.st_makepoint(center_lng, center_lat), 4326
            )::extensions.geography;

  return query
    select l.id, l.name, l.slug, l.latitude, l.longitude, l.accuracy_level,
           extensions.st_distance(l.geom, center)
    from public.historical_locations l
    where l.workflow_status = 'published'
      and l.geom is not null
      and extensions.st_dwithin(l.geom, center, radius_m)
    order by 7;
end;
$$;
