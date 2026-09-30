-- Giai đoạn 3 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md, mục 3.1–3.3): nội dung theo khung chuẩn.
-- TỆP SINH TỰ ĐỘNG bởi scripts/build-content-sql.mjs từ supabase/content/ — sửa nội dung ở các file .md rồi chạy lại script.
-- KHÔNG phải migration: là dữ liệu, chạy SAU seed.sql, seed-media.sql và migration 20260930000000_event_topics.sql.
--
-- 1. Viết lại nội dung 10 sự kiện đã công bố theo khung Bối cảnh – Diễn biến – Kết quả – Ý nghĩa – Câu chuyện nhỏ –
--    Em có biết? – Di tích ngày nay. Mỗi UPDATE chỉ chạy khi nội dung cũ còn nguyên (so md5), không đè bản đã sửa tay.
-- 2. Thêm 10 sự kiện mới và 5 địa điểm mới ở trạng thái NHÁP (draft) — phải qua kiểm duyệt mới hiện ở trang công khai.
-- 3. Gắn chủ đề phụ (event_topics), ví dụ Genève/Paris → "Lịch sử đối ngoại".
-- 4. Sửa chú thích ảnh xe tăng 843 (xe ở Dinh Độc Lập là xe cùng loại; xe nguyên bản ở Hà Nội).
--
-- Chỉ UPDATE/INSERT, không xóa. Mọi INSERT có "where not exists" nên chạy lại không tạo trùng.
-- Nội dung cần giáo viên đối chiếu SGK: xem docs/du-lieu-can-kiem-chung.md, mục "Nội dung GĐ3".

begin;

-- ---------- Địa điểm mới (nháp) ----------
insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Trụ sở Liên hợp quốc (New York)', null, 'tru-so-lien-hop-quoc-new-york', 'Trụ sở chính của Liên hợp quốc bên bờ sông East River, thành phố New York (Hoa Kỳ), nơi họp Đại hội đồng Liên hợp quốc.', 40.7493, -73.968, 'approximate', 'Tọa độ khu vực tòa nhà trụ sở Liên hợp quốc (gần đúng).', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'tru-so-lien-hop-quoc-new-york');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Bandar Seri Begawan (Brunei)', null, 'bandar-seri-begawan', 'Thủ đô của Brunei, nơi diễn ra Hội nghị Bộ trưởng Ngoại giao ASEAN lần thứ 28 và lễ kết nạp Việt Nam vào ASEAN ngày 28/7/1995.', 4.9031, 114.9398, 'region', 'Tọa độ trung tâm thành phố Bandar Seri Begawan; chưa xác định địa điểm họp cụ thể.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'bandar-seri-begawan');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Biên giới Tây Nam (Tây Ninh)', null, 'bien-gioi-tay-nam', 'Vùng biên giới Tây Nam của Tổ quốc, nơi quân và dân ta chiến đấu chống các cuộc tấn công của tập đoàn Pol Pot (1975–1979). Tây Ninh là một trong những địa bàn bị tấn công ác liệt nhất.', 11.31, 106.098, 'region', 'Điểm đại diện cho cả vùng biên giới Tây Nam (đặt tại Tây Ninh); các trận đánh diễn ra trên nhiều tỉnh từ Tây Ninh đến Kiên Giang.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'bien-gioi-tay-nam');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Biên giới phía Bắc (Lạng Sơn)', null, 'bien-gioi-phia-bac', 'Tuyến biên giới phía Bắc của Tổ quốc, nơi quân và dân ta chiến đấu bảo vệ lãnh thổ năm 1979 và những năm sau đó.', 21.8537, 106.7615, 'region', 'Điểm đại diện cho cả tuyến biên giới phía Bắc (đặt tại Lạng Sơn); các trận đánh diễn ra từ Lai Châu đến Quảng Ninh.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'bien-gioi-phia-bac');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Đảo Gạc Ma (quần đảo Trường Sa)', 'Gạc Ma', 'dao-gac-ma', 'Đảo đá thuộc cụm Sinh Tồn, quần đảo Trường Sa (Việt Nam), nơi các chiến sĩ Hải quân nhân dân Việt Nam chiến đấu bảo vệ chủ quyền ngày 14/3/1988.', 9.7167, 114.2833, 'approximate', 'Tọa độ gần đúng của đảo Gạc Ma.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'dao-gac-ma');

-- ---------- Sự kiện ----------
-- bao-ve-chu-quyen-gac-ma-1988.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'bao-ve-to-quoc-sau-1975'), 'Cuộc chiến đấu bảo vệ chủ quyền ở Gạc Ma', 'bao-ve-chu-quyen-gac-ma-1988', 1988, 1988,
  '1988-03-14', '1988-03-14', '14/3/1988', 'exact', 'Ngày 14/3/1988, các chiến sĩ Hải quân nhân dân Việt Nam đã chiến đấu anh dũng bảo vệ chủ quyền tại đảo Gạc Ma, Cô Lin, Len Đao thuộc quần đảo Trường Sa; 64 chiến sĩ đã hy sinh.',
  $md$## Bối cảnh

Quần đảo Trường Sa là một phần lãnh thổ không thể tách rời của Việt Nam. Cuối những năm 1980, tình hình ở Trường Sa trở nên căng thẳng khi lực lượng Trung Quốc chiếm đóng một số bãi đá. Hải quân Việt Nam triển khai lực lượng ra đóng giữ các đảo, bãi đá để bảo vệ chủ quyền.

## Diễn biến

- Sáng **14/3/1988**, tại khu vực đảo Gạc Ma, Cô Lin và Len Đao, lực lượng hải quân Trung Quốc tấn công các chiến sĩ và tàu vận tải của Hải quân Việt Nam.
- Tại Gạc Ma, các chiến sĩ công binh và hải quân, phần lớn không có vũ khí nặng, đã đứng thành **"vòng tròn bất tử"** quanh lá cờ Tổ quốc để bảo vệ đảo.
- Các tàu vận tải HQ-604 và HQ-605 bị bắn chìm. Tàu HQ-505 lao lên bãi Cô Lin để giữ đảo.

## Kết quả

**64 chiến sĩ** hy sinh. Đảo Gạc Ma bị Trung Quốc chiếm giữ, nhưng ta đã giữ được Cô Lin và Len Đao.

## Ý nghĩa

Sự hy sinh của các chiến sĩ Gạc Ma là biểu tượng của tinh thần sẵn sàng hy sinh vì chủ quyền biển, đảo thiêng liêng của Tổ quốc; nhắc nhở thế hệ hôm nay về trách nhiệm bảo vệ chủ quyền bằng các biện pháp hòa bình, phù hợp luật pháp quốc tế.

## Câu chuyện nhỏ

Khi bị bao vây, chiến sĩ **Trần Văn Phương** đã giữ chặt lá cờ Tổ quốc và hô: *"Thà hy sinh chứ không chịu mất đảo, hãy để cho máu của mình tô thắm lá cờ truyền thống của Quân chủng Hải quân"*. Anh hy sinh khi mới 23 tuổi và được truy tặng danh hiệu Anh hùng Lực lượng vũ trang nhân dân.

## Em có biết?

Con tàu **HQ-505** do thuyền trưởng Vũ Phi Trừ chỉ huy đã chủ động lao lên bãi Cô Lin trong khi đang bị bắn cháy — một quyết định giúp giữ được đảo.

## Di tích ngày nay

**Khu tưởng niệm chiến sĩ Gạc Ma** ở Cam Lâm (Khánh Hòa) có tượng đài "vòng tròn bất tử" và nhà trưng bày hiện vật.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'bao-ve-chu-quyen-gac-ma-1988');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'bao-ve-chu-quyen-gac-ma-1988'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'bao-ve-chu-quyen-gac-ma-1988'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'bao-ve-chu-quyen-gac-ma-1988'), (select id from public.historical_locations where slug = 'dao-gac-ma'), 'Nơi diễn ra cuộc chiến đấu', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'bao-ve-chu-quyen-gac-ma-1988') and location_id = (select id from public.historical_locations where slug = 'dao-gac-ma'));

-- binh-thuong-hoa-quan-he-viet-my-1995.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'), 'Bình thường hóa quan hệ Việt Nam – Hoa Kỳ', 'binh-thuong-hoa-quan-he-viet-my-1995', 1995, 1995,
  '1995-07-11', '1995-07-12', '11 – 12/7/1995', 'period', 'Tháng 7/1995, Việt Nam và Hoa Kỳ tuyên bố bình thường hóa quan hệ ngoại giao, khép lại quá khứ, hướng tới tương lai sau hai thập kỷ kể từ khi chiến tranh kết thúc.',
  $md$## Bối cảnh

Sau năm 1975, Mỹ thi hành chính sách bao vây, cấm vận đối với Việt Nam. Bước vào công cuộc Đổi mới, Việt Nam chủ trương "muốn là bạn với tất cả các nước", từng bước phá thế bao vây, cấm vận. Hai bên hợp tác trong việc giải quyết các vấn đề nhân đạo, như tìm kiếm quân nhân Mỹ mất tích trong chiến tranh (MIA). Ngày 3/2/1994, Tổng thống Mỹ B. Clinton tuyên bố bỏ lệnh cấm vận đối với Việt Nam.

## Diễn biến

Ngày **11/7/1995**, Tổng thống Mỹ B. Clinton tuyên bố bình thường hóa quan hệ ngoại giao với Việt Nam. Ngày **12/7/1995**, Thủ tướng **Võ Văn Kiệt** tuyên bố Việt Nam thiết lập quan hệ ngoại giao với Hoa Kỳ. Tháng 8/1995, hai nước khai trương đại sứ quán tại thủ đô của nhau.

## Kết quả

Quan hệ hai nước từng bước phát triển: năm 2000, ký Hiệp định Thương mại song phương; năm 2013, thiết lập quan hệ **Đối tác toàn diện**; năm 2023, nâng lên **Đối tác chiến lược toàn diện**. Hoa Kỳ trở thành một trong những thị trường xuất khẩu lớn nhất của Việt Nam.

## Ý nghĩa

Bình thường hóa quan hệ với Hoa Kỳ phá bỏ thế bao vây, cấm vận, mở rộng quan hệ đối ngoại, tạo môi trường thuận lợi cho công cuộc Đổi mới và hội nhập quốc tế. Sự kiện thể hiện tinh thần "gác lại quá khứ, hướng tới tương lai" của dân tộc Việt Nam.

