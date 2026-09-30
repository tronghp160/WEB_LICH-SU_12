-- Giai đoạn 1 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md, mục 1.2 và 1.4): dữ liệu "kho ảnh".
-- KHÔNG phải migration: là dữ liệu, chạy SAU seed.sql (cần migration 20260929000001_media_library.sql và các sự kiện,
-- nhân vật, địa điểm đã có). Chạy lại được: INSERT có "where not exists", ảnh thiếu chủ thì bỏ qua.
--
-- 1. Hai ảnh cũ đang lấy thẳng từ Wikimedia (hotlink, H6) chuyển sang bản tự lưu trong bucket `media` (webp 400/1200/2000 px).
-- 2. Thêm 29 ảnh: 8 sự kiện chưa có ảnh (mỗi sự kiện 1–3 ảnh, có ảnh bìa), chân dung 6 nhân vật, ảnh ngày nay của 9 địa điểm.
--    Mỗi ảnh ghi tác giả, giấy phép (lấy từ API Commons), trang gốc; đã xem từng ảnh để viết chữ thay thế đúng nội dung.
--    Chỉ dùng: ảnh công bố trước 1951 (hết 75 năm bảo hộ theo Luật SHTT), ảnh của Chính phủ Mỹ, CC0, CC BY, CC BY-SA,
--    GODL-India, và ảnh Lưu trữ Quốc gia Romania (chỉ yêu cầu ghi công).
--    Chưa có chân dung: Lê Đức Thọ, Văn Tiến Dũng (không tìm được ảnh có giấy phép rõ ràng).
-- 3. Ghép 2 cặp "xưa – nay" (pair_id): Nhà hát Lớn 1945 ↔ 2009; Hội nghị Genève 1954 ↔ Cung Liên hợp quốc ngày nay.
--
-- Chỉ UPDATE/INSERT, không xóa. Mỗi INSERT có "where not exists" theo file_url nên không tạo trùng.
-- ✔ Đã chạy trên database thật ngày 2026-09-29 (người dùng duyệt).
-- Tệp ảnh đã được tải lên Storage bằng scripts/import-commons-image.mjs.

begin;

-- ---------- 1. Bỏ hotlink ----------
update public.media_assets
set file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/chien-dich-dien-bien-phu/cam-co-ham-de-castries-1954-1200.webp', width = 1600, height = 972
where file_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Victory_in_Battle_of_Dien_Bien_Phu.jpg';

update public.media_assets
set file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tuyen-ngon-doc-lap/tuyen-ngon-doc-lap-1945-1200.webp', width = 628, height = 855
where file_url like 'https://commons.wikimedia.org/wiki/Special:FilePath/Pr%C3%A9sident_Ho-chi-Minh_lit_la_Proclamation%';

