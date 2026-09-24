-- Bucket lưu ảnh minh họa cho sự kiện (Phase 10, UC08).
--
-- ⚠ CHƯA CHẠY TRÊN DATABASE THẬT. Chạy trong Supabase SQL Editor (hoặc pgAdmin 4).
-- Chạy lại nhiều lần được (idempotent).
--
-- Lý do thiết kế:
--  - Bucket `media` CÔNG KHAI ĐỌC: ảnh của nội dung đã công bố phải xem được bằng URL trực tiếp,
--    không cần đăng nhập. (Ảnh của bản nháp cũng có URL công khai nhưng URL là chuỗi UUID khó đoán;
--    bản ghi media_assets trỏ tới nó vẫn được RLS ẩn với khách.)
--  - Giới hạn loại tệp (JPG/PNG/WebP) và kích thước (5 MB) đặt NGAY Ở BUCKET → được ép ở server,
--    không phụ thuộc kiểm tra ở trình duyệt.
--  - Chỉ nhân sự đang hoạt động (current_staff_role() is not null) mới được tải lên/xóa;
--    tài khoản `locked` mất quyền vì current_staff_role() chỉ trả về vai trò khi active.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_staff_insert" on storage.objects;
create policy "media_staff_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.current_staff_role() is not null);

drop policy if exists "media_staff_delete" on storage.objects;
create policy "media_staff_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.current_staff_role() is not null);
