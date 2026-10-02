-- Đợt nội dung "gd7" (KE_HOACH_NANG_CAP_GIAO_DIEN.md, GĐ7: nội dung còn thiếu của các bài SGK).
-- TỆP SINH TỰ ĐỘNG bởi: node scripts/build-content-sql.mjs --batch gd7 — sửa các file .md có "batch: gd7" rồi chạy lại.
-- KHÔNG phải migration: là dữ liệu, chạy SAU seed-content.sql. Sau đó chạy supabase/seed-sgk.sql để gán sự kiện vào bài.
--
-- Thêm 2 chủ đề, 6 địa điểm và 8 sự kiện ở trạng thái NHÁP (draft): phải qua kiểm duyệt trong trang
-- quản trị (chủ đề và địa điểm công bố TRƯỚC sự kiện) mới hiện ở trang công khai.
-- Chỉ INSERT, mọi câu có "where not exists" nên chạy lại không tạo trùng. Không xóa, không sửa dữ liệu cũ.
-- Nội dung cần giáo viên đối chiếu SGK: docs/du-lieu-can-kiem-chung.md, mục "Nội dung GĐ7".

begin;

-- ---------- Chủ đề mới (nháp) ----------
insert into public.curriculum_topics (name, slug, description, sort_order, workflow_status)
select 'Thế giới trong và sau Chiến tranh lạnh', 'the-gioi-trong-va-sau-chien-tranh-lanh', 'Sự ra đời của Liên hợp quốc, trật tự thế giới hai cực Ianta trong Chiến tranh lạnh và xu thế phát triển của thế giới sau khi Chiến tranh lạnh kết thúc.', 8, 'draft'
where not exists (select 1 from public.curriculum_topics where slug = 'the-gioi-trong-va-sau-chien-tranh-lanh');

insert into public.curriculum_topics (name, slug, description, sort_order, workflow_status)
select 'ASEAN: Những chặng đường lịch sử', 'asean-nhung-chang-duong-lich-su', 'Hiệp hội các quốc gia Đông Nam Á từ khi ra đời năm 1967, mở rộng thành ASEAN 10, đến khi xây dựng Cộng đồng ASEAN.', 9, 'draft'
where not exists (select 1 from public.curriculum_topics where slug = 'asean-nhung-chang-duong-lich-su');

-- ---------- Địa điểm mới (nháp) ----------
insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Cung điện Livađia (Ianta)', 'Ianta', 'cung-dien-livadia-ianta', 'Cung điện ở gần thành phố Ianta, bán đảo Crưm, nơi diễn ra Hội nghị Ianta của nguyên thủ ba cường quốc Liên Xô, Mỹ, Anh (4 – 11/2/1945).', 44.4677, 34.1436, 'approximate', 'Tọa độ khu vực cung điện Livađia (gần đúng).', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'cung-dien-livadia-ianta');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'San Phran-xi-xcô (Hoa Kỳ)', null, 'san-francisco', 'Thành phố ở bờ tây nước Mỹ, nơi họp hội nghị của 50 nước (25/4 – 26/6/1945) thông qua Hiến chương Liên hợp quốc.', 37.7793, -122.4193, 'region', 'Tọa độ trung tâm thành phố San Phran-xi-xcô; chưa xác định tòa nhà họp cụ thể.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'san-francisco');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Manta (Malta)', null, 'manta', 'Đảo quốc ở Địa Trung Hải, nơi nguyên thủ Liên Xô và Mỹ gặp nhau (2 – 3/12/1989) và tuyên bố chấm dứt Chiến tranh lạnh.', 35.84, 14.54, 'region', 'Điểm đại diện vùng biển phía đông nam đảo Manta; cuộc gặp diễn ra trên tàu neo ngoài khơi.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'manta');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Điện Crem-li (Mát-xcơ-va)', null, 'moskva-dien-kremli', 'Quần thể cung điện ở trung tâm thủ đô Mát-xcơ-va, nơi lá cờ Liên Xô được hạ xuống ngày 25/12/1991.', 55.752, 37.6175, 'approximate', 'Tọa độ khu vực điện Crem-li (gần đúng).', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'moskva-dien-kremli');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Băng Cốc (Thái Lan)', null, 'bang-coc', 'Thủ đô Thái Lan, nơi ngoại trưởng 5 nước kí Tuyên bố Băng Cốc thành lập ASEAN ngày 8/8/1967.', 13.7563, 100.5018, 'region', 'Tọa độ trung tâm thành phố Băng Cốc; chưa xác định địa điểm kí cụ thể.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'bang-coc');

