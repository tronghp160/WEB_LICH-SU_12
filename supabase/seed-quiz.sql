-- Giai đoạn 4.1 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md): câu hỏi trắc nghiệm soạn tay cho 10 sự kiện (30 câu).
-- TỆP SINH TỰ ĐỘNG bởi scripts/build-quiz-sql.mjs từ supabase/content/trac-nghiem.json — sửa ở file JSON rồi chạy lại script.
-- KHÔNG phải migration: là dữ liệu, chạy SAU migration 20260930000001_quiz_questions.sql.
-- Câu hỏi hiện ở trang công khai khi sự kiện của nó đã công bố (RLS). Chỉ INSERT, không xóa; chạy lại không tạo trùng.
-- Đáp án và giải thích chỉ dùng chi tiết đã có trong bài viết của sự kiện; giáo viên đối chiếu SGK: docs/du-lieu-can-kiem-chung.md.

begin;

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'), 'Ngày 5/6/1911, Nguyễn Tất Thành rời Tổ quốc từ bến cảng nào?', array['Bến Nhà Rồng (Sài Gòn)', 'Cảng Hải Phòng', 'Cửa Hội (Nghệ An)', 'Cảng Đà Nẵng'], 0, 'Ngày 5/6/1911, tại Bến Nhà Rồng, Nguyễn Tất Thành xuống tàu buôn Pháp Amiral Latouche-Tréville, lấy tên là Văn Ba, làm phụ bếp để đổi lấy chuyến đi.', 1
where exists (select 1 from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc') and question = 'Ngày 5/6/1911, Nguyễn Tất Thành rời Tổ quốc từ bến cảng nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'), 'Khi xuống tàu Amiral Latouche-Tréville, Nguyễn Tất Thành lấy tên là gì và làm công việc gì?', array['Văn Ba, làm phụ bếp', 'Lý Thụy, làm thủy thủ', 'Nguyễn Ái Quốc, làm thư ký', 'Văn Ba, làm hoa tiêu'], 0, 'Để có mặt trên tàu, anh xin làm phụ bếp với tên Văn Ba: dậy từ sáng sớm, nhóm lò, rửa nồi, khuân than trong khoang bếp nóng bức.', 2
where exists (select 1 from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc') and question = 'Khi xuống tàu Amiral Latouche-Tréville, Nguyễn Tất Thành lấy tên là gì và làm công việc gì?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'), 'Năm 1920, văn kiện nào giúp Nguyễn Ái Quốc tìm thấy con đường giải phóng dân tộc?', array['Sơ thảo lần thứ nhất những luận cương về vấn đề dân tộc và vấn đề thuộc địa của Lênin', 'Tuyên ngôn Độc lập của Mỹ năm 1776', 'Tuyên ngôn Nhân quyền và Dân quyền của Pháp', 'Bản yêu sách của nhân dân An Nam'], 0, 'Tháng 7/1920, Người đọc Sơ thảo luận cương của Lênin và tìm thấy con đường cách mạng vô sản. Bản yêu sách của nhân dân An Nam là văn bản chính Người gửi tới Hội nghị Véc-xai năm 1919.', 3
where exists (select 1 from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc') and question = 'Năm 1920, văn kiện nào giúp Nguyễn Ái Quốc tìm thấy con đường giải phóng dân tộc?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'), 'Ngày 28/1/1941, Nguyễn Ái Quốc về nước và sống, làm việc ở đâu?', array['Hang Cốc Bó, bản Pác Bó (Cao Bằng)', 'Tân Trào (Tuyên Quang)', 'Nhà 48 Hàng Ngang (Hà Nội)', 'Kim Liên (Nghệ An)'], 0, 'Người vượt biên giới ở khu vực cột mốc 108 (Hà Quảng, Cao Bằng), sống và làm việc tại hang Cốc Bó, bản Pác Bó, trong điều kiện vô cùng gian khổ.', 1
where exists (select 1 from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang') and question = 'Ngày 28/1/1941, Nguyễn Ái Quốc về nước và sống, làm việc ở đâu?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'), 'Hội nghị lần thứ 8 Ban Chấp hành Trung ương Đảng (5/1941) quyết định thành lập tổ chức nào?', array['Mặt trận Việt Minh', 'Đội Việt Nam Tuyên truyền Giải phóng quân', 'Ủy ban khởi nghĩa toàn quốc', 'Chính phủ lâm thời'], 0, 'Hội nghị do Nguyễn Ái Quốc chủ trì ở Pác Bó đặt nhiệm vụ giải phóng dân tộc lên hàng đầu và thành lập Mặt trận Việt Minh (19/5/1941). Đội Việt Nam Tuyên truyền Giải phóng quân ra đời sau, ngày 22/12/1944.', 2
where exists (select 1 from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang') and question = 'Hội nghị lần thứ 8 Ban Chấp hành Trung ương Đảng (5/1941) quyết định thành lập tổ chức nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'), 'Ở Pác Bó, Nguyễn Ái Quốc đặt tên cho dòng suối trước hang là gì?', array['Suối Lê-nin', 'Suối Các Mác', 'Suối Hiền Lương', 'Suối Khuổi Nậm'], 0, 'Người đặt tên dòng suối trước hang là suối Lê-nin, ngọn núi bên cạnh là núi Các Mác. Chiếc "bàn đá chông chênh" trong bài thơ Tức cảnh Pác Bó là một phiến đá bên bờ suối Lê-nin.', 3
where exists (select 1 from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang') and question = 'Ở Pác Bó, Nguyễn Ái Quốc đặt tên cho dòng suối trước hang là gì?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'), 'Sáng 19/8/1945, quần chúng Hà Nội tập trung mít tinh ở đâu trước khi chia thành các đoàn đi chiếm công sở?', array['Quảng trường Nhà hát Lớn', 'Quảng trường Ba Đình', 'Hồ Hoàn Kiếm', 'Văn Miếu – Quốc Tử Giám'], 0, 'Hàng chục vạn người kéo về Quảng trường Nhà hát Lớn dự mít tinh, rồi chia thành nhiều đoàn có tự vệ đi kèm, chiếm Phủ Khâm sai Bắc Bộ, Tòa Thị chính, Sở Cảnh sát…', 1
where exists (select 1 from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi') and question = 'Sáng 19/8/1945, quần chúng Hà Nội tập trung mít tinh ở đâu trước khi chia thành các đoàn đi chiếm công sở?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'), 'Ngày 19/8/1945 về sau được chọn là ngày truyền thống của lực lượng nào?', array['Công an nhân dân Việt Nam', 'Quân đội nhân dân Việt Nam', 'Bộ đội Biên phòng', 'Hải quân nhân dân Việt Nam'], 0, 'Ngày 19/8/1945 — ngày Hà Nội giành chính quyền — được chọn là ngày truyền thống của lực lượng Công an nhân dân Việt Nam.', 2
where exists (select 1 from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi') and question = 'Ngày 19/8/1945 về sau được chọn là ngày truyền thống của lực lượng nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'), 'Sau Hà Nội, khởi nghĩa giành chính quyền thắng lợi ở Huế và Sài Gòn vào những ngày nào?', array['Huế 23/8, Sài Gòn 25/8/1945', 'Huế 19/8, Sài Gòn 23/8/1945', 'Huế 25/8, Sài Gòn 28/8/1945', 'Huế 30/8, Sài Gòn 2/9/1945'], 0, 'Khởi nghĩa thắng lợi ở Huế (23/8) và Sài Gòn (25/8). Đến 28/8/1945, Tổng khởi nghĩa thành công trong cả nước; ngày 30/8, vua Bảo Đại thoái vị.', 3
where exists (select 1 from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi') and question = 'Sau Hà Nội, khởi nghĩa giành chính quyền thắng lợi ở Huế và Sài Gòn vào những ngày nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tuyen-ngon-doc-lap'), 'Chủ tịch Hồ Chí Minh khởi thảo bản Tuyên ngôn Độc lập tại đâu?', array['Nhà số 48 phố Hàng Ngang, Hà Nội', 'Hang Cốc Bó, Cao Bằng', 'Bắc Bộ phủ, Hà Nội', 'Đình Tân Trào, Tuyên Quang'], 0, 'Ngày 25/8/1945, Chủ tịch Hồ Chí Minh từ Tân Trào về Hà Nội. Tại căn nhà số 48 phố Hàng Ngang, Người khởi thảo bản Tuyên ngôn Độc lập. Ngôi nhà nay là di tích lịch sử.', 1
where exists (select 1 from public.historical_events where slug = 'tuyen-ngon-doc-lap')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tuyen-ngon-doc-lap') and question = 'Chủ tịch Hồ Chí Minh khởi thảo bản Tuyên ngôn Độc lập tại đâu?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tuyen-ngon-doc-lap'), 'Mở đầu bản Tuyên ngôn Độc lập, Chủ tịch Hồ Chí Minh dẫn những câu "bất hủ" trong văn kiện của hai nước nào?', array['Mỹ và Pháp', 'Anh và Pháp', 'Liên Xô và Trung Quốc', 'Mỹ và Anh'], 0, 'Tuyên ngôn dẫn Tuyên ngôn Độc lập của Mỹ (1776) và Tuyên ngôn Nhân quyền và Dân quyền của Pháp (1791), rồi vạch trần tội ác của thực dân Pháp.', 2
where exists (select 1 from public.historical_events where slug = 'tuyen-ngon-doc-lap')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tuyen-ngon-doc-lap') and question = 'Mở đầu bản Tuyên ngôn Độc lập, Chủ tịch Hồ Chí Minh dẫn những câu "bất hủ" trong văn kiện của hai nước nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tuyen-ngon-doc-lap'), 'Bản Tuyên ngôn Độc lập ngày 2/9/1945 khai sinh ra nhà nước nào?', array['Việt Nam Dân chủ Cộng hòa', 'Cộng hòa xã hội chủ nghĩa Việt Nam', 'Việt Nam Cộng hòa', 'Đế quốc Việt Nam'], 0, 'Thay mặt Chính phủ lâm thời, Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa. Ngày 2/9 trở thành Ngày Quốc khánh.', 3
where exists (select 1 from public.historical_events where slug = 'tuyen-ngon-doc-lap')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tuyen-ngon-doc-lap') and question = 'Bản Tuyên ngôn Độc lập ngày 2/9/1945 khai sinh ra nhà nước nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-dien-bien-phu'), 'Trong chiến dịch Điện Biên Phủ, phương châm tác chiến được chuyển sang phương châm nào?', array['"Đánh chắc, tiến chắc"', '"Đánh nhanh, thắng nhanh"', '"Đánh lâu dài"', '"Thần tốc, táo bạo, bất ngờ"'], 0, 'Phương châm tác chiến được chuyển từ "đánh nhanh, thắng nhanh" sang "đánh chắc, tiến chắc". Chiến dịch diễn ra trong 56 ngày đêm với ba đợt tiến công.', 1
where exists (select 1 from public.historical_events where slug = 'chien-dich-dien-bien-phu')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'chien-dich-dien-bien-phu') and question = 'Trong chiến dịch Điện Biên Phủ, phương châm tác chiến được chuyển sang phương châm nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-dien-bien-phu'), 'Tập đoàn cứ điểm Điện Biên Phủ gồm bao nhiêu cứ điểm, chia thành mấy phân khu?', array['49 cứ điểm, 3 phân khu', '36 cứ điểm, 2 phân khu', '62 cứ điểm, 4 phân khu', '56 cứ điểm, 3 phân khu'], 0, 'Pháp xây dựng Điện Biên Phủ thành tập đoàn cứ điểm mạnh nhất Đông Dương: 49 cứ điểm, chia thành ba phân khu (Bắc, Trung tâm, Nam), có sân bay, pháo binh và xe tăng.', 2
where exists (select 1 from public.historical_events where slug = 'chien-dich-dien-bien-phu')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'chien-dich-dien-bien-phu') and question = 'Tập đoàn cứ điểm Điện Biên Phủ gồm bao nhiêu cứ điểm, chia thành mấy phân khu?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-dien-bien-phu'), 'Trong trận Him Lam (13/3/1954), ai đã lấy thân mình lấp lỗ châu mai, mở đường cho đơn vị xung phong?', array['Phan Đình Giót', 'Tô Vĩnh Diện', 'Bế Văn Đàn', 'Bùi Quang Thận'], 0, 'Tiểu đội phó Phan Đình Giót bị thương nặng vẫn xin đi đánh tiếp, dùng thân mình lấp kín lỗ châu mai. Anh hy sinh ở tuổi 21, được truy tặng danh hiệu Anh hùng Lực lượng vũ trang nhân dân.', 3
where exists (select 1 from public.historical_events where slug = 'chien-dich-dien-bien-phu')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'chien-dich-dien-bien-phu') and question = 'Trong trận Him Lam (13/3/1954), ai đã lấy thân mình lấp lỗ châu mai, mở đường cho đơn vị xung phong?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'), 'Theo Hiệp định Genève 1954, giới tuyến quân sự tạm thời ở Việt Nam là ở đâu?', array['Vĩ tuyến 17 (sông Bến Hải)', 'Vĩ tuyến 16 (đèo Hải Vân)', 'Vĩ tuyến 18 (sông Gianh)', 'Vĩ tuyến 13'], 0, 'Hiệp định quy định ngừng bắn trên toàn Đông Dương và lấy vĩ tuyến 17 (sông Bến Hải) làm giới tuyến quân sự tạm thời; hai bên tập kết quân đội về hai miền.', 1
where exists (select 1 from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong') and question = 'Theo Hiệp định Genève 1954, giới tuyến quân sự tạm thời ở Việt Nam là ở đâu?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'), 'Ai dẫn đầu đoàn Việt Nam Dân chủ Cộng hòa tại Hội nghị Genève?', array['Phạm Văn Đồng', 'Lê Đức Thọ', 'Xuân Thủy', 'Võ Nguyên Giáp'], 0, 'Đoàn Việt Nam Dân chủ Cộng hòa do Phó Thủ tướng kiêm Bộ trưởng Ngoại giao Phạm Văn Đồng dẫn đầu. Người ký hiệp định đình chỉ chiến sự ở Việt Nam là Thứ trưởng Bộ Quốc phòng Tạ Quang Bửu.', 2
where exists (select 1 from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong') and question = 'Ai dẫn đầu đoàn Việt Nam Dân chủ Cộng hòa tại Hội nghị Genève?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong'), 'Theo Hiệp định Genève, cuộc tổng tuyển cử thống nhất đất nước dự kiến diễn ra khi nào?', array['Tháng 7/1956', 'Tháng 7/1955', 'Tháng 10/1954', 'Tháng 1/1957'], 0, 'Hiệp định quy định tổng tuyển cử tự do trong cả nước vào tháng 7/1956, dưới sự giám sát của Ủy ban quốc tế (Ấn Độ, Ba Lan, Canada). Cuộc tổng tuyển cử đã không diễn ra.', 3
where exists (select 1 from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'hiep-dinh-geneve-ve-dong-duong') and question = 'Theo Hiệp định Genève, cuộc tổng tuyển cử thống nhất đất nước dự kiến diễn ra khi nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'), 'Đợt 1 cuộc Tổng tiến công và nổi dậy Tết Mậu Thân mở màn vào thời điểm nào?', array['Đêm 30 rạng sáng 31/1/1968 (đêm Giao thừa)', 'Ngày 13/5/1968', 'Tháng 8/1968', 'Ngày 30/4/1968'], 0, 'Đêm 30 rạng sáng 31/1/1968 — đêm Giao thừa Tết Mậu Thân — quân và dân miền Nam đồng loạt tiến công và nổi dậy ở hầu khắp các thành phố, thị xã.', 1
where exists (select 1 from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968') and question = 'Đợt 1 cuộc Tổng tiến công và nổi dậy Tết Mậu Thân mở màn vào thời điểm nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'), 'Trong Tết Mậu Thân 1968, quân ta làm chủ phần lớn thành phố nào trong khoảng 25 ngày đêm?', array['Huế', 'Đà Nẵng', 'Sài Gòn', 'Cần Thơ'], 0, 'Tại Huế, quân ta làm chủ phần lớn thành phố trong khoảng 25 ngày đêm. Kinh thành Huế — nơi giao tranh ác liệt — nay đã được trùng tu và là Di sản Văn hóa Thế giới.', 2
where exists (select 1 from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968') and question = 'Trong Tết Mậu Thân 1968, quân ta làm chủ phần lớn thành phố nào trong khoảng 25 ngày đêm?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'), 'Sau đòn tiến công Tết Mậu Thân 1968, Mỹ phải làm gì?', array['Tuyên bố "phi Mỹ hóa" chiến tranh và chấp nhận đàm phán tại Paris', 'Rút hết quân khỏi miền Nam ngay trong năm 1968', 'Ký Hiệp định Paris ngay trong năm 1968', 'Đưa thêm quân vào miền Nam và ném bom Hà Nội bằng B-52'], 0, 'Tết Mậu Thân làm lung lay ý chí xâm lược của Mỹ: Mỹ tuyên bố "phi Mỹ hóa" chiến tranh, chấm dứt không điều kiện việc ném bom miền Bắc (11/1968) và đàm phán với ta tại Paris (từ 13/5/1968).', 3
where exists (select 1 from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968') and question = 'Sau đòn tiến công Tết Mậu Thân 1968, Mỹ phải làm gì?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'), 'Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được ký ngày nào?', array['27/1/1973', '21/7/1954', '29/3/1973', '30/4/1975'], 0, 'Ngày 27/1/1973, Hiệp định Paris được ký chính thức. Ngày 29/3/1973, toán lính Mỹ cuối cùng rút khỏi miền Nam.', 1
where exists (select 1 from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam') and question = 'Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được ký ngày nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'), 'Ai là người phụ nữ duy nhất đặt bút ký Hiệp định Paris?', array['Nguyễn Thị Bình', 'Nguyễn Thị Định', 'Võ Thị Sáu', 'Đặng Thùy Trâm'], 0, 'Bộ trưởng Nguyễn Thị Bình ký thay mặt Chính phủ Cách mạng lâm thời Cộng hòa miền Nam Việt Nam; bà là người phụ nữ duy nhất ký Hiệp định Paris.', 2
where exists (select 1 from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam') and question = 'Ai là người phụ nữ duy nhất đặt bút ký Hiệp định Paris?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam'), 'Theo Hiệp định Paris, Mỹ phải rút hết quân viễn chinh và quân đồng minh trong thời hạn bao lâu?', array['60 ngày', '2 năm', '6 tháng', '300 ngày'], 0, 'Hiệp định quy định Mỹ rút hết quân viễn chinh và quân đồng minh trong vòng 60 ngày, ngừng bắn trên toàn miền Nam và các bên trao trả tù binh.', 3
where exists (select 1 from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'hiep-dinh-paris-ve-viet-nam') and question = 'Theo Hiệp định Paris, Mỹ phải rút hết quân viễn chinh và quân đồng minh trong thời hạn bao lâu?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh'), 'Ai làm Tư lệnh Chiến dịch Hồ Chí Minh năm 1975?', array['Đại tướng Văn Tiến Dũng', 'Đại tướng Võ Nguyên Giáp', 'Đồng chí Phạm Hùng', 'Đồng chí Lê Duẩn'], 0, 'Đại tướng Văn Tiến Dũng làm Tư lệnh, đồng chí Phạm Hùng làm Chính ủy chiến dịch.', 1
where exists (select 1 from public.historical_events where slug = 'chien-dich-ho-chi-minh')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh') and question = 'Ai làm Tư lệnh Chiến dịch Hồ Chí Minh năm 1975?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh'), 'Trận đánh nào (9 – 21/4/1975) phá vỡ "cánh cửa thép" phía đông Sài Gòn?', array['Trận Xuân Lộc', 'Trận Buôn Ma Thuột', 'Trận Phước Long', 'Trận Đà Nẵng'], 0, 'Trận Xuân Lộc (9 – 21/4/1975) phá vỡ "cánh cửa thép" phía đông Sài Gòn, mở đường cho Chiến dịch Hồ Chí Minh bắt đầu lúc 17 giờ ngày 26/4/1975.', 2
where exists (select 1 from public.historical_events where slug = 'chien-dich-ho-chi-minh')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh') and question = 'Trận đánh nào (9 – 21/4/1975) phá vỡ "cánh cửa thép" phía đông Sài Gòn?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh'), 'Lá cờ cách mạng tung bay trên nóc Dinh Độc Lập vào thời điểm nào?', array['11 giờ 30 phút ngày 30/4/1975', '17 giờ ngày 26/4/1975', 'Sáng 2/5/1975', 'Chiều 29/4/1975'], 0, 'Sáng 30/4/1975, xe tăng Quân Giải phóng húc đổ cổng Dinh Độc Lập; 11 giờ 30 phút, lá cờ cách mạng tung bay trên nóc dinh.', 3
where exists (select 1 from public.historical_events where slug = 'chien-dich-ho-chi-minh')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'chien-dich-ho-chi-minh') and question = 'Lá cờ cách mạng tung bay trên nóc Dinh Độc Lập vào thời điểm nào?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi'), 'Đại hội đại biểu toàn quốc lần thứ VI của Đảng (12/1986) đề ra đường lối gì?', array['Đường lối Đổi mới toàn diện', 'Kế hoạch 5 năm lần thứ nhất', 'Đường lối kháng chiến toàn dân', 'Chính sách kinh tế mới (NEP)'], 0, 'Đại hội VI (15 – 18/12/1986) đề ra đường lối Đổi mới toàn diện, trọng tâm là đổi mới kinh tế: xóa bỏ cơ chế tập trung quan liêu, bao cấp.', 1
where exists (select 1 from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi') and question = 'Đại hội đại biểu toàn quốc lần thứ VI của Đảng (12/1986) đề ra đường lối gì?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi'), 'Ai được bầu làm Tổng Bí thư tại Đại hội VI của Đảng?', array['Nguyễn Văn Linh', 'Lê Duẩn', 'Trường Chinh', 'Đỗ Mười'], 0, 'Đồng chí Nguyễn Văn Linh được bầu làm Tổng Bí thư tại Đại hội VI.', 2
where exists (select 1 from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi') and question = 'Ai được bầu làm Tổng Bí thư tại Đại hội VI của Đảng?');

insert into public.quiz_questions (event_id, question, choices, correct_index, explanation, sort_order)
select (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi'), 'Năm 1988, nghị quyết nào của Bộ Chính trị giao ruộng đất ổn định lâu dài cho nông dân?', array['Nghị quyết 10 ("Khoán 10")', 'Chỉ thị 100', 'Nghị quyết 15', 'Chỉ thị 50'], 0, 'Tháng 4/1988, Nghị quyết 10 ("Khoán 10") giao ruộng đất ổn định lâu dài cho nông dân. Chỉ thị 100 (1981) là bước thử nghiệm khoán sản phẩm trước đó. Năm 1989, Việt Nam bắt đầu xuất khẩu gạo.', 3
where exists (select 1 from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi')
  and not exists (select 1 from public.quiz_questions where event_id = (select id from public.historical_events where slug = 'dai-hoi-dang-lan-thu-vi') and question = 'Năm 1988, nghị quyết nào của Bộ Chính trị giao ruộng đất ổn định lâu dài cho nông dân?');

commit;

-- Kiểm tra sau khi chạy:
--   select e.slug, count(*) from public.quiz_questions q join public.historical_events e on e.id = q.event_id group by 1 order by 1;
