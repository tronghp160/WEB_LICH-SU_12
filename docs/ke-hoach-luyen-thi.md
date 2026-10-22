# Kế hoạch nâng cấp Luyện thi THPT – Lịch sử

> Bản rút gọn để làm mốc trong repo. Bản đầy đủ do chủ dự án giao ngày 15/10/2026 (`ke-hoach-nang-cap-luyen-thi.md`).
> Số mục giữ nguyên như bản đầy đủ để ghi chú trong code (`docs/ke-hoach-luyen-thi.md, mục X`) trỏ đúng chỗ.
> Mục tiêu: biến `/luyen-thi` từ "2 đề mẫu 10 câu" thành phòng luyện thi đúng cấu trúc đề thật, có phân tích cá nhân.

## Quy tắc làm việc

- Làm **từng giai đoạn (GĐ)** theo mục 6, đúng thứ tự. Hết mỗi GĐ: lint, unit, E2E liên quan, SQL test, cập nhật
  `docs/test-report.md`, commit riêng, báo chủ dự án trước khi sang GĐ sau.
- Không đổi giá gói, `valid_until`; không xóa đơn hàng / mã kích hoạt.
- Giữ hành vi đang chạy: làm đề bằng mã + thiết bị (không cần tài khoản), gói gắn tài khoản, con dấu Hộ chiếu từ 7 điểm,
  khóa tiến độ `luyen-thi:<slug>`, đồng bộ qua `/api/tien-do`.
- Migration chỉ thêm / chuyển dữ liệu; `exam_questions` chỉ bỏ ở một migration dọn dẹp riêng sau khi đã kiểm tra.
- Bảng mới theo **Quy tắc database** trong `AGENTS.md` (RLS, `revoke` rồi mới `grant`; hàm `security definer` có
  `set search_path = ''`, chỉ `service_role` gọi). Migration: đưa chủ dự án xem trước, chủ dự án tự chạy trong SQL Editor.
- Câu hỏi tự soạn, mỗi câu có `source_note`; không chép đề của nhà xuất bản / trung tâm / trang khác.

## 1. Hiện trạng và vấn đề

### 1.2. Vấn đề cần sửa

1. **Cấu trúc đề.** Đề tốt nghiệp THPT môn Lịch sử từ năm 2025 (Quyết định 764/QĐ-BGDĐT, chương trình 2018):
   **Phần I – 24 câu trắc nghiệm** (0,25 điểm/câu) + **Phần II – 4 câu Đúng/Sai**, mỗi câu 4 ý (đúng 1 ý: 0,1; 2 ý: 0,25;
   3 ý: 0,5; 4 ý: 1 điểm), **50 phút**. Code cũ coi đề đầy đủ là 40 câu trắc nghiệm — sửa ở GĐ0 (`lib/exams/format.ts`).
   Kiểm tra ngày 15/10/2026: chưa thấy văn bản chính thức nào về đề năm 2027 → giữ cấu trúc từ 2025.
2. Đề thật thiên về **đọc hiểu tư liệu**; web chưa có câu kèm đoạn tư liệu dùng chung.
3. Đề thật có cả **kiến thức lớp 11**; web chỉ có khung 17 bài lớp 12.
4. **Lộ đáp án trước khi nộp**: `get_exam_set` trả đáp án + lời giải cho trình duyệt; chấm ở client.
5. Mất bài khi tải lại trang / đổi máy.
6. Không có phân tích cá nhân, sổ câu sai.
7. Quá ít nội dung (20 câu đề đã công bố, 30 câu trắc nghiệm theo bài).
8. Công cụ soạn đề chậm: từng câu một, không nhập hàng loạt, không dùng lại câu giữa các đề.

## 2. Sản phẩm đích

Phòng thi đúng đề thật (24 + 4, 50 phút, tự lưu, làm tiếp, đánh dấu câu, phím tắt) · trang kết quả phân tích theo bài /
mức độ / dạng câu · ≥ 10 đề đầy đủ + đề tự sinh theo ma trận · luyện theo bài / dạng, chấm ngay · sổ câu sai + ôn ngắt
quãng (Leitner) · bảng điều khiển (điểm dự kiến, bản đồ thành thạo 17 bài, đếm ngược) · lộ trình ôn · chuyên đề kỹ năng
Đúng/Sai, đọc tư liệu · sổ tay ôn thi · in đề + phiếu trả lời giấy.

## 3. Thiết kế dữ liệu

- **3.1** Enum: `exam_item_kind (mcq, true_false)`, `exam_item_level (nhan_biet, thong_hieu, van_dung)`,
  `exam_competency (tim_hieu_lich_su, nhan_thuc_tu_duy, van_dung_kien_thuc)`, `exam_attempt_mode (exam, practice, review,
  paper)`, `exam_attempt_status (in_progress, submitted, abandoned)`.