## Câu chuyện nhỏ

Nhiều cựu chiến binh của cả hai nước — những người từng ở hai bên chiến tuyến — sau này đã cùng nhau tham gia các chương trình khắc phục hậu quả chiến tranh: rà phá bom mìn, tẩy độc dioxin, tìm kiếm hài cốt liệt sĩ và quân nhân mất tích.

## Em có biết?

Năm 1995 là một năm đặc biệt trong đối ngoại của Việt Nam: chỉ trong vòng một tháng, Việt Nam vừa bình thường hóa quan hệ với Hoa Kỳ (tháng 7), vừa gia nhập ASEAN (28/7/1995).$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'binh-thuong-hoa-quan-he-viet-my-1995');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'binh-thuong-hoa-quan-he-viet-my-1995'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'binh-thuong-hoa-quan-he-viet-my-1995'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'binh-thuong-hoa-quan-he-viet-my-1995'), (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'), 'Nơi Chính phủ Việt Nam ra tuyên bố bình thường hóa', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'binh-thuong-hoa-quan-he-viet-my-1995') and location_id = (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'));

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'binh-thuong-hoa-quan-he-viet-my-1995'), (select id from public.curriculum_topics where slug = 'cong-cuoc-doi-moi')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'binh-thuong-hoa-quan-he-viet-my-1995') and topic_id = (select id from public.curriculum_topics where slug = 'cong-cuoc-doi-moi'));

-- chien-dich-dien-bien-phu.md
update public.historical_events set content = $md$## Bối cảnh

Sau 8 năm chiến tranh, thực dân Pháp ngày càng lún sâu vào thế bị động. Tháng 5/1953, với sự giúp sức của Mỹ, Pháp đề ra **kế hoạch Nava**, hy vọng trong 18 tháng giành thắng lợi quyết định để "kết thúc chiến tranh trong danh dự".

Ngày 20/11/1953, Pháp cho quân nhảy dù xuống Điện Biên Phủ và xây dựng nơi đây thành **tập đoàn cứ điểm mạnh nhất Đông Dương**: 49 cứ điểm, chia thành ba phân khu (Bắc, Trung tâm, Nam), có sân bay, pháo binh và xe tăng. Tháng 12/1953, Bộ Chính trị quyết định mở chiến dịch Điện Biên Phủ.

## Diễn biến

Phương châm tác chiến được chuyển từ "đánh nhanh, thắng nhanh" sang **"đánh chắc, tiến chắc"**. Chiến dịch diễn ra trong 56 ngày đêm với ba đợt tiến công:

- **Đợt 1 (13 – 17/3/1954):** tiêu diệt cụm cứ điểm Him Lam và toàn bộ phân khu Bắc, mở cánh cửa vào lòng chảo.
- **Đợt 2 (30/3 – 26/4/1954):** đánh chiếm các điểm cao phía đông phân khu Trung tâm; chiến đấu giằng co ác liệt ở đồi A1; hệ thống giao thông hào siết chặt vòng vây, khống chế sân bay.
- **Đợt 3 (1/5 – 7/5/1954):** tiến công các cứ điểm còn lại. Đêm 6/5, khối bộc phá nổ trên đồi A1. Chiều **7/5/1954**, quân ta đánh chiếm sở chỉ huy, bắt sống tướng De Castries cùng toàn bộ Bộ Tham mưu.

## Kết quả

Quân ta loại khỏi vòng chiến đấu toàn bộ lực lượng địch ở Điện Biên Phủ (khoảng 16.200 quân), bắn rơi 62 máy bay, thu toàn bộ vũ khí, phương tiện chiến tranh. Kế hoạch Nava bị phá sản hoàn toàn.

## Ý nghĩa

Chiến thắng Điện Biên Phủ đập tan kế hoạch Nava, giáng đòn quyết định vào ý chí xâm lược của thực dân Pháp, tạo cơ sở thực lực cho cuộc đấu tranh ngoại giao tại Hội nghị Genève. Đây là thắng lợi của một dân tộc thuộc địa trước một cường quốc thực dân, cổ vũ mạnh mẽ phong trào giải phóng dân tộc trên thế giới.

## Câu chuyện nhỏ

Chiều 13/3/1954, trong trận đánh cụm cứ điểm Him Lam, tiểu đội phó **Phan Đình Giót** bị thương nặng vẫn xin đi đánh tiếp. Khi đồng đội bị hỏa lực từ một lỗ châu mai chặn đứng, anh dùng thân mình lấp kín lỗ châu mai, mở đường cho đơn vị xung phong. Anh hy sinh ở tuổi 21, được truy tặng danh hiệu Anh hùng Lực lượng vũ trang nhân dân.

## Em có biết?

- Hàng vạn dân công đã dùng **xe đạp thồ** chở lương thực, đạn dược vượt núi rừng ra mặt trận.
- Những khẩu pháo nặng hàng tấn được bộ đội kéo bằng sức người qua đèo dốc vào trận địa.

## Di tích ngày nay

Ở Điện Biên Phủ ngày nay có thể thăm **đồi A1**, **hầm chỉ huy De Castries**, **Nghĩa trang liệt sĩ A1**, **tượng đài Chiến thắng trên đồi D1** và **Bảo tàng Chiến thắng lịch sử Điện Biên Phủ**. Em có thể học kỹ hơn trong bài học tương tác về chiến dịch này.$md$
where slug = 'chien-dich-dien-bien-phu' and md5(content) = 'caa05e20e21758ba91ce10db906b80c6';

-- chien-dich-ho-chi-minh.md
update public.historical_events set content = $md$## Bối cảnh

Sau Hiệp định Paris, quân Mỹ rút khỏi miền Nam nhưng chính quyền Sài Gòn vẫn tiếp tục chiến tranh. Đầu năm 1975, Bộ Chính trị đề ra kế hoạch giải phóng miền Nam trong hai năm 1975–1976, đồng thời nhấn mạnh: nếu thời cơ đến thì giải phóng ngay trong năm 1975.

Cuộc Tổng tiến công và nổi dậy Xuân 1975 mở màn bằng **chiến dịch Tây Nguyên** (từ 4/3/1975, trận then chốt Buôn Ma Thuột ngày 10/3), tiếp theo là **chiến dịch Huế – Đà Nẵng** (21 – 29/3/1975). Thời cơ chiến lược đã đến. Bộ Chính trị quyết định giải phóng Sài Gòn trước mùa mưa; ngày 14/4/1975, chiến dịch được mang tên **Chiến dịch Hồ Chí Minh**.

## Diễn biến

- Đại tướng **Văn Tiến Dũng** làm Tư lệnh, đồng chí Phạm Hùng làm Chính ủy chiến dịch.
- Trận Xuân Lộc (9 – 21/4/1975) phá vỡ "cánh cửa thép" phía đông Sài Gòn.
- 17 giờ ngày **26/4/1975**, chiến dịch bắt đầu. **Năm cánh quân** từ các hướng đồng loạt tiến công, đánh chiếm các căn cứ vòng ngoài rồi thọc sâu vào nội đô.
- Sáng **30/4/1975**, các cánh quân tiến vào trung tâm Sài Gòn. Xe tăng Quân Giải phóng húc đổ cổng **Dinh Độc Lập**. Tổng thống chính quyền Sài Gòn Dương Văn Minh tuyên bố đầu hàng không điều kiện. **11 giờ 30 phút**, lá cờ cách mạng tung bay trên nóc Dinh Độc Lập.

## Kết quả

Chiến dịch Hồ Chí Minh toàn thắng. Sài Gòn được giải phóng; đến ngày 2/5/1975, tỉnh cuối cùng là Châu Đốc được giải phóng. Cuộc kháng chiến chống Mỹ, cứu nước kết thúc thắng lợi.

## Ý nghĩa

Đại thắng mùa Xuân 1975 kết thúc 21 năm kháng chiến chống Mỹ và 30 năm chiến tranh giải phóng dân tộc, bảo vệ Tổ quốc; chấm dứt ách thống trị của chủ nghĩa đế quốc trên đất nước ta; hoàn thành cách mạng dân tộc dân chủ trong cả nước, mở ra kỷ nguyên độc lập, thống nhất, đi lên chủ nghĩa xã hội.

## Câu chuyện nhỏ

Trưa 30/4/1975, xe tăng **843** lao vào cổng phụ Dinh Độc Lập nhưng bị kẹt lại; ngay sau đó xe tăng **390** húc đổ cổng chính. Đại đội trưởng **Bùi Quang Thận** (xe 843) ôm lá cờ chạy vào dinh, lên tầng thượng và cắm cờ trên nóc. Khoảnh khắc lá cờ tung bay được nhiều người nhắc lại như biểu tượng của ngày thống nhất.

## Em có biết?

- Hai xe tăng **390** và **843** được công nhận là **Bảo vật quốc gia** (2012). Xe nguyên bản hiện được lưu giữ ở Hà Nội: xe 390 tại Bảo tàng Tăng thiết giáp, xe 843 tại Bảo tàng Lịch sử Quân sự Việt Nam. Hai xe tăng trưng bày ở Dinh Độc Lập hiện nay là xe cùng loại.
- Cuộc Tổng tiến công và nổi dậy Xuân 1975 kéo dài chưa đầy **2 tháng** (từ 4/3 đến 2/5/1975).

## Di tích ngày nay

**Dinh Độc Lập** (nay là Dinh Thống Nhất, 135 Nam Kỳ Khởi Nghĩa, TP. Hồ Chí Minh) mở cửa cho khách tham quan: phòng làm việc, hầm chỉ huy, sân thượng nơi cắm cờ.$md$
where slug = 'chien-dich-ho-chi-minh' and md5(content) = 'fb09f2d6855a9aaa400ef573063452b8';

-- chien-tranh-bao-ve-bien-gioi-phia-bac-1979.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'bao-ve-to-quoc-sau-1975'), 'Chiến tranh bảo vệ biên giới phía Bắc', 'chien-tranh-bao-ve-bien-gioi-phia-bac-1979', 1979, 1979,
  '1979-02-17', '1979-03-18', '17/2 – 18/3/1979', 'period', 'Ngày 17/2/1979, quân đội Trung Quốc mở cuộc tấn công dọc tuyến biên giới phía Bắc nước ta. Quân và dân các tỉnh biên giới chiến đấu kiên cường, buộc quân Trung Quốc phải rút quân (hoàn tất ngày 18/3/1979).',
  $md$## Bối cảnh

