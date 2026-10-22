-- Đề luyện thi MẪU để demo gói luyện thi (docs/ke-hoach-thanh-toan.md, GĐ3): đề 1 (miễn phí) và đề 2 (thuộc gói),
-- mỗi đề 10 câu trắc nghiệm, 15 phút. Đề đầy đủ theo cấu trúc thi tốt nghiệp từ 2025 (24 câu trắc nghiệm + 4 câu
-- Đúng/Sai, 50 phút) soạn ở trang quản trị và đi qua kiểm duyệt (docs/ke-hoach-luyen-thi.md).
--
-- Nội dung bám SGK Lịch sử 12 (Kết nối tri thức với cuộc sống); mỗi câu ghi nguồn và liên kết về bài SGK / sự kiện đã
-- công bố trên web. Để dễ duyệt, ĐÁP ÁN ĐÚNG LUÔN VIẾT ĐẦU TIÊN; khi chèn, các lựa chọn được xoay vòng theo vị trí câu
-- (cố định, chạy lại ra cùng kết quả) để đáp án đúng rải đều A/B/C/D.
-- Chạy SAU seed-payments.sql. Chạy lại được: cập nhật câu theo (đề, vị trí), không xóa dữ liệu khác.
--
-- ⚠ Chạy file này sẽ CÔNG BỐ đề 1 và đề 2 (workflow_status = 'published') — đề mẫu do người phụ trách nội dung duyệt
-- trực tiếp khi đọc file này, chưa qua màn hình kiểm duyệt.

begin;

update public.exam_sets
   set title = 'Đề luyện thi số 1 (đề mẫu)',
       description = 'Đề mẫu 10 câu trắc nghiệm, 15 phút — làm thử miễn phí. Muốn làm đề đầy đủ (24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút), xem Đề luyện thi số 3.',
       duration_min = 15,
       workflow_status = 'published'
 where slug = 'de-1';

update public.exam_sets
   set title = 'Đề luyện thi số 2 (đề mẫu)',
       description = 'Đề mẫu 10 câu trắc nghiệm, 15 phút — thuộc Gói luyện thi. Đề đầy đủ miễn phí (24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút): Đề luyện thi số 3.',
       duration_min = 15,
       workflow_status = 'published'
 where slug = 'de-2';

