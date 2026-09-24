-- Sửa lỗi của migration 20260925000004 (G5): trigger `reviewer_may_only_change_status` chặn NHẦM việc kiểm duyệt viên
-- công bố/ẩn ĐỊA ĐIỂM CÓ TỌA ĐỘ.
--
-- ⚠ CHƯA CHẠY TRÊN DATABASE THẬT — chờ người dùng duyệt. Mỗi migration chỉ chạy MỘT lần.
--
-- Nguyên nhân (đã tái hiện trên database thật): bảng `historical_locations` có cột `geom` là cột SINH TỰ ĐỘNG
-- (generated always ... stored) từ latitude/longitude. Postgres tính cột sinh SAU khi các trigger BEFORE ROW chạy, nên trong
-- trigger giá trị NEW.geom chưa được cập nhật và luôn khác OLD.geom khi dòng có tọa độ. Phép so sánh to_jsonb(NEW) với
-- to_jsonb(OLD) vì thế báo "đã sửa nội dung" ngay cả khi reviewer chỉ đổi workflow_status.
--   Hiện trạng: reviewer công bố địa điểm CÓ tọa độ → lỗi P0001 "chỉ được thay đổi trạng thái…"; địa điểm không có tọa độ thì bình thường.
--
-- Cách sửa: thêm `geom` vào danh sách cột được bỏ qua khi so sánh. An toàn vì `geom` chỉ là dữ liệu dẫn xuất từ latitude/longitude,
-- mà hai cột nguồn này VẪN được so sánh nên reviewer vẫn không thể đổi vị trí địa điểm.
--
-- Chỉ thay thân hàm (create or replace) — 4 trigger đã tạo ở migration 000004 tự dùng bản mới, không cần tạo lại.

create or replace function public.reviewer_may_only_change_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed_columns constant text[] := array['workflow_status', 'review_note', 'updated_at', 'geom'];
begin
  if public.current_staff_role() = 'reviewer' then
    if (to_jsonb(new) - allowed_columns) is distinct from (to_jsonb(old) - allowed_columns) then
      raise exception 'Kiểm duyệt viên chỉ được thay đổi trạng thái và ghi chú kiểm duyệt, không được sửa nội dung';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- KIỂM TRA (chạy cùng file này): hàm phải có `geom` trong danh sách cột được bỏ qua, và vẫn còn đủ 4 trigger.
-- Kỳ vọng: co_geom = true, so_trigger = 4.
-- ============================================================
select
  (select position('geom' in prosrc) > 0 from pg_proc where proname = 'reviewer_may_only_change_status' and pronamespace = 'public'::regnamespace) as co_geom,
  (select count(*) from pg_trigger where tgname = 'trg_reviewer_status_only' and not tgisinternal) as so_trigger;