Sau năm 1975, quan hệ giữa Việt Nam và Trung Quốc ngày càng căng thẳng. Cuối những năm 1970, tình hình biên giới phía Bắc xảy ra nhiều vụ khiêu khích, xâm phạm lãnh thổ.

## Diễn biến

- Rạng sáng **17/2/1979**, quân đội Trung Quốc đồng loạt tấn công dọc tuyến biên giới phía Bắc nước ta, từ Phong Thổ (Lai Châu) đến Móng Cái (Quảng Ninh).
- Quân và dân các tỉnh biên giới như Lạng Sơn, Cao Bằng, Lào Cai (khi đó thuộc tỉnh Hoàng Liên Sơn), Hà Tuyên, Lai Châu, Quảng Ninh chiến đấu anh dũng, gây nhiều thiệt hại cho đối phương.
- Ngày 5/3/1979, Chủ tịch nước ra lệnh tổng động viên trong cả nước. Cùng ngày, Trung Quốc tuyên bố rút quân; đến ngày **18/3/1979**, quân Trung Quốc rút hết khỏi lãnh thổ Việt Nam.

## Kết quả

Quân và dân ta bảo vệ được chủ quyền lãnh thổ ở biên giới phía Bắc. Tuy nhiên, tình hình biên giới còn căng thẳng trong nhiều năm sau, với những trận chiến đấu bảo vệ biên giới kéo dài đến cuối những năm 1980, tiêu biểu là ở mặt trận **Vị Xuyên** (tỉnh Hà Giang cũ, nay thuộc tỉnh Tuyên Quang).

## Ý nghĩa

Cuộc chiến đấu thể hiện ý chí bảo vệ độc lập, chủ quyền của dân tộc. Năm 1991, Việt Nam và Trung Quốc bình thường hóa quan hệ; hai nước lần lượt ký Hiệp ước biên giới trên đất liền (1999) và hoàn thành phân giới cắm mốc (2008).

## Câu chuyện nhỏ

Ở các tỉnh biên giới, nhiều dân quân, công an vũ trang và cả những người dân bình thường đã cùng bộ đội bám trụ, tiếp tế, cứu thương ngay trên quê hương mình. Tên tuổi của họ được khắc ghi trên các tấm bia ở những nghĩa trang liệt sĩ dọc biên giới.

## Em có biết?

**Nghĩa trang liệt sĩ quốc gia Vị Xuyên** (Hà Giang cũ, nay thuộc Tuyên Quang) là nơi an nghỉ của hàng nghìn liệt sĩ đã hy sinh trong cuộc chiến đấu bảo vệ biên giới phía Bắc.

## Di tích ngày nay

Nghĩa trang liệt sĩ quốc gia Vị Xuyên; các nghĩa trang, đài tưởng niệm liệt sĩ ở Lạng Sơn, Cao Bằng, Lào Cai.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-phia-bac-1979');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-phia-bac-1979'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-phia-bac-1979'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-phia-bac-1979'), (select id from public.historical_locations where slug = 'bien-gioi-phia-bac'), 'Tuyến biên giới phía Bắc bị tấn công', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-phia-bac-1979') and location_id = (select id from public.historical_locations where slug = 'bien-gioi-phia-bac'));

-- chien-tranh-bao-ve-bien-gioi-tay-nam.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'bao-ve-to-quoc-sau-1975'), 'Chiến tranh bảo vệ biên giới Tây Nam', 'chien-tranh-bao-ve-bien-gioi-tay-nam', 1975, 1979,
  null, null, '1975 – 1979', 'period', 'Từ năm 1975, tập đoàn Khmer Đỏ (Pol Pot) liên tục xâm phạm và gây tội ác ở vùng biên giới Tây Nam. Quân và dân ta chiến đấu bảo vệ lãnh thổ, rồi cùng lực lượng cách mạng Campuchia phản công, giải phóng Phnôm Pênh ngày 7/1/1979.',
  $md$## Bối cảnh

Ngay sau khi miền Nam được giải phóng, tập đoàn Khmer Đỏ do Pol Pot cầm đầu đã có những hành động thù địch với Việt Nam: tháng 5/1975, chúng đánh chiếm đảo Thổ Chu, tấn công Phú Quốc. Trong những năm 1977–1978, quân Pol Pot nhiều lần tấn công các tỉnh biên giới như An Giang, Tây Ninh, Kiên Giang, tàn sát dân thường.

## Diễn biến

- Năm 1978, quân Pol Pot gây ra nhiều vụ thảm sát, trong đó có **thảm sát Ba Chúc** (An Giang) tháng 4/1978, giết hại hơn 3.000 dân thường.
- Ngày **22/12/1978**, Pol Pot huy động lực lượng lớn tấn công vào Tây Ninh, mở rộng chiến tranh xâm lược.
- Quân và dân ta tổ chức phản công, đánh đuổi quân xâm lược ra khỏi lãnh thổ. Theo đề nghị của Mặt trận Đoàn kết dân tộc cứu nước Campuchia (thành lập ngày 2/12/1978), quân tình nguyện Việt Nam cùng lực lượng cách mạng Campuchia tiến công, giải phóng **Phnôm Pênh ngày 7/1/1979**.

## Kết quả

Chiến tranh bảo vệ biên giới Tây Nam giành thắng lợi. Chế độ diệt chủng Pol Pot bị lật đổ; nhân dân Campuchia được giải thoát khỏi thảm họa diệt chủng.

## Ý nghĩa

Thắng lợi này bảo vệ vững chắc chủ quyền, lãnh thổ ở biên giới Tây Nam của Tổ quốc, đồng thời thể hiện tinh thần quốc tế cao cả, giúp nhân dân Campuchia hồi sinh đất nước.

## Câu chuyện nhỏ

Ở **Ba Chúc**, những người dân sống sót sau vụ thảm sát đã cùng chính quyền dựng nên **Nhà mồ Ba Chúc**, lưu giữ hài cốt các nạn nhân. Những câu chuyện của họ nhắc nhở các thế hệ sau về giá trị của hòa bình.

## Em có biết?

Nhiều cựu chiến binh quân tình nguyện Việt Nam đã ở lại giúp Campuchia khôi phục đất nước trong gần 10 năm sau đó, đến năm 1989 mới rút hết về nước.

## Di tích ngày nay

**Khu di tích Nhà mồ Ba Chúc** (An Giang) là di tích quốc gia đặc biệt.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-tay-nam');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-tay-nam'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-tay-nam'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-tay-nam'), (select id from public.historical_locations where slug = 'bien-gioi-tay-nam'), 'Vùng biên giới bị tập đoàn Pol Pot tấn công', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'chien-tranh-bao-ve-bien-gioi-tay-nam') and location_id = (select id from public.historical_locations where slug = 'bien-gioi-tay-nam'));

-- dai-hoi-dang-lan-thu-vi.md
update public.historical_events set content = $md$## Bối cảnh

Sau năm 1975, đất nước bước vào xây dựng trong điều kiện vô cùng khó khăn: hậu quả chiến tranh nặng nề, bị bao vây, cấm vận, lại phải tiến hành chiến tranh bảo vệ biên giới. Cơ chế quản lý **kế hoạch hóa tập trung, quan liêu, bao cấp** kéo dài khiến sản xuất trì trệ. Đầu những năm 1980, đất nước lâm vào khủng hoảng kinh tế – xã hội: hàng hóa khan hiếm, đời sống nhân dân rất khó khăn; cuộc tổng điều chỉnh giá – lương – tiền năm 1985 thất bại, lạm phát tăng vọt.

Trước đó, một số địa phương và ngành đã có những tìm tòi, thử nghiệm mới, như khoán sản phẩm trong nông nghiệp (Chỉ thị 100, năm 1981).

## Diễn biến

Đại hội đại biểu toàn quốc lần thứ VI của Đảng họp tại Hà Nội từ ngày **15 đến 18/12/1986**. Với tinh thần **"nhìn thẳng vào sự thật, đánh giá đúng sự thật, nói rõ sự thật"**, Đại hội nghiêm khắc chỉ ra những sai lầm, khuyết điểm trong lãnh đạo, nhất là về kinh tế.

Đại hội đề ra **đường lối Đổi mới toàn diện**, trọng tâm là đổi mới kinh tế:

- Xóa bỏ cơ chế tập trung quan liêu, bao cấp.
- Phát triển nền kinh tế hàng hóa nhiều thành phần, vận hành theo cơ chế thị trường có sự quản lý của Nhà nước.
- Đổi mới hệ thống chính trị, mở rộng quan hệ đối ngoại.

Đồng chí **Nguyễn Văn Linh** được bầu làm Tổng Bí thư.

## Kết quả

Đường lối Đổi mới nhanh chóng đi vào cuộc sống. Tháng 4/1988, Nghị quyết 10 của Bộ Chính trị (thường gọi là "Khoán 10") giao ruộng đất ổn định lâu dài cho nông dân. Chỉ một năm sau, năm 1989, Việt Nam từ chỗ thiếu lương thực đã bắt đầu **xuất khẩu gạo**.

## Ý nghĩa

Đại hội VI đánh dấu bước ngoặt trong sự nghiệp xây dựng đất nước: mở đầu công cuộc Đổi mới, đưa Việt Nam từng bước thoát khỏi khủng hoảng, tạo nền tảng cho sự phát triển và hội nhập quốc tế những thập niên sau.

## Câu chuyện nhỏ

Từ năm 1966, Bí thư Tỉnh ủy Vĩnh Phúc **Kim Ngọc** đã cho thí điểm "khoán hộ" — giao ruộng cho từng hộ gia đình chăm sóc. Năng suất tăng rõ rệt, nhưng cách làm này bị phê phán là đi chệch đường lối và phải dừng lại. Hơn hai mươi năm sau, tinh thần "khoán" ấy được khẳng định trong Khoán 10 và trở thành một trong những điểm khởi đầu của Đổi mới.

## Em có biết?

- Thời bao cấp, nhiều nhu yếu phẩm như gạo, thịt, vải được mua theo **tem phiếu** và **sổ gạo**; người dân thường phải xếp hàng từ sáng sớm ở các cửa hàng mậu dịch.
- Em có thể hỏi ông bà, cha mẹ về những ngày "xếp hàng mua gạo" — đó là một cách học lịch sử rất sống động.

