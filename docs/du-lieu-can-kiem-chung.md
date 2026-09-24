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

## 6. Việc cần làm tiếp

1. Đối chiếu toàn bộ bảng trên với SGK Lịch sử 12 đang dùng.
2. Chạy `supabase/migrations/20260925000000_workflow_integrity.sql` (nếu
   chưa chạy) **trước hoặc sau** khi chạy `seed.sql` đều được — seed đã đưa
   sự kiện về `draft` trước, gắn nguồn, rồi mới `UPDATE` sang `published`,
   nên tương thích với trigger G4.
3. Sau khi xác minh xong, cập nhật lại các dòng còn `TODO` ở trên, đồng thời
   ghi chú vào Chương 2 báo cáo đồ án (theo Mục 9 của KE_HOACH_DU_AN.md).
4. Tiếp tục bổ sung dần tới 25–35 sự kiện theo Phụ lục B.2.
