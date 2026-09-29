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

## 7. Việc cần làm tiếp

1. Đối chiếu toàn bộ bảng trên với SGK Lịch sử 12 đang dùng.
2. Chạy `supabase/migrations/20260925000000_workflow_integrity.sql` (nếu
   chưa chạy) **trước hoặc sau** khi chạy `seed.sql` đều được — seed đã đưa
   sự kiện về `draft` trước, gắn nguồn, rồi mới `UPDATE` sang `published`,
   nên tương thích với trigger G4.
3. Sau khi xác minh xong, cập nhật lại các dòng còn `TODO` ở trên, đồng thời
   ghi chú vào Chương 2 báo cáo đồ án (theo Mục 9 của KE_HOACH_DU_AN.md).
4. Tiếp tục bổ sung dần tới 25–35 sự kiện theo Phụ lục B.2.