## Di tích ngày nay

Hội trường Ba Đình cũ — nơi họp Đại hội VI — nay không còn. Một số bảo tàng có trưng bày về thời bao cấp (tem phiếu, sổ gạo, đồ dùng gia đình), giúp em hình dung cuộc sống trước Đổi mới.$md$
where slug = 'dai-hoi-dang-lan-thu-vi' and md5(content) = '1beef38eade1cbf893056d3f13df468a';

-- ha-noi-dien-bien-phu-tren-khong-1972.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'khang-chien-chong-my'), 'Trận "Hà Nội – Điện Biên Phủ trên không"', 'ha-noi-dien-bien-phu-tren-khong-1972', 1972, 1972,
  '1972-12-18', '1972-12-29', '18 – 29/12/1972', 'period', 'Trong 12 ngày đêm cuối năm 1972, quân và dân miền Bắc, trọng tâm là Hà Nội và Hải Phòng, đánh bại cuộc tập kích chiến lược bằng máy bay B-52 của Mỹ, buộc Mỹ phải ký Hiệp định Paris.',
  $md$## Bối cảnh

Tháng 10/1972, văn bản Hiệp định Paris cơ bản đã được thỏa thuận, nhưng Mỹ lật lọng, đòi sửa đổi nhiều điều khoản. Để ép ta nhân nhượng, Mỹ mở cuộc tập kích chiến lược bằng máy bay ném bom **B-52** vào Hà Nội, Hải Phòng và nhiều nơi khác ở miền Bắc.

## Diễn biến

- Tối **18/12/1972**, những tốp B-52 đầu tiên ném bom Hà Nội. Cuộc tập kích kéo dài **12 ngày đêm** (đến 29/12/1972).
- Nhiều khu dân cư, bệnh viện, trường học bị tàn phá; phố **Khâm Thiên** (26/12) và **Bệnh viện Bạch Mai** (22/12) bị bom rải thảm.
- Bộ đội phòng không – không quân cùng dân quân tự vệ chiến đấu ngoan cường, bắn rơi nhiều máy bay B-52 ngay trên bầu trời Hà Nội.

## Kết quả

Theo số liệu của ta, trong 12 ngày đêm, quân dân miền Bắc bắn rơi 81 máy bay, trong đó có 34 máy bay B-52. Ngày 30/12/1972, Mỹ buộc phải tuyên bố ngừng ném bom miền Bắc và trở lại bàn đàm phán.

## Ý nghĩa

Thắng lợi này được gọi là trận **"Điện Biên Phủ trên không"**, đập tan cố gắng quân sự cao nhất của Mỹ nhằm ép ta nhân nhượng, buộc Mỹ ký Hiệp định Paris ngày 27/1/1973.

## Câu chuyện nhỏ

Đêm 27/12/1972, một chiếc B-52 bị bắn rơi xuống **hồ Hữu Tiệp** giữa khu dân cư Ngọc Hà. Xác máy bay nằm trong lòng hồ nhỏ từ đó đến nay, như một chứng tích giữa lòng Thủ đô.

## Em có biết?

Ngay từ năm 1968, Chủ tịch Hồ Chí Minh đã dự báo: *"Sớm muộn đế quốc Mỹ cũng sẽ đưa B-52 ra đánh Hà Nội rồi có thua mới chịu thua"*, và dặn cần chuẩn bị trước.

## Di tích ngày nay

**Hồ Hữu Tiệp** (phố Hoàng Hoa Thám, Hà Nội) còn xác B-52. **Bảo tàng Chiến thắng B-52** và **Đài tưởng niệm Khâm Thiên** là những nơi em có thể đến thăm để hiểu thêm về 12 ngày đêm ấy.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'ha-noi-dien-bien-phu-tren-khong-1972');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'ha-noi-dien-bien-phu-tren-khong-1972'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'ha-noi-dien-bien-phu-tren-khong-1972'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'ha-noi-dien-bien-phu-tren-khong-1972'), (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'), 'Trọng điểm của cuộc tập kích bằng B-52', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'ha-noi-dien-bien-phu-tren-khong-1972') and location_id = (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'));

-- hiep-dinh-geneve-ve-dong-duong.md
update public.historical_events set content = $md$## Bối cảnh

Đầu năm 1954, các nước lớn đồng ý triệu tập hội nghị ở Genève (Thụy Sĩ) để bàn về chiến tranh Triều Tiên và lập lại hòa bình ở Đông Dương. Ngày **8/5/1954** — một ngày sau chiến thắng Điện Biên Phủ — hội nghị bắt đầu thảo luận về vấn đề Đông Dương.

Tham dự có đại diện Liên Xô, Mỹ, Anh, Pháp, Trung Quốc, Việt Nam Dân chủ Cộng hòa, Quốc gia Việt Nam (chính quyền Bảo Đại), Lào và Campuchia. Đoàn Việt Nam Dân chủ Cộng hòa do Phó Thủ tướng kiêm Bộ trưởng Ngoại giao **Phạm Văn Đồng** dẫn đầu.

## Diễn biến

Cuộc đấu tranh ngoại giao diễn ra gay gắt, phức tạp vì lập trường ngoan cố của Pháp, Mỹ và sự chi phối của các nước lớn. Đoàn ta kiên trì đòi Pháp công nhận độc lập, chủ quyền của ba nước Đông Dương. Ngày **21/7/1954**, các hiệp định đình chỉ chiến sự ở Việt Nam, Lào, Campuchia được ký kết.

## Kết quả

Hiệp định Genève quy định:

- Các nước tham dự cam kết tôn trọng **độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ** của Việt Nam, Lào, Campuchia.
- Ngừng bắn trên toàn Đông Dương; lấy **vĩ tuyến 17** (sông Bến Hải) làm giới tuyến quân sự tạm thời, hai bên tập kết quân đội về hai miền.
- Tổng tuyển cử tự do trong cả nước vào tháng 7/1956 để thống nhất đất nước, dưới sự giám sát của một Ủy ban quốc tế (Ấn Độ, Ba Lan, Canada).

Mỹ không ký hiệp định. Tháng 10/1954, Thủ đô Hà Nội được giải phóng; tháng 5/1955, những toán quân Pháp cuối cùng rút khỏi miền Bắc.

## Ý nghĩa

Hiệp định Genève là văn bản pháp lý quốc tế ghi nhận các quyền dân tộc cơ bản của nhân dân Đông Dương, đánh dấu thắng lợi của cuộc kháng chiến chống Pháp; miền Bắc hoàn toàn giải phóng. Tuy nhiên, đất nước còn tạm thời bị chia cắt làm hai miền.

## Câu chuyện nhỏ

Khi hiệp định được ký, nhiều gia đình ở hai bờ sông Bến Hải chia tay nhau trên **cầu Hiền Lương** với lời hẹn: "hai năm nữa gặp lại" sau tổng tuyển cử. Nhưng tổng tuyển cử không diễn ra; lời hẹn ấy kéo dài tới **21 năm**, đến tận mùa xuân 1975.

## Em có biết?

- Người thay mặt Việt Nam Dân chủ Cộng hòa ký hiệp định đình chỉ chiến sự ở Việt Nam là Thứ trưởng Bộ Quốc phòng **Tạ Quang Bửu**.
- Cây cầu Hiền Lương từng được sơn hai màu khác nhau ở hai nửa cầu trong những năm đất nước bị chia cắt.

## Di tích ngày nay

