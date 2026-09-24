-- Phần 1 + 2: Enum và 10 bảng
-- ĐÃ CHẠY THÀNH CÔNG trên Supabase qua pgAdmin 4. File này chỉ để đồng bộ
-- mã nguồn với database thật — KHÔNG chạy lại (sẽ lỗi "already exists").

create extension if not exists postgis with schema extensions;

create type public.content_workflow_status as enum
  ('draft', 'pending_review', 'needs_revision', 'published', 'hidden');
create type public.staff_role as enum ('editor', 'reviewer', 'system_admin');
create type public.account_status as enum ('active', 'locked');

create table public.staff_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  account_status public.account_status not null default 'active',
  role           public.staff_role     not null default 'editor',
  created_at     timestamptz default now(),
  updated_at     timestamptz not null default now()
);

create table public.curriculum_topics (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  slug            text not null unique,
  description     text,
  sort_order      integer not null default 0,
  workflow_status public.content_workflow_status not null default 'draft',
  created_at      timestamptz default now()
);

create table public.historical_figures (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  other_names     text,
  birth_year      integer,
  death_year      integer check (death_year is null or birth_year is null or death_year >= birth_year),
  biography       text,
  portrait_url    text,
  workflow_status public.content_workflow_status not null default 'draft'
);

create table public.historical_locations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  historical_name text,
  slug            text not null unique,
  description     text,
  latitude        numeric(9,6) check (latitude is null or latitude between -90 and 90),
  longitude       numeric(9,6) check (longitude is null or longitude between -180 and 180),
  accuracy_level  text not null default 'unknown'
                  check (accuracy_level in ('exact', 'approximate', 'region', 'unknown')),
  accuracy_note   text,
  workflow_status public.content_workflow_status not null default 'draft',
  geom extensions.geography(Point, 4326) generated always as (
    case when latitude is not null and longitude is not null then
      extensions.st_setsrid(
        extensions.st_makepoint(longitude::double precision, latitude::double precision), 4326
      )::extensions.geography
    end
  ) stored,
  check ((latitude is null) = (longitude is null))
);

create table public.sources (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  author_org     text,
  publisher      text,
  published_year integer,
  url            text,
  source_type    text not null
                 check (source_type in ('book', 'article', 'official', 'web', 'archive', 'other')),
  citation       text not null,
  accessed_at    date
);

create table public.historical_events (
  id              uuid primary key default gen_random_uuid(),
  topic_id        uuid not null references public.curriculum_topics(id),
  title           text not null,
  slug            text not null unique,
  start_year      integer not null,
  end_year        integer,
  start_date      date,
  end_date        date,
  date_text       text not null,
  date_precision  text not null
                  check (date_precision in ('exact', 'year', 'period', 'approximate', 'disputed')),
  summary         text not null,
  content         text,
  is_featured     boolean default false,
  workflow_status public.content_workflow_status not null default 'draft',
  created_at      timestamptz default now(),
  updated_at      timestamptz not null default now(),
  check (end_year is null or end_year >= start_year),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (start_date is null or extract(year from start_date) = start_year),
  check (end_date is null or end_year is null or extract(year from end_date) = end_year)
);

create table public.event_figures (
  event_id     uuid not null references public.historical_events(id) on delete cascade,
  figure_id    uuid not null references public.historical_figures(id),
  relationship text,
  sort_order   integer default 0,
  primary key (event_id, figure_id)
);

create table public.event_locations (
  event_id      uuid not null references public.historical_events(id) on delete cascade,
  location_id   uuid not null references public.historical_locations(id),
  location_role text,
  is_primary    boolean default false,
  primary key (event_id, location_id)
);

create table public.event_sources (
  event_id        uuid not null references public.historical_events(id) on delete cascade,
  source_id       uuid not null references public.sources(id),
  source_note     text,
  confidence_note text,
  primary key (event_id, source_id)
);

create table public.media_assets (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.historical_events(id) on delete cascade,
  file_url   text not null,
  media_type text not null check (media_type in ('image', 'document')),
  caption    text,
  alt_text   text,
  source_id  uuid references public.sources(id) on delete set null,
  sort_order integer default 0
);
