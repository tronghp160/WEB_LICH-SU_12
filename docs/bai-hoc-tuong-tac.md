# Bài học tương tác — bản mẫu Chiến dịch Điện Biên Phủ

Trang: `/bai-hoc/chien-dich-dien-bien-phu`. Lối vào có ở trang chủ (mục "Bài học tương tác") và trên trang sự kiện Điện Biên Phủ (nút "Xem bài học tương tác").

## Chạy để demo

```bash
npm run build
npx next start -p 3000      # bản production chạy mượt hơn `npm run dev`
```

Mở http://localhost:3000. Cần mạng Internet để tải nền bản đồ OpenStreetMap và phát video YouTube; ảnh tư liệu nằm sẵn trong `public/`.

## Kịch bản demo (khoảng 3 phút)

1. **Trang chủ**: cuộn xuống mục "Bài học tương tác", chỉ thẻ Điện Biên Phủ có ảnh nền, rồi bấm vào.
   Có thể đi đường khác: vào Dòng thời gian → Chiến dịch Điện Biên Phủ → nút đỏ "Xem bài học tương tác".
2. **Mở đầu**: ảnh cắm cờ trên nóc hầm De Castries zoom chậm, ba con số (56 ngày đêm, 49 cứ điểm, 16.200 quân) tự đếm lên. Bấm "Bắt đầu bài học".
3. **Mục tiêu theo SGK** và **dòng thời gian 8 mốc** hiện dần khi cuộn.
4. **Bản đồ diễn biến**: bấm **Phát** rồi để bản đồ tự chạy, hoặc bấm từng bước:
   - Bước 1: toàn cảnh Đông Dương, giới thiệu kế hoạch Nava.
   - Bước 2: bản đồ bay vào lòng chảo, hiện 3 phân khu và 10 cứ điểm màu xanh (địch).
   - Bước 3: đường kéo pháo nét đứt, trận địa pháo, sở chỉ huy Mường Phăng, vòng vây ngoài. Kèm thẻ "Bạn có biết?" về Tô Vĩnh Diện và ảnh kéo pháo.
   - Bước 4: mũi tên đỏ vẽ dần vào Him Lam, Độc Lập, Bản Kéo; các cứ điểm này chuyển sang đỏ có sao vàng. Kèm thẻ về Phan Đình Giót.
   - Bước 5: đánh E1, D1, C1; A1 và sân bay nhấp nháy viền đỏ (đang giằng co); vòng vây siết lại.
   - Bước 6–7: hầm De Castries bị chiếm, kèm ảnh cắm cờ; toàn bộ cứ điểm bị tiêu diệt.
5. **Video**: bấm phát video QPVN. Nhắc người xem rằng video chỉ tải khi bấm, nên trang vẫn nhanh.
6. **Kết quả và ý nghĩa**: số liệu đếm động, 4 ý nghĩa, câu thơ Tố Hữu.
7. **Nhân vật**: bấm lật thẻ De Castries và Võ Nguyên Giáp.
8. **Di tích ngày nay**: hầm De Castries, hố bộc phá A1, chiến hào, tượng đài D1.
9. **Ghi nhớ nhanh**: đọc câu hỏi, bấm lật để xem đáp án.

## Kỹ thuật

