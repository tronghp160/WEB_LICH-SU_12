-- Dữ liệu mẫu — Phase 2 (KE_HOACH_DU_AN.md).
-- Nguồn chính: Sách giáo khoa Lịch sử 12, bộ "Kết nối tri thức với cuộc sống",
-- NXB Giáo dục Việt Nam. ⚠ NGƯỜI DÙNG PHẢI TỰ ĐỐI CHIẾU với đúng ấn bản/năm
-- xuất bản đang học trước khi công bố chính thức — xem thêm
-- docs/du-lieu-can-kiem-chung.md.
--
-- Đợt 1: 10 sự kiện tiêu biểu (đánh dấu ★ trong Phụ lục B.2) trong tổng số
-- 25–35 sự kiện dự kiến. Chạy file này bằng role `postgres` (pgAdmin 4 /
-- Supabase SQL Editor) để không bị RLS chặn. Dùng slug để liên kết, không
-- hardcode UUID.

begin;

-- ============================================================
-- 1. CHỦ ĐỀ (curriculum_topics) — toàn bộ 7 chủ đề theo Phụ lục B.1
-- ============================================================
insert into public.curriculum_topics (name, slug, description, sort_order, workflow_status) values
('Cách mạng tháng Tám năm 1945', 'cach-mang-thang-tam-1945',
 'Phong trào đấu tranh giành chính quyền của nhân dân Việt Nam dưới sự lãnh đạo của Đảng và Mặt trận Việt Minh, dẫn tới sự ra đời của nước Việt Nam Dân chủ Cộng hòa.',
 1, 'published'),
('Cuộc kháng chiến chống thực dân Pháp (1945–1954)', 'khang-chien-chong-phap',
 'Cuộc kháng chiến của nhân dân Việt Nam chống thực dân Pháp xâm lược, kết thúc bằng chiến thắng Điện Biên Phủ và Hiệp định Genève.',
 2, 'published'),
('Cuộc kháng chiến chống Mỹ, cứu nước (1954–1975)', 'khang-chien-chong-my',
 'Cuộc kháng chiến chống đế quốc Mỹ và chính quyền Sài Gòn, thống nhất đất nước năm 1975.',
 3, 'published'),
('Đấu tranh bảo vệ Tổ quốc từ sau 1975', 'bao-ve-to-quoc-sau-1975',
 'Các cuộc đấu tranh bảo vệ chủ quyền, toàn vẹn lãnh thổ sau khi đất nước thống nhất.',
 4, 'published'),
('Công cuộc Đổi mới từ năm 1986', 'cong-cuoc-doi-moi',
 'Công cuộc đổi mới toàn diện đất nước do Đảng Cộng sản Việt Nam khởi xướng từ Đại hội VI.',
 5, 'published'),
('Lịch sử đối ngoại của Việt Nam', 'doi-ngoai-viet-nam',
 'Các dấu mốc quan trọng trong hoạt động đối ngoại của Việt Nam.',
 6, 'published'),
('Hồ Chí Minh trong lịch sử Việt Nam', 'ho-chi-minh',
 'Cuộc đời, sự nghiệp cách mạng và tư tưởng Hồ Chí Minh gắn với các mốc lịch sử dân tộc.',
 7, 'published');

-- ============================================================
-- 2. NGUỒN (sources)
-- ============================================================
-- 2.1. Nguồn chính: SGK
insert into public.sources (title, author_org, publisher, published_year, source_type, citation) values
('Sách giáo khoa Lịch sử 12', 'Bộ Giáo dục và Đào tạo', 'Nhà xuất bản Giáo dục Việt Nam', 2024, 'book',
 'Sách giáo khoa Lịch sử 12, bộ Kết nối tri thức với cuộc sống, NXB Giáo dục Việt Nam, 2024.');

