-- Siết RLS cho các bảng liên kết của sự kiện: biên tập viên chỉ được GHI khi sự kiện cha đang ở
-- `draft` hoặc `needs_revision` (Phase 10 — Quy tắc 3: phân quyền dựa vào RLS ở database).
--
-- ⚠ CHƯA CHẠY TRÊN DATABASE THẬT. Chạy trong Supabase SQL Editor của project. Chạy lại được (idempotent).
--
-- Vấn đề đã kiểm chứng trên database thật (kiểm thử Phase 10): chính sách cũ "staff_manage" cho MỌI
-- nhân sự đang hoạt động ghi các bảng này bất kể trạng thái sự kiện cha, nên biên tập viên có thể gọi
-- thẳng API để thêm/xóa nguồn, nhân vật, địa điểm hay sửa ảnh của sự kiện đang chờ duyệt hoặc đã
-- công bố (giao diện không cho, nhưng RLS thì không chặn).
--
-- Áp dụng cho 4 bảng đều có cột event_id: event_figures, event_locations, event_sources, media_assets.
--
-- Sau khi chạy:
--   - ĐỌC: mọi nhân sự đang hoạt động (như cũ). Khách vẫn đọc theo chính sách "public_read_published".
--   - GHI bởi system_admin và reviewer: giữ nguyên như cũ (không đổi hành vi của hai vai trò này).
--   - GHI bởi editor: chỉ khi sự kiện cha ở draft/needs_revision. Áp dụng cho cả INSERT, UPDATE
--     (kể cả đổi event_id sang sự kiện khác) và DELETE, vì cả USING lẫn WITH CHECK đều kiểm tra.
--   - Tài khoản `locked`: current_staff_role() trả về null nên mất mọi quyền (như cũ).
--
-- Chưa xử lý (ngoài phạm vi migration này): bảng `sources` dùng chung cho nhiều sự kiện nên
-- không có event_id; biên tập viên vẫn sửa được nội dung nguồn kể cả nguồn của sự kiện đã công bố.

do $$
declare
  t text;
begin
  foreach t in array array['event_figures', 'event_locations', 'event_sources', 'media_assets']
  loop
    -- Bỏ chính sách rộng cũ (và các chính sách của lần chạy trước để chạy lại được).
    execute format('drop policy if exists "staff_manage" on public.%I', t);
    execute format('drop policy if exists "staff_read_all" on public.%I', t);
    execute format('drop policy if exists "reviewer_admin_manage" on public.%I', t);
    execute format('drop policy if exists "editor_manage_editable" on public.%I', t);

    execute format($p$
      create policy "staff_read_all" on public.%I
      for select to authenticated
      using (public.current_staff_role() is not null)
    $p$, t);

    execute format($p$
      create policy "reviewer_admin_manage" on public.%I
      for all to authenticated
      using (public.current_staff_role() in ('reviewer', 'system_admin'))
      with check (public.current_staff_role() in ('reviewer', 'system_admin'))
    $p$, t);

    execute format($p$
      create policy "editor_manage_editable" on public.%I
      for all to authenticated
      using (
        public.current_staff_role() = 'editor'
        and exists (
          select 1 from public.historical_events e
          where e.id = event_id
            and e.workflow_status in ('draft', 'needs_revision')
        )
      )
      with check (
        public.current_staff_role() = 'editor'
        and exists (
          select 1 from public.historical_events e
          where e.id = event_id
            and e.workflow_status in ('draft', 'needs_revision')
        )
      )
    $p$, t);
  end loop;
end $$;

-- Kiểm tra nhanh: mỗi bảng phải có đúng 4 chính sách (public_read_published cho bảng có, staff_read_all,
-- reviewer_admin_manage, editor_manage_editable) và KHÔNG còn "staff_manage".
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('event_figures', 'event_locations', 'event_sources', 'media_assets')
order by tablename, policyname;