- Dữ liệu viết cứng: `lib/lessons/dien-bien-phu.ts` (bài học) và `lib/battles/dien-bien-phu-1954.ts` (bản đồ). Demo không đụng database và không có migration.
- Bộ mô phỏng dùng chung với Bạch Đằng (`components/battle/*`). Hỗ trợ camera bay theo bước, cứ điểm (đang giữ / đang bị tiến công / đã tiêu diệt), mũi tên vẽ dần, vùng (phân khu, vòng vây), thẻ "Bạn có biết?" và ảnh theo bước.
- Không thêm thư viện: hiệu ứng dùng CSS, `requestAnimationFrame` và `IntersectionObserver`. Khi người dùng bật "giảm chuyển động", mọi hiệu ứng tắt.
- Màu theo quy ước bản đồ lịch sử Việt Nam: quân ta đỏ, địch xanh. Các loại biểu tượng còn khác nhau về hình dáng, nên người khó phân biệt màu vẫn đọc được.
- Tọa độ cứ điểm tra từ OpenStreetMap. Bản Kéo và Hồng Cúm không có trên OSM nên đặt vị trí gần đúng; trang có ghi chú điều này.
- Ảnh lấy từ Wikimedia Commons, đã kiểm tra giấy phép (phạm vi công cộng, CC BY, CC BY-SA), nén webp ≤ 250 KB. Mỗi ảnh có dòng ghi công và link tới trang gốc.
- Video nhúng qua `youtube-nocookie.com`, chỉ tải khi bấm. Đã xác minh bằng YouTube oEmbed ngày 24/9/2026:
  - `qvE5Zd9kHPY`: QPVN – Truyền hình Quốc phòng Việt Nam.
  - `JJVn9hFeaPE`: THVL Tổng Hợp, "Tay không kéo pháo".
  - `kPpJD6UzSPU`: VTV4, "Điện Biên Phủ – Cuộc chiến vì hòa bình".
- Kiểm thử:
  - `tests/unit/lesson-data.test.ts` và `tests/unit/battle-animation.test.ts`.
  - `tests/e2e/lesson.spec.ts` (10 ca) và `tests/e2e/battle.spec.ts`.
- Lighthouse, bản build chạy trên máy phát triển:

  | | Hiệu năng | Trợ năng | Thực hành tốt nhất | SEO |
  |---|---|---|---|---|
  | Mobile | 80 | 100 | 100 | 100 |
  | Desktop | 99 | 100 | 100 | 100 |

## Cần đối chiếu với SGK Kết nối tri thức

Danh sách nằm ở `toVerify` trong `lib/lessons/dien-bien-phu.ts` và hiện trong mục "Ghi chú biên soạn" cuối trang:
- Số bài và số trang.
- Các con số: 49 cứ điểm, 16.200 quân, 62 máy bay.
- Ngày của ba đợt tiến công.
- Khối bộc phá A1 "gần 1 tấn".
- Cách viết "Giơnevơ".
- Câu thơ Tố Hữu.

Nội dung được viết lại bằng lời của nhóm, không chép nguyên văn SGK.

## Lộ trình sau demo

1. **Làm giàu nội dung 10 sự kiện hiện có** theo khung SGK: Bối cảnh, Diễn biến, Kết quả, Ý nghĩa, khoảng 400–800 chữ mỗi sự kiện, kèm 2–4 ảnh có giấy phép. Trang chi tiết hỗ trợ tiêu đề mục.
2. **Đưa bài học vào database** để biên tập viên tự soạn:
   - Bảng `lessons` và `lesson_steps`.
   - `media_type` thêm `'video'`.
   - RLS theo quy trình biên tập → kiểm duyệt → công bố.
   - Form có chọn điểm trên bản đồ.
   - Cần migration; sẽ trình duyệt trước khi chạy.
3. **Thêm 4–5 bài học**:
   - Cách mạng tháng Tám 1945: bản đồ khởi nghĩa lan rộng theo ngày.
   - Chiến dịch Hồ Chí Minh 1975: 5 cánh quân.
   - Tết Mậu Thân 1968.
   - Hiệp định Paris.
   - Chiến dịch Biên giới 1950.
4. **Tùy chọn (Phase 15)**: địa hình 3D lòng chảo Điện Biên Phủ, ảnh 360° tại đồi A1. Chỉ tải khi người dùng bấm xem.
5. **Triển khai Vercel (Phase 14)** để demo online. Cập nhật báo cáo: phạm vi mới (video, hoạt hình, thẻ ghi nhớ), Use Case "Học bài tương tác", `docs/test-report.md`.