- **3.2** `exam_passages`: đoạn tư liệu dùng chung (`body` 30–2000 ký tự, `source_citation` bắt buộc, `workflow_status`).
- **3.3** `exam_items`: ngân hàng câu hỏi. `mcq` → 4 `choices` + `correct_index`; `true_false` → `statements` jsonb đúng
  4 ý `{text, is_true, explanation}`. `grade` 11/12, `lesson_slug` / `topic_tag`, `level`, `competency`, `event_id`,
  `source_note`, `fingerprint` (unique, chống trùng), `legacy_question_id` (chuyển từ `exam_questions`).
- **3.4** `exam_set_items (set_id, item_id, section 1|2, position)`.
- **3.5** `exam_sets` thêm `format ('thpt_2025' | 'mini' | 'chuyen_de')`, `published_at`, `difficulty 1–3`; `de-1`, `de-2` → `mini`.
- **3.6** `exam_attempts`: lượt làm bài chấm phía server (`item_ids`, `answers` jsonb, `deadline_at`, `score10`,
  `breakdown`…). Ghi chỉ qua hàm `security definer`.
- **3.7** `learner_item_state`: sổ câu sai + hộp Leitner, chỉ cho tài khoản.
- **3.8** `exam_item_reports`: người học báo lỗi câu (giới hạn tần suất).
- **3.9** Thống kê câu (tỉ lệ đúng, độ phân hóa) — chỉ quản trị, chỉ hiện khi ≥ 30 lượt.
- **3.10** Hàm SQL: `exam_access`, `start_exam_attempt` (trả câu KHÔNG kèm đáp án), `start_generated_attempt`,
  `save_attempt_answers`, `submit_exam_attempt` (chấm trong SQL, trả đáp án + lời giải), `get_attempt_result`,
  `get_due_review_items`, `report_exam_item`, `regrade_item`.

### 3.11. Chấm điểm

Giống hệt ở SQL và `lib/exams/scoring.ts`. Trắc nghiệm: 0,25/câu. Đúng/Sai theo số ý đúng 0/1/2/3/4 → 0 / 0,1 / 0,25 /
0,5 / 1 (ý bỏ trống tính sai). Đề `thpt_2025` tối đa 10 điểm. Đề khác cấu trúc: `score10 = raw / max × 10`, làm tròn 2 chữ
số. Con dấu Hộ chiếu giữ ngưỡng ≥ 7; lượt đề mới lưu `best = round(score10 × 100)`, `total = 1000`.

## 4. Tính năng

- **4.1** Phòng thi `components/exams/runner/*`: câu trắc nghiệm, câu Đúng/Sai (nút bật Đúng / Sai cho từng ý), khung tư
  liệu chia đôi màn hình, phiếu trả lời, đồng hồ theo `deadline_at` của server, hộp thoại nộp bài; tự lưu (localStorage +
  `PATCH` gom nhóm 2 giây), làm tiếp, đánh dấu, phím tắt, toàn màn hình, cỡ chữ.
- **4.2** Kết quả `/luyen-thi/ket-qua/[id]`: điểm từng phần, biểu đồ theo bài / mức độ / dạng / thời gian, lọc lời giải,
  làm lại câu sai, báo lỗi câu.
- **4.3** Luyện tập `/luyen-thi/luyen-tap`: lọc bài / dạng / mức độ, chấm ngay từng câu; miễn phí 10 câu/ngày.
- **4.4** Đề tự sinh `/luyen-thi/de-ngau-nhien` theo ma trận `lib/exams/blueprint.ts` (ma trận do web tự đặt, **không
  phải ma trận chính thức của Bộ**); chỉ hiện khi ngân hàng đủ ≥ 3 đề không trùng.
- **4.5** Sổ câu sai `/luyen-thi/so-cau-sai`: Leitner 1 / 3 / 7 / 14 / 30 ngày, giờ Việt Nam; cần đăng nhập.
- **4.6** Tổng quan `/luyen-thi/tong-quan`: điểm dự kiến (≥ 2 lượt đầy đủ), bản đồ thành thạo, chuỗi ngày, **đếm ngược
  theo `NEXT_PUBLIC_EXAM_DATE` (`lib/exams/config.ts`) — trống thì không hiện**, việc nên làm tiếp, lịch sử lượt.
- **4.7** Lộ trình `/luyen-thi/lo-trinh` theo mục tiêu điểm và số tuần.
- **4.8** Chuyên đề kỹ năng (miễn phí) + sổ tay ôn thi từng bài (thuộc gói, 1 bài xem thử).
- **4.9** In đề + phiếu trả lời giấy, nhập đáp án để chấm (không in đáp án).
- **4.10** Báo lỗi câu hỏi → hàng đợi quản trị → chấm lại các lượt cũ khi sửa đáp án.
- **4.11** (Tùy chọn) Thi thử định kỳ — chỉ làm khi chủ dự án đồng ý.

