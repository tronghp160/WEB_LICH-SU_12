# Dữ liệu cần kiểm chứng — Seed đợt 1 (Phase 2)

> Theo Quy tắc 4 (KE_HOACH_DU_AN.md): agent **không bịa dữ liệu lịch sử**.
> Danh sách dưới đây liệt kê mọi điểm agent tự tổng hợp từ kiến thức chung
> (không tra cứu trực tiếp SGK bạn đang dùng) hoặc chưa xác minh được độ
> chính xác tuyệt đối. Bạn **PHẢI đối chiếu với SGK Lịch sử 12** (bộ *Kết nối
> tri thức với cuộc sống*, NXB Giáo dục Việt Nam) trước khi công bố chính
> thức bất kỳ nội dung nào.

## 1. Nguồn (citation)

- `sources.published_year = 2024` cho SGK — **TODO**: xác nhận đúng năm
  xuất bản/tái bản của quyển sách bạn đang cầm trên tay (có thể khác nếu
  dùng bản tái bản).
- Chưa có số trang/bài học cụ thể trong `event_sources.source_note` — cần
  bổ sung "Bài X, trang Y" cho từng sự kiện khi đối chiếu SGK thật.

## 2. Tọa độ địa điểm (`historical_locations`)

Các địa điểm đã đánh dấu `accuracy_level` trung thực (`region`/`approximate`
thay vì `exact`) cho các khu vực rộng, nhưng **giá trị latitude/longitude cụ
thể agent tự nhớ, chưa tra Google Maps/bản đồ chính thức**:

| slug | Toạ độ hiện tại | Ghi chú |
|---|---|---|
| `dien-bien-phu` | 21.386000, 103.023000 | Tâm khu vực lòng chảo; trận địa thực tế trải rộng nhiều cứ điểm (Him Lam, Độc Lập, C1, A1…) |
| `geneve-thuy-si` | 46.204400, 6.143200 | Tâm thành phố; chưa xác định tòa nhà họp cụ thể |
| `sai-gon` | 10.776900, 106.700900 | Tâm khu vực Quận 1 (TP.HCM) cũ |
| `hue` | 16.463700, 107.590900 | Tâm thành phố Huế |
| `paris-phap` | 48.856600, 2.352200 | Tâm thành phố; địa điểm ký thực tế là Trung tâm Hội nghị Quốc tế, Avenue Kléber — chưa xác định tọa độ chính xác |
| `ha-noi-khu-vuc-trung-tam` | 21.028500, 105.854200 | Hội trường Ba Đình cũ (nơi tổ chức Đại hội VI) đã không còn tồn tại; dùng tọa độ trung tâm Hà Nội thay thế |
| `pac-bo-cao-bang` | 22.907500, 106.222500 | Khu di tích Pác Bó; cần đối chiếu bản đồ để tăng độ chính xác |

Các địa điểm còn lại (`nha-hat-lon-ha-noi`, `quang-truong-ba-dinh`,
`dinh-doc-lap`, `ben-nha-rong`) đánh dấu `exact` vì là công trình cụ thể,
nhưng vẫn nên đối chiếu lại tọa độ chính xác trước khi dùng cho báo cáo.

## 3. Mốc thời gian cần đối chiếu SGK

| Sự kiện | Ngày agent dùng | Ghi chú |
|---|---|---|
| Đại hội Đảng lần thứ VI | 15–18/12/1986 | Cần đối chiếu đúng ngày khai mạc/bế mạc theo SGK |
| Nguyễn Ái Quốc về nước | 28/1/1941 | Một số tài liệu ghi các ngày lân cận; cần đối chiếu SGK để lấy đúng ngày SGK dùng |
| Tổng tiến công Tết Mậu Thân | Đêm 30, rạng sáng 31/1/1968 | Sự kiện kéo dài nhiều đợt trong năm 1968; SGK có thể trình bày mốc chính khác |

## 4. Nhân vật (`historical_figures`)