insert into public.exam_questions (set_id, position, question, choices, correct_index, explanation, lesson_slug, event_id, source_note)
select s.id, q.position, q.question,
       -- phần tử ở vị trí mới i lấy từ vị trí gốc (i - k) mod 4 → đáp án đúng (gốc 0) nằm ở vị trí k
       array(select q.choices[((i - k.r + 4) % 4) + 1] from generate_series(0, 3) as i order by i),
       k.r, q.explanation, q.lesson_slug,
       (select e.id from public.historical_events e where e.slug = q.event_slug), q.source_note
  from (values
    -- ===== Đề 1 (miễn phí) =====
    ('de-1', 1, 'Tổ chức Liên hợp quốc chính thức được thành lập vào ngày nào?',
      array['24/10/1945', '26/6/1945', '2/9/1945', '10/12/1948'], 0,
      'Hiến chương Liên hợp quốc được thông qua tại Hội nghị Xan Phran-xi-xcô (26/6/1945) và có hiệu lực từ ngày 24/10/1945 — ngày này được lấy làm Ngày Liên hợp quốc.',
      '1-lien-hop-quoc', null, 'SGK Lịch sử 12 (KNTT), Bài 1'),
    ('de-1', 2, 'Hiệp hội các quốc gia Đông Nam Á (ASEAN) được thành lập ngày 8/8/1967 tại đâu?',
      array['Băng Cốc (Thái Lan)', 'Gia-các-ta (In-đô-nê-xi-a)', 'Cua-la Lăm-pơ (Ma-lai-xi-a)', 'Ma-ni-la (Phi-líp-pin)'], 0,
      'Ngày 8/8/1967, ngoại trưởng 5 nước In-đô-nê-xi-a, Ma-lai-xi-a, Phi-líp-pin, Xin-ga-po và Thái Lan kí Tuyên bố Băng Cốc, thành lập ASEAN.',
      '4-su-ra-doi-va-phat-trien-cua-asean', null, 'SGK Lịch sử 12 (KNTT), Bài 4'),
    ('de-1', 3, 'Việt Nam trở thành thành viên chính thức của ASEAN vào năm nào?',
      array['1995', '1992', '1997', '1999'], 0,
      'Ngày 28/7/1995, Việt Nam gia nhập ASEAN, trở thành thành viên thứ bảy của tổ chức.',
      '4-su-ra-doi-va-phat-trien-cua-asean', null, 'SGK Lịch sử 12 (KNTT), Bài 4'),
    ('de-1', 4, 'Ngày 19/8/1945, nhân dân thành phố nào khởi nghĩa giành chính quyền thắng lợi?',
      array['Hà Nội', 'Huế', 'Sài Gòn', 'Hải Phòng'], 0,
      'Khởi nghĩa thắng lợi ở Hà Nội ngày 19/8/1945 có ý nghĩa quyết định; sau đó là Huế (23/8) và Sài Gòn (25/8).',
      '6-cach-mang-thang-tam-nam-1945', 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi', 'SGK Lịch sử 12 (KNTT), Bài 6'),
    ('de-1', 5, 'Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại đâu?',
      array['Quảng trường Ba Đình (Hà Nội)', 'Nhà hát Lớn Hà Nội', 'Đình Tân Trào (Tuyên Quang)', 'Hang Pác Bó (Cao Bằng)'], 0,
      'Tại Quảng trường Ba Đình, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa.',
      '6-cach-mang-thang-tam-nam-1945', 'tuyen-ngon-doc-lap', 'SGK Lịch sử 12 (KNTT), Bài 6'),
    ('de-1', 6, 'Chiến dịch Điện Biên Phủ kết thúc thắng lợi vào ngày nào?',
      array['7/5/1954', '13/3/1954', '21/7/1954', '19/12/1946'], 0,
      'Chiến dịch mở màn ngày 13/3/1954 và kết thúc ngày 7/5/1954 khi tướng Đờ Ca-xtơ-ri cùng Bộ chỉ huy tập đoàn cứ điểm bị bắt sống.',
      '7-khang-chien-chong-phap', 'chien-dich-dien-bien-phu', 'SGK Lịch sử 12 (KNTT), Bài 7'),
    ('de-1', 7, 'Theo Hiệp định Giơ-ne-vơ năm 1954 về Đông Dương, giới tuyến quân sự tạm thời ở Việt Nam là',
      array['vĩ tuyến 17', 'vĩ tuyến 16', 'vĩ tuyến 13', 'vĩ tuyến 38'], 0,
      'Hiệp định quy định lấy vĩ tuyến 17 (dọc sông Bến Hải) làm giới tuyến quân sự tạm thời, tiến tới tổng tuyển cử thống nhất đất nước.',
      '7-khang-chien-chong-phap', 'hiep-dinh-geneve-ve-dong-duong', 'SGK Lịch sử 12 (KNTT), Bài 7'),
    ('de-1', 8, 'Hiệp định Pa-ri về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được kí kết vào ngày nào?',
      array['27/1/1973', '21/7/1954', '30/4/1975', '6/3/1946'], 0,
      'Hiệp định Pa-ri được kí ngày 27/1/1973; Mỹ cam kết tôn trọng độc lập, chủ quyền, thống nhất, toàn vẹn lãnh thổ của Việt Nam và rút hết quân về nước.',
      '8-khang-chien-chong-my-cuu-nuoc', 'hiep-dinh-paris-ve-viet-nam', 'SGK Lịch sử 12 (KNTT), Bài 8'),
    ('de-1', 9, 'Chiến dịch Hồ Chí Minh năm 1975 kết thúc thắng lợi vào ngày nào?',
      array['30/4/1975', '26/4/1975', '29/3/1975', '10/3/1975'], 0,
      'Chiến dịch Hồ Chí Minh diễn ra từ 26 đến 30/4/1975; trưa 30/4/1975 Sài Gòn được giải phóng, kết thúc cuộc kháng chiến chống Mỹ, cứu nước.',
      '8-khang-chien-chong-my-cuu-nuoc', 'chien-dich-ho-chi-minh', 'SGK Lịch sử 12 (KNTT), Bài 8'),
    ('de-1', 10, 'Đường lối đổi mới đất nước được Đảng Cộng sản Việt Nam đề ra tại đại hội nào?',
      array['Đại hội đại biểu toàn quốc lần thứ VI (12/1986)', 'Đại hội đại biểu toàn quốc lần thứ V (3/1982)', 'Đại hội đại biểu toàn quốc lần thứ VII (6/1991)', 'Đại hội đại biểu toàn quốc lần thứ IV (12/1976)'], 0,
      'Đại hội VI (15–18/12/1986) đề ra đường lối đổi mới toàn diện, mở đầu công cuộc Đổi mới ở Việt Nam.',
      '10-khai-quat-ve-cong-cuoc-doi-moi', 'dai-hoi-dang-lan-thu-vi', 'SGK Lịch sử 12 (KNTT), Bài 10'),

    -- ===== Đề 2 (thuộc gói) =====
    ('de-2', 1, 'Hội nghị I-an-ta (tháng 2/1945) có sự tham gia của nguyên thủ ba cường quốc nào?',
      array['Liên Xô, Mỹ, Anh', 'Liên Xô, Mỹ, Pháp', 'Mỹ, Anh, Pháp', 'Liên Xô, Anh, Trung Quốc'], 0,
      'Hội nghị I-an-ta có sự tham gia của Xta-lin (Liên Xô), Ru-dơ-ven (Mỹ) và Sơ-sin (Anh); những quyết định của hội nghị hình thành khuôn khổ trật tự hai cực I-an-ta.',
      '2-trat-tu-the-gioi-trong-chien-tranh-lanh', null, 'SGK Lịch sử 12 (KNTT), Bài 2'),
    ('de-2', 2, 'Tháng 12/1989, cuộc gặp không chính thức giữa M. Goóc-ba-chốp và G. Bu-sơ tại đảo Man-ta đã',
      array['tuyên bố chấm dứt Chiến tranh lạnh', 'quyết định giải thể Liên Xô', 'thành lập Liên minh châu Âu', 'kí Hiệp ước hạn chế hệ thống phòng chống tên lửa (ABM)'], 0,
      'Tại cuộc gặp ở Man-ta (12/1989), hai nhà lãnh đạo Liên Xô và Mỹ tuyên bố chấm dứt Chiến tranh lạnh. Liên Xô tan rã năm 1991; Hiệp ước ABM kí năm 1972.',
      '2-trat-tu-the-gioi-trong-chien-tranh-lanh', null, 'SGK Lịch sử 12 (KNTT), Bài 2'),
    ('de-2', 3, 'Cộng đồng ASEAN được xây dựng dựa trên ba trụ cột nào?',
      array['Chính trị – An ninh, Kinh tế, Văn hóa – Xã hội', 'Quân sự, Kinh tế, Ngoại giao', 'Chính trị, Quốc phòng, Thương mại', 'Kinh tế, Giáo dục, Môi trường'], 0,
      'Cộng đồng ASEAN chính thức hình thành cuối năm 2015 với ba trụ cột: Cộng đồng Chính trị – An ninh, Cộng đồng Kinh tế và Cộng đồng Văn hóa – Xã hội.',
      '5-cong-dong-asean', null, 'SGK Lịch sử 12 (KNTT), Bài 5'),
    ('de-2', 4, 'Ngày 5/6/1911, Nguyễn Tất Thành rời Tổ quốc ra đi tìm đường cứu nước từ đâu?',
      array['Bến cảng Nhà Rồng (Sài Gòn)', 'Cảng Hải Phòng', 'Cửa Hội (Nghệ An)', 'Cảng Đà Nẵng'], 0,
      'Nguyễn Tất Thành rời bến cảng Nhà Rồng trên con tàu Đô đốc La-tút-sơ Tơ-rê-vin, bắt đầu hành trình tìm đường cứu nước.',
      '15-khai-quat-cuoc-doi-va-su-nghiep-ho-chi-minh', 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc', 'SGK Lịch sử 12 (KNTT), Bài 15'),
    ('de-2', 5, 'Ngày 28/1/1941, Nguyễn Ái Quốc về nước trực tiếp lãnh đạo cách mạng, chọn nơi nào làm căn cứ?',
      array['Pác Bó (Cao Bằng)', 'Tân Trào (Tuyên Quang)', 'Bắc Sơn (Lạng Sơn)', 'Định Hóa (Thái Nguyên)'], 0,
      'Người về nước và chọn Pác Bó (Cao Bằng) làm căn cứ; tại đây Hội nghị Trung ương 8 (5/1941) được triệu tập. Tháng 5/1945 Người mới chuyển về Tân Trào.',
      '16-ho-chi-minh-anh-hung-giai-phong-dan-toc', 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang', 'SGK Lịch sử 12 (KNTT), Bài 16'),
    ('de-2', 6, 'Chiến dịch tiến công lớn đầu tiên của bộ đội chủ lực Việt Nam trong kháng chiến chống thực dân Pháp là',
      array['chiến dịch Biên giới thu – đông năm 1950', 'chiến dịch Việt Bắc thu – đông năm 1947', 'chiến dịch Hòa Bình đông – xuân 1951–1952', 'chiến dịch Điện Biên Phủ năm 1954'], 0,
      'Chiến dịch Biên giới 1950 là chiến dịch tiến công lớn đầu tiên do ta chủ động mở; thắng lợi giúp ta giành thế chủ động trên chiến trường chính Bắc Bộ. Việt Bắc 1947 là chiến dịch phản công.',
      '7-khang-chien-chong-phap', null, 'SGK Lịch sử 12 (KNTT), Bài 7'),
    ('de-2', 7, 'Một kết quả quan trọng của cuộc Tổng tiến công và nổi dậy Tết Mậu Thân năm 1968 là buộc Mỹ',
      array['chấp nhận đến bàn đàm phán ở Pa-ri', 'rút ngay toàn bộ quân khỏi miền Nam', 'công nhận độc lập, chủ quyền của Việt Nam', 'kí Hiệp định Giơ-ne-vơ'], 0,
      'Sau đòn Tết Mậu Thân, Mỹ tuyên bố "phi Mỹ hóa" chiến tranh, ngừng ném bom miền Bắc và chấp nhận đàm phán ở Pa-ri. Việc công nhận độc lập, chủ quyền của Việt Nam chỉ có trong Hiệp định Pa-ri năm 1973.',
      '8-khang-chien-chong-my-cuu-nuoc', 'tong-tien-cong-va-noi-day-tet-mau-than-1968', 'SGK Lịch sử 12 (KNTT), Bài 8'),
    ('de-2', 8, 'Cuộc Tổng tiến công và nổi dậy Xuân 1975 mở đầu bằng chiến dịch nào?',
      array['Chiến dịch Tây Nguyên', 'Chiến dịch Huế – Đà Nẵng', 'Chiến dịch Hồ Chí Minh', 'Chiến dịch Đường 9 – Nam Lào'], 0,
      'Chiến dịch Tây Nguyên mở màn bằng trận Buôn Ma Thuột (10/3/1975), tiếp đó là chiến dịch Huế – Đà Nẵng và cuối cùng là chiến dịch Hồ Chí Minh.',
      '8-khang-chien-chong-my-cuu-nuoc', null, 'SGK Lịch sử 12 (KNTT), Bài 8'),
    ('de-2', 9, 'Năm 1995, Việt Nam đạt được những bước tiến đối ngoại nào?',
      array['Bình thường hóa quan hệ với Mỹ và gia nhập ASEAN', 'Gia nhập WTO và APEC', 'Trở thành thành viên Liên hợp quốc', 'Kí Hiệp định Pa-ri về Việt Nam'], 0,
      'Tháng 7/1995, Việt Nam và Mỹ bình thường hóa quan hệ ngoại giao và Việt Nam gia nhập ASEAN. Việt Nam vào Liên hợp quốc năm 1977, APEC năm 1998, WTO năm 2007.',
      '14-doi-ngoai-tu-nam-1975-den-nay', null, 'SGK Lịch sử 12 (KNTT), Bài 14'),
    ('de-2', 10, 'Việt Nam trở thành thành viên chính thức của Tổ chức Thương mại thế giới (WTO) vào năm nào?',
      array['2007', '1995', '2000', '2015'], 0,
      'Ngày 11/1/2007, Việt Nam trở thành thành viên thứ 150 của WTO, đánh dấu bước hội nhập sâu rộng vào kinh tế thế giới.',
      '14-doi-ngoai-tu-nam-1975-den-nay', null, 'SGK Lịch sử 12 (KNTT), Bài 14')
  ) as q(set_slug, position, question, choices, correct_index, explanation, lesson_slug, event_slug, source_note)
  join public.exam_sets s on s.slug = q.set_slug
  cross join lateral (select ((q.position * 7 + case q.set_slug when 'de-1' then 1 else 2 end) % 4)::smallint as r) as k
 where q.correct_index = 0
on conflict (set_id, position) do update
   set question = excluded.question, choices = excluded.choices, correct_index = excluded.correct_index,
       explanation = excluded.explanation, lesson_slug = excluded.lesson_slug, event_id = excluded.event_id,
       source_note = excluded.source_note;

commit;

-- Kiểm tra:
--   select s.slug, s.workflow_status, s.duration_min, count(q.*) as so_cau, count(q.event_id) as co_su_kien
--     from public.exam_sets s left join public.exam_questions q on q.set_id = s.id
--    where s.slug in ('de-1', 'de-2') group by 1, 2, 3 order by 1;
--   → de-1 published 15 10 7 · de-2 published 15 10 3