## 5. Miễn phí và có gói

17 bài SGK, bản đồ, trắc nghiệm theo bài vẫn miễn phí. Miễn phí: 1 đề đầy đủ, luyện 10 câu/ngày, kết quả cơ bản, chuyên
đề kỹ năng, 1 bài sổ tay. Có gói: mọi đề, đề tự sinh, luyện không giới hạn, phân tích đầy đủ, sổ câu sai, tổng quan, lộ
trình, sổ tay 17 bài, in đề. Trang `/luyen-thi` chỉ nói những gì đã có thật (dựng từ dữ liệu, `lib/exams/pack.ts`).

## 6. Lộ trình

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 0 | Sửa cấu trúc 40 câu → 24 + 4 (`lib/exams/format.ts`), câu chữ trang, `lib/exams/config.ts` (ngày thi), tài liệu này | Xong 15/10/2026 |
| 1 | Ngân hàng câu hỏi, dạng Đúng/Sai, tư liệu; quản trị ngân hàng, soạn đề từ ngân hàng, nhập JSON | Xong 15/10/2026 (test-report mục 22) — xem "Quyết định khi làm GĐ1" |
| 2 | Lượt làm bài + chấm phía server, API mới, không lộ đáp án | Xong 15/10/2026 (test-report mục 23) — xem "Quyết định khi làm GĐ2" |
| 3 | Phòng thi mới + trang kết quả | Xong 15/10/2026 (test-report mục 24) — xem "Quyết định khi làm GĐ3" |
| 4 | Luyện tập, sổ câu sai, ôn ngắt quãng | Xong 15/10/2026 (test-report mục 25) — xem "Quyết định khi làm GĐ4" |
| 5 | Đề tự sinh, tổng quan, lộ trình | Xong 15/10/2026 (test-report mục 26) — xem "Quyết định khi làm GĐ5"; đề tự sinh hiện ẩn tới khi ngân hàng đủ câu (GĐ6) |
| 6 | Nội dung (song song từ GĐ1): ≥ 360 câu trắc nghiệm, ≥ 60 câu Đúng/Sai, ≥ 60 câu tư liệu, ≥ 5 đề đầy đủ | **Đang làm** — lô nháp đầu 16/10/2026: 50 trắc nghiệm + 18 Đúng/Sai (2 có tư liệu) cho cả 17 bài, đã nạp vào ngân hàng ở trạng thái **nháp**, chờ giáo viên đối chiếu SGK và duyệt (test-report mục 29) |
| 7 | Thống kê câu hỏi, hàng đợi báo lỗi, chấm lại | Xong 16/10/2026 (test-report mục 27) — xem "Quyết định khi làm GĐ7" |
| 8 | Trang bán hàng, kỹ năng, sổ tay, bản in | Xong 16/10/2026 (test-report mục 28) — xem "Quyết định khi làm GĐ8" |
| 9 | (Tùy chọn) Thi thử định kỳ | |

### Đợt demo luyện thi (kế hoạch `docs/ke-hoach-demo-luyen-thi.md`, nhánh `feat/demo-luyen-thi`)

Dữ liệu demo đầy đủ cho Bài 6, 7, 8 · lời giải "sai ở đâu – bài nào – mục nào" · đề số 3 đầy đủ 24 + 4.

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| D0 | Khảo sát, skill `soan-cau-hoi-lich-su` + `kiem-tra-de-thpt`, agent `soat-cau-hoi` | Xong 22/10/2026 |
| D1 | Lời giải từng phương án + vị trí kiến thức (migration `20261101000000_exam_item_explain.sql`) | Code xong 22/10/2026 (test-report mục 30); migration chờ chủ dự án chạy, E2E `exam-explain` chạy sau đó |
| D2 | Bài 6, 7, 8 mỗi bài 30 trắc nghiệm + 8 Đúng/Sai | |
| D3 | Đề luyện thi số 3 (24 + 4) | |
| D4 | Seed demo + công bố | |
| D5 | Kiểm thử tổng | |
| D6 | Kịch bản demo cho giáo viên | |

Kết quả khảo sát GĐ-D0:

- Trang `/bai/<slug>` đã có neo `id="muc-N"` cho từng mục (`app/(public)/bai/[slug]/page.tsx`) → liên kết
  `sgkPaths.section()` dùng được ngay, không cần sửa.
