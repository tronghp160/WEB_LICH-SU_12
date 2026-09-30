-- Giai đoạn 1 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md, mục 1.1): "kho ảnh" chuẩn cho media_assets.
--
-- 1. Thêm loại media 'video', 'panorama'.
-- 2. Thêm thông tin trung thực và ghi công ngay trên từng ảnh (H7):
--      era (historical | today | illustration), year_taken, photographer, license, license_url, source_page_url,
--      is_reenactment (cảnh dựng lại), is_colorized (ảnh tô màu), is_cover (ảnh bìa), focal_point (điểm lấy nét khi cắt),
--      pair_id (ghép cặp "xưa – nay"), width/height (tỉ lệ ảnh cho next/image và lightbox).
--    Lý do đặt ghi công trên ảnh thay vì chỉ dựa vào bảng `sources`: khách chỉ đọc được `sources` gắn qua
--    event_sources (RLS), nên nguồn của ảnh có thể không hiện ở trang công khai.
-- 3. Ảnh gắn được với NHÂN VẬT hoặc ĐỊA ĐIỂM, không chỉ sự kiện: event_id bỏ NOT NULL, thêm figure_id, location_id,
--    ràng buộc mỗi ảnh thuộc ĐÚNG MỘT chủ (media_owner_one). Mỗi chủ có tối đa một ảnh bìa.
-- 4. Viết lại RLS của media_assets cho ba loại chủ (cùng nguyên tắc với migration 20260925000002):
--      khách đọc ảnh của nội dung đã công bố; editor chỉ ghi khi chủ đang draft/needs_revision; reviewer/admin như cũ.
-- 5. Khóa nguồn với editor (migration 20260925000003) tính cả ảnh của nhân vật/địa điểm đã gửi duyệt/công bố.
-- 6. Điền dữ liệu cho 2 ảnh hiện có (ghi công, ảnh bìa; ảnh cắm cờ 1954 là cảnh dựng lại).
--
-- ✔ ĐÃ CHẠY TRÊN DATABASE THẬT (2026-09-29) sau khi được người dùng duyệt. Mỗi migration chỉ chạy MỘT lần — KHÔNG chạy lại.
--
-- Không xóa dữ liệu. Các DROP chỉ là ràng buộc CHECK cũ và các policy được tạo lại ngay trong file này.

begin;

-- ---------- 1. Loại media ----------
alter table public.media_assets drop constraint if exists media_assets_media_type_check;
alter table public.media_assets add constraint media_assets_media_type_check
  check (media_type in ('image', 'document', 'video', 'panorama'));

-- ---------- 2. Cột ghi công và trình bày ----------
alter table public.media_assets
  add column era text not null default 'historical'
    constraint media_assets_era_check check (era in ('historical', 'today', 'illustration')),
  add column year_taken integer
    constraint media_assets_year_taken_check check (year_taken between 1800 and 2100),
  add column photographer text,
  add column license text,
  add column license_url text
    constraint media_assets_license_url_check check (license_url ~ '^https?://'),
  add column source_page_url text
    constraint media_assets_source_page_url_check check (source_page_url ~ '^https?://'),
  add column is_reenactment boolean not null default false,
  add column is_colorized boolean not null default false,
  add column is_cover boolean not null default false,
  add column focal_point text
    constraint media_assets_focal_point_check check (focal_point ~ '^(100|[1-9]?[0-9])% (100|[1-9]?[0-9])%$'),
  add column pair_id uuid,
  add column width integer constraint media_assets_width_check check (width > 0),
  add column height integer constraint media_assets_height_check check (height > 0);

-- ---------- 3. Chủ của ảnh: sự kiện | nhân vật | địa điểm ----------
alter table public.media_assets alter column event_id drop not null;
alter table public.media_assets
  add column figure_id uuid references public.historical_figures(id) on delete cascade,
  add column location_id uuid references public.historical_locations(id) on delete cascade,
  add constraint media_owner_one check (num_nonnulls(event_id, figure_id, location_id) = 1);

create index idx_media_assets_figure   on public.media_assets (figure_id) where figure_id is not null;
create index idx_media_assets_location on public.media_assets (location_id) where location_id is not null;
create index idx_media_assets_pair     on public.media_assets (pair_id) where pair_id is not null;
-- Tối đa một ảnh bìa cho mỗi chủ (ba cột loại trừ nhau nên coalesce ra đúng id của chủ).
create unique index uq_media_assets_one_cover
  on public.media_assets ((coalesce(event_id, figure_id, location_id)))
  where is_cover;