insert into public.historical_locations (name, historical_name, slug, description, latitude, longitude, accuracy_level, accuracy_note, workflow_status)
select 'Cu-a-la Lăm-pơ (Ma-lai-xi-a)', null, 'kuala-lumpur', 'Thủ đô Ma-lai-xi-a, nơi lãnh đạo các nước ASEAN kí Tuyên bố về việc thành lập Cộng đồng ASEAN (22/11/2015).', 3.139, 101.6869, 'region', 'Tọa độ trung tâm thành phố Cu-a-la Lăm-pơ; chưa xác định địa điểm họp cụ thể.', 'draft'
where not exists (select 1 from public.historical_locations where slug = 'kuala-lumpur');

-- ---------- Sự kiện mới (nháp) ----------
-- ban-yeu-sach-cua-nhan-dan-an-nam-1919.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'doi-ngoai-viet-nam'), 'Nguyễn Ái Quốc gửi "Bản yêu sách của nhân dân An Nam" tới Hội nghị Véc-xai', 'ban-yeu-sach-cua-nhan-dan-an-nam-1919', 1919, 1919,
  '1919-06-18', '1919-06-18', '18/6/1919', 'exact', 'Ngày 18/6/1919, thay mặt những người Việt Nam yêu nước tại Pháp, Nguyễn Ái Quốc gửi tới Hội nghị Véc-xai bản "Yêu sách của nhân dân An Nam" gồm 8 điểm, đòi các quyền tự do, dân chủ, bình đẳng cho nhân dân Việt Nam.',
  $md$## Bối cảnh

Chiến tranh thế giới thứ nhất kết thúc (11/1918). Năm 1919, các nước thắng trận họp hội nghị hòa bình ở Pa-ri (thường gọi là **Hội nghị Véc-xai**) để phân chia lại thế giới. Tổng thống Mỹ U. Uyn-xơn nêu nguyên tắc về quyền tự quyết của các dân tộc, khiến nhiều dân tộc thuộc địa hi vọng được lên tiếng. Lúc này, Nguyễn Tất Thành đang hoạt động trong Hội những người Việt Nam yêu nước tại Pháp.

## Diễn biến

Ngày **18/6/1919**, thay mặt những người Việt Nam yêu nước tại Pháp, Người gửi tới Hội nghị Véc-xai bản **"Yêu sách của nhân dân An Nam"** gồm **8 điểm**, đòi Chính phủ Pháp thừa nhận các quyền tự do, dân chủ, bình đẳng và quyền tự quyết của nhân dân Việt Nam. Bản yêu sách được kí tên **Nguyễn Ái Quốc** và được gửi tới các phái đoàn dự hội nghị, đăng trên báo chí Pháp.

## Kết quả

Bản yêu sách không được Hội nghị chấp nhận. Tuy vậy, nó gây tiếng vang lớn trong dư luận Pháp và trong cộng đồng người Việt; tên tuổi Nguyễn Ái Quốc bắt đầu được nhiều người biết đến.

## Ý nghĩa

Đây là hoạt động đối ngoại đầu tiên mang tính quốc tế của Nguyễn Ái Quốc, đưa vấn đề Việt Nam ra diễn đàn quốc tế. Qua sự việc, Người rút ra bài học: muốn được giải phóng, các dân tộc chỉ có thể trông cậy vào lực lượng của chính mình — tiền đề để Người tìm tới con đường cách mạng vô sản.

## Em có biết?

- Đây là lần đầu tiên tên gọi **Nguyễn Ái Quốc** ("người yêu nước họ Nguyễn") xuất hiện công khai.
- Bản yêu sách về sau được chuyển thành văn vần với tên "Việt Nam yêu cầu ca" để phổ biến rộng rãi.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919'), (select id from public.historical_locations where slug = 'paris-phap'), 'Nơi Nguyễn Ái Quốc hoạt động và gửi bản yêu sách tới Hội nghị của các nước thắng trận', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919') and location_id = (select id from public.historical_locations where slug = 'paris-phap'));