- Bản mới nhất của `exam_attempt_view` nằm ở `20261029000000_exam_quality.sql` (`exam_paper.sql` chỉ gọi lại view).
- `de-1` … `de-10` đã có dòng nháp từ `seed-payments.sql` (`generate_series`); `de-3` hiện thuộc gói gốc `goi-luyen-thi-2027`.
- Câu nháp sẵn có của Bài 6 / 7 / 8 trong `chu-de-3.json`: 5 / 6 / 5 câu (kế hoạch ghi 6 / 7 / 5) — đều chuyển sang tệp mới ở GĐ-D2.
- Migration `20261031000000_exam_plans.sql` (gói tháng / năm) vẫn **chưa chạy** — không ảnh hưởng đợt demo (đề 3 miễn phí).

### Quyết định khi làm GĐ1 (khác / chi tiết hơn bản đầy đủ)

- **Rải đáp án:** chọn cách lưu độ xoay trong `exam_set_items.choice_shift` (0–3). Học sinh thấy lựa chọn gốc i ở vị
  trí (i + shift) mod 4; `get_exam_set` và `lib/exams/compose.ts` dùng cùng công thức. Thêm câu vào đề → tự chọn độ xoay
  để đáp án rơi vào chữ đang ít nhất; nút "Rải đều đáp án A/B/C/D" xếp lại cả đề.
- **Dấu vân tay chống trùng** gồm câu hỏi + các lựa chọn / ý (đã sắp xếp), không chỉ câu hỏi — nhiều câu trắc nghiệm có
  chung câu dẫn ("Nội dung nào sau đây…"), nhiều câu Đúng/Sai có chung "Đọc đoạn tư liệu sau đây". Trigger tính trong
  database (`exam_item_fingerprint`), bản TypeScript chỉ để báo sớm.
- **Phần của câu** suy ra từ dạng: trắc nghiệm → Phần I, Đúng/Sai → Phần II (cả với đề ngắn / theo chủ đề).
- **Đề có câu Đúng/Sai hoặc câu tư liệu soạn và gửi duyệt được, nhưng CHƯA công bố được** cho tới khi có phòng thi mới
  (GĐ3) — trình làm đề hiện tại chỉ hiển thị trắc nghiệm. Cờ `RICH_ITEMS_PLAYABLE` trong `lib/exams/format.ts`.
- **Câu chờ duyệt dùng được trong đề:** đề gửi duyệt được khi mọi câu đã công bố hoặc đang chờ duyệt; công bố đề thì công
  bố luôn các câu (và tư liệu) đang chờ duyệt trong đề. Câu / tư liệu đang nằm trong đề đã công bố thì không ẩn được.
- **Bảng `exam_item_reports` (mục 3.8) để sang GĐ7**, cùng chức năng báo lỗi dùng nó — tránh tạo bảng chưa có chỗ dùng.
- Kiểm duyệt viên công bố / gửi duyệt hàng loạt ở danh sách ngân hàng (tối đa 200 câu một lượt).

### Quyết định khi làm GĐ2

- **Chủ lượt:** lượt tạo khi đăng nhập thuộc tài khoản (đổi máy vẫn xem được, đăng xuất thì không); tạo khi chưa đăng
  nhập thuộc mã thiết bị (UUID trong localStorage, gửi lên dạng băm có muối). Người khác nhận 404 như lượt không tồn tại.
- `exam_attempts` thêm cột **`choice_shifts`** (độ xoay lựa chọn chép từ đề lúc bắt đầu) — đề sửa sau không làm đổi lượt
  đang làm hay điểm đã chấm.
- **Chấm bằng số nguyên phần nghìn** (trắc nghiệm 250, Đúng/Sai 0/100/250/500/1000), điểm thang 10 làm tròn 0,01 nửa
  lên bằng công thức số nguyên — SQL và `lib/exams/scoring.ts` không lệch do số thực; một ca chấm dùng chung cho cả hai
  bộ test.
- **Câu trả lời gửi theo từng câu, thay cả object của câu đó** (bỏ chọn = `{"choice": null}`); server bỏ câu lạ, khóa lạ.
- **Hết giờ:** lưu sau hạn + 30 giây bị từ chối (`time_up`); lượt quá hạn chưa nộp được chấm theo phần đã lưu khi người
  học mở lại đề hoặc xem lượt.
- `GET /api/luyen-thi/[slug]` giờ chỉ trả quyền + số câu + lượt đang làm dở (không có câu hỏi). `start_generated_attempt`
  (đề tự sinh) làm ở GĐ5 cùng ma trận đề. `get_exam_set` (trả cả đáp án) không còn được gọi — bỏ ở migration dọn dẹp.
- Trình làm đề cũ (giao diện giữ nguyên) chuyển sang API mới; hiển thị tối thiểu câu Đúng/Sai và tư liệu cho an toàn —
  phòng thi đầy đủ ở GĐ3. Con dấu Hộ chiếu lưu điểm dạng score10 × 100 / 1000 (mục 3.11).

