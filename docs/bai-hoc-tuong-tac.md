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

---

## Phim 3D "Đồi A1, đêm 6/5/1954"

Trang riêng: `/phim-3d/doi-a1`; cũng nhúng trong bài học Điện Biên Phủ (mục "Phim 3D"). Thời lượng 1 phút 50 giây.

### Người xem thấy gì
- 8 chương: toàn cảnh Mường Thanh về đêm → đồi A1 → **đường hầm và khối bộc phá nhìn xuyên đất** (có nhãn chú thích) → chiến hào chờ giờ G (20 giờ 30) → **vụ nổ** (chớp trắng, cầu lửa, cột khói, mảnh văng, sóng xung kích, hố bom) → bộ đội xung phong (khoảng 75 người, đạn, lựu đạn, pháo yểm trợ, cháy) → giáp lá cà (địch bị hất ngã, rút lui hoặc giơ tay đầu hàng) → **rạng sáng**, cắm cờ trên đỉnh A1.
- Camera điện ảnh 11 cú máy (cầm tay rung nhẹ, rung mạnh khi nổ); nút **Camera tự do** cho phép kéo chuột xoay và cuộn để phóng to.
- **Âm thanh** tổng hợp tại chỗ: gió, dế, nhịp tim dồn dập, tiếng nổ, súng, kèn xung phong, trống hành quân, chim buổi sáng. Tiếng nổ/súng phát theo vị trí (lệch trái/phải theo camera, nhỏ dần theo khoảng cách) và **đến trễ theo tốc độ âm thanh**: thấy chớp trước, nghe sau. Sau vụ nổ lớn tiếng bị bóp nghẹt, ù tai rồi hồi lại.
- **Thuyết minh tiếng Việt** bằng giọng đọc của trình duyệt (nếu máy có giọng tiếng Việt) và **phụ đề**; có lời thuyết minh dạng văn bản bên dưới.
- Điều khiển: phát/tạm dừng, thanh tua có vạch chương, tắt tiếng, bật/tắt thuyết minh, camera, toàn màn hình. Phím: Cách/K, ←/→ (±5 s), M, C, F.

### Cách làm (không thêm gì ngoài Three.js)
- **Địa hình thật**: ảnh độ cao Terrarium (AWS Open Data) quanh đồi A1, đã tải sẵn thành `public/cinema/dbp-dem-a1.png` (512×512, ~4,4 m/điểm). Dữ liệu SRTM 30 m không phân giải nổi một quả đồi cao ~30 m, nên **đồi A1, chiến hào, công sự là công trình dựng theo mô tả** trên nền địa hình thật; sông núi xung quanh và vị trí sở chỉ huy De Castries theo OpenStreetMap.
- **Không dùng mô hình 3D hay file âm thanh bên ngoài**: người lính (13 khối có xương giả lập: chạy, cúi, bắn, ném, ngã, giơ tay, cắm cờ), hầm, bao cát, rào thép gai, cây, bầu trời sao, dãy núi đều tạo bằng mã. Nhờ vậy không có vấn đề bản quyền mô hình.
- **Tất định theo thời gian**: mọi thứ (vị trí lính, đạn, khói, lửa, camera) là hàm thuần của thời điểm `t` (`lib/cinema/*`, có 39 unit test) nên tua tới bất kỳ giây nào cũng ra đúng hình, không cần mô phỏng liên tục.
- **Tải lười**: Three.js (~190 KB) và địa hình (~320 KB) chỉ tải khi bấm "Xem phim 3D"; trang bài học vẫn Lighthouse mobile 79 / desktop 99 (trợ năng 100). Có tự hạ chất lượng (giảm độ phân giải, tắt bóng đổ và bloom) nếu máy yếu; không có WebGL thì báo rõ; tôn trọng "giảm chuyển động" (tắt rung máy và chớp trắng).

### Giới hạn cần nói thẳng khi demo
- Đây là **đồ họa 3D dạng khối (low-poly)** chạy trong trình duyệt, không phải phim điện ảnh quay hay dựng bằng phần mềm chuyên dụng. Người lính là hình khối cách điệu, không có khuôn mặt hay quân phục chi tiết.
- Số lượng nhân vật, động tác, vị trí công sự được giản lược; trang đã ghi chú "minh họa" ngay dưới phim.
- Các chi tiết cần đối chiếu tài liệu chính thống: đường hầm ~45 m, khối bộc phá ~1 tấn, mốc 20 giờ 30 phút ngày 6/5, "rạng sáng 7/5" làm chủ A1 (có trong danh sách "Ghi chú biên soạn" của bài học).
- Muốn tăng độ chân thực nữa cần tài nguyên ngoài: mô hình nhân vật/vũ khí có bản quyền rõ ràng hoặc video do AI tạo (ghi rõ nguồn) chèn vào các cảnh.

### Kịch bản demo thêm (1 phút)
1. Vào bài học → cuộn tới "Phim 3D: Đồi A1" (hoặc mở `/phim-3d/doi-a1`), bấm **Xem phim 3D**, bật loa.
2. Để chạy tới **giờ G**: chỉ cho khán giả đường hầm xuyên đất, rồi vụ nổ.
3. Tạm dừng lúc xung phong, bật **Camera tự do** kéo chuột xoay quanh chiến trường; bấm Toàn màn hình.
4. Tua tới rạng sáng để xem lá cờ.