-- ---------- 4. RLS của media_assets ----------
-- Trạng thái của chủ ảnh (dùng trong policy; security invoker nên vẫn đi qua RLS của người gọi).
create or replace function public.media_owner_status(p_event uuid, p_figure uuid, p_location uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select e.workflow_status::text from public.historical_events e where e.id = p_event),
    (select f.workflow_status::text from public.historical_figures f where f.id = p_figure),
    (select l.workflow_status::text from public.historical_locations l where l.id = p_location)
  )
$$;

drop policy if exists "public_read_published" on public.media_assets;
create policy "public_read_published" on public.media_assets
  for select to anon, authenticated
  using (public.media_owner_status(event_id, figure_id, location_id) = 'published');

-- staff_read_all và reviewer_admin_manage (migration 20260925000002) không phụ thuộc event_id → giữ nguyên.
drop policy if exists "editor_manage_editable" on public.media_assets;
create policy "editor_manage_editable" on public.media_assets
  for all to authenticated
  using (
    public.current_staff_role() = 'editor'
    and public.media_owner_status(event_id, figure_id, location_id) in ('draft', 'needs_revision')
  )
  with check (
    public.current_staff_role() = 'editor'
    and public.media_owner_status(event_id, figure_id, location_id) in ('draft', 'needs_revision')
  );

-- ---------- 5. Khóa nguồn với editor: tính cả ảnh của nhân vật/địa điểm ----------
create or replace function public.source_locked_for_editor(p_source uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_sources es
    join public.historical_events e on e.id = es.event_id
    where es.source_id = p_source
      and e.workflow_status in ('pending_review', 'published', 'hidden')
  )
  or exists (
    select 1
    from public.media_assets ma
    where ma.source_id = p_source
      and public.media_owner_status(ma.event_id, ma.figure_id, ma.location_id) in ('pending_review', 'published', 'hidden')
  )
$$;

drop policy if exists "editor_update_unlinked" on public.sources;
create policy "editor_update_unlinked" on public.sources
  for update to authenticated
  using (public.current_staff_role() = 'editor' and not public.source_locked_for_editor(id))
  with check (public.current_staff_role() = 'editor' and not public.source_locked_for_editor(id));

drop policy if exists "editor_delete_unlinked" on public.sources;
create policy "editor_delete_unlinked" on public.sources
  for delete to authenticated
  using (public.current_staff_role() = 'editor' and not public.source_locked_for_editor(id));

-- ---------- 6. Dữ liệu cho 2 ảnh hiện có ----------
update public.media_assets
set era = 'historical',
    year_taken = 1954,
    photographer = 'Quân đội nhân dân Việt Nam',
    license = 'Commons ghi phạm vi công cộng tại Việt Nam (PD-Vietnam), nhãn đang được xem lại',
    source_page_url = 'https://commons.wikimedia.org/wiki/File:Victory_in_Battle_of_Dien_Bien_Phu.jpg',
    is_reenactment = true,
    is_cover = true
where file_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Victory_in_Battle_of_Dien_Bien_Phu.jpg';

update public.media_assets
set era = 'historical',
    year_taken = 1945,
    photographer = 'Front pour l''indépendance du Việt-Nam (© VARCHIV)',
    license = 'CC BY-SA 4.0',
    license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
    source_page_url = 'https://commons.wikimedia.org/wiki/File:Pr%C3%A9sident_Ho-chi-Minh_lit_la_Proclamation-d%27ind%C3%A9pendance_sur_la_place_Ba-dinh_le_2nd_Sep_1945.jpg',
    is_cover = true
where file_url like 'https://commons.wikimedia.org/wiki/Special:FilePath/Pr%C3%A9sident_Ho-chi-Minh_lit_la_Proclamation%';

commit;

-- Kiểm tra sau khi chạy:
--   select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'media_assets' order by 1;
--     → editor_manage_editable, public_read_published, reviewer_admin_manage, staff_read_all
--   select count(*) filter (where is_cover) as anh_bia, count(*) filter (where is_reenactment) as dung_lai,
--          count(*) filter (where license is null) as thieu_giay_phep from public.media_assets;
--     → 2, 1, 0