insert into public.event_figures (event_id, figure_id, relationship, sort_order)
select (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919'), (select id from public.historical_figures where slug = 'ho-chi-minh'), 'Người kí tên Nguyễn Ái Quốc và gửi bản yêu sách', 1
where not exists (select 1 from public.event_figures where event_id = (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919') and figure_id = (select id from public.historical_figures where slug = 'ho-chi-minh'));

insert into public.event_topics (event_id, topic_id)
select (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919'), (select id from public.curriculum_topics where slug = 'ho-chi-minh')
where not exists (select 1 from public.event_topics where event_id = (select id from public.historical_events where slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919') and topic_id = (select id from public.curriculum_topics where slug = 'ho-chi-minh'));

-- cong-dong-asean-2015.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'asean-nhung-chang-duong-lich-su'), 'Cộng đồng ASEAN được thành lập', 'cong-dong-asean-2015', 2015, 2015,
  '2015-12-31', '2015-12-31', '31/12/2015', 'exact', 'Ngày 31/12/2015, Cộng đồng ASEAN chính thức được thành lập với ba trụ cột: Cộng đồng Chính trị – An ninh, Cộng đồng Kinh tế và Cộng đồng Văn hóa – Xã hội.',
  $md$## Bối cảnh

Sau khi trở thành tổ chức của cả 10 nước Đông Nam Á (1999), ASEAN đặt mục tiêu liên kết sâu rộng hơn. Năm 2003, các nhà lãnh đạo ASEAN thông qua ý tưởng xây dựng **Cộng đồng ASEAN**. Ngày 20/11/2007, các nước kí **Hiến chương ASEAN**; Hiến chương có hiệu lực từ ngày 15/12/2008, tạo khuôn khổ pháp lí để ASEAN trở thành một tổ chức liên kết chặt chẽ.

## Diễn biến

Ngày **22/11/2015**, tại Hội nghị cấp cao ASEAN lần thứ 27 ở Cu-a-la Lăm-pơ (Ma-lai-xi-a), lãnh đạo các nước kí Tuyên bố về việc thành lập Cộng đồng ASEAN. Ngày **31/12/2015**, Cộng đồng ASEAN chính thức được thành lập.

## Kết quả

Cộng đồng ASEAN gồm **ba trụ cột**:

- **Cộng đồng Chính trị – An ninh**: bảo đảm hòa bình, ổn định, giải quyết bất đồng bằng biện pháp hòa bình.
- **Cộng đồng Kinh tế**: một thị trường và cơ sở sản xuất thống nhất, tự do lưu chuyển hàng hóa, dịch vụ, đầu tư.
- **Cộng đồng Văn hóa – Xã hội**: nâng cao chất lượng cuộc sống, gìn giữ bản sắc, hướng tới cộng đồng lấy người dân làm trung tâm.

Cùng năm 2015, ASEAN thông qua **Tầm nhìn Cộng đồng ASEAN 2025** để tiếp tục xây dựng cộng đồng.

## Ý nghĩa

Sự ra đời của Cộng đồng ASEAN đánh dấu bước phát triển mới về chất của hợp tác khu vực: từ một hiệp hội lỏng lẻo trở thành một cộng đồng gắn kết, có vai trò trung tâm trong các cơ chế hợp tác ở châu Á – Thái Bình Dương. Việt Nam là thành viên tích cực, chủ động đóng góp vào tiến trình này.

## Em có biết?

- Khẩu hiệu của Cộng đồng ASEAN là **"Một tầm nhìn, một bản sắc, một cộng đồng"**.
- Cộng đồng ASEAN có hơn 650 triệu dân, là một trong những khu vực kinh tế năng động nhất thế giới.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'cong-dong-asean-2015');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'cong-dong-asean-2015'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'cong-dong-asean-2015'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'cong-dong-asean-2015'), (select id from public.historical_locations where slug = 'kuala-lumpur'), 'Nơi kí Tuyên bố Cu-a-la Lăm-pơ về việc thành lập Cộng đồng ASEAN (22/11/2015)', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'cong-dong-asean-2015') and location_id = (select id from public.historical_locations where slug = 'kuala-lumpur'));

-- hoi-nghi-ianta-1945.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'the-gioi-trong-va-sau-chien-tranh-lanh'), 'Hội nghị Ianta', 'hoi-nghi-ianta-1945', 1945, 1945,
  '1945-02-04', '1945-02-11', '4 – 11/2/1945', 'period', 'Từ ngày 4 đến 11/2/1945, nguyên thủ ba cường quốc Liên Xô, Mỹ, Anh họp tại Ianta (bán đảo Crưm), đưa ra những quyết định quan trọng hình thành khuôn khổ của trật tự thế giới hai cực sau Chiến tranh thế giới thứ hai.',
  $md$## Bối cảnh