**Khu di tích Đôi bờ Hiền Lương – Bến Hải** (Quảng Trị) là di tích quốc gia đặc biệt, có cầu Hiền Lương được phục dựng, cột cờ và tượng đài Khát vọng thống nhất.$md$
where slug = 'hiep-dinh-geneve-ve-dong-duong' and md5(content) = 'd3d9c811c52334f0bc52d05cb11fbf83';

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'), (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong') and topic_id = (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'));

-- hiep-dinh-paris-ve-viet-nam.md
update public.historical_events set content = $md$## Bối cảnh

Sau đòn tiến công Tết Mậu Thân 1968, Mỹ buộc phải ngồi vào bàn đàm phán. Ngày **13/5/1968**, cuộc đàm phán chính thức giữa Việt Nam Dân chủ Cộng hòa và Hoa Kỳ bắt đầu tại Paris. Từ ngày 25/1/1969, hội nghị mở rộng thành **hội nghị bốn bên**: Việt Nam Dân chủ Cộng hòa, Mặt trận Dân tộc Giải phóng miền Nam Việt Nam (từ 6/1969 là Chính phủ Cách mạng lâm thời Cộng hòa miền Nam Việt Nam), Hoa Kỳ và chính quyền Sài Gòn.

## Diễn biến

- Đoàn Việt Nam Dân chủ Cộng hòa do Bộ trưởng **Xuân Thủy** làm trưởng đoàn, đồng chí **Lê Đức Thọ** làm cố vấn đặc biệt. Đoàn Chính phủ Cách mạng lâm thời do Bộ trưởng Ngoại giao **Nguyễn Thị Bình** dẫn đầu.
- Cuộc đàm phán kéo dài, giằng co vì Mỹ muốn dùng sức ép quân sự để buộc ta nhượng bộ. Tháng 10/1972, dự thảo hiệp định đã được thỏa thuận nhưng Mỹ lật lọng.
- Từ ngày 18 đến 29/12/1972, Mỹ dùng máy bay B-52 ném bom Hà Nội, Hải Phòng. Quân dân miền Bắc đánh bại cuộc tập kích này (trận "Hà Nội – Điện Biên Phủ trên không"), buộc Mỹ trở lại bàn đàm phán.
- Ngày **27/1/1973**, Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được ký chính thức.

## Kết quả

Hiệp định quy định: Hoa Kỳ và các nước cam kết tôn trọng độc lập, chủ quyền, thống nhất và toàn vẹn lãnh thổ của Việt Nam; Mỹ rút hết quân viễn chinh và quân đồng minh trong vòng 60 ngày; ngừng bắn trên toàn miền Nam; nhân dân miền Nam tự quyết định tương lai chính trị; các bên trao trả tù binh. Ngày 29/3/1973, toán lính Mỹ cuối cùng rút khỏi miền Nam.

## Ý nghĩa

Hiệp định Paris là thắng lợi của sự kết hợp đấu tranh quân sự, chính trị và ngoại giao. Mỹ phải công nhận các quyền dân tộc cơ bản của Việt Nam và rút quân — tạo thời cơ thuận lợi để nhân dân ta tiến lên giải phóng hoàn toàn miền Nam.

## Câu chuyện nhỏ

Trong lễ ký ngày 27/1/1973, Bộ trưởng **Nguyễn Thị Bình** đặt bút ký thay mặt Chính phủ Cách mạng lâm thời Cộng hòa miền Nam Việt Nam. Bà là **người phụ nữ duy nhất** ký Hiệp định Paris. Suốt những năm đàm phán, hình ảnh bà điềm tĩnh, sắc sảo trong các cuộc họp báo đã giúp bạn bè quốc tế hiểu và ủng hộ cuộc đấu tranh chính nghĩa của nhân dân Việt Nam.

## Em có biết?

- Cuộc đàm phán kéo dài **4 năm 9 tháng**, với **202 phiên họp chung** công khai và **24 cuộc gặp riêng**.
- Năm 1973, Ủy ban Nobel trao giải Nobel Hòa bình cho Lê Đức Thọ và Henry Kissinger, nhưng **Lê Đức Thọ từ chối nhận** vì hòa bình ở Việt Nam chưa thật sự được lập lại.

## Di tích ngày nay

Lễ ký diễn ra tại **Trung tâm Hội nghị quốc tế trên đại lộ Kléber** (Paris), nay là khách sạn The Peninsula Paris. Ở Hà Nội, **Bảo tàng Chiến thắng B-52** lưu giữ nhiều hiện vật về trận "Hà Nội – Điện Biên Phủ trên không".$md$
where slug = 'hiep-dinh-paris-ve-viet-nam' and md5(content) = '6240060998ead3396a2ecb110d8342a2';

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'), (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam') and topic_id = (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'));

-- hiep-dinh-so-bo-6-3-1946.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'), 'Hiệp định Sơ bộ 6/3/1946', 'hiep-dinh-so-bo-6-3-1946', 1946, 1946,
  '1946-03-06', '1946-03-06', '6/3/1946', 'exact', 'Ngày 6/3/1946, Chủ tịch Hồ Chí Minh thay mặt Chính phủ Việt Nam Dân chủ Cộng hòa ký với đại diện Chính phủ Pháp bản Hiệp định Sơ bộ, tạm thời hòa hoãn với Pháp để gạt quân Trung Hoa Dân quốc ra khỏi miền Bắc, tranh thủ thời gian chuẩn bị lực lượng.',
  $md$## Bối cảnh

Sau Cách mạng tháng Tám, nước Việt Nam Dân chủ Cộng hòa non trẻ phải đối phó cùng lúc với nhiều kẻ thù. Ở miền Bắc có khoảng 20 vạn quân Trung Hoa Dân quốc vào giải giáp quân Nhật; ở miền Nam, thực dân Pháp đã quay lại gây chiến. Ngày 28/2/1946, Pháp và Trung Hoa Dân quốc ký Hiệp ước Hoa – Pháp: quân Pháp được ra miền Bắc thay quân Trung Hoa Dân quốc. Ta đứng trước lựa chọn: đánh Pháp ngay, hay tạm hòa hoãn để có thời gian chuẩn bị.

## Diễn biến

Ban Thường vụ Trung ương Đảng chủ trương **"hòa để tiến"**. Chiều **6/3/1946**, tại Hà Nội, Chủ tịch Hồ Chí Minh thay mặt Chính phủ Việt Nam Dân chủ Cộng hòa ký với đại diện Chính phủ Pháp là J. Sainteny bản **Hiệp định Sơ bộ**.

## Kết quả

Hiệp định quy định:

- Chính phủ Pháp công nhận Việt Nam là một **quốc gia tự do**, có chính phủ, nghị viện, quân đội và tài chính riêng, nằm trong khối Liên hiệp Pháp.
- Việt Nam đồng ý để 15.000 quân Pháp ra miền Bắc thay quân Trung Hoa Dân quốc; số quân này sẽ rút dần trong thời hạn 5 năm.
- Hai bên ngừng bắn ở Nam Bộ, tạo không khí thuận lợi cho đàm phán chính thức.

Tiếp đó, ngày 14/9/1946, Chủ tịch Hồ Chí Minh ký với Pháp bản Tạm ước, tiếp tục kéo dài thời gian hòa hoãn.

## Ý nghĩa

Hiệp định Sơ bộ là một sách lược ngoại giao mềm dẻo, khôn khéo: tránh phải đối phó cùng lúc với nhiều kẻ thù, đẩy được quân Trung Hoa Dân quốc ra khỏi miền Bắc, có thêm thời gian củng cố chính quyền và chuẩn bị lực lượng cho cuộc kháng chiến lâu dài.

## Câu chuyện nhỏ

Nhiều người khi ấy không hiểu vì sao Chính phủ lại để quân Pháp vào miền Bắc. Ngày 7/3/1946, tại cuộc mít tinh trước Nhà hát Lớn Hà Nội, Chủ tịch Hồ Chí Minh nói chuyện trực tiếp với đồng bào:

> Tôi, Hồ Chí Minh, suốt cuộc đời đã cùng đồng bào chiến đấu cho độc lập của Tổ quốc. Tôi thà chết chứ không bao giờ bán nước.
> — Hồ Chí Minh, mít tinh ngày 7/3/1946

Lời nói chân thành ấy giúp nhân dân tin tưởng vào chủ trương "hòa để tiến".

## Em có biết?

Chỉ chín tháng sau, khi thực dân Pháp liên tiếp bội ước, cuộc kháng chiến toàn quốc bùng nổ (19/12/1946) — lúc ấy lực lượng của ta đã được chuẩn bị tốt hơn nhiều.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946'), (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'), 'Nơi ký Hiệp định Sơ bộ', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946') and location_id = (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'));