Năm sinh/năm mất và vai trò các nhân vật (Hồ Chí Minh, Võ Nguyên Giáp, Phạm
Văn Đồng, Lê Duẩn, Lê Đức Thọ, Nguyễn Thị Bình, Văn Tiến Dũng, Nguyễn Văn
Linh, Trường Chinh) là kiến thức phổ thông, nhưng **chưa tra cứu trực tiếp
SGK/nguồn chính thức** — đề nghị đối chiếu lại, đặc biệt:
- `nguyen-thi-binh`: `death_year = null` (chưa xác nhận còn sống hay đã mất
  tại thời điểm bạn đọc tài liệu này — cần kiểm tra tin tức mới nhất).

## 5. Ảnh minh họa (`media_assets`)

- Chỉ **2/10 sự kiện** có ảnh: `chien-dich-dien-bien-phu` và
  `tuyen-ngon-doc-lap`. Cả hai đã được tra cứu trực tiếp trên Wikimedia
  Commons, xác nhận giấy phép (public domain tại Việt Nam / CC BY-SA 4.0)
  trước khi đưa vào seed — xem `citation` trong bảng `sources` tương ứng.
- **8 sự kiện còn lại chưa có ảnh** (`tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi`,
  `chien-dich-dien-bien-phu` đã có, `hiep-dinh-geneve-ve-dong-duong`,
  `tong-tien-cong-va-noi-day-tet-mau-than-1968`, `hiep-dinh-paris-ve-viet-nam`,
  `chien-dich-ho-chi-minh`, `dai-hoi-dang-lan-thu-vi`,
  `nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc`,
  `nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang`) — **TODO**: tự tìm và xác
  minh giấy phép trên Wikimedia Commons (hoặc nguồn ảnh tự do khác) trước
  khi thêm `media_assets`, ghi rõ `alt_text` và `source_id`.
- `historical_figures.portrait_url` mới chỉ có cho `ho-chi-minh`; 8 nhân
  vật còn lại chưa có ảnh chân dung.

> **Cập nhật 29/09/2026 (GĐ1 — kho ảnh, `supabase/seed-media.sql`):** 10/10 sự kiện đã có ảnh (16 ảnh), 6/8 nhân vật
> có chân dung, 9 địa điểm có ảnh ngày nay; mọi ảnh ghi tác giả, giấy phép và trang gốc, lưu trong bucket `media`.
> Còn thiếu chân dung **Lê Đức Thọ** và **Văn Tiến Dũng**: ảnh trên Commons hoặc chụp lại từ bàn thờ, hoặc chỉ là
> phạm vi công cộng tại Hoa Kỳ (ảnh AP/LIFE) — nên xin phép Bảo tàng Lịch sử Quân sự / TTXVN hoặc dùng ảnh tự chụp.
> Lưu ý thêm về luật: ảnh chưa công bố trong 25 năm kể từ khi chụp được bảo hộ 100 năm kể từ khi chụp, nên nhãn
> PD-Vietnam trên Commons (thường tính theo năm chụp) có thể sai; GĐ1 chỉ dùng ảnh công bố trước 1951 hoặc có giấy phép mở.

## 5b. Nội dung GĐ3 (30/09/2026) — cần giáo viên đối chiếu SGK

Nội dung soạn trong `supabase/content/su-kien/*.md` (sinh SQL bằng `node scripts/build-content-sql.mjs`).
Agent viết theo kiến thức phổ thông, **chưa đối chiếu trực tiếp SGK Kết nối tri thức**. 10 sự kiện mới ở trạng thái
**nháp**: chỉ công bố sau khi kiểm duyệt viên (nên là giáo viên Lịch sử) duyệt trong trang quản trị.
Những chi tiết nên kiểm kỹ nhất:

| Sự kiện | Chi tiết cần đối chiếu |
|---|---|
| Nguyễn Tất Thành ra đi (1911) | dạy ở Trường Dục Thanh năm 1910; tàu cập Mác-xây tháng 7/1911 |
| Nguyễn Ái Quốc về nước | cột mốc 108 (nay là mốc 675); Hội nghị TW 8 (10–19/5/1941); báo *Việt Nam độc lập* (1941) |
| Tổng khởi nghĩa Hà Nội | chuyện lá cờ thả từ ban công ngày 17/8; 19/8 là ngày truyền thống CAND; Bắc Bộ phủ nay là Nhà khách Chính phủ |
| Tuyên ngôn Độc lập | câu hỏi "Tôi nói đồng bào nghe rõ không?"; trích nguyên văn Tuyên ngôn |
| Điện Biên Phủ | số liệu 16.200 quân, 62 máy bay (khớp bài học); chuyện Phan Đình Giót |
| Genève | Tạ Quang Bửu ký hiệp định đình chỉ chiến sự; chuyện cầu Hiền Lương sơn hai màu |
| Tết Mậu Thân | Huế "khoảng 25 ngày đêm"; thời gian đợt 2, 3; cách SGK đánh giá tổn thất |
| Hiệp định Paris | 202 phiên họp chung, 24 cuộc gặp riêng; 4 năm 9 tháng; 29/3/1973 lính Mỹ cuối cùng rút |
| Chiến dịch Hồ Chí Minh | 11 giờ 30 cắm cờ; Châu Đốc giải phóng 2/5; nơi lưu giữ xe tăng 390 (Bảo tàng Tăng thiết giáp) và 843 (Bảo tàng LSQS) — tra 30/09/2026 trên báo VnExpress, VietNamNet |
| Đại hội VI | chuyện Kim Ngọc "khoán hộ" từ 1966; 1989 bắt đầu xuất khẩu gạo |
| Hiệp định Sơ bộ (mới) | 15.000 quân Pháp, rút trong 5 năm; câu nói ngày 7/3/1946 |
| Toàn quốc kháng chiến (mới) | 20 giờ 19/12, Nhà máy điện Yên Phụ; "khoảng 60 ngày đêm" |
| Điện Biên Phủ trên không (mới) | 81 máy bay / 34 B-52 (ghi rõ "theo số liệu của ta"); nguyên văn câu dự báo của Bác về B-52 |
| Biên giới Tây Nam (mới) | thảm sát Ba Chúc (hơn 3.000 người); các mốc 22/12/1978, 2/12/1978, 7/1/1979 |
| Biên giới phía Bắc (mới) | các mốc 17/2, 5/3, 18/3/1979; Hiệp ước biên giới 1999, phân giới cắm mốc 2008 |
| Gạc Ma (mới) | 64 chiến sĩ; nguyên văn lời Trần Văn Phương và tuổi của anh; tên các tàu HQ-604, 605, 505 |
| Gia nhập LHQ (mới) | thành viên thứ 149; hai nhiệm kỳ ủy viên không thường trực HĐBA |
| Việt – Mỹ (mới) | 3/2/1994, 11–12/7/1995; các mốc 2000, 2013, 2023 |
| ASEAN (mới) | Hội nghị AMM lần thứ 28; Timor-Leste là thành viên thứ 11 (2025) |
| WTO (mới) | nộp đơn 1/1995; 7/11/2006; thành viên thứ 150; vai trò của ông Lương Văn Tự |

**Chủ đề nhạy cảm** (biên giới 1979, Gạc Ma): đã viết theo giọng trung tính của SGK, nhưng nên để giáo viên duyệt kỹ
cách diễn đạt trước khi công bố.

## 6. Phát hiện khi xây trang chủ (Phase 4)

Hai điểm về dữ liệu lộ ra khi xem trang chủ thật — chưa sửa vì cần bạn quyết định:

1. **Chủ đề "trống"**: `doi-ngoai-viet-nam` và `bao-ve-to-quoc-sau-1975` hiện
   "Chưa có sự kiện". Lý do: Phụ lục B.2 xếp Hiệp định Genève/Paris vào *nhiều*
   chủ đề (ví dụ "2, 6"), nhưng bảng `historical_events` chỉ có **một** cột
   `topic_id` nên seed đã chọn chủ đề đầu tiên. Muốn một sự kiện thuộc nhiều
   chủ đề cần bảng nối `event_topics` (thay đổi schema — phải hỏi trước, Quy
   tắc 1). Cách nhẹ nhàng hơn: chuyển hẳn Genève/Paris sang chủ đề 6 (đổi
   `topic_id`), hoặc chấp nhận chủ đề đó trống cho tới khi thêm sự kiện.