Đầu năm 1945, Chiến tranh thế giới thứ hai bước vào giai đoạn kết thúc: Hồng quân Liên Xô tiến sát nước Đức, quân Đồng minh mở mặt trận ở Tây Âu, còn Nhật Bản vẫn chiến đấu ở châu Á – Thái Bình Dương. Các nước Đồng minh cần thống nhất cách kết thúc chiến tranh, tổ chức lại thế giới sau chiến tranh và phân chia thành quả giữa các nước thắng trận.

## Diễn biến

Từ ngày **4 đến 11/2/1945**, hội nghị nguyên thủ ba cường quốc họp tại Cung điện Livađia ở Ianta (bán đảo Crưm), gồm **I. Xta-lin** (Liên Xô), **Ph. Ru-dơ-ven** (Mỹ) và **U. Sớc-sin** (Anh). Hội nghị thông qua những quyết định quan trọng:

- Thống nhất mục tiêu tiêu diệt tận gốc chủ nghĩa phát xít Đức và chủ nghĩa quân phiệt Nhật; Liên Xô sẽ tham chiến chống Nhật ở châu Á sau khi đánh bại Đức.
- Thành lập tổ chức **Liên hợp quốc** để duy trì hòa bình và an ninh thế giới.
- Thỏa thuận về việc đóng quân tại các nước nhằm giải giáp quân đội phát xít và phân chia **phạm vi ảnh hưởng** ở châu Âu và châu Á giữa các cường quốc.

## Kết quả

Những quyết định của Hội nghị Ianta cùng các thỏa thuận sau đó của ba cường quốc trở thành khuôn khổ của trật tự thế giới mới, thường gọi là **trật tự hai cực Ianta**, do Liên Xô và Mỹ đứng đầu mỗi cực.

## Ý nghĩa

Hội nghị Ianta định hình cục diện thế giới trong gần nửa thế kỉ sau chiến tranh. Sự đối đầu giữa hai cực Xô – Mỹ trong khuôn khổ trật tự này là nguồn gốc của cuộc Chiến tranh lạnh.

## Em có biết?

- Cung điện Livađia từng là nơi nghỉ mùa hè của gia đình Sa hoàng Ni-cô-lai II; nay là bảo tàng.
- Ianta là hội nghị thứ hai trong ba hội nghị lớn của các nước Đồng minh thời chiến (Tê-hê-ran 1943, Ianta 1945, Pốt-xđam 1945).

## Di tích ngày nay

Cung điện Livađia ở gần thành phố Ianta vẫn giữ phòng họp và chiếc bàn tròn của hội nghị, mở cửa đón khách tham quan.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'hoi-nghi-ianta-1945');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'hoi-nghi-ianta-1945'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'hoi-nghi-ianta-1945'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'hoi-nghi-ianta-1945'), (select id from public.historical_locations where slug = 'cung-dien-livadia-ianta'), 'Nơi diễn ra Hội nghị', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'hoi-nghi-ianta-1945') and location_id = (select id from public.historical_locations where slug = 'cung-dien-livadia-ianta'));

-- hoi-nghi-manta-1989.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'the-gioi-trong-va-sau-chien-tranh-lanh'), 'Hội nghị Manta — Mỹ và Liên Xô tuyên bố chấm dứt Chiến tranh lạnh', 'hoi-nghi-manta-1989', 1989, 1989,
  '1989-12-02', '1989-12-03', '2 – 3/12/1989', 'period', 'Tháng 12/1989, tại cuộc gặp không chính thức ở đảo Manta (Địa Trung Hải), nguyên thủ hai nước Liên Xô và Mỹ tuyên bố chấm dứt Chiến tranh lạnh, mở ra thời kì hòa dịu giữa hai siêu cường.',
  $md$## Bối cảnh

Sau hơn bốn thập kỉ chạy đua vũ trang, cả Liên Xô và Mỹ đều suy giảm sức mạnh trên nhiều mặt, trong khi Tây Âu và Nhật Bản vươn lên mạnh mẽ. Liên Xô lâm vào khủng hoảng kinh tế – xã hội; Mỹ cũng chịu gánh nặng chi phí quân sự khổng lồ. Hai nước đều cần thoát khỏi thế đối đầu. Ngày 9/11/1989, **bức tường Béc-lin** — biểu tượng của sự chia cắt Đông – Tây — bị phá bỏ.

## Diễn biến