insert into public.event_figures (event_id, figure_id, relationship, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946'), (select id from public.historical_figures where slug = 'ho-chi-minh'), 'Người thay mặt Chính phủ ký Hiệp định', 1
where not exists (select 1 from public.event_figures where event_id = (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946') and figure_id = (select id from public.historical_figures where slug = 'ho-chi-minh'));

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946'), (select id from public.curriculum_topics where slug = 'ho-chi-minh')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'hiep-dinh-so-bo-6-3-1946') and topic_id = (select id from public.curriculum_topics where slug = 'ho-chi-minh'));

-- nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang.md
update public.historical_events set content = $md$## Bối cảnh

Chiến tranh thế giới thứ hai bùng nổ (9/1939). Tháng 6/1940, Pháp đầu hàng Đức; tháng 9/1940, Nhật vào Đông Dương. Thực dân Pháp và phát xít Nhật cùng câu kết áp bức, bóc lột, khiến nhân dân ta chịu cảnh "một cổ hai tròng". Mâu thuẫn giữa dân tộc Việt Nam với đế quốc, phát xít trở nên gay gắt; nhiệm vụ giải phóng dân tộc được đặt ra cấp bách.

Sau gần 30 năm hoạt động ở nước ngoài, lãnh tụ Nguyễn Ái Quốc nhận định thời cơ cách mạng đang tới gần và quyết định về nước để trực tiếp lãnh đạo.

## Diễn biến

- Ngày **28/1/1941**, Nguyễn Ái Quốc vượt biên giới Việt – Trung ở khu vực cột mốc 108 (Hà Quảng, Cao Bằng), trở về Tổ quốc.
- Người sống và làm việc tại **hang Cốc Bó**, bản Pác Bó, trong điều kiện vô cùng gian khổ; đặt tên dòng suối trước hang là **suối Lê-nin**, ngọn núi bên cạnh là **núi Các Mác**.
- Từ ngày 10 đến 19/5/1941, Người chủ trì **Hội nghị lần thứ 8 Ban Chấp hành Trung ương Đảng** tại Pác Bó. Hội nghị đặt nhiệm vụ giải phóng dân tộc lên hàng đầu và quyết định thành lập **Mặt trận Việt Minh** (19/5/1941).
- Người mở lớp huấn luyện cán bộ, sáng lập báo *Việt Nam độc lập* (1941), dịch và viết tài liệu cho cán bộ, nhân dân.

## Kết quả

Từ căn cứ Cao Bằng, phong trào Việt Minh phát triển nhanh chóng. Các tổ chức cứu quốc ra đời; lực lượng chính trị và lực lượng vũ trang từng bước được xây dựng. Ngày 22/12/1944, theo chỉ thị của Người, Đội Việt Nam Tuyên truyền Giải phóng quân được thành lập.

## Ý nghĩa

Việc Nguyễn Ái Quốc về nước là sự kiện có ý nghĩa quyết định: cách mạng Việt Nam có sự lãnh đạo trực tiếp của lãnh tụ; đường lối giải phóng dân tộc được hoàn chỉnh; lực lượng cách mạng được chuẩn bị chu đáo. Đây là những tiền đề quan trọng cho thắng lợi của Tổng khởi nghĩa tháng Tám năm 1945.

## Câu chuyện nhỏ

Cuộc sống ở hang Cốc Bó rất thiếu thốn: hang ẩm lạnh, bữa ăn thường chỉ có cháo ngô và rau rừng. Vậy mà Người vẫn làm việc bên chiếc bàn đá cạnh suối, dịch tài liệu *Lịch sử Đảng Cộng sản Liên Xô*, và viết những vần thơ lạc quan:

> Sáng ra bờ suối, tối vào hang,
> Cháo bẹ rau măng vẫn sẵn sàng.
> Bàn đá chông chênh dịch sử Đảng,
> Cuộc đời cách mạng thật là sang.
> — Hồ Chí Minh, *Tức cảnh Pác Bó* (1941)

## Em có biết?

- Cột mốc 108 nơi Người về nước nay mang số hiệu **675** sau đợt cắm mốc biên giới mới.
- Chiếc "bàn đá chông chênh" trong bài thơ là một phiến đá bên bờ suối Lê-nin, đến nay vẫn còn.

## Di tích ngày nay

**Khu di tích quốc gia đặc biệt Pác Bó** (xã Trường Hà, tỉnh Cao Bằng) gồm hang Cốc Bó, suối Lê-nin, núi Các Mác, lán Khuổi Nậm và nhà tưởng niệm Chủ tịch Hồ Chí Minh.$md$
where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang' and md5(content) = 'b4bf1b54ecbd857231418c76c51b2c5d';

-- nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc.md
update public.historical_events set content = $md$## Bối cảnh

Đầu thế kỷ XX, Việt Nam đã trở thành thuộc địa của thực dân Pháp. Các phong trào yêu nước lần lượt thất bại: phong trào Cần Vương cuối thế kỷ XIX bị đàn áp; con đường dựa vào Nhật Bản để đánh Pháp của Phan Bội Châu (phong trào Đông du) và con đường cải cách của Phan Châu Trinh đều không đưa được dân tộc đến độc lập.

Sinh năm 1890 ở Kim Liên (Nam Đàn, Nghệ An), trong một gia đình nhà nho yêu nước, Nguyễn Tất Thành sớm chứng kiến nỗi khổ của người dân mất nước. Anh khâm phục các bậc tiền bối nhưng không tán thành con đường của họ, và quyết định sang phương Tây — nơi có những tư tưởng "tự do, bình đẳng, bác ái" — để tìm hiểu xem các nước ấy làm thế nào, rồi trở về giúp đồng bào.

## Diễn biến

- Năm 1910, Nguyễn Tất Thành dạy học ở Trường Dục Thanh (Phan Thiết), rồi vào Sài Gòn tìm cách ra nước ngoài.
- Ngày **5/6/1911**, tại Bến Nhà Rồng, anh xuống tàu buôn Pháp **Amiral Latouche-Tréville**, lấy tên là **Văn Ba**, làm phụ bếp để đổi lấy chuyến đi.
- Tháng 7/1911, tàu cập cảng Mác-xây (Pháp). Từ đó, anh làm nhiều nghề để sống và học hỏi, đi qua nhiều nước ở châu Âu, châu Phi, châu Mỹ.

## Kết quả

Chuyến đi mở đầu gần 30 năm bôn ba ở nước ngoài. Năm 1919, lấy tên Nguyễn Ái Quốc, Người gửi *Bản yêu sách của nhân dân An Nam* tới Hội nghị Véc-xai. Tháng 7/1920, Người đọc *Sơ thảo lần thứ nhất những luận cương về vấn đề dân tộc và vấn đề thuộc địa* của Lênin và tìm thấy con đường giải phóng dân tộc: con đường cách mạng vô sản. Tháng 12/1920, tại Đại hội Tua, Người bỏ phiếu tán thành gia nhập Quốc tế Cộng sản và tham gia sáng lập Đảng Cộng sản Pháp.

## Ý nghĩa

Sự kiện 5/6/1911 là bước ngoặt trong cuộc đời Nguyễn Tất Thành và của cả dân tộc: người thanh niên yêu nước đã chọn hướng đi mới — sang phương Tây, tự mình tìm hiểu, rồi lựa chọn con đường cứu nước phù hợp với xu thế thời đại. Con đường đó về sau dẫn tới sự ra đời của Đảng Cộng sản Việt Nam (1930) và thắng lợi của Cách mạng tháng Tám năm 1945.

## Câu chuyện nhỏ

Để có mặt trên tàu, Nguyễn Tất Thành xin làm phụ bếp với tên Văn Ba. Công việc rất vất vả: dậy từ sáng sớm, nhóm lò, rửa nồi, khuân than trong khoang bếp nóng bức, giữa những ngày biển động. Một người thanh niên 21 tuổi, không tiền bạc, không người quen ở xứ lạ, đã chọn con đường lao động bằng chính đôi tay để được đi, được thấy và được học.

## Em có biết?

- Khi rời Tổ quốc, Nguyễn Tất Thành mới **21 tuổi** — trạc tuổi các anh chị sinh viên năm ba hôm nay.
- Ngày 5/6 hằng năm được nhắc đến như ngày kỷ niệm Bác Hồ ra đi tìm đường cứu nước.

## Di tích ngày nay

**Bến Nhà Rồng** (số 1 Nguyễn Tất Thành, TP. Hồ Chí Minh) nay là Bảo tàng Hồ Chí Minh – Chi nhánh TP. Hồ Chí Minh, trưng bày nhiều hiện vật về hành trình tìm đường cứu nước của Người. Khu di tích Kim Liên (Nam Đàn, Nghệ An) là quê nội và quê ngoại của Bác.$md$
where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc' and md5(content) = 'a66e02867a4ff07b7b80e5ebadb74b8c';

-- toan-quoc-khang-chien-19-12-1946.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'khang-chien-chong-phap'), 'Cuộc kháng chiến toàn quốc bùng nổ', 'toan-quoc-khang-chien-19-12-1946', 1946, 1946,
  '1946-12-19', '1946-12-19', '19/12/1946', 'exact', 'Tối 19/12/1946, trước những hành động bội ước và tối hậu thư của thực dân Pháp, cuộc kháng chiến toàn quốc bùng nổ bắt đầu từ Hà Nội. Lời kêu gọi toàn quốc kháng chiến của Chủ tịch Hồ Chí Minh khơi dậy ý chí "thà hy sinh tất cả chứ nhất định không chịu mất nước".',
  $md$## Bối cảnh

Sau Hiệp định Sơ bộ và Tạm ước, thực dân Pháp liên tiếp bội ước: tháng 11/1946, Pháp đánh chiếm Hải Phòng, Lạng Sơn; tháng 12/1946, Pháp gây nhiều vụ khiêu khích ở Hà Nội. Ngày 18/12/1946, Pháp gửi tối hậu thư đòi ta giải tán lực lượng tự vệ, giao quyền kiểm soát Thủ đô. Nhân nhượng đã đến giới hạn cuối cùng.

## Diễn biến

- Ngày 18 và 19/12/1946, Ban Thường vụ Trung ương Đảng họp tại làng Vạn Phúc (Hà Đông), quyết định phát động toàn quốc kháng chiến.
- **20 giờ ngày 19/12/1946**, công nhân Nhà máy điện Yên Phụ phá máy, cả thành phố mất điện — hiệu lệnh cho các lực lượng vũ trang ở Hà Nội đồng loạt nổ súng. Cuộc chiến đấu lan rộng ra các thành phố khác.
- Sáng 20/12/1946, **Lời kêu gọi toàn quốc kháng chiến** của Chủ tịch Hồ Chí Minh được phát đi.

> Không! Chúng ta thà hy sinh tất cả, chứ nhất định không chịu mất nước, nhất định không chịu làm nô lệ.
> — Hồ Chí Minh, Lời kêu gọi toàn quốc kháng chiến

## Kết quả

Quân dân Hà Nội chiến đấu kiên cường trong khoảng **60 ngày đêm**, giam chân địch trong thành phố, tạo điều kiện để các cơ quan Trung ương và lực lượng kháng chiến rút lên căn cứ Việt Bắc an toàn. Tháng 2/1947, Trung đoàn Thủ đô rút ra ngoài thành, tiếp tục chiến đấu.

## Ý nghĩa

Ngày 19/12/1946 mở đầu cuộc kháng chiến toàn quốc chống thực dân Pháp — cuộc kháng chiến toàn dân, toàn diện, lâu dài, dựa vào sức mình là chính. Cuộc chiến đấu ở các đô thị đã bảo toàn lực lượng và chuẩn bị cho cuộc kháng chiến lâu dài.

## Câu chuyện nhỏ

Trong những ngày chiến đấu ở Hà Nội, nhiều chiến sĩ trẻ của **Trung đoàn Thủ đô** — có người mới mười lăm, mười sáu tuổi — tình nguyện ở lại bám trụ từng góc phố, từng ngôi nhà với khẩu hiệu **"Quyết tử để Tổ quốc quyết sinh"**.

## Em có biết?

Lời kêu gọi toàn quốc kháng chiến được Chủ tịch Hồ Chí Minh viết tại một ngôi nhà ở làng Vạn Phúc (nay thuộc Hà Nội). Ngôi nhà ấy nay là di tích lịch sử.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946'), (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'), 'Nơi nổ súng mở đầu kháng chiến toàn quốc', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946') and location_id = (select id from public.historical_locations where slug = 'ha-noi-khu-vuc-trung-tam'));

insert into public.event_figures (event_id, figure_id, relationship, sort_order)
select (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946'), (select id from public.historical_figures where slug = 'ho-chi-minh'), 'Người ra Lời kêu gọi toàn quốc kháng chiến', 1
where not exists (select 1 from public.event_figures where event_id = (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946') and figure_id = (select id from public.historical_figures where slug = 'ho-chi-minh'));

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946'), (select id from public.curriculum_topics where slug = 'ho-chi-minh')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'toan-quoc-khang-chien-19-12-1946') and topic_id = (select id from public.curriculum_topics where slug = 'ho-chi-minh'));

-- tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi.md
update public.historical_events set content = $md$## Bối cảnh

Giữa tháng 8/1945, phát xít Nhật đầu hàng Đồng minh không điều kiện. Quân Nhật ở Đông Dương hoang mang, chính phủ thân Nhật Trần Trọng Kim rệu rã. Thời cơ "ngàn năm có một" để giành độc lập đã đến, nhưng cũng rất ngắn: phải giành chính quyền trước khi quân Đồng minh vào Đông Dương.

Ngày 13/8/1945, Ủy ban khởi nghĩa toàn quốc được thành lập và ra Quân lệnh số 1. Hội nghị toàn quốc của Đảng (14–15/8) và Quốc dân Đại hội ở Tân Trào (16/8) quyết định phát động Tổng khởi nghĩa trong cả nước.

## Diễn biến

- Ngày **17/8/1945**, cuộc mít tinh do Tổng hội viên chức tổ chức trước Nhà hát Lớn đã biến thành cuộc mít tinh ủng hộ Việt Minh. Xứ ủy Bắc Kỳ quyết định khởi nghĩa vào ngày 19/8.
- Sáng **19/8/1945**, hàng chục vạn người từ nội thành và ngoại thành, cầm cờ đỏ sao vàng, băng rôn, giáo mác, kéo về Quảng trường Nhà hát Lớn dự mít tinh.
- Sau mít tinh, quần chúng chia thành nhiều đoàn biểu tình có tự vệ đi kèm, chiếm Phủ Khâm sai Bắc Bộ, Tòa Thị chính, Sở Cảnh sát, Trại Bảo an binh và nhiều công sở khác.

## Kết quả

Chỉ trong một ngày, chính quyền ở Hà Nội đã về tay nhân dân, hầu như không phải đổ máu. Tiếp đó, khởi nghĩa giành thắng lợi ở Huế (23/8) và Sài Gòn (25/8). Đến ngày 28/8/1945, Tổng khởi nghĩa đã thành công trong cả nước. Ngày 30/8, vua Bảo Đại thoái vị, chấm dứt chế độ quân chủ ở Việt Nam.

## Ý nghĩa

Thắng lợi ở Hà Nội — trung tâm chính trị của cả nước — có ý nghĩa quyết định, cổ vũ mạnh mẽ các địa phương khác nổi dậy, làm tê liệt ý chí kháng cự của chính quyền thân Nhật. Đây là minh chứng cho sức mạnh của khối đoàn kết toàn dân khi biết chớp đúng thời cơ.

## Câu chuyện nhỏ

Trong cuộc mít tinh chiều 17/8/1945, khi diễn giả của chính quyền thân Nhật đang phát biểu, một lá cờ đỏ sao vàng rất lớn bất ngờ được thả xuống từ ban công Nhà hát Lớn. Các cán bộ Việt Minh lên lễ đài, kêu gọi đồng bào ủng hộ Việt Minh. Cả biển người hô vang khẩu hiệu. Chỉ hai ngày sau, cũng tại quảng trường ấy, người Hà Nội đứng lên giành chính quyền.

## Em có biết?

- Ngày 19/8/1945 được chọn là **ngày truyền thống của lực lượng Công an nhân dân Việt Nam**.
- Cả nước giành chính quyền chỉ trong khoảng **15 ngày** (14 – 28/8/1945).

## Di tích ngày nay

**Nhà hát Lớn Hà Nội** (số 1 Tràng Tiền) vẫn là nơi tổ chức nhiều sự kiện văn hóa lớn. **Bắc Bộ phủ** (12 Ngô Quyền) — nơi quần chúng chiếm được ngày 19/8 — nay là Nhà khách Chính phủ.$md$
where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi' and md5(content) = '9e07c4e054bee6e1840bce6df31364bf';

-- tong-tien-cong-va-noi-day-tet-mau-than-1968.md
update public.historical_events set content = $md$## Bối cảnh

Từ năm 1965, Mỹ tiến hành chiến lược "Chiến tranh cục bộ", đưa quân viễn chinh Mỹ và đồng minh vào miền Nam, đồng thời ném bom phá hoại miền Bắc. Qua hai mùa khô 1965–1966 và 1966–1967, các cuộc phản công của Mỹ đều không đạt mục tiêu. Nhận định so sánh lực lượng có lợi, lại nhân dịp năm bầu cử tổng thống ở Mỹ (1968), ta chủ trương mở cuộc **Tổng tiến công và nổi dậy** trên toàn miền Nam, đánh vào các đô thị — nơi Mỹ và chính quyền Sài Gòn cho là an toàn nhất.

## Diễn biến

- **Đợt 1:** đêm 30 rạng sáng **31/1/1968** (đêm Giao thừa Tết Mậu Thân), quân và dân miền Nam đồng loạt tiến công và nổi dậy ở hầu khắp các thành phố, thị xã.
- Tại **Sài Gòn**, các lực lượng vũ trang, trong đó có biệt động thành, đánh vào những mục tiêu đầu não như Tòa Đại sứ Mỹ, Dinh Độc Lập, Bộ Tổng tham mưu quân đội Sài Gòn, sân bay Tân Sơn Nhất, Đài phát thanh.
- Tại **Huế**, quân ta làm chủ phần lớn thành phố trong khoảng 25 ngày đêm.
- **Đợt 2** (tháng 5 – 6/1968) và **đợt 3** (tháng 8 – 9/1968) tiếp tục tiến công nhưng gặp nhiều khó khăn.

## Kết quả

Cuộc Tổng tiến công và nổi dậy gây cho Mỹ và chính quyền Sài Gòn nhiều thiệt hại, làm rung chuyển hệ thống chính quyền ở các đô thị. Tuy nhiên, ta cũng chịu **tổn thất lớn**, nhất là ở các đợt 2 và 3, do đánh giá chưa đúng tương quan lực lượng và chưa kịp thời điều chỉnh khi địch phản kích.

## Ý nghĩa

Tết Mậu Thân 1968 làm lung lay ý chí xâm lược của giới cầm quyền Mỹ, mở ra bước ngoặt của cuộc kháng chiến chống Mỹ: Mỹ phải tuyên bố "phi Mỹ hóa" chiến tranh, chấm dứt không điều kiện việc ném bom miền Bắc (11/1968) và chấp nhận đàm phán với ta tại Hội nghị Paris (từ 13/5/1968).

## Câu chuyện nhỏ

Mục tiêu táo bạo nhất ở Sài Gòn là **Tòa Đại sứ Mỹ**. Một đội biệt động nhỏ, chỉ với vũ khí nhẹ, đã đánh vào khu vực được xem là an toàn bậc nhất của Mỹ ở miền Nam và cầm cự tới sáng. Hình ảnh trận đánh xuất hiện trên truyền hình Mỹ khiến nhiều người dân Mỹ bắt đầu nghi ngờ lời khẳng định "sắp thắng" của chính phủ họ.

## Em có biết?

Đêm Giao thừa Tết Mậu Thân, đồng bào cả nước nghe lời chúc Tết của Chủ tịch Hồ Chí Minh:

> Xuân này hơn hẳn mấy xuân qua,
> Thắng trận tin vui khắp nước nhà.
> Nam Bắc thi đua đánh giặc Mỹ,
> Tiến lên! Toàn thắng ắt về ta.
> — Hồ Chí Minh, thơ chúc Tết Mậu Thân 1968

## Di tích ngày nay

Ở TP. Hồ Chí Minh, khu vực Tòa Đại sứ Mỹ cũ (đường Lê Duẩn) và Dinh Độc Lập gắn với trận đánh năm 1968. Ở Huế, **Kinh thành Huế** — nơi diễn ra giao tranh ác liệt — đã được trùng tu nhiều hạng mục và là Di sản Văn hóa Thế giới.$md$
where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968' and md5(content) = 'd90e931b971d1223ab3137fdaedbc7f8';

-- tuyen-ngon-doc-lap.md
update public.historical_events set content = $md$## Bối cảnh

Cách mạng tháng Tám thành công trong cả nước. Ngày 25/8/1945, Chủ tịch Hồ Chí Minh từ Tân Trào về Hà Nội. Tại căn nhà số 48 phố Hàng Ngang, Người khởi thảo bản Tuyên ngôn Độc lập. Chính phủ lâm thời quyết định tổ chức mít tinh lớn tại Quảng trường Ba Đình để ra mắt quốc dân và tuyên bố độc lập.

## Diễn biến

- Chiều **2/9/1945**, hàng chục vạn đồng bào Hà Nội và các vùng lân cận, trong trang phục đẹp nhất, cờ hoa rực rỡ, tập trung tại Quảng trường Ba Đình.
- Chính phủ lâm thời ra mắt quốc dân. Thay mặt Chính phủ, Chủ tịch Hồ Chí Minh đọc **bản Tuyên ngôn Độc lập**, khai sinh nước **Việt Nam Dân chủ Cộng hòa**.
- Tuyên ngôn mở đầu bằng việc dẫn những câu "bất hủ" trong Tuyên ngôn Độc lập của Mỹ (1776) và Tuyên ngôn Nhân quyền và Dân quyền của Pháp (1791), rồi vạch trần tội ác của thực dân Pháp, khẳng định nhân dân ta đã giành chính quyền từ tay Nhật chứ không phải từ tay Pháp.

> Nước Việt Nam có quyền hưởng tự do và độc lập, và sự thật đã thành một nước tự do, độc lập. Toàn thể dân Việt Nam quyết đem tất cả tinh thần và lực lượng, tính mạng và của cải để giữ vững quyền tự do, độc lập ấy.
> — Tuyên ngôn Độc lập, 2/9/1945

## Kết quả

Nước Việt Nam Dân chủ Cộng hòa ra đời. Tuyên ngôn tuyên bố thoát ly hẳn quan hệ thực dân với Pháp, xóa bỏ mọi đặc quyền của Pháp ở Việt Nam và khẳng định quyết tâm bảo vệ nền độc lập.

## Ý nghĩa

Tuyên ngôn Độc lập là văn kiện lịch sử có giá trị to lớn: khẳng định quyền độc lập, tự do của dân tộc Việt Nam trước quốc dân và thế giới, đặt nền tảng pháp lý cho nhà nước mới. Việc gắn quyền của mỗi con người với quyền của cả dân tộc cho thấy tầm nhìn nhân văn của văn kiện.

## Câu chuyện nhỏ

Đang đọc Tuyên ngôn, Chủ tịch Hồ Chí Minh bỗng dừng lại và hỏi: *"Tôi nói đồng bào nghe rõ không?"*. Cả quảng trường đồng thanh đáp: *"Có!"*. Câu hỏi giản dị ấy khiến khoảng cách giữa vị Chủ tịch nước và người dân như biến mất — nhiều người có mặt hôm ấy nhớ mãi khoảnh khắc này.

## Em có biết?

- Ngày 2/9 trở thành **Ngày Quốc khánh** của nước ta.
- Câu mở đầu Tuyên ngôn: *"Tất cả mọi người đều sinh ra có quyền bình đẳng. Tạo hóa cho họ những quyền không ai có thể xâm phạm được; trong những quyền ấy, có quyền được sống, quyền tự do và quyền mưu cầu hạnh phúc."*

## Di tích ngày nay

**Quảng trường Ba Đình** và **Lăng Chủ tịch Hồ Chí Minh** (quận Ba Đình cũ, Hà Nội). **Nhà 48 Hàng Ngang** — nơi Người soạn thảo Tuyên ngôn — là di tích lịch sử, mở cửa cho khách tham quan.$md$
where slug = 'tuyen-ngon-doc-lap' and md5(content) = 'd3c0f3d5284700935b1dfc4144ffaec3';

-- viet-nam-gia-nhap-asean-1995.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'), 'Việt Nam gia nhập ASEAN', 'viet-nam-gia-nhap-asean-1995', 1995, 1995,
  '1995-07-28', '1995-07-28', '28/7/1995', 'exact', 'Ngày 28/7/1995, tại Bandar Seri Begawan (Brunei), Việt Nam chính thức trở thành thành viên thứ 7 của Hiệp hội các quốc gia Đông Nam Á (ASEAN).',
  $md$## Bối cảnh

ASEAN được thành lập ngày 8/8/1967. Trong nhiều năm, quan hệ giữa Việt Nam và một số nước ASEAN còn nhiều khác biệt. Từ cuối những năm 1980, khi vấn đề Campuchia được giải quyết và Việt Nam tiến hành Đổi mới, quan hệ Việt Nam – ASEAN cải thiện rõ rệt. Tháng 7/1992, Việt Nam ký Hiệp ước Thân thiện và Hợp tác ở Đông Nam Á và trở thành quan sát viên của ASEAN.

## Diễn biến

Ngày **28/7/1995**, tại Hội nghị Bộ trưởng Ngoại giao ASEAN lần thứ 28 ở Bandar Seri Begawan (Brunei), lễ kết nạp Việt Nam được tổ chức trọng thể. Việt Nam trở thành **thành viên thứ 7** của ASEAN.

## Kết quả

Việt Nam tham gia ngày càng tích cực vào các hoạt động của ASEAN: đăng cai Hội nghị Cấp cao ASEAN lần thứ 6 tại Hà Nội (1998), đảm nhiệm vai trò Chủ tịch ASEAN năm 2010 và năm 2020. Việc gia nhập ASEAN cũng mở đường cho Việt Nam tham gia Khu vực Mậu dịch tự do ASEAN (AFTA).

## Ý nghĩa

Gia nhập ASEAN đánh dấu bước phát triển mới trong chính sách đối ngoại của Việt Nam: từ đối đầu chuyển sang hợp tác, hội nhập khu vực; góp phần xây dựng Đông Nam Á hòa bình, ổn định và thịnh vượng.

## Câu chuyện nhỏ

Tại lễ kết nạp, lá cờ Việt Nam được kéo lên bên cạnh cờ của sáu nước thành viên. Chỉ hai mươi năm trước đó, khu vực còn chìm trong chiến tranh; nay các nước cùng ngồi chung một mái nhà.

## Em có biết?

- Hiện nay ASEAN có **11 thành viên** (Timor-Leste được kết nạp năm 2025).
- Khẩu hiệu của ASEAN là **"Một tầm nhìn, một bản sắc, một cộng đồng"**.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'viet-nam-gia-nhap-asean-1995');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-asean-1995'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-asean-1995'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-asean-1995'), (select id from public.historical_locations where slug = 'bandar-seri-begawan'), 'Nơi lễ kết nạp Việt Nam vào ASEAN diễn ra', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-asean-1995') and location_id = (select id from public.historical_locations where slug = 'bandar-seri-begawan'));

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-asean-1995'), (select id from public.curriculum_topics where slug = 'cong-cuoc-doi-moi')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-asean-1995') and topic_id = (select id from public.curriculum_topics where slug = 'cong-cuoc-doi-moi'));

