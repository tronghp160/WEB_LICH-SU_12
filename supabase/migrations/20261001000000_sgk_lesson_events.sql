-- Nâng cấp giao diện GĐ7 (KE_HOACH_NANG_CAP_GIAO_DIEN.md, mục 8.2): biên tập viên tự GÁN SỰ KIỆN vào bài/mục SGK.
--
-- Khung 6 chủ đề – 17 bài – các mục (tên, số tiết, yêu cầu cần đạt) là mục lục CỐ ĐỊNH của sách nên vẫn viết trong code
-- (lib/sgk/curriculum.ts). Phần thay đổi theo nội dung — sự kiện nào thuộc bài nào, mục nào — chuyển vào bảng này để
-- biên tập viên tự làm trong trang quản trị "Bài SGK" khi thêm sự kiện mới, không cần sửa code.
--
-- Trang công khai đọc bảng này; bảng chưa có hoặc chưa có dòng nào thì dùng cách gán viết sẵn trong code (không gãy).
-- Dữ liệu ban đầu: supabase/seed-sgk.sql (sinh từ lib/sgk/curriculum.ts bằng scripts/build-sgk-sql.mjs).
--
-- Quyền (giản lược so với kế hoạch: việc gán là siêu dữ liệu mục lục, không phải nội dung nên không qua hàng đợi duyệt):
--   - khách: chỉ thấy liên kết tới sự kiện ĐÃ CÔNG BỐ;
--   - mọi nhân sự: đọc hết;
--   - biên tập viên và quản trị: thêm / sửa / xóa; kiểm duyệt viên chỉ đọc.
-- Không xóa dữ liệu nào.

begin;

create table public.sgk_lesson_events (
  id          uuid primary key default gen_random_uuid(),
  -- Slug bài và id mục theo lib/sgk/curriculum.ts, ví dụ "7-khang-chien-chong-phap" / "muc-3".
  lesson_slug text not null constraint sgk_lesson_events_lesson_check check (lesson_slug ~ '^([1-9]|1[0-7])-[a-z0-9-]+$'),
  section_id  text not null constraint sgk_lesson_events_section_check check (section_id ~ '^muc-[1-9]$'),
  event_id    uuid not null references public.historical_events(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sgk_lesson_events_unique unique (lesson_slug, section_id, event_id)
);

create index idx_sgk_lesson_events_lesson on public.sgk_lesson_events (lesson_slug, section_id, sort_order);
create index idx_sgk_lesson_events_event on public.sgk_lesson_events (event_id);

create trigger trg_sgk_lesson_events_updated_at
  before update on public.sgk_lesson_events
  for each row execute function public.set_updated_at();

alter table public.sgk_lesson_events enable row level security;

create policy "public_read_published" on public.sgk_lesson_events
  for select to anon, authenticated
  using (exists (select 1 from public.historical_events e where e.id = event_id and e.workflow_status = 'published'));

create policy "staff_read_all" on public.sgk_lesson_events
  for select to authenticated
  using (public.current_staff_role() is not null);

create policy "editor_admin_manage" on public.sgk_lesson_events
  for all to authenticated
  using (public.current_staff_role() in ('editor', 'system_admin'))
  with check (public.current_staff_role() in ('editor', 'system_admin'));

grant select on public.sgk_lesson_events to anon, authenticated;
grant insert, update, delete on public.sgk_lesson_events to authenticated;

commit;

-- Kiểm tra sau khi chạy:
--   select policyname from pg_policies where schemaname = 'public' and tablename = 'sgk_lesson_events' order by 1;
--     → editor_admin_manage, public_read_published, staff_read_all
--   select count(*) from public.sgk_lesson_events;   -- 0 cho tới khi chạy supabase/seed-sgk.sql
