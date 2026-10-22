# Kịch bản demo Luyện thi cho giáo viên

Kế hoạch: `docs/ke-hoach-demo-luyen-thi.md` (GĐ-D6). Thời lượng gợi ý: 20 – 25 phút. Mỗi bước gồm **thao tác** · **điều cần
chỉ cho giáo viên** · **ảnh** (ảnh `docs/screenshots/demo-*.png` do E2E `tests/e2e/luyen-thi-demo.spec.ts` và
`exam-explain.spec.ts` chụp lại sau mỗi lần chạy).

## Chuẩn bị trước buổi demo

1. Dữ liệu demo đã nạp (chạy trong Supabase SQL Editor, mỗi file một lần, theo thứ tự):
   `supabase/seed-ngan-hang.sql` → `supabase/seed-de-3.sql` → `supabase/seed-demo-luyen-thi.sql`. Kiểm bằng các câu `select`
   ở cuối `seed-demo-luyen-thi.sql`: Bài 6, 7, 8 mỗi bài 30 trắc nghiệm + 8 Đúng/Sai; đề `de-3` đã công bố, 24 + 4 câu.
2. Chạy `npm run build` rồi `TEST_PW='…' npx playwright test tests/e2e/luyen-thi-demo.spec.ts` để chắc mọi thứ chạy và có
   ảnh mới.
3. Tài khoản:
   - Một **tài khoản học sinh có gói** (để mở đề 2, sổ câu sai, ôn ngắt quãng) — mua gói bằng cổng giả lập
     (`PAYMENT_PROVIDER=mock`) hoặc tạo mã kích hoạt ở `/quan-tri/don-hang`.
   - Tài khoản quản trị / kiểm duyệt (`admin@test.local`, `reviewer@test.local`) để chiếu phần quản trị.
4. Trên máy học sinh: làm sẵn **một lượt đề 3 đã nộp, có vài câu sai** (để không phải làm đủ 50 phút trong buổi demo);
   ghi lại đường dẫn `/luyen-thi/ket-qua/<mã lượt>`.
5. Mở sẵn các tab: `/luyen-thi`, kết quả lượt đề 3, `/bai/7-khang-chien-chong-phap#muc-3`, `/quan-tri/ngan-hang-cau-hoi`.

> Nội dung câu hỏi do AI soạn, đã qua soát độc lập nhưng **chưa được giáo viên đối chiếu SGK in** — nói rõ điều này đầu buổi
> và mời giáo viên góp ý (bước 10). Danh sách điểm cần đối chiếu: `docs/du-lieu-can-kiem-chung.md`, mục 6f.

## Các bước

### 1. Danh sách đề — `/luyen-thi`

- **Thao tác:** mở trang Luyện thi, cuộn tới danh sách đề.
- **Chỉ cho giáo viên:** đề 1 (đề mẫu ngắn, miễn phí), đề 2 (thuộc gói), **đề 3 — đề đầy đủ 24 câu trắc nghiệm + 4 câu
  Đúng/Sai, 50 phút, miễn phí**; ghi chú cấu trúc đề thi tốt nghiệp từ 2025 tự đổi thành “Hiện có … đề đầy đủ”.
- **Ảnh:** —

### 2. Làm đề 3 — phòng thi

- **Thao tác:** vào đề 3 → “Bắt đầu làm bài”; đi tới câu 7 (tư liệu Điện Biên Phủ, dùng chung cho câu 7 – 8); đánh dấu một
  câu; mở phiếu trả lời; tải lại trang.
- **Chỉ cho giáo viên:** hai phần như đề thật; tư liệu chia đôi màn hình; đồng hồ 50 phút theo giờ máy chủ; tự lưu —
  tải lại trang không mất bài, làm tiếp đúng câu; phím tắt (`?`).
- **Ảnh:** `docs/screenshots/demo-de-3-phong-thi.png`

### 3. Nộp bài — trang kết quả

- **Thao tác:** mở tab kết quả lượt đề 3 đã chuẩn bị.
- **Chỉ cho giáo viên:** điểm thang 10, điểm từng phần (Phần I / 6, Phần II / 4), biểu đồ theo bài / mức độ / dạng câu / thời
  gian, và khối mới **“Kiến thức cần ôn lại”** — gom câu sai theo bài › mục, có nút “Đọc lại mục” và “Luyện 10 câu bài
  này”.
- **Ảnh:** `docs/screenshots/demo-de-3-ket-qua-1280.png` (cỡ 360 / 768: `…-360.png`, `…-768.png`)

### 4. Một câu trắc nghiệm sai — “sai ở đâu, bài nào, mục nào”

- **Thao tác:** lọc “Sai”, mở một câu trắc nghiệm sai (ví dụ câu 7 hoặc 8 về kế hoạch Na-va / Điện Biên Phủ); mở “Xem giải
  thích cả 4 phương án”; bấm liên kết “Kiến thức này ở: Bài 7 › Mục 3…”.
- **Chỉ cho giáo viên:** **“Vì sao sai”** nói đúng phương án em đã chọn (kể cả khi thứ tự phương án đã bị xoay); nhãn kiểu bẫy
  (“Đánh tráo thời gian”…); vị trí kiến thức dẫn thẳng tới đúng mục của trang Bài; **“Ghi nhớ”**; liên kết “Bài học tương
  tác: Chiến dịch Điện Biên Phủ” (bản đồ phim, mô hình 3D).