-- viet-nam-gia-nhap-lien-hop-quoc-1977.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'), 'Việt Nam gia nhập Liên hợp quốc', 'viet-nam-gia-nhap-lien-hop-quoc-1977', 1977, 1977,
  '1977-09-20', '1977-09-20', '20/9/1977', 'exact', 'Ngày 20/9/1977, Đại hội đồng Liên hợp quốc chấp nhận nước Cộng hòa xã hội chủ nghĩa Việt Nam là thành viên thứ 149, mở ra một thời kỳ mới trong hoạt động đối ngoại của Việt Nam.',
  $md$## Bối cảnh

Sau khi đất nước thống nhất, ngày 2/7/1976, Quốc hội khóa VI quyết định đặt tên nước là **Cộng hòa xã hội chủ nghĩa Việt Nam**. Việt Nam mong muốn tham gia Liên hợp quốc để góp tiếng nói vào các vấn đề chung của thế giới và tranh thủ sự giúp đỡ tái thiết đất nước. Tuy nhiên, những lần xin gia nhập trước đó đã bị Mỹ dùng quyền phủ quyết tại Hội đồng Bảo an ngăn cản.

## Diễn biến

Năm 1977, Hội đồng Bảo an Liên hợp quốc thông qua việc giới thiệu Việt Nam. Ngày **20/9/1977**, tại khóa họp thứ 32 của Đại hội đồng Liên hợp quốc ở New York, Việt Nam chính thức trở thành **thành viên thứ 149** của tổ chức này. Lá cờ đỏ sao vàng được kéo lên trước trụ sở Liên hợp quốc.

