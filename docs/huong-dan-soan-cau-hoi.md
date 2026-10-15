# Hướng dẫn soạn câu hỏi luyện thi

Dành cho biên tập viên soạn câu trong **Ngân hàng câu hỏi** (`/quan-tri/ngan-hang-cau-hoi`) và tệp JSON nhập hàng loạt.
Kế hoạch tổng thể: `docs/ke-hoach-luyen-thi.md`.

## Cấu trúc đề thi tốt nghiệp môn Lịch sử (từ năm 2025)

- **Phần I — 24 câu trắc nghiệm** 4 lựa chọn, 0,25 điểm / câu.
- **Phần II — 4 câu Đúng/Sai**, mỗi câu 4 ý a) – d). Điểm một câu theo số ý trả lời đúng: 1 ý → 0,1; 2 ý → 0,25;
  3 ý → 0,5; cả 4 ý → 1 điểm.
- 50 phút, tối đa 10 điểm. Đề thật thiên về **đọc hiểu tư liệu** và vận dụng, có cả kiến thức lớp 11.

## Nguyên tắc chung

- **Tự soạn.** Không chép câu hỏi từ sách tham khảo, đề của trường / trung tâm / trang web khác, kể cả khi sửa vài chữ.
  Có thể dùng AI để gợi ý nháp, nhưng mỗi câu phải được người đối chiếu lại với SGK.
- Chỉ dùng kiến thức có trong **SGK Lịch sử 12 (Kết nối tri thức với cuộc sống)** hiện hành (câu lớp 11: SGK Lịch sử 11).
  Số liệu, ngày tháng phải đối chiếu — xem `docs/du-lieu-can-kiem-chung.md`.
- Mỗi câu ghi **nguồn** cụ thể đến bài / mục, ví dụ `SGK Lịch sử 12 (KNTT), Bài 7, mục 3`.
- Gắn đúng **mức độ** (Nhận biết / Thông hiểu / Vận dụng) và **năng lực**. Phân vân thì chọn mức thấp hơn.
- Lời giải phải giải thích **vì sao** đúng (và vì sao các lựa chọn khác sai khi cần), không chỉ nhắc lại đáp án.

## Câu trắc nghiệm

- Mỗi câu kiểm tra **một** ý; câu dẫn rõ ràng, không phủ định kép ("không phải là… không").
- Phương án nhiễu **hợp lý**: cùng loại, cùng giai đoạn, độ dài tương đương đáp án đúng. Đáp án đúng dài hơn hẳn → học
  sinh đoán được (trang quản trị sẽ nhắc).
- Tránh "Tất cả các ý trên", "Cả A và B" — khi ghép đề, thứ tự lựa chọn được **xoay** để rải đều đáp án A/B/C/D, nên
  lựa chọn không được nhắc tới chữ cái của lựa chọn khác.
- Đáp án đúng đặt ở vị trí nào cũng được.

## Câu Đúng/Sai

- Câu dẫn: một đoạn tư liệu (chọn ở ô "Đoạn tư liệu") hoặc một tình huống ngắn.
- 4 ý **độc lập**, mỗi ý kiểm tra một điểm; nên có **1–3 ý đúng** (trang quản trị nhắc khi cả 4 ý cùng đúng / cùng sai).
- Ý sai phải **sai rõ ràng theo SGK** — các kiểu thường gặp: đánh tráo thời gian, đánh tráo chủ thể, nhầm nguyên nhân với
  kết quả, phóng đại bằng từ tuyệt đối ("duy nhất", "hoàn toàn", "chỉ"). Không sai vì câu chữ mơ hồ.
- Mỗi ý có **lời giải riêng**; thêm một nhận xét chung cho cả câu.

## Câu dựa trên tư liệu

- Đoạn trích có **nguồn rõ** (tên văn kiện / sách, nơi xuất bản, năm, trang), dài vừa đọc trong 1–2 phút (30–2000 ký tự).
- Câu hỏi phải **cần đọc tư liệu** mới làm được — không hỏi điều chỉ cần nhớ SGK.
- Một đoạn tư liệu dùng được cho nhiều câu; tư liệu được duyệt / công bố cùng câu đầu tiên dùng nó.

## Quy trình

1. Soạn trên giao diện, hoặc soạn tệp JSON (`supabase/content/ngan-hang/<bài>.json`, định dạng ở trang "Nhập từ JSON")
   rồi bấm **Kiểm tra** — sửa hết lỗi trước khi **Ghi**. Mọi câu vào trạng thái nháp. Với tệp JSON trong repo, chạy
   `npm run kiem-tra-ngan-hang` (lỗi, trùng, câu gần giống, đáp án dài hơn hẳn, Đúng/Sai toàn đúng / toàn sai) rồi
   `node scripts/build-exam-bank-sql.mjs` để dựng `supabase/seed-ngan-hang.sql`.
2. Gửi duyệt (từng câu, hoặc chọn nhiều câu ở danh sách → "Gửi duyệt các câu đã chọn").
3. Kiểm duyệt viên đọc ở chế độ xem trước (có đáp án, lời giải) → công bố hoặc trả về kèm lý do.
4. Ghép đề ở "Đề luyện thi": đề đầy đủ đúng 24 + 4, bấm "Rải đều đáp án A/B/C/D", gửi duyệt. Công bố đề sẽ công bố luôn
   các câu đang chờ duyệt trong đề.