Ngày **2 và 3/12/1989**, Tổng Bí thư Đảng Cộng sản Liên Xô **M. Goóc-ba-chốp** và Tổng thống Mỹ **G. Bu-sơ** (cha) gặp nhau không chính thức ngoài khơi đảo Manta. Kết thúc cuộc gặp, hai bên cùng tuyên bố **chấm dứt Chiến tranh lạnh**.

## Kết quả

Quan hệ Xô – Mỹ chuyển từ đối đầu sang đối thoại; hai nước tiếp tục các cuộc đàm phán cắt giảm vũ khí. Tuy nhiên, trật tự hai cực Ianta chỉ thật sự sụp đổ khi Liên Xô tan rã cuối năm 1991.

## Ý nghĩa

Việc chấm dứt Chiến tranh lạnh mở ra thời kì mới trong quan hệ quốc tế: nguy cơ chiến tranh thế giới hủy diệt bị đẩy lùi; các cuộc xung đột khu vực có điều kiện được giải quyết bằng thương lượng; các nước điều chỉnh chính sách, lấy phát triển kinh tế làm trọng tâm.

## Em có biết?

- Vì biển động mạnh, cuộc gặp diễn ra chủ yếu trên tàu du lịch Mác-xim Goóc-ki của Liên Xô neo trong vịnh.
- Nhiều người gọi hội nghị này là "từ Ianta đến Manta": khép lại thời kì bắt đầu từ Hội nghị Ianta năm 1945.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'hoi-nghi-manta-1989');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'hoi-nghi-manta-1989'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'hoi-nghi-manta-1989'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'hoi-nghi-manta-1989'), (select id from public.historical_locations where slug = 'manta'), 'Nơi diễn ra cuộc gặp giữa nguyên thủ Liên Xô và Mỹ', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'hoi-nghi-manta-1989') and location_id = (select id from public.historical_locations where slug = 'manta'));

-- lien-xo-tan-ra-1991.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'the-gioi-trong-va-sau-chien-tranh-lanh'), 'Liên Xô tan rã, trật tự hai cực Ianta sụp đổ', 'lien-xo-tan-ra-1991', 1991, 1991,
  '1991-12-25', '1991-12-25', '25/12/1991', 'exact', 'Ngày 25/12/1991, Tổng thống M. Goóc-ba-chốp từ chức, lá cờ Liên Xô được hạ xuống khỏi điện Crem-li. Liên Xô chấm dứt tồn tại; trật tự thế giới hai cực Ianta sụp đổ hoàn toàn.',
  $md$## Bối cảnh

Từ cuối những năm 1980, Liên Xô lâm vào khủng hoảng toàn diện về kinh tế, chính trị và xã hội. Công cuộc cải tổ không đưa đất nước ra khỏi khủng hoảng; mâu thuẫn dân tộc bùng lên, nhiều nước cộng hòa lần lượt tuyên bố độc lập. Sau cuộc đảo chính thất bại tháng 8/1991, Đảng Cộng sản Liên Xô bị đình chỉ hoạt động.

## Diễn biến

Ngày **21/12/1991**, 11 nước cộng hòa trong Liên bang Xô viết kí hiệp định thành lập **Cộng đồng các quốc gia độc lập** (SNG). Ngày **25/12/1991**, Tổng thống **M. Goóc-ba-chốp** tuyên bố từ chức; tối hôm đó lá cờ đỏ búa liềm trên nóc điện Crem-li được hạ xuống. **Liên Xô chấm dứt tồn tại** sau 69 năm.

## Kết quả

Một trong hai cực của trật tự thế giới không còn nữa — **trật tự hai cực Ianta sụp đổ hoàn toàn**. Liên bang Nga kế tục địa vị pháp lí của Liên Xô, trong đó có ghế ủy viên thường trực Hội đồng Bảo an Liên hợp quốc.

## Ý nghĩa

Sự tan rã của Liên Xô là tổn thất lớn đối với phong trào cộng sản và công nhân quốc tế, làm thay đổi sâu sắc cục diện thế giới. Thế giới chuyển sang thời kì sau Chiến tranh lạnh, hình thành trật tự mới theo **xu thế đa cực**, với sự vươn lên của nhiều trung tâm quyền lực.

## Em có biết?

- Liên Xô (Liên bang Cộng hòa xã hội chủ nghĩa Xô viết) được thành lập ngày 30/12/1922.
- Sau khi Liên Xô tan rã, 15 nước cộng hòa trở thành 15 quốc gia độc lập.

