-- ============================================================
-- Hồ sơ nhân sự cho 4 tài khoản THỬ NGHIỆM (Phase 9 — UC06)
-- ============================================================
-- KHÔNG phải migration: chỉ dùng cho môi trường thử/bảo vệ đồ án, KHÔNG dùng cho dữ liệu thật.
--
-- BƯỚC 1 — Tạo 4 tài khoản trong Supabase Dashboard → Authentication → Users → "Add user"
--          → "Create new user". Mỗi tài khoản: nhập email + mật khẩu (dùng CHUNG một mật khẩu
--          thử cho cả 4 để dễ nhớ) và BẬT "Auto Confirm User" (nếu không, đăng nhập sẽ báo
--          "chưa xác nhận email"):
--              editor@test.local      reviewer@test.local
--              admin@test.local       locked@test.local
--          (Tùy chọn, để thử ca "thiếu hồ sơ": tạo thêm noprofile@test.local và KHÔNG chèn hồ sơ.)
--
-- BƯỚC 2 — Chạy file này trong Supabase SQL Editor hoặc pgAdmin 4 (role postgres nên không bị RLS
--          chặn; bảng staff_profiles chưa có ai thì chưa có quản trị viên nào để "cấp quyền").
--          Chạy lại nhiều lần được (idempotent).
--
-- Mật khẩu KHÔNG nằm trong file này và không bao giờ commit lên Git.

insert into public.staff_profiles (id, full_name, role, account_status)
select id, 'Biên tập viên thử', 'editor', 'active'
from auth.users where email = 'editor@test.local'
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, account_status = excluded.account_status;

insert into public.staff_profiles (id, full_name, role, account_status)
select id, 'Kiểm duyệt viên thử', 'reviewer', 'active'
from auth.users where email = 'reviewer@test.local'
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, account_status = excluded.account_status;

insert into public.staff_profiles (id, full_name, role, account_status)
select id, 'Quản trị viên thử', 'system_admin', 'active'
from auth.users where email = 'admin@test.local'
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, account_status = excluded.account_status;

-- Tài khoản bị khóa: đăng nhập Auth được nhưng phải mất toàn bộ quyền nội bộ.
insert into public.staff_profiles (id, full_name, role, account_status)
select id, 'Biên tập viên bị khóa', 'editor', 'locked'
from auth.users where email = 'locked@test.local'
on conflict (id) do update
  set full_name = excluded.full_name, role = excluded.role, account_status = excluded.account_status;

-- Kiểm tra: phải ra 4 dòng (đúng vai trò/trạng thái).
select u.email, p.full_name, p.role, p.account_status
from public.staff_profiles p
join auth.users u on u.id = p.id
where u.email like '%@test.local'
order by u.email;
