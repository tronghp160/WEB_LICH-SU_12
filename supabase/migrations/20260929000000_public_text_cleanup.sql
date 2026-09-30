-- Giai đoạn 0 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md): dọn chữ hiển thị cho học sinh.
--   N1 — gỡ ghi chú nội bộ "TODO: kiểm chứng…" khỏi các cột hiện ở trang công khai
--        (ghi chú được chuyển sang docs/du-lieu-can-kiem-chung.md, không mất thông tin).
--   N5 — thêm tên đơn vị hành chính hiện hành (sau sắp xếp 1/7/2025: bỏ cấp huyện/quận, gộp xã/phường).
--   H8 — sửa câu ghi công ảnh cắm cờ 1954: "công bố hơn 75 năm" là sai (1954 → 2026 mới ~72 năm).
--   H9 — ghi rõ cảnh cắm cờ trên nóc hầm De Castries là cảnh quay dựng lại sau chiến dịch (đoàn làm phim Roman Karmen).
--
-- ✔ ĐÃ CHẠY TRÊN DATABASE THẬT (2026-09-29) sau khi được người dùng duyệt. Mỗi migration chỉ chạy MỘT lần — KHÔNG chạy lại.
--
-- CHỈ SỬA CHỮ (UPDATE theo slug/tiêu đề), không đổi schema, không xóa dòng nào.
-- Dùng replace() trên đúng đoạn chữ cũ: nếu dòng đã được sửa tay qua trang quản trị thì câu lệnh không làm gì.
-- Chạy với quyền postgres nên không vướng trigger "reviewer chỉ đổi trạng thái".

begin;

-- ---------- N1: nguồn SGK ----------
update public.sources
set citation = replace(citation,
  ' — TODO: kiểm chứng đúng năm xuất bản/tái bản của ấn bản đang dùng.', '.')
where title = 'Sách giáo khoa Lịch sử 12';

update public.event_sources
set source_note = 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where source_note = 'Xem bài học liên quan trong SGK Lịch sử 12 — TODO: bổ sung số trang cụ thể theo đúng ấn bản đang dùng.';

-- ---------- N1: ghi chú độ chính xác tọa độ ----------
update public.historical_locations
set accuracy_note = replace(accuracy_note, ' — TODO: kiểm chứng.', '.')
where slug in ('dien-bien-phu', 'geneve-thuy-si', 'paris-phap', 'ha-noi-khu-vuc-trung-tam', 'pac-bo-cao-bang');

update public.historical_locations
set accuracy_note = replace(accuracy_note, '; cần đối chiếu bản đồ/SGK để tăng độ chính xác.', ' (tọa độ gần đúng).')
where slug = 'pac-bo-cao-bang';

-- ---------- N5: tên hành chính hiện hành ----------
update public.historical_locations
set description = replace(description,
  '(nay là TP. Điện Biên Phủ, tỉnh Điện Biên)',
  '(trước đây là TP. Điện Biên Phủ; từ 7/2025 khu trung tâm nay thuộc các phường Điện Biên Phủ và Mường Thanh, tỉnh Điện Biên)')
where slug = 'dien-bien-phu';

update public.historical_locations
set accuracy_note = replace(accuracy_note,
  '(nay là Quận 1, TP. Hồ Chí Minh).',
  '(khu vực Quận 1 cũ, TP. Hồ Chí Minh; từ 7/2025 không còn cấp quận).')
where slug = 'sai-gon';

update public.historical_locations
set accuracy_note = replace(accuracy_note,
  '(nay là Dinh Thống Nhất), TP. Hồ Chí Minh.',
  '(nay là Dinh Thống Nhất), 135 Nam Kỳ Khởi Nghĩa, phường Bến Thành, TP. Hồ Chí Minh.')
where slug = 'dinh-doc-lap';

update public.historical_locations
set accuracy_note = replace(accuracy_note,
  '(nay là Bảo tàng Hồ Chí Minh - Chi nhánh TP. Hồ Chí Minh).',
  '(nay là Bảo tàng Hồ Chí Minh - Chi nhánh TP. Hồ Chí Minh), số 1 Nguyễn Tất Thành, phường Xóm Chiếu (trước đây thuộc Quận 4), TP. Hồ Chí Minh.')
where slug = 'ben-nha-rong';

update public.historical_locations
set description = replace(description,
  'xã Trường Hà, huyện Hà Quảng, tỉnh Cao Bằng',
  'xã Trường Hà, tỉnh Cao Bằng (trước đây thuộc huyện Hà Quảng)')
where slug = 'pac-bo-cao-bang';

update public.historical_events
set content = replace(content,
  'xã Trường Hà, huyện Hà Quảng, tỉnh Cao Bằng',
  'xã Trường Hà, tỉnh Cao Bằng (trước đây thuộc huyện Hà Quảng)')
where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang';

-- ---------- H8: ghi công ảnh cắm cờ 1954 ----------
update public.sources
set author_org = 'Quân đội nhân dân Việt Nam, hệ thống Bảo tàng Quân đội (qua Wikimedia Commons)',
    citation = 'Wikimedia Commons, "Victory in Battle of Dien Bien Phu.jpg", tác giả: Quân đội nhân dân Việt Nam, nguồn: hệ thống Bảo tàng Quân đội nhân dân Việt Nam. '
            || 'Commons gắn nhãn phạm vi công cộng tại Việt Nam (PD-Vietnam); lưu ý: ảnh công bố năm 1954, tính đến 2026 chưa đủ 75 năm bảo hộ theo Luật Sở hữu trí tuệ nên nhãn này cần được xem xét lại. '
            || 'Sử dụng cho mục đích giáo dục phi lợi nhuận, có ghi nguồn. Truy cập https://commons.wikimedia.org/wiki/File:Victory_in_Battle_of_Dien_Bien_Phu.jpg'
where title = 'Ảnh tư liệu: Bộ đội cắm cờ chiến thắng tại Điện Biên Phủ (1954)'
  and citation like '%ảnh công bố hơn 75 năm%';

-- ---------- H9: cảnh dựng lại ----------
update public.media_assets
set caption = 'Bộ đội ta cắm cờ "Quyết chiến, Quyết thắng" trên nóc hầm chỉ huy tập đoàn cứ điểm Điện Biên Phủ. '
           || 'Theo nhiều tư liệu (trong đó có báo Nhân Dân), cảnh này do đoàn làm phim của Roman Karmen (Liên Xô) quay dựng lại sau khi chiến dịch kết thúc.'
where file_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Victory_in_Battle_of_Dien_Bien_Phu.jpg'
  and caption = 'Bộ đội ta cắm cờ "Quyết chiến, Quyết thắng" trên nóc hầm chỉ huy tập đoàn cứ điểm Điện Biên Phủ, tháng 5/1954.';

commit;

-- Kiểm tra sau khi chạy (mong đợi: 0 dòng còn TODO):
-- select 'sources' as bang, count(*) from public.sources where citation ~* '\mTODO\M'
-- union all select 'event_sources', count(*) from public.event_sources where source_note ~* '\mTODO\M'
-- union all select 'locations', count(*) from public.historical_locations where accuracy_note ~* '\mTODO\M' or description ~* '\mTODO\M'
-- union all select 'events', count(*) from public.historical_events where summary ~* '\mTODO\M' or content ~* '\mTODO\M'
-- union all select 'media', count(*) from public.media_assets where caption ~* '\mTODO\M';