## Di tích ngày nay

Điện Crem-li ở thủ đô Mát-xcơ-va (Nga) nay là nơi làm việc của Tổng thống Liên bang Nga và là Di sản thế giới.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'lien-xo-tan-ra-1991');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'lien-xo-tan-ra-1991'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'lien-xo-tan-ra-1991'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'lien-xo-tan-ra-1991'), (select id from public.historical_locations where slug = 'moskva-dien-kremli'), 'Nơi hạ lá cờ Liên Xô ngày 25/12/1991', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'lien-xo-tan-ra-1991') and location_id = (select id from public.historical_locations where slug = 'moskva-dien-kremli'));

-- thanh-lap-asean-1967.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'asean-nhung-chang-duong-lich-su'), 'Hiệp hội các quốc gia Đông Nam Á (ASEAN) được thành lập', 'thanh-lap-asean-1967', 1967, 1967,
  '1967-08-08', '1967-08-08', '8/8/1967', 'exact', 'Ngày 8/8/1967, tại Băng Cốc (Thái Lan), ngoại trưởng 5 nước In-đô-nê-xi-a, Ma-lai-xi-a, Phi-líp-pin, Xin-ga-po và Thái Lan kí Tuyên bố Băng Cốc, thành lập Hiệp hội các quốc gia Đông Nam Á (ASEAN).',
  $md$## Bối cảnh

Sau khi giành độc lập, các nước Đông Nam Á bước vào thời kì xây dựng đất nước và cần hợp tác với nhau để cùng phát triển. Cùng lúc, cuộc chiến tranh của Mỹ ở Đông Dương ngày càng mở rộng, khiến các nước trong khu vực muốn hạn chế ảnh hưởng của các nước lớn. Xu thế liên kết khu vực trên thế giới (như Cộng đồng châu Âu) cũng thúc đẩy các nước Đông Nam Á liên kết.

## Diễn biến

Ngày **8/8/1967**, tại Băng Cốc (Thái Lan), ngoại trưởng 5 nước **In-đô-nê-xi-a, Ma-lai-xi-a, Phi-líp-pin, Xin-ga-po và Thái Lan** kí **Tuyên bố Băng Cốc**, thành lập Hiệp hội các quốc gia Đông Nam Á (ASEAN).

## Kết quả

Mục tiêu của ASEAN là phát triển kinh tế và văn hóa thông qua nỗ lực hợp tác chung giữa các nước thành viên, trên tinh thần duy trì hòa bình và ổn định khu vực. Tháng 2/1976, tại Hội nghị cấp cao lần thứ nhất ở Ba-li (In-đô-nê-xi-a), các nước kí **Hiệp ước Thân thiện và Hợp tác ở Đông Nam Á** (Hiệp ước Ba-li), xác định các nguyên tắc cơ bản trong quan hệ giữa các nước: tôn trọng độc lập, chủ quyền; không can thiệp vào công việc nội bộ; giải quyết tranh chấp bằng biện pháp hòa bình; hợp tác có hiệu quả.

## Ý nghĩa

Sự ra đời của ASEAN mở ra thời kì hợp tác khu vực ở Đông Nam Á. Từ 5 thành viên ban đầu, ASEAN dần mở rộng ra toàn khu vực, trở thành một tổ chức có vai trò ngày càng lớn ở châu Á – Thái Bình Dương.

## Em có biết?

- Quá trình mở rộng ASEAN: Bru-nây (1984), **Việt Nam (1995)**, Lào và Mi-an-ma (1997), Cam-pu-chia (1999) — thành "ASEAN 10".
- Ngày 8/8 hằng năm là Ngày ASEAN; biểu tượng trên lá cờ ASEAN là một bó lúa gồm 10 nhánh, tượng trưng cho các nước Đông Nam Á gắn bó với nhau.$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'thanh-lap-asean-1967');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'thanh-lap-asean-1967'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'thanh-lap-asean-1967'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'thanh-lap-asean-1967'), (select id from public.historical_locations where slug = 'bang-coc'), 'Nơi kí Tuyên bố Băng Cốc thành lập ASEAN', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'thanh-lap-asean-1967') and location_id = (select id from public.historical_locations where slug = 'bang-coc'));