-- 2.2. Nguồn ảnh tư liệu (Wikimedia Commons, đã xác minh giấy phép)
insert into public.sources (title, author_org, publisher, url, source_type, citation, accessed_at) values
('Ảnh tư liệu: Bộ đội cắm cờ chiến thắng tại Điện Biên Phủ (1954)',
 'Quân đội nhân dân Việt Nam, hệ thống Bảo tàng Quân đội (qua Wikimedia Commons)', 'Wikimedia Commons',
 'https://commons.wikimedia.org/wiki/File:Victory_in_Battle_of_Dien_Bien_Phu.jpg',
 'web',
 'Wikimedia Commons, "Victory in Battle of Dien Bien Phu.jpg", tác giả: Quân đội nhân dân Việt Nam, nguồn: hệ thống Bảo tàng Quân đội nhân dân Việt Nam. Commons gắn nhãn phạm vi công cộng tại Việt Nam (PD-Vietnam); lưu ý: ảnh công bố năm 1954, tính đến 2026 chưa đủ 75 năm bảo hộ theo Luật Sở hữu trí tuệ nên nhãn này cần được xem xét lại. Sử dụng cho mục đích giáo dục phi lợi nhuận, có ghi nguồn. Truy cập https://commons.wikimedia.org/wiki/File:Victory_in_Battle_of_Dien_Bien_Phu.jpg',
 '2026-09-24'),
('Ảnh tư liệu: Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình (2/9/1945)',
 'Front pour l''indépendance du Việt-Nam (qua Wikimedia Commons, © VARCHIV)', 'Wikimedia Commons',
 'https://commons.wikimedia.org/wiki/File:Pr%C3%A9sident_Ho-chi-Minh_lit_la_Proclamation-d%27ind%C3%A9pendance_sur_la_place_Ba-dinh_le_2nd_Sep_1945.jpg',
 'web',
 'Wikimedia Commons, "Président Ho-chi-Minh lit la Proclamation d''indépendance sur la place Ba-dinh le 2 Sep 1945.jpg", nguồn © VARCHIV, giấy phép CC BY-SA 4.0, truy cập https://commons.wikimedia.org/wiki/File:Pr%C3%A9sident_Ho-chi-Minh_lit_la_Proclamation-d%27ind%C3%A9pendance_sur_la_place_Ba-dinh_le_2nd_Sep_1945.jpg',
 '2026-09-24'),
('Ảnh chân dung: Hồ Chí Minh, khoảng năm 1946',
 'Không rõ tác giả (qua Wikimedia Commons)', 'Wikimedia Commons',
 'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_1946.jpg',
 'web',
 'Wikimedia Commons, "Ho Chi Minh 1946.jpg", tác giả không rõ, public domain tại Việt Nam (ảnh công bố hơn 75 năm), truy cập https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_1946.jpg',
 '2026-09-24');

-- ============================================================
-- 3. NHÂN VẬT (historical_figures)
-- ============================================================
insert into public.historical_figures (name, slug, other_names, birth_year, death_year, biography, portrait_url, workflow_status) values
('Hồ Chí Minh', 'ho-chi-minh', 'Nguyễn Sinh Cung, Nguyễn Tất Thành, Nguyễn Ái Quốc', 1890, 1969,
 'Lãnh tụ của Đảng Cộng sản Việt Nam và nhân dân Việt Nam, Chủ tịch nước Việt Nam Dân chủ Cộng hòa, người đọc bản Tuyên ngôn Độc lập ngày 2/9/1945.',
 'https://commons.wikimedia.org/wiki/Special:FilePath/Ho_Chi_Minh_1946.jpg',
 'published'),
('Võ Nguyên Giáp', 'vo-nguyen-giap', null, 1911, 2013,
 'Đại tướng đầu tiên của Quân đội nhân dân Việt Nam, Tổng Tư lệnh, người trực tiếp chỉ huy Chiến dịch Điện Biên Phủ năm 1954.',
 null, 'published'),
('Phạm Văn Đồng', 'pham-van-dong', null, 1906, 2000,
 'Nhà cách mạng, Thủ tướng Chính phủ Việt Nam Dân chủ Cộng hòa, Trưởng đoàn đại biểu Việt Nam Dân chủ Cộng hòa tại Hội nghị Genève năm 1954.',
 null, 'published'),
('Lê Duẩn', 'le-duan', null, 1907, 1986,
 'Bí thư thứ nhất Ban Chấp hành Trung ương Đảng Lao động Việt Nam, có vai trò quan trọng trong việc hoạch định chủ trương Tổng tiến công và nổi dậy Tết Mậu Thân 1968.',
 null, 'published'),
('Lê Đức Thọ', 'le-duc-tho', null, 1911, 1990,
 'Cố vấn đặc biệt của đoàn đại biểu Việt Nam Dân chủ Cộng hòa, trực tiếp đàm phán và ký tắt Hiệp định Paris năm 1973.',
 null, 'published'),
