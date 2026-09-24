-- Siết RLS cho bảng `sources`: biên tập viên được THÊM nguồn mới, nhưng chỉ được SỬA/XÓA nguồn khi
-- nguồn đó KHÔNG gắn với sự kiện nào đang ở `pending_review`, `published` hoặc `hidden`.
--
-- ⚠ CHƯA CHẠY TRÊN DATABASE THẬT. Chạy trong Supabase SQL Editor của project. Chạy lại được (idempotent).
--
-- Vấn đề đã kiểm chứng trên database thật (tests/rls/sources.mjs, trước migration): chính sách cũ
-- "staff_manage" cho MỌI nhân sự đang hoạt động ghi `sources`. `sources` dùng chung nhiều sự kiện và
-- không có cột event_id nên migration 20260925000002 không phủ được. Hậu quả: biên tập viên gọi thẳng
-- API sửa được phần trích dẫn của nguồn mà sự kiện ĐÃ CÔNG BỐ đang dẫn, và xóa được nguồn chỉ gắn qua ảnh
-- của sự kiện đã công bố (khóa ngoại `media_assets.source_id` là ON DELETE SET NULL nên ảnh âm thầm mất nguồn).
--
-- "Gắn với sự kiện" được hiểu là CẢ HAI đường liên kết:
--   1. event_sources.source_id  (nguồn tham khảo của sự kiện)
--   2. media_assets.source_id   (nguồn của ảnh thuộc sự kiện)
--
-- Sau khi chạy:
--   - ĐỌC: mọi nhân sự đang hoạt động (như cũ). Khách vẫn đọc theo "public_read_published" (không đổi).
--   - system_admin và reviewer: giữ nguyên toàn quyền như cũ.
--   - editor: INSERT nguồn mới — luôn được.
--             UPDATE / DELETE — chỉ khi nguồn KHÔNG gắn với sự kiện pending_review/published/hidden.
--             (Nguồn chưa gắn với sự kiện nào, hoặc chỉ gắn với sự kiện draft/needs_revision → được.)
--   - Tài khoản `locked`: current_staff_role() trả về null nên mất mọi quyền (như cũ).
--
-- Lưu ý khi xóa: nếu nguồn còn gắn (event_sources) với BẤT KỲ sự kiện nào kể cả draft thì khóa ngoại vẫn
-- chặn xóa (lỗi 23503) — hành vi cũ, không đổi.

drop policy if exists "staff_manage" on public.sources;
drop policy if exists "staff_read_all" on public.sources;
drop policy if exists "reviewer_admin_manage" on public.sources;
drop policy if exists "editor_insert" on public.sources;
drop policy if exists "editor_update_unlinked" on public.sources;
drop policy if exists "editor_delete_unlinked" on public.sources;

create policy "staff_read_all" on public.sources
  for select to authenticated
  using (public.current_staff_role() is not null);

create policy "reviewer_admin_manage" on public.sources
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));

create policy "editor_insert" on public.sources
  for insert to authenticated
  with check (public.current_staff_role() = 'editor');

create policy "editor_update_unlinked" on public.sources
  for update to authenticated
  using (
    public.current_staff_role() = 'editor'
    and not exists (
      select 1
      from public.event_sources es
      join public.historical_events e on e.id = es.event_id
      where es.source_id = sources.id
        and e.workflow_status in ('pending_review', 'published', 'hidden')
    )
    and not exists (
      select 1
      from public.media_assets ma
      join public.historical_events e on e.id = ma.event_id
      where ma.source_id = sources.id
        and e.workflow_status in ('pending_review', 'published', 'hidden')
    )
  )
  with check (
    public.current_staff_role() = 'editor'
    and not exists (
      select 1
      from public.event_sources es
      join public.historical_events e on e.id = es.event_id
      where es.source_id = sources.id
        and e.workflow_status in ('pending_review', 'published', 'hidden')
    )
    and not exists (
      select 1
      from public.media_assets ma
      join public.historical_events e on e.id = ma.event_id
      where ma.source_id = sources.id
        and e.workflow_status in ('pending_review', 'published', 'hidden')
    )
  );

create policy "editor_delete_unlinked" on public.sources
  for delete to authenticated
  using (
    public.current_staff_role() = 'editor'
    and not exists (
      select 1
      from public.event_sources es
      join public.historical_events e on e.id = es.event_id
      where es.source_id = sources.id
        and e.workflow_status in ('pending_review', 'published', 'hidden')
    )
    and not exists (
      select 1
      from public.media_assets ma
      join public.historical_events e on e.id = ma.event_id
      where ma.source_id = sources.id
        and e.workflow_status in ('pending_review', 'published', 'hidden')
    )
  );

-- ============================================================
-- KIỂM TRA (chạy cùng file này): bảng `sources` phải có ĐÚNG 6 chính sách dưới đây và KHÔNG còn
-- "staff_manage":
--   public_read_published   SELECT   (khách + nhân sự đọc nguồn của sự kiện đã công bố — có từ trước)
--   staff_read_all          SELECT
--   reviewer_admin_manage   ALL
--   editor_insert           INSERT
--   editor_update_unlinked  UPDATE
--   editor_delete_unlinked  DELETE
-- ============================================================
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'sources'
order by policyname;

-- Kỳ vọng "co_staff_manage" = 0 và "so_chinh_sach" = 6:
select
  count(*) filter (where policyname = 'staff_manage') as co_staff_manage,
  count(*) as so_chinh_sach
from pg_policies
where schemaname = 'public' and tablename = 'sources';