-- thanh-lap-lien-hop-quoc-1945.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'the-gioi-trong-va-sau-chien-tranh-lanh'), 'Liên hợp quốc được thành lập', 'thanh-lap-lien-hop-quoc-1945', 1945, 1945,
  '1945-10-24', '1945-10-24', '24/10/1945', 'exact', 'Ngày 24/10/1945, Hiến chương Liên hợp quốc (thông qua tại Hội nghị San Phran-xi-xcô ngày 26/6/1945) chính thức có hiệu lực — Liên hợp quốc ra đời với mục tiêu duy trì hòa bình, an ninh và thúc đẩy hợp tác quốc tế.',
  $md$## Bối cảnh

Hai cuộc chiến tranh thế giới đã gây ra những tổn thất khủng khiếp cho nhân loại. Ngay từ khi chiến tranh chưa kết thúc, các nước Đồng minh đã bàn việc lập một tổ chức quốc tế mới để giữ gìn hòa bình. Tại **Hội nghị Ianta** (2/1945), ba cường quốc Liên Xô, Mỹ, Anh thống nhất thành lập tổ chức **Liên hợp quốc**.

## Diễn biến

Từ ngày **25/4 đến 26/6/1945**, đại biểu của 50 nước họp tại San Phran-xi-xcô (Mỹ). Ngày **26/6/1945**, hội nghị thông qua **Hiến chương Liên hợp quốc**. Ngày **24/10/1945**, sau khi được các nước thành viên phê chuẩn, Hiến chương chính thức có hiệu lực — Liên hợp quốc ra đời. Ngày 24/10 hằng năm trở thành Ngày Liên hợp quốc.

## Kết quả

Hiến chương nêu rõ **mục tiêu** của Liên hợp quốc: duy trì hòa bình và an ninh quốc tế; phát triển quan hệ hữu nghị giữa các dân tộc trên cơ sở tôn trọng quyền bình đẳng và quyền tự quyết; thúc đẩy hợp tác quốc tế về kinh tế, xã hội, văn hóa và nhân đạo.

Các **nguyên tắc hoạt động** chính gồm: bình đẳng chủ quyền giữa các quốc gia; giải quyết tranh chấp bằng biện pháp hòa bình; không dùng vũ lực hoặc đe dọa dùng vũ lực; không can thiệp vào công việc nội bộ của bất kì nước nào. Liên hợp quốc có 6 cơ quan chính, trong đó **Hội đồng Bảo an** có 5 ủy viên thường trực: Liên Xô (nay là Liên bang Nga), Mỹ, Anh, Pháp và Trung Quốc.

## Ý nghĩa

Liên hợp quốc trở thành tổ chức quốc tế lớn nhất hành tinh, là diễn đàn để các nước đối thoại, hợp tác; góp phần ngăn chặn chiến tranh thế giới mới, thúc đẩy phi thực dân hóa, phát triển kinh tế – xã hội và bảo vệ quyền con người.

## Em có biết?

- Ba Lan không kịp dự hội nghị nhưng ký Hiến chương sau đó, nên Liên hợp quốc có **51 nước thành viên sáng lập**.
- Việt Nam trở thành thành viên thứ 149 của Liên hợp quốc ngày 20/9/1977.

## Di tích ngày nay

Trụ sở chính của Liên hợp quốc nằm bên bờ sông East River ở thành phố New York (Mỹ).$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'thanh-lap-lien-hop-quoc-1945');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'thanh-lap-lien-hop-quoc-1945'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'thanh-lap-lien-hop-quoc-1945'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'thanh-lap-lien-hop-quoc-1945'), (select id from public.historical_locations where slug = 'san-francisco'), 'Nơi họp hội nghị thông qua Hiến chương Liên hợp quốc', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'thanh-lap-lien-hop-quoc-1945') and location_id = (select id from public.historical_locations where slug = 'san-francisco'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'thanh-lap-lien-hop-quoc-1945'), (select id from public.historical_locations where slug = 'tru-so-lien-hop-quoc-new-york'), 'Trụ sở chính của Liên hợp quốc hiện nay', false
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'thanh-lap-lien-hop-quoc-1945') and location_id = (select id from public.historical_locations where slug = 'tru-so-lien-hop-quoc-new-york'));

-- unesco-ton-vinh-ho-chi-minh-1987.md (NHÁP)
insert into public.historical_events
  (topic_id, title, slug, start_year, end_year, start_date, end_date, date_text, date_precision, summary, content, is_featured, workflow_status)