('Nguyễn Thị Bình', 'nguyen-thi-binh', null, 1927, null,
 'Trưởng đoàn đại biểu Chính phủ Cách mạng lâm thời Cộng hòa miền Nam Việt Nam, người đại diện ký Hiệp định Paris năm 1973.',
 null, 'published'),
('Văn Tiến Dũng', 'van-tien-dung', null, 1917, 2002,
 'Đại tướng, Tổng Tham mưu trưởng Quân đội nhân dân Việt Nam, Tư lệnh Chiến dịch Hồ Chí Minh năm 1975.',
 null, 'published'),
('Nguyễn Văn Linh', 'nguyen-van-linh', null, 1915, 1998,
 'Tổng Bí thư Ban Chấp hành Trung ương Đảng Cộng sản Việt Nam được bầu tại Đại hội VI (12/1986), người khởi xướng đường lối Đổi mới.',
 null, 'published'),
('Trường Chinh', 'truong-chinh', null, 1907, 1988,
 'Tổng Bí thư Đảng Cộng sản Việt Nam giai đoạn chuẩn bị Đại hội VI, có vai trò quan trọng trong việc thúc đẩy đổi mới tư duy trước Đại hội VI (12/1986).',
 null, 'published');

-- ============================================================
-- 4. ĐỊA ĐIỂM (historical_locations)
-- ============================================================
insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status) values
('Nhà hát Lớn Hà Nội', null, 'nha-hat-lon-ha-noi',
 'Nơi diễn ra cuộc mít tinh lớn trong ngày Tổng khởi nghĩa giành chính quyền ở Hà Nội, 19/8/1945.',
 21.024500, 105.857800, 'exact',
 'Tọa độ trung tâm công trình Nhà hát Lớn Hà Nội; cần đối chiếu bản đồ để tăng độ chính xác.',
 'published'),
('Quảng trường Ba Đình', null, 'quang-truong-ba-dinh',
 'Nơi Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập ngày 2/9/1945, khai sinh nước Việt Nam Dân chủ Cộng hòa.',
 21.036900, 105.834200, 'exact',
 'Tọa độ trung tâm khu vực Quảng trường Ba Đình hiện nay.',
 'published'),
('Điện Biên Phủ', null, 'dien-bien-phu',
 'Lòng chảo Điện Biên Phủ (trước đây là TP. Điện Biên Phủ; từ 7/2025 khu trung tâm nay thuộc các phường Điện Biên Phủ và Mường Thanh, tỉnh Điện Biên), nơi diễn ra chiến dịch quyết định năm 1954.',
 21.386000, 103.023000, 'region',
 'Tọa độ trung tâm khu vực lòng chảo Điện Biên Phủ (thành phố hiện nay); trận địa thực tế trải rộng trên nhiều cứ điểm xung quanh.',
 'published'),
('Genève (Thụy Sĩ)', null, 'geneve-thuy-si',
 'Thành phố nơi diễn ra Hội nghị Genève về Đông Dương năm 1954.',
 46.204400, 6.143200, 'region',
 'Tọa độ trung tâm thành phố Genève; địa điểm họp cụ thể chưa được xác định chính xác trong dữ liệu này.',
 'published'),
('Sài Gòn', 'Sài Gòn', 'sai-gon',
 'Trung tâm chính trị của chính quyền Sài Gòn, một trong các mục tiêu chính của cuộc Tổng tiến công và nổi dậy Tết Mậu Thân 1968.',
 10.776900, 106.700900, 'region',
 'Tọa độ trung tâm khu vực Sài Gòn (khu vực Quận 1 cũ, TP. Hồ Chí Minh; từ 7/2025 không còn cấp quận).',
 'published'),
('Huế', null, 'hue',
 'Một trong những mặt trận trọng điểm của cuộc Tổng tiến công và nổi dậy Tết Mậu Thân 1968.',
 16.463700, 107.590900, 'region',
 'Tọa độ trung tâm thành phố Huế.',
 'published'),
('Paris (Pháp)', null, 'paris-phap',
 'Thành phố nơi diễn ra đàm phán và ký kết Hiệp định Paris về Việt Nam năm 1973.',
 48.856600, 2.352200, 'region',
 'Tọa độ trung tâm thành phố Paris; địa điểm họp cụ thể (Trung tâm Hội nghị Quốc tế, Avenue Kléber) chưa được xác định chính xác trong dữ liệu này.',
 'published'),
