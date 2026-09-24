-- Bổ sung toàn vẹn nghiệp vụ (Mục 4.2 KE_HOACH_DU_AN.md): G1, G3, G4.
-- Người dùng đã đồng ý áp dụng G1, G3, G4 (bỏ qua G2, G5).
--
-- ⚠ CHƯA CHẠY TRÊN DATABASE THẬT. Chạy file này trong Supabase SQL Editor
-- hoặc pgAdmin 4, sau đó sinh lại lib/database.types.ts.

-- ============================================================
-- G1: Lưu lý do trả sửa (UC11) trên 4 bảng có workflow_status
-- ============================================================
alter table public.curriculum_topics    add column review_note text;
alter table public.historical_events    add column review_note text;
alter table public.historical_figures   add column review_note text;
alter table public.historical_locations add column review_note text;

-- ============================================================
-- G3: Không cho khóa/hạ quyền/xóa quản trị viên hoạt động cuối cùng (UC13)
-- ============================================================
create or replace function public.prevent_last_admin_lockout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_admins integer;
begin
  if TG_OP = 'DELETE' then
    if OLD.role = 'system_admin' and OLD.account_status = 'active' then
      select count(*) into remaining_admins
      from public.staff_profiles
      where role = 'system_admin' and account_status = 'active' and id <> OLD.id;

      if remaining_admins = 0 then
        raise exception 'Không thể xóa: đây là quản trị viên đang hoạt động cuối cùng';
      end if;
    end if;
    return OLD;
  end if;

  if TG_OP = 'UPDATE' then
    if OLD.role = 'system_admin' and OLD.account_status = 'active'
       and (NEW.role <> 'system_admin' or NEW.account_status <> 'active') then
      select count(*) into remaining_admins
      from public.staff_profiles
      where role = 'system_admin' and account_status = 'active' and id <> OLD.id;

      if remaining_admins = 0 then
        raise exception 'Không thể thực hiện: đây là quản trị viên đang hoạt động cuối cùng';
      end if;
    end if;
    return NEW;
  end if;

  return null;
end;
$$;

create trigger trg_prevent_last_admin_lockout
  before update or delete on public.staff_profiles
  for each row execute function public.prevent_last_admin_lockout();

-- ============================================================
-- G4: Sự kiện phải có ≥ 1 nguồn khi chuyển sang pending_review/published
-- ============================================================
-- Lưu ý: chỉ có tác dụng thực tế khi UPDATE (draft -> pending_review sau khi
-- đã gắn nguồn). Nếu insert thẳng với workflow_status pending_review/published
-- thì luôn thiếu nguồn (vì event_sources cần event_id đã tồn tại), nên trigger
-- sẽ từ chối — đúng ý muốn: mọi nội dung phải tạo draft, gắn nguồn, rồi mới
-- chuyển trạng thái.
create or replace function public.check_event_has_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_count integer;
begin
  if NEW.workflow_status in ('pending_review', 'published') then
    select count(*) into source_count
    from public.event_sources
    where event_id = NEW.id;

    if source_count = 0 then
      raise exception 'Sự kiện phải có ít nhất 1 nguồn tham khảo trước khi gửi duyệt hoặc công bố';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_check_event_has_source
  before insert or update on public.historical_events
  for each row execute function public.check_event_has_source();