select (select id from public.curriculum_topics where slug = 'ho-chi-minh'), 'UNESCO tôn vinh Chủ tịch Hồ Chí Minh', 'unesco-ton-vinh-ho-chi-minh-1987', 1987, 1987,
  '1987-10-20', '1987-11-20', 'Tháng 10 – 11/1987', 'period', 'Năm 1987, khóa họp lần thứ 24 của Đại hội đồng UNESCO thông qua nghị quyết kỉ niệm 100 năm ngày sinh Chủ tịch Hồ Chí Minh (1890 – 1990), tôn vinh Người là "Anh hùng giải phóng dân tộc và Nhà văn hóa kiệt xuất của Việt Nam".',
  $md$## Bối cảnh

UNESCO (Tổ chức Giáo dục, Khoa học và Văn hóa của Liên hợp quốc) có truyền thống kỉ niệm ngày sinh, ngày mất của những danh nhân có đóng góp lớn cho nhân loại. Năm 1990 là năm tròn 100 năm ngày sinh Chủ tịch Hồ Chí Minh (19/5/1890).

## Diễn biến

Tại khóa họp lần thứ **24** của Đại hội đồng UNESCO ở Pa-ri (Pháp) năm **1987**, các nước thành viên thông qua nghị quyết về việc kỉ niệm 100 năm ngày sinh Chủ tịch Hồ Chí Minh, tôn vinh Người là **"Anh hùng giải phóng dân tộc và Nhà văn hóa kiệt xuất của Việt Nam"**. Nghị quyết khẳng định Người là biểu tượng của khát vọng độc lập dân tộc, có những đóng góp quan trọng trên các lĩnh vực văn hóa, giáo dục và nghệ thuật.

## Kết quả

Năm 1990, lễ kỉ niệm 100 năm ngày sinh Chủ tịch Hồ Chí Minh được tổ chức ở Việt Nam và nhiều nước trên thế giới, với nhiều hội thảo, triển lãm về cuộc đời và sự nghiệp của Người.

## Ý nghĩa

Nghị quyết của UNESCO là sự ghi nhận của cộng đồng quốc tế đối với những cống hiến của Chủ tịch Hồ Chí Minh cho sự nghiệp giải phóng dân tộc, cho hòa bình và tiến bộ xã hội; thể hiện dấu ấn sâu đậm của Người trong lòng nhân dân thế giới.

## Em có biết?

- Tên Hồ Chí Minh được đặt cho đường phố, công viên ở nhiều nước; ở thủ đô Mát-xcơ-va (Nga) có tượng đài Hồ Chí Minh dựng năm 1990, đúng dịp kỉ niệm 100 năm ngày sinh của Người.
- UNESCO cũng đã vinh danh nhiều danh nhân Việt Nam khác, trong đó có Đại thi hào Nguyễn Du (kỉ niệm 250 năm năm sinh, 2015).$md$, false, 'draft'
where not exists (select 1 from public.historical_events where slug = 'unesco-ton-vinh-ho-chi-minh-1987');

insert into public.event_sources (event_id, source_id, source_note)
select (select id from public.historical_events where slug = 'unesco-ton-vinh-ho-chi-minh-1987'), (select id from public.sources where title = 'Sách giáo khoa Lịch sử 12'), 'Xem bài học tương ứng trong SGK Lịch sử 12 (Kết nối tri thức với cuộc sống).'
where not exists (select 1 from public.event_sources where event_id = (select id from public.historical_events where slug = 'unesco-ton-vinh-ho-chi-minh-1987'));

insert into public.event_locations (event_id, location_id, location_role, is_primary)
select (select id from public.historical_events where slug = 'unesco-ton-vinh-ho-chi-minh-1987'), (select id from public.historical_locations where slug = 'paris-phap'), 'Trụ sở UNESCO, nơi họp khóa 24 của Đại hội đồng', true
where not exists (select 1 from public.event_locations where event_id = (select id from public.historical_events where slug = 'unesco-ton-vinh-ho-chi-minh-1987') and location_id = (select id from public.historical_locations where slug = 'paris-phap'));

insert into public.event_figures (event_id, figure_id, relationship, sort_order)
select (select id from public.historical_events where slug = 'unesco-ton-vinh-ho-chi-minh-1987'), (select id from public.historical_figures where slug = 'ho-chi-minh'), 'Người được UNESCO tôn vinh', 1
where not exists (select 1 from public.event_figures where event_id = (select id from public.historical_events where slug = 'unesco-ton-vinh-ho-chi-minh-1987') and figure_id = (select id from public.historical_figures where slug = 'ho-chi-minh'));

commit;