('Dinh Độc Lập', 'Dinh Độc Lập / Dinh Thống Nhất', 'dinh-doc-lap',
 'Nơi xe tăng Quân Giải phóng tiến vào trưa 30/4/1975, đánh dấu thời khắc kết thúc Chiến dịch Hồ Chí Minh.',
 10.777200, 106.695300, 'exact',
 'Tọa độ trung tâm công trình Dinh Độc Lập (nay là Dinh Thống Nhất), 135 Nam Kỳ Khởi Nghĩa, phường Bến Thành, TP. Hồ Chí Minh.',
 'published'),
('Hà Nội (khu vực trung tâm)', null, 'ha-noi-khu-vuc-trung-tam',
 'Khu vực trung tâm Hà Nội, nơi diễn ra Đại hội đại biểu toàn quốc lần thứ VI của Đảng (12/1986).',
 21.028500, 105.854200, 'region',
 'Địa điểm cụ thể tổ chức Đại hội VI (Hội trường Ba Đình cũ) hiện không còn; dùng tọa độ trung tâm Hà Nội để đại diện khu vực.',
 'published'),
('Bến Nhà Rồng', 'Bến Nhà Rồng', 'ben-nha-rong',
 'Nơi người thanh niên Nguyễn Tất Thành xuống tàu Amiral Latouche-Tréville ra đi tìm đường cứu nước ngày 5/6/1911.',
 10.768600, 106.707100, 'exact',
 'Tọa độ khu vực Bến Nhà Rồng (nay là Bảo tàng Hồ Chí Minh - Chi nhánh TP. Hồ Chí Minh), số 1 Nguyễn Tất Thành, phường Xóm Chiếu (trước đây thuộc Quận 4), TP. Hồ Chí Minh.',
 'published'),
('Pác Bó', null, 'pac-bo-cao-bang',
 'Địa danh thuộc xã Trường Hà, tỉnh Cao Bằng (trước đây thuộc huyện Hà Quảng), nơi lãnh tụ Nguyễn Ái Quốc về nước trực tiếp lãnh đạo cách mạng năm 1941.',
 22.907500, 106.222500, 'approximate',
 'Tọa độ khu di tích Pác Bó (tọa độ gần đúng).',
 'published');