### Quyết định khi làm GĐ3

- **Không cần migration.** "Bắt đầu lại" = nộp lượt đang dở (chấm phần đã làm) rồi mở lượt mới — dùng lại hàm GĐ2.
- **Trang kết quả tải phía trình duyệt** (`/luyen-thi/ket-qua/[id]`, không lập chỉ mục): chủ lượt chưa đăng nhập được nhận
  ra bằng mã thiết bị trong localStorage, server không đọc được lúc dựng trang. **So với lần trước** dùng lịch sử lượt trên
  máy (`ls12:lich-su-thi`); **thứ hạng** route tính bằng khóa bí mật khi đề đủ 30 lượt nộp, chỉ trả con số.
- Lưu trên máy: `ls12:luot-thi:<id>` (câu trả lời + câu chưa gửi + câu đang xem), `ls12:luot-dang-lam` (nhãn "Đang làm
  dở" ở danh sách đề). Làm tiếp: câu máy này đổi mà chưa gửi được thì lấy bản máy, còn lại theo server.
- Thời gian từng câu chỉ ghi khi xem ≥ 1 giây (đỡ gửi lưu liên tục khi lướt câu); ẩn tab thì ngừng đếm.
- Phím tắt Đúng/Sai: Q/W, E/R, T/Y, U/I (phím trái = Đúng). Bỏ chế độ chọn ý bằng ↑/↓ rồi Đ/S của bản đầy đủ — hai
  phím một ý đủ nhanh và ít nhầm.
- "Làm lại các câu sai" để GĐ4 (cần chế độ luyện tập); "Ôn bài yếu nhất" tạm dẫn tới trang đọc bài SGK. Ảnh chia sẻ kết
  quả (tùy chọn) chưa làm.
- `RICH_ITEMS_PLAYABLE = true`: đề có câu Đúng/Sai / tư liệu công bố được.

### Quyết định khi làm GĐ4

- **Luyện tập dùng chung bảng `exam_attempts`** (chế độ `practice` / `review`, không bấm giờ, `set_id` trống). Câu do
  server chọn ngẫu nhiên theo bộ lọc; lựa chọn xoay ngẫu nhiên. "Làm lại câu sai" là một lượt practice từ câu chưa đạt của
  lượt cũ (của chính mình). Bắt đầu lượt luyện mới thì lượt luyện cũ còn dở được chấm theo câu đã kiểm tra.
- **"Kiểm tra" khóa câu**: câu đã kiểm tra không đổi được câu trả lời (lưu / nộp bỏ qua câu đó). Lượt luyện tập chỉ lộ đáp
  án của câu đã kiểm tra — kể cả sau khi nộp — và chỉ chấm các câu đó; nên không lách được hạn mức miễn phí bằng cách mở
  30 câu rồi nộp.
- **Hạn mức miễn phí 10 câu / ngày** đếm trong SQL (`consume_rate_limit`, cửa sổ = số giây từ 0 giờ hôm nay theo giờ Việt
  Nam). Có gói (mã + máy, hoặc gói của tài khoản) thì không giới hạn.
- **Sổ câu sai chỉ cho tài khoản.** Ghi sổ khi: kiểm tra câu luyện tập / ôn; nộp bài thi (câu đã làm mà chưa đạt tối đa —
  Đúng/Sai sai một ý cũng vào sổ; câu bỏ trống không tính). Xem sổ: mọi tài khoản; **ôn đến hạn**: cần gói.
- Hạn ôn là 0 giờ của ngày đến hạn theo giờ Việt Nam; E2E giả lập "sang ngày mai" bằng cách lùi `due_at` trong DB
  (`page.clock` không đổi được giờ của database).
- Bỏ nút "Ôn bài yếu nhất → luyện theo bài" kiểu GĐ3 (vẫn dẫn tới trang đọc bài SGK); trang luyện tập chọn bài ngay ở đầu.

### Quyết định khi làm GĐ5

- **Ma trận** (`lib/exams/blueprint.ts`): `thpt_2025` 24 + 4 / 50 phút (Phần II ≥ 2 câu có tư liệu khi ngân hàng có),
  `quick_15` 10 + 1 / 15 phút, `tf_only` 8 câu Đúng/Sai / 40 phút, `chu-de-N` 16 + 2 / 30 phút (6 chủ đề). Phân bố theo bài
  tỉ lệ **số tiết** trong `lib/sgk/curriculum.ts`; mức độ theo `LEVEL_MIX_SUGGESTED`. Ghi rõ trên trang: không phải ma trận
  của Bộ. Chỉ lấy câu lớp 12.
- **Server chọn câu, SQL chỉ kiểm**: `lib/exams/generate.ts` (hàm thuần, có seed) chọn theo luật ưu tiên — tránh câu đã gặp
  trong 14 ngày, ≤ 2 câu / sự kiện, Phần I không 2 câu cùng tư liệu — rồi nới dần khi thiếu (ghi chú cho học sinh thấy ở
  đầu đề). Đáp án đúng rải A/B/C/D bằng độ xoay, chọn ngẫu nhiên giữa các chữ đang ít nhất (cả nút "Rải đều đáp án" ở
  trang soạn đề cũng đổi theo — không còn mẫu A, B, C, D… đoán được). `start_generated_attempt` kiểm gói, mọi câu đã công
  bố / không trùng / độ dài, rồi tạo lượt như đề thường (chấm, kết quả, sổ câu sai dùng chung).
- **Lệch mục 7.5**: route đọc thông tin phân loại câu (id, dạng, bài, mức độ, tư liệu, sự kiện, đáp án gốc để rải đáp án)
  bằng khóa bí mật, chỉ trên server, không trả ra trình duyệt — học sinh không có quyền đọc `exam_items`.
- **Đang có lượt dở cùng ma trận** thì "Bắt đầu" trả lượt đó (như đề có sẵn); "Bắt đầu lại" nộp lượt cũ rồi sinh đề mới.
  Đề tự sinh **không** tính vào Hộ chiếu (mỗi lần một đề khác).
- **Chỉ hiện khi đủ câu**: danh sách và liên kết ở `/luyen-thi` cần đủ câu cho 3 đề không trùng; trang làm một ma trận cần
  đủ cho 1 đề. Ngân hàng hiện chỉ có 20 câu trắc nghiệm, chưa có câu Đúng/Sai → mọi ma trận đang ẩn (chờ GĐ6).
- **Tổng quan / lộ trình cần đăng nhập + gói gắn tài khoản** (mục 5). Đọc lượt làm bài bằng phiên của học sinh (RLS
  `own_select`); mục tiêu điểm (`learner_profiles.exam_goal`) và lộ trình (`study_plan`, JSON ≤ 32 KB) ghi bằng phiên của
  họ (RLS `own_update`), server action kiểm lại gói. Điểm dự kiến: 0,5 / 0,3 / 0,2 của 3 lượt đề đầy đủ gần nhất, ẩn khi
  < 2 lượt. Bản đồ thành thạo tô màu khi bài có ≥ 20 câu đã chấm (vững ≥ 80%, khá 50–79%, cần ôn < 50%), có chữ ghi mức
  bên cạnh màu. Đếm ngược chỉ khi có `NEXT_PUBLIC_EXAM_DATE`.
- **Lộ trình**: mục tiêu 6 / 7 / 8 / 9+, 2–7 buổi / tuần; dài tới ngày thi (tối đa 26 tuần) hoặc 8 tuần khi chưa có ngày
  thi. Mỗi tuần: buổi ôn sổ câu sai (khi ≥ 3 buổi), đề đầy đủ (mục tiêu 6: 2 tuần một đề; 7–8: mỗi tuần; 9+: 2 đề khi ≥ 4
  buổi), còn lại luyện bài theo thứ tự yếu → chưa đủ dữ liệu → khá → vững. Buổi tự tick từ lượt nộp sau khi lập (luyện bài:
  ≥ 5 câu của bài trong một lượt); không có tick tay. Trang luyện tập nhận `?bai=` để mở sẵn bài.

### Quyết định khi làm GĐ7

- **Báo lỗi** chỉ cho câu học sinh ĐÃ THẤY ĐÁP ÁN (lượt thi đã nộp, câu luyện tập đã kiểm tra) của chính lượt mình — để
  không thành kênh dò đáp án. Một người một báo cáo đang mở cho mỗi câu; 10 lần / 10 phút. Thiết bị lưu dạng băm. Nút ở
  từng câu trong lời giải (trang kết quả) và sau khi kiểm tra câu (luyện tập). Học sinh không đọc được báo cáo nào.
- **Xử lý**: nhân sự xem hàng đợi `/quan-tri/de-luyen-thi/bao-loi`; kiểm duyệt viên / quản trị viên đánh dấu "đã sửa" /
  "không phải lỗi" (RLS cho phép đổi đúng 4 cột trạng thái, không sửa được lời học sinh).
- **Chấm lại**: quy trình hiện có chỉ cho quản trị viên sửa câu đã công bố, nên nút "Chấm lại các lượt đã nộp" (trang
  câu) cũng chỉ cho quản trị viên. `regrade_item` tính lại **điểm của đúng câu đó** theo đáp án hiện tại rồi cộng phần
  chênh vào điểm lượt và các nhóm phân tích — không chấm lại cả lượt, không đổi giờ nộp, không đụng sổ câu sai. Nhật ký
  `exam_regrade_log` (điểm cũ / mới, người chấm). Trang kết quả ghi "Điểm đã được cập nhật do sửa đáp án câu N".
- **Thống kê câu** chỉ từ lượt THI đã nộp: tỉ lệ đạt, độ phân hóa (27% cao − 27% thấp), lựa chọn theo thứ tự gốc (đã quy
  đổi độ xoay), tỉ lệ đúng từng ý. Cờ cảnh báo và độ phân hóa chỉ hiện khi ≥ 30 lượt. Cột "Đạt x%" ở danh sách ngân hàng.
- **Thống kê quản trị** `/quan-tri/de-luyen-thi/thong-ke` (kiểm duyệt viên, quản trị viên): lượt theo ngày, người dùng
  hoạt động (tài khoản hoặc thiết bị), phân bố điểm — chỉ số đếm, không có thông tin cá nhân.
- Người dùng cho phép làm tiếp không hỏi lại (15/10/2026): tôi tự chạy migration GĐ7 bằng `DATABASE_URL` sau khi thử
  PGlite, rồi chạy kiểm thử SQL (tự hoàn tác) ngay trên DB thật và gọi thử hàm qua API.

### Quyết định khi làm GĐ8

- **Trang `/luyen-thi`**: "Gói gồm những gì?" dựng bằng `packBenefits()` từ số liệu thật — số đề đầy đủ, số câu đã công
  bố trong ngân hàng (và số câu Đúng/Sai), đề tự sinh chỉ khi đủ câu, số bài có sổ tay. Ghi chú cấu trúc đề đổi theo việc
  đã có đề đầy đủ hay chưa. Thêm nút "Làm thử đề miễn phí", khối "Xem trước" (ảnh chụp đề miễn phí thật từ bản production,
  `public/anh/luyen-thi/*.webp`), hỏi đáp 5 câu. **Không tự đặt chính sách hoàn tiền** (chưa có văn bản): câu hỏi về đơn
  hàng hướng tới Tra cứu đơn + email liên hệ + Điều khoản.
- **Người có gói gắn tài khoản** vào `/luyen-thi` được chuyển sang `/luyen-thi/tong-quan`; `?gioi-thieu=1` xem lại trang
  giới thiệu; các nút "danh sách đề / thi đề khác / làm đề đầy đủ" trỏ tới `/luyen-thi?gioi-thieu=1#cac-de` để không bị
  chuyển vòng. Người có gói bằng MÃ (không đăng nhập) vẫn xem trang giới thiệu (server không thấy mã trong máy).
- **Kỹ năng** `/luyen-thi/ky-nang` (+ `/dung-sai`, `/doc-tu-lieu`): miễn phí, do web biên soạn (`lib/exams/skills.ts`), mỗi
  trang 5 ví dụ, lời giải ẩn trong `<details>` (không cần JavaScript). Chỉ dùng dữ kiện cơ bản của SGK; trích nguyên văn chỉ
  lấy từ văn kiện công khai (Tuyên ngôn độc lập, Lời kêu gọi toàn quốc kháng chiến, văn kiện Đại hội VI); đoạn tóm lược ghi
  rõ là lời của web. **Cần giáo viên xem lại** như ma trận (mục 9).
- **Sổ tay** `/luyen-thi/so-tay/[bai]`: dựng từ khung SGK (cần đạt, mục) + sự kiện đã công bố của từng mục + nhân vật gắn sự
  kiện + "câu hay bị nhầm" (≥ 30 lượt, tỉ lệ đạt < 60%, kèm đáp án — chỉ người có gói thấy). Bài 6 xem thử. Gói tài khoản
  kiểm phía server; gói bằng mã: trang tải qua `/api/luyen-thi/so-tay/[bai]` (kiểm gói bằng `get_generated_intro`). Chưa có
  phần "biên tập viên viết thêm" (không có bảng nội dung riêng) — để sau.
- **Bản in** `/luyen-thi/[slug]/in`: lượt chế độ `paper` (hàm `start_paper_attempt`, không hạn nộp; in lại khi chưa nộp →
  cùng lượt, cùng thứ tự lựa chọn), in đề + phiếu trả lời, có "mã bài in" (8 ký tự đầu của lượt) để đối chiếu. Nhập đáp án ở
  `/luyen-thi/[slug]/nhap-dap-an?luot=…` trên cùng máy / tài khoản → chấm như bài online. Lượt `paper` không vào sổ câu sai
  và không tính vào thống kê câu (chỉ lượt `exam`).
- Menu "Ôn tập" thêm Kỹ năng làm bài, Sổ tay ôn thi; sitemap thêm các trang công khai (không có trang kết quả / tổng quan).
- **Hiệu năng**: Lighthouse mobile `/luyen-thi` 86 (desktop 98) trên máy phát triển, bằng mức chung của web lúc đo (trang chủ
  87, trang kỹ năng tĩnh 86) — chưa đạt mục tiêu 90 của kế hoạch; cần đo lại trên Vercel trước khi kết luận.

### Ghi chú GĐ6 (nội dung)

- Lô nháp đầu do Claude soạn (`supabase/content/ngan-hang/chu-de-1-2.json`, `chu-de-3.json`, `chu-de-4-6.json`): mỗi bài
  3–4 câu trắc nghiệm + 1 câu Đúng/Sai, chỉ dùng dữ kiện cơ bản của SGK Lịch sử 12, không trùng 20 câu đã công bố; 2 câu
  dùng tư liệu trích nguyên văn (đoạn kết Tuyên ngôn độc lập; Lời kêu gọi toàn quốc kháng chiến). Nguồn mới ghi tới **bài**
  — người duyệt bổ sung **mục** khi đối chiếu SGK. Không gắn sự kiện (`event`) — gắn khi duyệt nếu cần.
- **Không tự công bố**: đã nạp vào database ở trạng thái nháp (`supabase/seed-ngan-hang.sql`, chạy lại không tạo trùng).
  Giáo viên / kiểm duyệt viên: lọc "Nháp" ở `/quan-tri/ngan-hang-cau-hoi`, đọc bản xem trước, sửa nếu cần, gửi duyệt rồi
  công bố. Câu không dùng thì xóa (câu nháp xóa được).
- `npm run kiem-tra-ngan-hang` kiểm mọi tệp JSON bằng đúng hàm của trang "Nhập từ JSON" + trùng giữa các tệp, câu gần
  giống, cảnh báo soạn câu (đáp án dài hơn hẳn — đã bắt và sửa 3 câu), Đúng/Sai phải có cả ý đúng lẫn ý sai, phân bố đáp
  án, nguồn ghi tới bài. Chạy cùng bộ unit test.
- Còn thiếu so với mục tiêu tối thiểu: ~290 câu trắc nghiệm, ~42 câu Đúng/Sai, ~58 câu có tư liệu, 5 đề đầy đủ — cần người
  soạn có chuyên môn; khi đủ câu Đúng/Sai, đề tự sinh tự hiện (GĐ5) và ghép được đề `thpt_2025`.

## 7. Phụ lục kỹ thuật

Định dạng JSON nhập ngân hàng (`supabase/content/ngan-hang/*.json`), hướng dẫn soạn câu (`docs/huong-dan-soan-cau-hoi.md`)
và checklist bảo mật xem bản đầy đủ, mục 7.2–7.5. Checklist bảo mật bắt buộc mỗi GĐ: đáp án không có trong HTML / RSC /
API trước khi nộp; RLS + `revoke` cho bảng mới; lượt làm bài chỉ chủ đọc / ghi; giới hạn tần suất; không ghi mã kích hoạt
/ mã thiết bị thô vào nhật ký.

## 8. Tiêu chí "xứng đáng tiền" (trước khi quảng bá gói)

≥ 5 đề `thpt_2025` đã duyệt (mục tiêu 10) · đề tự sinh ra ≥ 3 đề không trùng · mọi câu có lời giải, Đúng/Sai giải từng ý ·
không mất bài khi tải lại / mất mạng / đổi máy · kết quả chỉ ra ≥ 1 điểm yếu và 1 việc nên làm · sổ câu sai chạy đúng qua
nhiều ngày · trang bán hàng chỉ nói điều có thật · 3–5 học sinh lớp 12 dùng thử và góp ý.

## 9. Quyết định cần chủ dự án xác nhận (đang dùng mặc định)

| # | Câu hỏi | Mặc định |
|---|---|---|
| 1 | Mở phạm vi lớp 11? | Có cột `grade` từ GĐ1; nội dung ưu tiên lớp 12, trang bán hàng ghi "hiện tập trung lớp 12" |
| 2 | Tính năng cá nhân bắt buộc đăng nhập? | Có; người chỉ dùng mã vẫn làm đề, xem kết quả trên máy này |
| 3 | Hạn mức luyện miễn phí | 10 câu/ngày |
| 4 | Giá gói | Giữ 29.000đ |
| 5 | Đưa đề chính thức / minh họa của Bộ lên web? | Không; chỉ đặt liên kết tới nguồn chính thức |
| 6 | Ngày thi 2027 | Để trống `NEXT_PUBLIC_EXAM_DATE` tới khi Bộ công bố |
| 7 | Ma trận đề tự sinh | Giá trị gợi ý trong `blueprint.ts`, cần giáo viên xem lại |
| 8 | Thi thử định kỳ (GĐ9) | Không, để sau |