-- ---------- 2. Ảnh mới ----------
-- File:Cách mạng tháng 8 b.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/cach-mang-thang-8-b-1200.webp', 'image', 'Ảnh đen trắng: đông đảo quần chúng cầm cờ tụ tập trước Bắc Bộ phủ ở Hà Nội ngày 19/8/1945', 'Quần chúng khởi nghĩa trước Bắc Bộ phủ (phố Ngô Quyền, Hà Nội) ngày 19/8/1945. Ảnh của Vũ Năng An, đạt Giải thưởng Hồ Chí Minh về nhiếp ảnh năm 1996.', 'historical', 1945,
  'Vũ Năng An', 'Public domain', null, 'https://commons.wikimedia.org/wiki/File:C%C3%A1ch_m%E1%BA%A1ng_th%C3%A1ng_8_b.jpg',
  false, false, true, null, 448, 325,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/cach-mang-thang-8-b-1200.webp')
  and (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi') is not null;

-- File:Mít tinh chào mừng Cách mạng Tháng Tám năm 1945 thành công tại Nhà hát Lớn Hà Nội.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/mit-tinh-nha-hat-lon-1945-1200.webp', 'image', 'Ảnh đen trắng: biển người dự mít tinh trước Nhà hát Lớn Hà Nội, cờ và băng rôn phía trên', 'Mít tinh mừng Cách mạng tháng Tám thành công trước Nhà hát Lớn Hà Nội, cuối tháng 8/1945.', 'historical', 1945,
  'Không rõ tác giả', 'Public domain', null, 'https://commons.wikimedia.org/wiki/File:M%C3%ADt_tinh_ch%C3%A0o_m%E1%BB%ABng_C%C3%A1ch_m%E1%BA%A1ng_Th%C3%A1ng_T%C3%A1m_n%C4%83m_1945_th%C3%A0nh_c%C3%B4ng_t%E1%BA%A1i_Nh%C3%A0_h%C3%A1t_L%E1%BB%9Bn_H%C3%A0_N%E1%BB%99i.jpg',
  false, false, false, null, 1000, 541,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/mit-tinh-nha-hat-lon-1945-1200.webp')
  and (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi') is not null;

-- File:Hanoi Opera House 1.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/nha-hat-lon-2009-1200.webp', 'image', 'Nhà hát Lớn Hà Nội ngày nay, mặt tiền kiến trúc Pháp màu vàng nhạt', 'Nhà hát Lớn Hà Nội ngày nay (2009) — nơi diễn ra cuộc mít tinh mở đầu Tổng khởi nghĩa ngày 19/8/1945.', 'today', 2009,
  'Dennis G. Jarvis', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Hanoi_Opera_House_1.jpg',
  false, false, false, null, 2000, 1348,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/nha-hat-lon-2009-1200.webp')
  and (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi') is not null;

-- File:1954 Geneva Conference.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-geneve-ve-dong-duong/1954-geneva-conference-1200.webp', 'image', 'Ảnh đen trắng: các phái đoàn ngồi quanh bàn họp lớn tại Hội nghị Genève năm 1954', 'Một phiên họp của Hội nghị Genève về Đông Dương, năm 1954.', 'historical', 1954,
  'Quân đội Hoa Kỳ', 'Public domain', null, 'https://commons.wikimedia.org/wiki/File:1954_Geneva_Conference.jpg',
  false, false, true, null, 742, 570,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-geneve-ve-dong-duong/1954-geneva-conference-1200.webp')
  and (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong') is not null;

-- File:Palais des nations.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-geneve-ve-dong-duong/palais-des-nations-1200.webp', 'image', 'Cung Liên hợp quốc (Palais des Nations) ở Genève, Thụy Sĩ, với hàng cờ các nước phía trước', 'Cung Liên hợp quốc ở Genève ngày nay — nơi họp Hội nghị Genève về Đông Dương năm 1954.', 'today', 2005,
  'Yann Forget', 'CC BY-SA 3.0', 'http://creativecommons.org/licenses/by-sa/3.0/', 'https://commons.wikimedia.org/wiki/File:Palais_des_nations.jpg',
  false, false, false, null, 1550, 1160,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-geneve-ve-dong-duong/palais-des-nations-1200.webp')
  and (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong') is not null;

-- File:Black smoke covers areas of the capital city and fire trucks rush to the scenes of fires set during attacks by the Viet - NARA - 541874.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-tien-cong-va-noi-day-tet-mau-than-1968/sai-gon-tet-mau-than-1968-1200.webp', 'image', 'Ảnh đen trắng: khói đen bốc lên trên nhiều khu nhà ở Sài Gòn, xe cứu hỏa chạy trên đường', 'Khói bốc lên ở nhiều khu vực Sài Gòn trong những ngày đầu cuộc Tổng tiến công và nổi dậy Tết Mậu Thân, 1968. Ảnh của Quân đội Mỹ (Lưu trữ Quốc gia Hoa Kỳ).', 'historical', 1968,
  'Quân đội Hoa Kỳ (Lưu trữ Quốc gia Hoa Kỳ)', 'Public domain', null, 'https://commons.wikimedia.org/wiki/File:Black_smoke_covers_areas_of_the_capital_city_and_fire_trucks_rush_to_the_scenes_of_fires_set_during_attacks_by_the_Viet_-_NARA_-_541874.jpg',
  false, false, true, null, 2000, 2714,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-tien-cong-va-noi-day-tet-mau-than-1968/sai-gon-tet-mau-than-1968-1200.webp')
  and (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968') is not null;

-- File:Vietnam, Hue, Imperial City of Hue, The Meridian Gate.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-tien-cong-va-noi-day-tet-mau-than-1968/vietnam-hue-imperial-city-of-hue-the-meridian-gate-1200.webp', 'image', 'Công trình gỗ mái ngói cổ trên nền thành đá bên mặt nước, một góc Ngọ Môn – Hoàng thành Huế', 'Một góc Ngọ Môn – Hoàng thành Huế ngày nay (2008). Huế là một trong những mặt trận ác liệt nhất của Tết Mậu Thân 1968.', 'today', 2008,
  'Vyacheslav Argenberg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0', 'https://commons.wikimedia.org/wiki/File:Vietnam,_Hue,_Imperial_City_of_Hue,_The_Meridian_Gate.jpg',
  false, false, false, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-tien-cong-va-noi-day-tet-mau-than-1968/vietnam-hue-imperial-city-of-hue-the-meridian-gate-1200.webp')
  and (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968') is not null;

-- File:Vietnam peace agreement signing, 27580141, new.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-paris-ve-viet-nam/ky-hiep-dinh-paris-1973-1200.webp', 'image', 'Ảnh màu: các đại biểu mặc com-lê ngồi bên bàn phủ khăn xanh, ký văn kiện Hiệp định Paris', 'Lễ ký Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam, ngày 27/1/1973, tại khách sạn Majestic (Paris). Ảnh của nhiếp ảnh gia Nhà Trắng Robert L. Knudsen.', 'historical', 1973,
  'Robert LeRoy Knudsen', 'Public domain', null, 'https://commons.wikimedia.org/wiki/File:Vietnam_peace_agreement_signing,_27580141,_new.jpg',
  false, false, true, null, 2000, 1354,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-paris-ve-viet-nam/ky-hiep-dinh-paris-1973-1200.webp')
  and (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam') is not null;

-- File:Vietnamese T-54A or Type 59 tank at the Reunification Palace in Ho Chi Minh City, Vietnam.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/chien-dich-ho-chi-minh/xe-tang-dinh-doc-lap-1200.webp', 'image', 'Xe tăng sơn xanh mang số hiệu 843 trưng bày dưới tán cây, bên cạnh là bảng giới thiệu', 'Xe tăng 843, một trong những xe tăng đầu tiên tiến vào Dinh Độc Lập trưa 30/4/1975, nay trưng bày trong khuôn viên dinh (ảnh năm 2007).', 'today', 2007,
  'Jame Healy', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Vietnamese_T-54A_or_Type_59_tank_at_the_Reunification_Palace_in_Ho_Chi_Minh_City,_Vietnam.jpg',
  false, false, true, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/chien-dich-ho-chi-minh/xe-tang-dinh-doc-lap-1200.webp')
  and (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh') is not null;

-- File:20190923 Independence Palace-10.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/chien-dich-ho-chi-minh/20190923-independence-palace-10-1200.webp', 'image', 'Mặt tiền Dinh Độc Lập với bãi cỏ rộng phía trước', 'Dinh Độc Lập (nay là Dinh Thống Nhất), TP. Hồ Chí Minh, năm 2019.', 'today', 2019,
  'Balon Greyjoy', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:20190923_Independence_Palace-10.jpg',
  false, false, false, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/chien-dich-ho-chi-minh/20190923-independence-palace-10-1200.webp')
  and (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh') is not null;

-- File:Khu trung tâm thành phố Hồ Chí Minh, nhìn từ phía quận 2.JPG
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/dai-hoi-dang-lan-thu-vi/tphcm-2015-1200.webp', 'image', 'Các tòa nhà cao tầng khu trung tâm TP. Hồ Chí Minh rực đèn về đêm, phản chiếu trên mặt sông Sài Gòn', 'Khu trung tâm TP. Hồ Chí Minh về đêm, năm 2015 — diện mạo đô thị sau gần 30 năm Đổi mới.', 'today', 2015,
  'Tokeisan at Vietnamese Wikipedia', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:Khu_trung_t%C3%A2m_th%C3%A0nh_ph%E1%BB%91_H%E1%BB%93_Ch%C3%AD_Minh,_nh%C3%ACn_t%E1%BB%AB_ph%C3%ADa_qu%E1%BA%ADn_2.JPG',
  false, false, true, null, 2000, 1477,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/dai-hoi-dang-lan-thu-vi/tphcm-2015-1200.webp')
  and (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi') is not null;

-- File:M 128 10 descente de l'Himalaya et du Latouche Tréville.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc/tau-latouche-treville-1916-1200.webp', 'image', 'Ảnh đen trắng cũ: nhiều người đứng trên bến cảng bên cạnh thân một con tàu lớn', 'Tàu Himalaya và Amiral Latouche-Tréville cập cảng (báo Le Miroir, 1916). Năm 1911, Nguyễn Tất Thành làm phụ bếp trên tàu Amiral Latouche-Tréville để ra đi tìm đường cứu nước.', 'historical', 1916,
  'Không rõ tác giả (báo Le Miroir)', 'Public domain', null, 'https://commons.wikimedia.org/wiki/File:M_128_10_descente_de_l%27Himalaya_et_du_Latouche_Tr%C3%A9ville.jpg',
  false, false, true, null, 1224, 969,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc/tau-latouche-treville-1916-1200.webp')
  and (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc') is not null;

-- File:Ho Chi Minh Museum, Saigon.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc/ben-nha-rong-2013-1200.webp', 'image', 'Tòa nhà Bến Nhà Rồng hai tầng sơn màu hồng cam, mái có hình rồng, phía trước là bãi cỏ và hàng cây', 'Bến Nhà Rồng ngày nay (2013), nay là Bảo tàng Hồ Chí Minh – Chi nhánh TP. Hồ Chí Minh.', 'today', 2013,
  'Gary Todd', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_Museum,_Saigon.jpg',
  false, false, false, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc/ben-nha-rong-2013-1200.webp')
  and (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc') is not null;

-- File:Pác Bó.jpg
insert into public.media_assets
  (event_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang/suoi-le-nin-pac-bo-1200.webp', 'image', 'Dòng suối trong xanh chảy giữa núi đá ở khu di tích Pác Bó', 'Suối Lê-nin ở khu di tích Pác Bó (Cao Bằng) ngày nay (2016). Nơi đây Nguyễn Ái Quốc sống và làm việc sau khi về nước năm 1941.', 'today', 2016,
  'Tycho (shansov.net)', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:P%C3%A1c_B%C3%B3.jpg',
  false, false, true, null, 2000, 1125,
  coalesce((select max(sort_order) from public.media_assets where event_id = (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang/suoi-le-nin-pac-bo-1200.webp')
  and (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang') is not null;

-- File:Vo Nguyen Giap 2008.jpg
insert into public.media_assets
  (figure_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_figures where slug = 'vo-nguyen-giap'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/vo-nguyen-giap/vo-nguyen-giap-2008-1200.webp', 'image', 'Đại tướng Võ Nguyên Giáp lúc tuổi cao, mặc quân phục trắng gắn huân chương, đang nói chuyện', 'Đại tướng Võ Nguyên Giáp năm 2008.', 'historical', 2008,
  'Ricardo Stuckert (PR/ABr/Brazil)', 'CC BY 3.0 br', 'https://creativecommons.org/licenses/by/3.0/br/deed.en', 'https://commons.wikimedia.org/wiki/File:Vo_Nguyen_Giap_2008.jpg',
  false, false, true, null, 2000, 2222,
  coalesce((select max(sort_order) from public.media_assets where figure_id = (select id from public.historical_figures where slug = 'vo-nguyen-giap')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/vo-nguyen-giap/vo-nguyen-giap-2008-1200.webp')
  and (select id from public.historical_figures where slug = 'vo-nguyen-giap') is not null;

-- File:Phạm Văn Đồng 1972.jpg
insert into public.media_assets
  (figure_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_figures where slug = 'pham-van-dong'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/pham-van-dong/pham-van-dong-1972-1200.webp', 'image', 'Chân dung ông Phạm Văn Đồng, ảnh đen trắng', 'Thủ tướng Phạm Văn Đồng năm 1972.', 'historical', 1972,
  'Lưu trữ Quốc gia Hà Lan (Anefo)', 'CC BY-SA 3.0 nl', 'https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en', 'https://commons.wikimedia.org/wiki/File:Ph%E1%BA%A1m_V%C4%83n_%C4%90%E1%BB%93ng_1972.jpg',
  false, false, true, null, 1258, 1748,
  coalesce((select max(sort_order) from public.media_assets where figure_id = (select id from public.historical_figures where slug = 'pham-van-dong')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/pham-van-dong/pham-van-dong-1972-1200.webp')
  and (select id from public.historical_figures where slug = 'pham-van-dong') is not null;

-- File:Nguyen Thi Binh.jpg
insert into public.media_assets
  (figure_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_figures where slug = 'nguyen-thi-binh'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/nguyen-thi-binh/nguyen-thi-binh-1200.webp', 'image', 'Chân dung bà Nguyễn Thị Bình tuổi cao, tóc bạc, quàng khăn, đứng trước một băng rôn', 'Bà Nguyễn Thị Bình năm 2008 (ảnh của Văn phòng Tổng thống Ấn Độ).', 'historical', 2008,
  'President''s Secretariat', 'GODL-India', 'https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf', 'https://commons.wikimedia.org/wiki/File:Nguyen_Thi_Binh.jpg',
  false, false, true, null, 206, 274,
  coalesce((select max(sort_order) from public.media_assets where figure_id = (select id from public.historical_figures where slug = 'nguyen-thi-binh')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/nguyen-thi-binh/nguyen-thi-binh-1200.webp')
  and (select id from public.historical_figures where slug = 'nguyen-thi-binh') is not null;

-- File:Tám Lê Thanh và Nguyễn Văn Linh (cropped) (2).jpg
insert into public.media_assets
  (figure_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_figures where slug = 'nguyen-van-linh'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/nguyen-van-linh/nguyen-van-linh-1984-1200.webp', 'image', 'Chân dung ông Nguyễn Văn Linh', 'Ông Nguyễn Văn Linh năm 1984.', 'historical', 1984,
  'CalCoWSpiBudSu', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0', 'https://commons.wikimedia.org/wiki/File:T%C3%A1m_L%C3%AA_Thanh_v%C3%A0_Nguy%E1%BB%85n_V%C4%83n_Linh_(cropped)_(2).jpg',
  false, false, true, null, 1153, 1509,
  coalesce((select max(sort_order) from public.media_assets where figure_id = (select id from public.historical_figures where slug = 'nguyen-van-linh')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/nguyen-van-linh/nguyen-van-linh-1984-1200.webp')
  and (select id from public.historical_figures where slug = 'nguyen-van-linh') is not null;

-- File:Le Duan.png
insert into public.media_assets
  (figure_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_figures where slug = 'le-duan'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/le-duan/le-duan-1978-1200.webp', 'image', 'Chân dung ông Lê Duẩn', 'Tổng Bí thư Lê Duẩn năm 1978 (Lưu trữ Quốc gia Romania).', 'historical', 1978,
  'Lưu trữ Quốc gia Romania', 'Attribution', null, 'https://commons.wikimedia.org/wiki/File:Le_Duan.png',
  false, false, true, null, 298, 331,
  coalesce((select max(sort_order) from public.media_assets where figure_id = (select id from public.historical_figures where slug = 'le-duan')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/le-duan/le-duan-1978-1200.webp')
  and (select id from public.historical_figures where slug = 'le-duan') is not null;

-- File:Truong Chinh, Le Duan, Nicolae og Elena Ceausescu (cropped)(b).jpg
insert into public.media_assets
  (figure_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_figures where slug = 'truong-chinh'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/truong-chinh/truong-chinh-1978-1200.webp', 'image', 'Chân dung ông Trường Chinh', 'Ông Trường Chinh năm 1978 (Lưu trữ Quốc gia Romania).', 'historical', 1978,
  'Lưu trữ Quốc gia Romania', 'Attribution', null, 'https://commons.wikimedia.org/wiki/File:Truong_Chinh,_Le_Duan,_Nicolae_og_Elena_Ceausescu_(cropped)(b).jpg',
  false, false, true, null, 262, 347,
  coalesce((select max(sort_order) from public.media_assets where figure_id = (select id from public.historical_figures where slug = 'truong-chinh')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/figures/truong-chinh/truong-chinh-1978-1200.webp')
  and (select id from public.historical_figures where slug = 'truong-chinh') is not null;

-- File:Hanoi Opera House 1.jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'nha-hat-lon-ha-noi'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/nha-hat-lon-ha-noi/nha-hat-lon-2009-1200.webp', 'image', 'Nhà hát Lớn Hà Nội ngày nay, mặt tiền kiến trúc Pháp màu vàng nhạt', 'Nhà hát Lớn Hà Nội năm 2009.', 'today', 2009,
  'Dennis G. Jarvis', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0', 'https://commons.wikimedia.org/wiki/File:Hanoi_Opera_House_1.jpg',
  false, false, true, null, 2000, 1348,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'nha-hat-lon-ha-noi')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/nha-hat-lon-ha-noi/nha-hat-lon-2009-1200.webp')
  and (select id from public.historical_locations where slug = 'nha-hat-lon-ha-noi') is not null;

-- File:Hanoi, Vietnam, Ba Dinh Square and Ho Chi Minh Mausoleum.jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'quang-truong-ba-dinh'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/quang-truong-ba-dinh/quang-truong-ba-dinh-2008-1200.webp', 'image', 'Quảng trường Ba Đình rộng với các ô cỏ, phía xa là Lăng Chủ tịch Hồ Chí Minh', 'Quảng trường Ba Đình và Lăng Chủ tịch Hồ Chí Minh năm 2008.', 'today', 2008,
  'Vyacheslav Argenberg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0', 'https://commons.wikimedia.org/wiki/File:Hanoi,_Vietnam,_Ba_Dinh_Square_and_Ho_Chi_Minh_Mausoleum.jpg',
  false, false, true, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'quang-truong-ba-dinh')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/quang-truong-ba-dinh/quang-truong-ba-dinh-2008-1200.webp')
  and (select id from public.historical_locations where slug = 'quang-truong-ba-dinh') is not null;

-- File:The Museum of Dien Bien Phu Victory (front, 2022).jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'dien-bien-phu'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/dien-bien-phu/bao-tang-dien-bien-phu-2022-1200.webp', 'image', 'Bảo tàng Chiến thắng lịch sử Điện Biên Phủ, mái hình nón lưới', 'Bảo tàng Chiến thắng lịch sử Điện Biên Phủ năm 2022.', 'today', 2022,
  'Ioe2015', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0', 'https://commons.wikimedia.org/wiki/File:The_Museum_of_Dien_Bien_Phu_Victory_(front,_2022).jpg',
  false, false, true, null, 2000, 1466,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'dien-bien-phu')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/dien-bien-phu/bao-tang-dien-bien-phu-2022-1200.webp')
  and (select id from public.historical_locations where slug = 'dien-bien-phu') is not null;

-- File:Palais des nations.jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'geneve-thuy-si'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/geneve-thuy-si/palais-des-nations-1200.webp', 'image', 'Cung Liên hợp quốc (Palais des Nations) ở Genève, Thụy Sĩ, với hàng cờ các nước phía trước', 'Cung Liên hợp quốc ở Genève.', 'today', 2005,
  'Yann Forget', 'CC BY-SA 3.0', 'http://creativecommons.org/licenses/by-sa/3.0/', 'https://commons.wikimedia.org/wiki/File:Palais_des_nations.jpg',
  false, false, true, null, 1550, 1160,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'geneve-thuy-si')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/geneve-thuy-si/palais-des-nations-1200.webp')
  and (select id from public.historical_locations where slug = 'geneve-thuy-si') is not null;

-- File:Khu trung tâm thành phố Hồ Chí Minh, nhìn từ phía quận 2.JPG
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'sai-gon'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/sai-gon/tphcm-2015-1200.webp', 'image', 'Các tòa nhà cao tầng khu trung tâm TP. Hồ Chí Minh rực đèn về đêm, phản chiếu trên mặt sông Sài Gòn', 'Khu trung tâm TP. Hồ Chí Minh về đêm nhìn từ bên kia sông Sài Gòn, năm 2015.', 'today', 2015,
  'Tokeisan at Vietnamese Wikipedia', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:Khu_trung_t%C3%A2m_th%C3%A0nh_ph%E1%BB%91_H%E1%BB%93_Ch%C3%AD_Minh,_nh%C3%ACn_t%E1%BB%AB_ph%C3%ADa_qu%E1%BA%ADn_2.JPG',
  false, false, true, null, 2000, 1477,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'sai-gon')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/sai-gon/tphcm-2015-1200.webp')
  and (select id from public.historical_locations where slug = 'sai-gon') is not null;

-- File:Vietnam, Hue, Imperial City of Hue, The Meridian Gate.jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'hue'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/hue/vietnam-hue-imperial-city-of-hue-the-meridian-gate-1200.webp', 'image', 'Công trình gỗ mái ngói cổ trên nền thành đá bên mặt nước, một góc Ngọ Môn – Hoàng thành Huế', 'Một góc Ngọ Môn – Hoàng thành Huế, năm 2008.', 'today', 2008,
  'Vyacheslav Argenberg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0', 'https://commons.wikimedia.org/wiki/File:Vietnam,_Hue,_Imperial_City_of_Hue,_The_Meridian_Gate.jpg',
  false, false, true, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'hue')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/hue/vietnam-hue-imperial-city-of-hue-the-meridian-gate-1200.webp')
  and (select id from public.historical_locations where slug = 'hue') is not null;

-- File:20190923 Independence Palace-10.jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'dinh-doc-lap'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/dinh-doc-lap/20190923-independence-palace-10-1200.webp', 'image', 'Mặt tiền Dinh Độc Lập với bãi cỏ rộng phía trước', 'Dinh Độc Lập (Dinh Thống Nhất) năm 2019.', 'today', 2019,
  'Balon Greyjoy', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:20190923_Independence_Palace-10.jpg',
  false, false, true, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'dinh-doc-lap')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/dinh-doc-lap/20190923-independence-palace-10-1200.webp')
  and (select id from public.historical_locations where slug = 'dinh-doc-lap') is not null;

-- File:Ho Chi Minh Museum, Saigon.jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'ben-nha-rong'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/ben-nha-rong/ben-nha-rong-2013-1200.webp', 'image', 'Tòa nhà Bến Nhà Rồng hai tầng sơn màu hồng cam, mái có hình rồng, phía trước là bãi cỏ và hàng cây', 'Bến Nhà Rồng (Bảo tàng Hồ Chí Minh – Chi nhánh TP. Hồ Chí Minh) năm 2013.', 'today', 2013,
  'Gary Todd', 'CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', 'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_Museum,_Saigon.jpg',
  false, false, true, null, 2000, 1333,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'ben-nha-rong')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/ben-nha-rong/ben-nha-rong-2013-1200.webp')
  and (select id from public.historical_locations where slug = 'ben-nha-rong') is not null;

-- File:Pác Bó.jpg
insert into public.media_assets
  (location_id, file_url, media_type, alt_text, caption, era, year_taken, photographer, license, license_url, source_page_url,
   is_reenactment, is_colorized, is_cover, focal_point, width, height, sort_order)
select (select id from public.historical_locations where slug = 'pac-bo-cao-bang'), 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/pac-bo-cao-bang/suoi-le-nin-pac-bo-1200.webp', 'image', 'Dòng suối trong xanh chảy giữa núi đá ở khu di tích Pác Bó', 'Suối Lê-nin, khu di tích Pác Bó, năm 2016.', 'today', 2016,
  'Tycho (shansov.net)', 'CC BY-SA 3.0', 'https://creativecommons.org/licenses/by-sa/3.0', 'https://commons.wikimedia.org/wiki/File:P%C3%A1c_B%C3%B3.jpg',
  false, false, true, null, 2000, 1125,
  coalesce((select max(sort_order) from public.media_assets where location_id = (select id from public.historical_locations where slug = 'pac-bo-cao-bang')), 0) + 1
where not exists (select 1 from public.media_assets where file_url = 'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/locations/pac-bo-cao-bang/suoi-le-nin-pac-bo-1200.webp')
  and (select id from public.historical_locations where slug = 'pac-bo-cao-bang') is not null;

-- ---------- 3. Cặp "xưa – nay" ----------
with pair as (select gen_random_uuid() as id)
update public.media_assets set pair_id = (select id from pair)
where file_url in ('https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/mit-tinh-nha-hat-lon-1945-1200.webp',
                   'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi/nha-hat-lon-2009-1200.webp')
  and pair_id is null;

with pair as (select gen_random_uuid() as id)
update public.media_assets set pair_id = (select id from pair)
where file_url in ('https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-geneve-ve-dong-duong/1954-geneva-conference-1200.webp',
                   'https://ueolfjujjybutyuyfxha.supabase.co/storage/v1/object/public/media/events/hiep-dinh-geneve-ve-dong-duong/palais-des-nations-1200.webp')
  and pair_id is null;

commit;

-- Kiểm tra sau khi chạy:
--   select count(*) filter (where event_id is not null) su_kien, count(*) filter (where figure_id is not null) nhan_vat,
--          count(*) filter (where location_id is not null) dia_diem, count(*) filter (where file_url like '%commons.wikimedia%') con_hotlink,
--          count(*) filter (where license is null) thieu_giay_phep, count(distinct pair_id) cap_xua_nay
--   from public.media_assets;
--   → 16, 6, 9, 0, 0, 2