-- ============================================================
-- 5. SỰ KIỆN (historical_events) — 10 sự kiện ★ đợt 1
-- ============================================================
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
values
(
  (select id from public.curriculum_topics where slug = 'cach-mang-thang-tam-1945'),
  'Tổng khởi nghĩa giành chính quyền ở Hà Nội', 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi',
  1945, 1945, '1945-08-19', '1945-08-19', '19/8/1945', 'exact',
  'Ngày 19/8/1945, quần chúng nhân dân Hà Nội dưới sự lãnh đạo của Việt Minh đã nổi dậy giành chính quyền, mở đầu thắng lợi của Cách mạng tháng Tám trên cả nước.',
  'Sáng 19/8/1945, hàng chục vạn quần chúng nội thành và ngoại thành Hà Nội, có sự hỗ trợ của các đội tự vệ chiến đấu, tổ chức mít tinh tại Quảng trường Nhà hát Lớn rồi chuyển thành biểu tình vũ trang, lần lượt chiếm Phủ Khâm sai, Sở Cảnh sát, Sở Bưu điện... Chính quyền về tay nhân dân Hà Nội ngay trong ngày 19/8, cổ vũ mạnh mẽ phong trào khởi nghĩa giành chính quyền trong cả nước.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'cach-mang-thang-tam-1945'),
  'Tuyên ngôn Độc lập', 'tuyen-ngon-doc-lap',
  1945, 1945, '1945-09-02', '1945-09-02', '2/9/1945', 'exact',
  'Ngày 2/9/1945, tại Quảng trường Ba Đình (Hà Nội), Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập, tuyên bố thành lập nước Việt Nam Dân chủ Cộng hòa — nhà nước công nông đầu tiên ở Đông Nam Á.',
  'Trước cuộc mít tinh của hàng chục vạn đồng bào tại Quảng trường Ba Đình, Chủ tịch Hồ Chí Minh thay mặt Chính phủ lâm thời đọc bản Tuyên ngôn Độc lập, khẳng định quyền độc lập, tự do của dân tộc Việt Nam và tuyên bố thoát ly hẳn quan hệ với thực dân Pháp, xóa bỏ chế độ quân chủ.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'khang-chien-chong-phap'),
  'Chiến dịch Điện Biên Phủ', 'chien-dich-dien-bien-phu',
  1954, 1954, '1954-03-13', '1954-05-07', '13/3 – 7/5/1954', 'period',
  'Chiến dịch Điện Biên Phủ (13/3–7/5/1954) là trận quyết chiến chiến lược, đánh bại hoàn toàn tập đoàn cứ điểm mạnh nhất của Pháp ở Đông Dương, tạo cơ sở cho việc ký kết Hiệp định Genève.',
  'Qua ba đợt tiến công (13/3, 30/3 và 1/5/1954), quân đội ta lần lượt tiêu diệt các cứ điểm của tập đoàn cứ điểm Điện Biên Phủ. Chiều 7/5/1954, quân ta đánh chiếm sở chỉ huy, tướng De Castries cùng toàn bộ Bộ Tham mưu bị bắt sống, chiến dịch toàn thắng.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'khang-chien-chong-phap'),
  'Hiệp định Genève về Đông Dương', 'hiep-dinh-geneve-ve-dong-duong',
  1954, 1954, '1954-07-21', '1954-07-21', '21/7/1954', 'exact',
  'Hiệp định Genève về Đông Dương được ký kết ngày 21/7/1954, chấm dứt chiến tranh, lập lại hòa bình ở Đông Dương; các bên công nhận độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam.',
  'Hội nghị Genève khai mạc từ tháng 4/1954, có sự tham gia của các cường quốc và các bên liên quan. Hiệp định quy định lấy vĩ tuyến 17 làm giới tuyến quân sự tạm thời, hai bên tập kết quân đội, tiến tới tổng tuyển cử thống nhất đất nước sau hai năm.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'khang-chien-chong-my'),
  'Tổng tiến công và nổi dậy Tết Mậu Thân', 'tong-tien-cong-va-noi-day-tet-mau-than-1968',
  1968, 1968, '1968-01-30', null,
  'Đêm 30, rạng sáng 31/1/1968 (Tết Mậu Thân) và các đợt tiếp theo trong năm 1968', 'period',
  'Cuộc Tổng tiến công và nổi dậy Tết Mậu Thân 1968 đồng loạt đánh vào các đô thị, cơ quan đầu não của Mỹ và chính quyền Sài Gòn trên khắp miền Nam, làm lung lay ý chí xâm lược của Mỹ, buộc Mỹ phải xuống thang chiến tranh và ngồi vào bàn đàm phán.',
  'Đêm 30 rạng sáng 31/1/1968, quân và dân miền Nam đồng loạt tiến công và nổi dậy ở hầu khắp các đô thị, trong đó có Sài Gòn, Huế... đánh vào các cơ quan đầu não quan trọng như Tòa Đại sứ Mỹ, Dinh Độc Lập, Bộ Tổng tham mưu. Cuộc tiến công gây chấn động lớn, làm lung lay ý chí xâm lược của giới cầm quyền Mỹ.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'khang-chien-chong-my'),
  'Hiệp định Paris về Việt Nam', 'hiep-dinh-paris-ve-viet-nam',
  1973, 1973, '1973-01-27', '1973-01-27', '27/1/1973', 'exact',
  'Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được ký ngày 27/1/1973, buộc Mỹ rút quân khỏi miền Nam Việt Nam, tạo bước ngoặt cho cuộc kháng chiến chống Mỹ.',
  'Sau gần 5 năm đàm phán (bắt đầu từ 1968), ngày 27/1/1973, Hiệp định Paris được ký kết giữa các bên: Việt Nam Dân chủ Cộng hòa, Hoa Kỳ, Cộng hòa miền Nam Việt Nam và chính quyền Sài Gòn. Hiệp định quy định Mỹ rút hết quân, tôn trọng các quyền dân tộc cơ bản của nhân dân Việt Nam.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'khang-chien-chong-my'),
  'Chiến dịch Hồ Chí Minh', 'chien-dich-ho-chi-minh',
  1975, 1975, '1975-04-26', '1975-04-30', '26–30/4/1975', 'period',
  'Chiến dịch Hồ Chí Minh (26–30/4/1975) là chiến dịch quyết chiến chiến lược cuối cùng, kết thúc bằng việc xe tăng Quân Giải phóng tiến vào Dinh Độc Lập trưa 30/4/1975, giải phóng hoàn toàn miền Nam, thống nhất đất nước.',
  'Từ 26/4/1975, 5 cánh quân của ta đồng loạt tiến công vào Sài Gòn theo kế hoạch đã định. Trưa 30/4/1975, xe tăng Quân Giải phóng tiến vào Dinh Độc Lập, Tổng thống chính quyền Sài Gòn Dương Văn Minh tuyên bố đầu hàng không điều kiện, chiến dịch toàn thắng.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'cong-cuoc-doi-moi'),
  'Đại hội Đảng lần thứ VI – mở đầu Đổi mới', 'dai-hoi-dang-lan-thu-vi',
  1986, 1986, '1986-12-15', '1986-12-18', '15–18/12/1986', 'period',
  'Đại hội đại biểu toàn quốc lần thứ VI của Đảng (15–18/12/1986, Hà Nội) đề ra đường lối Đổi mới toàn diện đất nước, đánh dấu bước ngoặt trong tư duy phát triển kinh tế – xã hội của Việt Nam.',
  'Đại hội VI nhìn thẳng vào sự thật, đánh giá đúng sự thật, chỉ rõ những sai lầm trong lãnh đạo kinh tế; đề ra đường lối Đổi mới toàn diện, trước hết là đổi mới tư duy kinh tế, xóa bỏ cơ chế quản lý tập trung quan liêu bao cấp, chuyển sang nền kinh tế hàng hóa nhiều thành phần.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'ho-chi-minh'),
  'Nguyễn Tất Thành ra đi tìm đường cứu nước', 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc',
  1911, 1911, '1911-06-05', '1911-06-05', '5/6/1911', 'exact',
  'Ngày 5/6/1911, tại Bến Nhà Rồng (Sài Gòn), người thanh niên yêu nước Nguyễn Tất Thành xuống tàu Amiral Latouche-Tréville, bắt đầu hành trình ra đi tìm đường cứu nước.',
  'Với lòng yêu nước và khát vọng giải phóng dân tộc, Nguyễn Tất Thành rời Tổ quốc trên con tàu buôn Pháp Amiral Latouche-Tréville với tên gọi Văn Ba, bắt đầu hành trình gần 30 năm bôn ba qua nhiều châu lục tìm con đường cứu nước đúng đắn cho dân tộc Việt Nam.',
  true, 'draft'
),
(
  (select id from public.curriculum_topics where slug = 'ho-chi-minh'),
  'Nguyễn Ái Quốc về nước lãnh đạo cách mạng', 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang',
  1941, 1941, '1941-01-28', '1941-01-28', '28/1/1941', 'exact',
  'Ngày 28/1/1941, lãnh tụ Nguyễn Ái Quốc về nước sau 30 năm bôn ba tìm đường cứu nước, trực tiếp lãnh đạo phong trào cách mạng tại Pác Bó (Cao Bằng), chuẩn bị cho Cách mạng tháng Tám.',
  'Sau 30 năm hoạt động ở nước ngoài, lãnh tụ Nguyễn Ái Quốc về nước, sống và làm việc tại hang Pác Bó (xã Trường Hà, tỉnh Cao Bằng (trước đây thuộc huyện Hà Quảng)), trực tiếp lãnh đạo cách mạng Việt Nam. Tháng 5/1941, Người chủ trì Hội nghị Trung ương lần thứ 8, quyết định thành lập Mặt trận Việt Minh.',
  true, 'draft'
);