2. **`date_text` quá dài** của `tong-tien-cong-va-noi-day-tet-mau-than-1968`
   ("Đêm 30, rạng sáng 31/1/1968 (Tết Mậu Thân) và các đợt tiếp theo trong năm
   1968") làm thẻ sự kiện cao hơn các thẻ khác (đã bị cắt 2 dòng trên thẻ). Gợi ý
   rút gọn (chạy trong pgAdmin nếu đồng ý):
   ```sql
   update public.historical_events
   set date_text = 'Từ đêm 30/1/1968'
   where slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968';
   ```

## 6b. Ghi chú nội bộ đã gỡ khỏi trang công khai (29/09/2026)

Trước đây các ghi chú "TODO: kiểm chứng" nằm thẳng trong cột hiển thị cho học sinh
(`sources.citation`, `event_sources.source_note`, `historical_locations.accuracy_note`).
Migration `20260929000000_public_text_cleanup.sql` đã gỡ chúng; **việc cần kiểm chứng vẫn còn nguyên**:

| Chỗ | Việc còn phải làm |
|---|---|
| Nguồn SGK (`sources.citation`, `published_year = 2024`) | Xác nhận năm xuất bản/tái bản của ấn bản đang dùng |
| `event_sources.source_note` (10 sự kiện) | Bổ sung "Bài X, trang Y" cho từng sự kiện |
| `dien-bien-phu`, `geneve-thuy-si`, `paris-phap`, `ha-noi-khu-vuc-trung-tam`, `pac-bo-cao-bang` | Đối chiếu tọa độ (xem bảng mục 2) |

Từ nay trang quản trị **chặn gửi duyệt** nếu phần hiển thị công khai còn chữ `TODO`/`FIXME`
(`lib/admin/readiness.ts`). Ghi chú kiểm chứng hãy để ở file này hoặc ở ô "Ghi chú kiểm duyệt".

### Tên hành chính sau sắp xếp 1/7/2025 (đã cập nhật, nên kiểm lại)

Tra cứu ngày 29/09/2026 trên báo và cổng thông tin. Nên đối chiếu lại với nghị quyết sắp xếp chính thức:

| Địa điểm | Đã ghi | Nguồn tra |
|---|---|---|
| Dinh Độc Lập | 135 Nam Kỳ Khởi Nghĩa, phường Bến Thành, TP. Hồ Chí Minh | Dân trí, 06/07/2025 |
| Bến Nhà Rồng | Số 1 Nguyễn Tất Thành, phường Xóm Chiếu (trước đây thuộc Quận 4) | trang du lịch, Wikipedia |
| Sài Gòn (tâm khu vực) | "khu vực Quận 1 cũ; từ 7/2025 không còn cấp quận" | — |
| Điện Biên Phủ | khu trung tâm nay thuộc các phường Điện Biên Phủ và Mường Thanh, tỉnh Điện Biên | Thư viện Pháp luật |
| Pác Bó | xã Trường Hà, tỉnh Cao Bằng (trước đây thuộc huyện Hà Quảng) | Bảo tàng Hồ Chí Minh, Wikipedia — **chưa chắc xã Trường Hà có giữ tên sau sáp nhập xã, cần kiểm lại** |

### Ảnh cắm cờ trên nóc hầm De Castries (1954)

- **Giấy phép:** Commons gắn nhãn `PD-Vietnam` với lý do "công bố hơn 75 năm", nhưng ảnh công bố năm 1954
  nên đến 2026 mới ~72 năm (Luật SHTT: tác phẩm nhiếp ảnh bảo hộ 75 năm kể từ khi công bố lần đầu).
  Đã sửa câu ghi công cho trung thực; **nên hỏi thầy cô/bộ phận pháp chế** trước khi công khai rộng,
  hoặc thay bằng ảnh có giấy phép rõ ràng.
- **Bối cảnh:** báo Nhân Dân (bài "Dien Bien Phu resounds in foreign films", trích nhật ký Roman Karmen) và
  Wikipedia (mục Roman Karmen) cho biết cảnh cắm cờ trên nóc hầm được đoàn làm phim của Karmen quay dựng lại
  sau chiến dịch. Chú thích ảnh ở trang sự kiện và bài học đã ghi rõ "cảnh dựng lại".

## 6c. Trắc nghiệm GĐ4 (30/09/2026) — cần giáo viên đối chiếu

- **30 câu soạn tay** cho 10 sự kiện đã công bố: `supabase/content/trac-nghiem.json` (sinh ra `supabase/seed-quiz.sql`
  bằng `node scripts/build-quiz-sql.mjs`). Đáp án đúng và lời giải thích chỉ dùng chi tiết **đã có** trong bài viết
  của sự kiện (mục 5b), nên đối chiếu cùng lúc với mục 5b. Đáp án nhiễu cố ý sai; cần chắc không đáp án nhiễu nào
  vô tình cũng đúng.
- **8 câu của bài học Điện Biên Phủ**: `lib/lessons/dien-bien-phu.ts` (trường `quiz`). Riêng câu "ngày 26/1/1954"
  và "16.200 quân" trùng các chi tiết đang chờ đối chiếu của bài học (`toVerify`).
- **Câu tự sinh** (ảnh → sự kiện, năm, chân dung, di tích) ghép trực tiếp từ dữ liệu đã duyệt, không thêm thông tin;
  chỉ đúng khi ảnh được gắn đúng sự kiện/nhân vật/địa điểm.
- Trò chơi "Đoán năm" lấy **năm bắt đầu** của sự kiện (không phải năm chụp ảnh), chỉ với sự kiện có ngày chính xác,
  theo năm hoặc theo giai đoạn.

## 6d. Khung SGK 17 bài — nâng cấp giao diện (01/10/2026) — cần giáo viên đối chiếu

`lib/sgk/curriculum.ts` dựng mục lục **6 chủ đề, 17 bài** của SGK Lịch sử 12 (Kết nối tri thức với cuộc sống) để
web "học theo bài". Chỉ dùng tên chủ đề/bài/mục (thông tin mục lục), không chép nội dung sách.

- **Tên chủ đề, tên bài, số tiết:** lấy theo phân phối chương trình (bảng 12.3 của KE_HOACH_NANG_CAP_GIAO_DIEN.md).
  Cần đối chiếu từng chữ với SGK in.
- **Tên các mục 1, 2, 3… của từng bài: diễn đạt lại, CHƯA đối chiếu SGK in.** Cách chia mục (ví dụ Bài 7 chia
  1945–1946 / 1946–1950 / 1951–1954 / Nguyên nhân – ý nghĩa) là để gắn sự kiện cho đúng giai đoạn; nếu SGK chia khác
  thì sửa `sections` (giữ `id` "muc-N" để không mất tiến độ đã lưu của học sinh).
- **Yêu cầu cần đạt:** diễn đạt lại theo chương trình môn Lịch sử 2018, cần so với yêu cầu cần đạt in đầu mỗi bài.
- **Đánh số mục bằng chữ số Ả Rập** (1, 2, 3) theo cách trình bày thường gặp của bộ Kết nối tri thức; nếu sách in dùng
  số La Mã thì chỉ cần đổi trường `numeral`.
- **Gắn sự kiện vào bài/mục:** theo bảng ánh xạ ở mục 12.3 của kế hoạch; một sự kiện được thuộc nhiều bài (ví dụ
  Hiệp định Genève: Bài 7 mục 3 và Bài 13 mục 1). Bài 1–3, 5, 11, 17 chưa có sự kiện nào → hiện "Đang biên soạn".
- **Giới thiệu chủ đề** (`summary`, 1–2 câu mỗi chủ đề): nhóm tự viết, cần đọc lại.

## 6e. Nội dung GĐ7 (01 – 02/10/2026) — cần giáo viên đối chiếu

**8 sự kiện mới, 2 chủ đề mới, 6 địa điểm mới — đều ở trạng thái NHÁP** (file `supabase/content/su-kien/*.md` có
`batch: gd7`, `supabase/content/chu-de-gd7.json`, `supabase/content/dia-diem-gd7.json` → `supabase/seed-content-gd7.sql`).
Phải qua kiểm duyệt mới hiện công khai; nên duyệt chủ đề và địa điểm trước.

| Sự kiện | Điểm cần đối chiếu |
|---|---|
| Hội nghị Ianta (4 – 11/2/1945) | ba quyết định chính; cách viết tên Xta-lin, Ru-dơ-ven, Sớc-sin theo SGK |
| Liên hợp quốc thành lập (24/10/1945) | mục tiêu, nguyên tắc theo cách diễn đạt của SGK; 50 nước dự Hội nghị San Phran-xi-xcô |
| Hội nghị Manta (2 – 3/12/1989) | cách SGK gọi chức danh M. Goóc-ba-chốp năm 1989 |
| Liên Xô tan rã (25/12/1991) | ngày 21/12/1991 và số 11 nước cộng hòa kí thành lập SNG |
| Thành lập ASEAN (8/8/1967) | mục tiêu của ASEAN; nguyên tắc của Hiệp ước Ba-li (2/1976) |
| Cộng đồng ASEAN (31/12/2015) | mốc 2003, Hiến chương 2007/2008, Tuyên bố Cu-a-la Lăm-pơ 22/11/2015 |
| Bản yêu sách của nhân dân An Nam (18/6/1919) | tên tổ chức "Hội những người Việt Nam yêu nước tại Pháp"; 8 điểm |
| UNESCO tôn vinh Hồ Chí Minh (1987) | thời gian khóa họp 24 Đại hội đồng UNESCO (20/10 – 20/11/1987) và nguyên văn danh hiệu |

**Chuyên đề tương tác mới** (dữ liệu trong code, danh sách cần đối chiếu ở trường `toVerify`, hiện khi mở trang với `?bien-tap=1`):

- `lib/lessons/chien-dich-ho-chi-minh.ts` + `lib/battles/chien-dich-ho-chi-minh-1975.ts` — Chiến dịch Hồ Chí Minh (Bài 8, mục 3):
  hướng tiến công của năm cánh quân, các mốc 14/4, 21/4, 17 giờ 26/4, 10 giờ 45 và 11 giờ 30 ngày 30/4, 2/5/1975; vai trò
  Phạm Hùng, Lê Đức Thọ. Vị trí cánh quân trên bản đồ là sơ đồ hướng tiến công.
- `lib/lessons/tet-mau-than.ts` + `lib/battles/tet-mau-than-1968.ts` — Tết Mậu Thân 1968 (Bài 8, mục 2): số liệu "37/44 thị
  xã, 5/6 thành phố", ngày 20/1 (Khe Sanh), thời gian làm chủ Huế, thời gian đợt 2 và 3, đánh giá hạn chế.
- Ảnh: Commons (ảnh năm 1968, 1975 của quân đội Mỹ — phạm vi công cộng hoặc CC BY 2.0; ảnh di tích ngày nay CC BY / CC BY-SA).
  Không dùng ảnh báo chí năm 1975 của các hãng thông tấn (còn bản quyền). Xe tăng 390, 843 trong Dinh Độc Lập là xe cùng
  loại; xe nguyên bản lưu giữ tại Hà Nội — chú thích đã ghi rõ.
- Video: VTV24, Báo Quân đội nhân dân, Báo Nhân Dân — đã xác minh tên kênh bằng YouTube oEmbed ngày 1 – 2/10/2026.

## 7. Việc cần làm tiếp

1. Đối chiếu toàn bộ bảng trên với SGK Lịch sử 12 đang dùng.
2. Chạy `supabase/migrations/20260925000000_workflow_integrity.sql` (nếu
   chưa chạy) **trước hoặc sau** khi chạy `seed.sql` đều được — seed đã đưa
   sự kiện về `draft` trước, gắn nguồn, rồi mới `UPDATE` sang `published`,
   nên tương thích với trigger G4.
3. Sau khi xác minh xong, cập nhật lại các dòng còn `TODO` ở trên, đồng thời
   ghi chú vào Chương 2 báo cáo đồ án (theo Mục 9 của KE_HOACH_DU_AN.md).
4. Tiếp tục bổ sung dần tới 25–35 sự kiện theo Phụ lục B.2.
