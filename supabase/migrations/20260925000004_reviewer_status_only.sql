-- G5: Kiểm duyệt viên chỉ được đổi TRẠNG THÁI và GHI CHÚ KIỂM DUYỆT, không được sửa nội dung
-- (Mục 4.2 KE_HOACH_DU_AN.md — hạng mục G5 đã bỏ qua ở Phase 1, nay áp dụng vì đã kiểm chứng lỗ hổng).
--
-- ĐÃ CHẠY một lần trên database thật (4 trigger). LƯU Ý: bản này chặn nhầm việc reviewer công bố/ẩn ĐỊA ĐIỂM CÓ TỌA ĐỘ
-- vì bỏ sót cột sinh tự động `geom` — được sửa bằng migration 20260925000005_reviewer_status_only_fix_geom.sql.
--
-- Vấn đề đã kiểm chứng trên database thật (tests/rls/reviewer.mjs): policy `reviewer_update_status`
-- chỉ kiểm tra TRẠNG THÁI mới (WITH CHECK status in (needs_revision, published, hidden)) nên chuyển
-- `published → published` vẫn hợp lệ, kèm đổi nội dung. Kiểm duyệt viên gọi thẳng API là sửa được nội dung
-- (summary, content, tọa độ, tiểu sử...) của bản ĐÃ CÔNG BỐ mà không qua quy trình duyệt. Giao diện không làm
-- việc này, nhưng RLS (theo dòng, không theo cột) không chặn được.
--
-- Cách sửa: trigger BEFORE UPDATE trên 4 bảng có workflow_status. Nếu người gọi là `reviewer`, so sánh dòng cũ
-- và mới SAU KHI loại các cột được phép đổi (workflow_status, review_note, updated_at) — có khác biệt nào thì từ
-- chối. Hàm dùng chung cho cả 4 bảng nhờ so sánh to_jsonb(NEW) với to_jsonb(OLD), nên không cần liệt kê cột và tự
-- bao phủ cột thêm sau này.
--
-- Không ảnh hưởng:
--   - editor (chỉ đổi được bản draft/needs_revision theo RLS riêng), system_admin (toàn quyền), khách.
--   - Các thao tác duyệt hợp lệ của reviewer: chỉ ghi workflow_status (+ review_note) nên không bao giờ vi phạm.
--   - Người dùng hệ thống (không có JWT, ví dụ SQL Editor/pgAdmin/migration chạy bằng role postgres): current_staff_role()
--     trả về null nên trigger bỏ qua.
--
-- Chưa xử lý (ngoài phạm vi): reviewer vẫn có quyền ghi các bảng liên kết và `sources` theo chính sách
-- "reviewer_admin_manage" (giữ nguyên theo yêu cầu ở migration 20260925000002/3).

create or replace function public.reviewer_may_only_change_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed_columns constant text[] := array['workflow_status', 'review_note', 'updated_at'];
begin
  if public.current_staff_role() = 'reviewer' then
    if (to_jsonb(new) - allowed_columns) is distinct from (to_jsonb(old) - allowed_columns) then
      raise exception 'Kiểm duyệt viên chỉ được thay đổi trạng thái và ghi chú kiểm duyệt, không được sửa nội dung';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviewer_status_only on public.curriculum_topics;
create trigger trg_reviewer_status_only
  before update on public.curriculum_topics
  for each row execute function public.reviewer_may_only_change_status();

drop trigger if exists trg_reviewer_status_only on public.historical_events;
create trigger trg_reviewer_status_only
  before update on public.historical_events
  for each row execute function public.reviewer_may_only_change_status();

drop trigger if exists trg_reviewer_status_only on public.historical_figures;
create trigger trg_reviewer_status_only
  before update on public.historical_figures
  for each row execute function public.reviewer_may_only_change_status();

drop trigger if exists trg_reviewer_status_only on public.historical_locations;
create trigger trg_reviewer_status_only
  before update on public.historical_locations
  for each row execute function public.reviewer_may_only_change_status();

-- ============================================================
-- KIỂM TRA (chạy cùng file này): phải ra ĐÚNG 4 dòng — mỗi bảng một trigger BEFORE UPDATE.
-- ============================================================
select event_object_table as bang, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public' and trigger_name = 'trg_reviewer_status_only'
order by event_object_table;