-- ============================================================
-- 6. LIÊN KẾT SỰ KIỆN – NHÂN VẬT (event_figures)
-- ============================================================
insert into public.event_figures (event_id, figure_id, relationship, sort_order) values
((select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'),
 (select id from public.historical_figures where slug = 'ho-chi-minh'),
 'Lãnh tụ, chỉ đạo chung phong trào Tổng khởi nghĩa', 1),

((select id from public.historical_events where slug = 'tuyen-ngon-doc-lap'),
 (select id from public.historical_figures where slug = 'ho-chi-minh'),
 'Người soạn thảo và đọc bản Tuyên ngôn Độc lập', 1),

((select id from public.historical_events where slug = 'chien-dich-dien-bien-phu'),
 (select id from public.historical_figures where slug = 'ho-chi-minh'),
 'Chủ tịch nước, người chỉ đạo chiến lược chung', 1),
((select id from public.historical_events where slug = 'chien-dich-dien-bien-phu'),
 (select id from public.historical_figures where slug = 'vo-nguyen-giap'),
 'Tổng Tư lệnh, trực tiếp chỉ huy chiến dịch', 2),

((select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'),
 (select id from public.historical_figures where slug = 'pham-van-dong'),
 'Trưởng đoàn đại biểu Việt Nam Dân chủ Cộng hòa tại hội nghị', 1),

((select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'),
 (select id from public.historical_figures where slug = 'le-duan'),
 'Có vai trò quan trọng trong việc hoạch định chủ trương tổng tiến công', 1),

((select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'),
 (select id from public.historical_figures where slug = 'le-duc-tho'),
 'Cố vấn đặc biệt, trực tiếp đàm phán', 1),
((select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'),
 (select id from public.historical_figures where slug = 'nguyen-thi-binh'),
 'Trưởng đoàn đại biểu Chính phủ Cách mạng lâm thời Cộng hòa miền Nam Việt Nam, đại diện ký hiệp định', 2),

((select id from public.historical_events where slug = 'chien-dich-ho-chi-minh'),
 (select id from public.historical_figures where slug = 'van-tien-dung'),
 'Tư lệnh Chiến dịch Hồ Chí Minh', 1),

((select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi'),
 (select id from public.historical_figures where slug = 'nguyen-van-linh'),
 'Được bầu làm Tổng Bí thư tại Đại hội, người khởi xướng Đổi mới', 1),
((select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi'),
 (select id from public.historical_figures where slug = 'truong-chinh'),
 'Tổng Bí thư giai đoạn chuẩn bị Đại hội, thúc đẩy đổi mới tư duy', 2),

((select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'),
 (select id from public.historical_figures where slug = 'ho-chi-minh'),
 'Nhân vật chính của sự kiện (tên gọi thời trẻ: Nguyễn Tất Thành)', 1),

((select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'),
 (select id from public.historical_figures where slug = 'ho-chi-minh'),
 'Nhân vật chính của sự kiện (tên gọi lúc bấy giờ: Nguyễn Ái Quốc)', 1);

-- ============================================================
-- 7. LIÊN KẾT SỰ KIỆN – ĐỊA ĐIỂM (event_locations, đúng 1 is_primary/sự kiện)
-- ============================================================
insert into public.event_locations (event_id, location_id, location_role, is_primary) values
((select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'),
 (select id from public.historical_locations where slug = 'nha-hat-lon-ha-noi'),
 'Nơi diễn ra cuộc mít tinh mở đầu khởi nghĩa', true),

((select id from public.historical_events where slug = 'tuyen-ngon-doc-lap'),
 (select id from public.historical_locations where slug = 'quang-truong-ba-dinh'),
 'Nơi đọc Tuyên ngôn Độc lập', true),

((select id from public.historical_events where slug = 'chien-dich-dien-bien-phu'),
 (select id from public.historical_locations where slug = 'dien-bien-phu'),
 'Địa bàn diễn ra chiến dịch', true),

((select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'),
 (select id from public.historical_locations where slug = 'geneve-thuy-si'),
 'Nơi diễn ra hội nghị và ký hiệp định', true),

((select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'),
 (select id from public.historical_locations where slug = 'sai-gon'),
 'Một trong các mục tiêu tiến công trọng điểm', true),
((select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'),
 (select id from public.historical_locations where slug = 'hue'),
 'Mặt trận trọng điểm, giao tranh ác liệt kéo dài nhiều ngày', false),

((select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'),
 (select id from public.historical_locations where slug = 'paris-phap'),
 'Nơi diễn ra đàm phán và ký hiệp định', true),

((select id from public.historical_events where slug = 'chien-dich-ho-chi-minh'),
 (select id from public.historical_locations where slug = 'dinh-doc-lap'),
 'Đích đến cuối cùng của chiến dịch, nơi xe tăng Quân Giải phóng tiến vào trưa 30/4/1975', true),

((select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi'),
 (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'),
 'Nơi tổ chức Đại hội', true),

((select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'),
 (select id from public.historical_locations where slug = 'ben-nha-rong'),
 'Nơi xuống tàu ra đi tìm đường cứu nước', true),

((select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'),
 (select id from public.historical_locations where slug = 'pac-bo-cao-bang'),
 'Nơi trực tiếp lãnh đạo cách mạng sau khi về nước', true);

-- ============================================================
-- 8. LIÊN KẾT SỰ KIỆN – NGUỒN (event_sources, ≥ 1 nguồn/sự kiện)
-- ============================================================
insert into public.event_sources (event_id, source_id, source_note, confidence_note)
select e.id,
       (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'),
       'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).',
       null
from public.historical_events e
where e.slug in (
  'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi',
  'tuyen-ngon-doc-lap',
  'chien-dich-dien-bien-phu',
  'hiep-dinh-geneve-ve-dong-duong',
  'tong-tien-cong-va-noi-day-tet-mau-than-1968',
  'hiep-dinh-paris-ve-viet-nam',
  'chien-dich-ho-chi-minh',
  'dai-hoi-dang-lan-thu-vi',
  'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc',
  'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'
);

-- ============================================================
-- 8b. CÔNG BỐ 10 SỰ KIỆN (sau khi đã có đủ nguồn tham khảo)
-- ============================================================
-- Đưa từ draft -> published SAU KHI đã gắn event_sources, để tương thích với
-- trigger G4 (check_event_has_source, migration 20260925000000) nếu đã chạy:
-- trigger đó chặn published/pending_review khi chưa có nguồn.
update public.historical_events
set workflow_status = 'published'
where slug in (
  'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi',
  'tuyen-ngon-doc-lap',
  'chien-dich-dien-bien-phu',
  'hiep-dinh-geneve-ve-dong-duong',
  'tong-tien-cong-va-noi-day-tet-mau-than-1968',
  'hiep-dinh-paris-ve-viet-nam',
  'chien-dich-ho-chi-minh',
  'dai-hoi-dang-lan-thu-vi',
  'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc',
  'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'
);

-- ============================================================
-- 9. ẢNH MINH HỌA (media_assets)
-- ============================================================
-- Chỉ 2/10 sự kiện có ảnh đã xác minh giấy phép thật (Wikimedia Commons).
-- Các sự kiện còn lại: cần bổ sung ảnh sau khi tự xác minh giấy phép (xem docs/du-lieu-can-kiem-chung.md).
insert into public.media_assets (event_id, file_url, media_type, caption, alt_text, source_id, sort_order) values
(
  (select id from public.historical_events where slug = 'chien-dich-dien-bien-phu'),
  'https://commons.wikimedia.org/wiki/Special:FilePath/Victory_in_Battle_of_Dien_Bien_Phu.jpg',
  'image',
  'Bộ đội ta cắm cờ "Quyết chiến, Quyết thắng" trên nóc hầm chỉ huy tập đoàn cứ điểm Điện Biên Phủ. Theo nhiều tư liệu (trong đó có báo Nhân Dân), cảnh này do đoàn làm phim của Roman Karmen (Liên Xô) quay dựng lại sau khi chiến dịch kết thúc.',
  'Ảnh tư liệu đen trắng: bộ đội Việt Minh cắm cờ chiến thắng trên công sự quân sự tại Điện Biên Phủ năm 1954',
  (select id from public.sources where title = 'Ảnh tư liệu: Bộ đội cắm cờ chiến thắng tại Điện Biên Phủ (1954)'),
  1
),
(
  (select id from public.historical_events where slug = 'tuyen-ngon-doc-lap'),
  'https://commons.wikimedia.org/wiki/Special:FilePath/Pr%C3%A9sident_Ho-chi-Minh_lit_la_Proclamation-d%27ind%C3%A9pendance_sur_la_place_Ba-dinh_le_2nd_Sep_1945.jpg',
  'image',
  'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập tại Quảng trường Ba Đình, ngày 2/9/1945.',
  'Ảnh tư liệu đen trắng: Chủ tịch Hồ Chí Minh đứng trên lễ đài đọc Tuyên ngôn Độc lập trước đông đảo quần chúng tại Quảng trường Ba Đình',
  (select id from public.sources where title = 'Ảnh tư liệu: Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình (2/9/1945)'),
  1
);

commit;