- **Ảnh:** `docs/screenshots/demo-loi-giai.png`

### 5. Câu Đúng/Sai — lời giải từng ý

- **Thao tác:** mở một câu Phần II (ví dụ câu về Hội nghị Giơ-ne-vơ hoặc Hội nghị Pa-ri).
- **Chỉ cho giáo viên:** mỗi ý có lời giải riêng; ý sai có nhãn kiểu bẫy (“Tuyệt đối hóa”, “Đánh tráo chủ thể”, “Đảo ngược
  nhân quả”…) và vị trí kiến thức (có thể khác bài — ví dụ Bài 13 phần đối ngoại); ý em làm sai được tô nền; cách tính điểm
  Đúng/Sai 0,1 / 0,25 / 0,5 / 1.
- **Ảnh:** `docs/screenshots/demo-loi-giai.png` (phần dưới)

### 6. Luyện tập theo bài — `/luyen-thi/luyen-tap`

- **Thao tác:** chọn Bài 6, 7, 8; thử lần lượt các bộ lọc: dạng câu, mức độ, “Chỉ câu có tư liệu”, 10 / 20 / 30 câu; bắt đầu
  với Bài 7 × Trắc nghiệm × Vận dụng × Chỉ câu có tư liệu; trả lời từng câu → “Kiểm tra”.
- **Chỉ cho giáo viên:** mỗi bài có 30 trắc nghiệm (12 Nhận biết · 9 Thông hiểu · 9 Vận dụng) + 8 Đúng/Sai; kiểm tra từng câu
  là thấy ngay lời giải chi tiết như bước 4; kết thúc → tổng kết có “Kiến thức cần ôn lại”.
- **Ảnh:** `docs/screenshots/demo-luyen-tap.png`

### 7. Ưu tiên câu từng sai, sổ câu sai (cần tài khoản)

- **Thao tác:** đăng nhập tài khoản học sinh có gói; luyện tập với “Ưu tiên câu em từng sai”; mở `/luyen-thi/so-cau-sai`,
  “Ôn ngay”.
- **Chỉ cho giáo viên:** câu sai tự vào sổ; ôn ngắt quãng (Leitner) — câu đến hạn ôn lại theo lịch; làm lại câu sai của một
  lượt.
- **Ảnh:** —

### 8. Bản in đề 3 + nhập đáp án giấy — `/luyen-thi/de-3/in`

- **Thao tác:** mở bản in; xem trước khi in (Ctrl + P); “Nhập đáp án đã làm”, nhập vài câu, “Chấm điểm”.
- **Chỉ cho giáo viên:** dùng cho lớp không có máy: in đề hai phần + phiếu trả lời, không có đáp án / lời giải; học sinh làm
  giấy rồi nhập đáp án để được chấm và xem lời giải như làm trực tuyến.
- **Ảnh:** —

### 9. Quản trị — ngân hàng câu hỏi và soạn đề

- **Thao tác:** đăng nhập kiểm duyệt viên; `/quan-tri/ngan-hang-cau-hoi`, lọc Bài 7; mở một câu; mở “Đề luyện thi” → đề 3.
- **Chỉ cho giáo viên:** bản xem trước có đáp án, lời giải từng phương án, kiểu bẫy, mục SGK, ghi nhớ; form soạn câu có ô mục
  SGK, giải thích + bài / mục / kiểu bẫy cho từng phương án và từng ý; nhập hàng loạt từ JSON (mẫu định dạng trên trang);
  trang soạn đề kiểm đề đầy đủ phải đúng 24 + 4 và có nút “Rải đều đáp án A/B/C/D”. Các câu demo mang ghi chú “Demo 10/2026 —
  cần giáo viên đối chiếu SGK in”.
- **Ảnh:** —

### 10. Cách giáo viên góp ý

- **Thao tác:** ở trang kết quả, bấm “Báo lỗi” dưới một câu; mở `/quan-tri/de-luyen-thi/bao-loi` (hàng đợi báo lỗi) bằng tài khoản
  kiểm duyệt.
- **Chỉ cho giáo viên:** mỗi câu học sinh đã thấy đáp án đều có nút báo lỗi (sai đáp án, lỗi chính tả, sai kiến thức…); kiểm
  duyệt viên xử lý, sửa câu và **chấm lại** các lượt đã nộp; đề nghị giáo viên đối chiếu danh sách
  `docs/du-lieu-can-kiem-chung.md`, mục 6f.
- **Ảnh:** —

## Sau buổi demo

- Ghi lại góp ý của giáo viên vào `docs/du-lieu-can-kiem-chung.md` (sửa câu trong `supabase/content/ngan-hang/*.json`, chạy
  `npm run kiem-tra-ngan-hang`, `node scripts/build-exam-bank-sql.mjs` — câu đã công bố không bị seed ghi đè, sửa trên giao
  diện quản trị rồi “chấm lại” nếu đổi đáp án).
- Câu đã được giáo viên xác nhận: bỏ ghi chú “Demo 10/2026…” ở trang câu hỏi.