## Kết quả

Việt Nam có điều kiện tham gia các hoạt động của Liên hợp quốc và các tổ chức chuyên môn như UNESCO, UNICEF, WHO, FAO; nhận được nhiều chương trình hỗ trợ khắc phục hậu quả chiến tranh, phát triển giáo dục, y tế.

## Ý nghĩa

Việc gia nhập Liên hợp quốc là sự công nhận của cộng đồng quốc tế đối với một nước Việt Nam độc lập, thống nhất; nâng cao vị thế của Việt Nam trên trường quốc tế.

## Câu chuyện nhỏ

Nhiều cán bộ ngoại giao Việt Nam có mặt ở New York hôm ấy từng trải qua những năm tháng chiến tranh. Với họ, khoảnh khắc lá cờ Tổ quốc tung bay giữa hàng cờ các nước là kết quả của cả một chặng đường đấu tranh dài của dân tộc.

## Em có biết?

- Việt Nam đã hai lần là **Ủy viên không thường trực Hội đồng Bảo an Liên hợp quốc** (nhiệm kỳ 2008–2009 và 2020–2021).
- Từ năm 2014, Việt Nam cử sĩ quan tham gia **lực lượng gìn giữ hòa bình** của Liên hợp quốc.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'viet-nam-gia-nhap-lien-hop-quoc-1977');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-lien-hop-quoc-1977'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-lien-hop-quoc-1977'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-lien-hop-quoc-1977'), (select id from public.historical_locations where slug = 'tru-so-lien-hop-quoc-new-york'), 'Nơi Đại hội đồng Liên hợp quốc chấp nhận Việt Nam', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-lien-hop-quoc-1977') and location_id = (select id from public.historical_locations where slug = 'tru-so-lien-hop-quoc-new-york'));

-- viet-nam-gia-nhap-wto-2007.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'), 'Việt Nam gia nhập Tổ chức Thương mại Thế giới (WTO)', 'viet-nam-gia-nhap-wto-2007', 2007, 2007,
  '2007-01-11', '2007-01-11', '11/1/2007', 'exact', 'Ngày 11/1/2007, sau hơn 11 năm đàm phán, Việt Nam chính thức trở thành thành viên thứ 150 của Tổ chức Thương mại Thế giới (WTO), hội nhập sâu rộng vào nền kinh tế toàn cầu.',
  $md$## Bối cảnh

Công cuộc Đổi mới đặt ra yêu cầu mở cửa, hội nhập kinh tế quốc tế. Tháng 1/1995, Việt Nam nộp đơn xin gia nhập Tổ chức Thương mại Thế giới (WTO). Để trở thành thành viên, Việt Nam phải đàm phán với nhiều nước và sửa đổi hệ thống pháp luật cho phù hợp với các quy định của WTO.

## Diễn biến

- Việt Nam tiến hành đàm phán song phương với các đối tác và đàm phán đa phương trong suốt hơn 11 năm.
- Ngày 7/11/2006, tại Genève, Đại hội đồng WTO chính thức thông qua việc kết nạp Việt Nam.
- Ngày **11/1/2007**, Việt Nam trở thành **thành viên thứ 150** của WTO.

## Kết quả

Hàng hóa Việt Nam được tiếp cận thị trường của các nước thành viên với điều kiện bình đẳng hơn; đầu tư nước ngoài tăng mạnh; xuất khẩu tăng trưởng nhanh. Đồng thời, doanh nghiệp trong nước phải đối mặt với sức cạnh tranh lớn hơn.

## Ý nghĩa

Gia nhập WTO là mốc quan trọng của quá trình hội nhập kinh tế quốc tế, khẳng định kết quả của công cuộc Đổi mới, tạo động lực cho tăng trưởng và cải cách thể chế.

## Câu chuyện nhỏ

Thứ trưởng Bộ Thương mại **Lương Văn Tự** là Trưởng đoàn đàm phán của Chính phủ trong giai đoạn nước rút. Phiên đàm phán song phương cuối cùng — với Hoa Kỳ — là một trong những phiên khó khăn nhất, kết thúc năm 2006, mở đường cho việc Đại hội đồng WTO thông qua việc kết nạp Việt Nam.

## Em có biết?

Nhiều mặt hàng quen thuộc với em như điện thoại, quần áo, giày dép, cà phê, gạo… được xuất khẩu đi khắp thế giới nhờ quá trình hội nhập mà WTO là một mốc quan trọng.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'viet-nam-gia-nhap-wto-2007');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-wto-2007'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-wto-2007'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-wto-2007'), (select id from public.historical_locations where slug = 'geneve-thuy-si'), 'Nơi đặt trụ sở WTO, nơi Đại hội đồng WTO thông qua việc kết nạp Việt Nam', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-wto-2007') and location_id = (select id from public.historical_locations where slug = 'geneve-thuy-si'));

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'viet-nam-gia-nhap-wto-2007'), (select id from public.curriculum_topics where slug = 'cong-cuoc-doi-moi')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'viet-nam-gia-nhap-wto-2007') and topic_id = (select id from public.curriculum_topics where slug = 'cong-cuoc-doi-moi'));

-- ---------- Sửa chú thích ảnh xe tăng 843 ----------
update public.media_assets
set caption = 'Xe tăng mang số hiệu 843 trưng bày trong khuôn viên Dinh Độc Lập (ảnh năm 2007) — đây là xe cùng loại; hai xe tăng 390 và 843 nguyên bản tiến vào Dinh trưa 30/4/1975 là Bảo vật quốc gia, được lưu giữ tại Hà Nội.'
where file_url like '%/events/chien-dich-ho-chi-minh/xe-tang-dinh-doc-lap-1200.webp'
  and caption like 'Xe tăng 843, một trong những xe tăng đầu tiên%';

commit;
