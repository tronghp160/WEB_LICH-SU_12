---
name: soan-cau-hoi-lich-su
description: Dùng khi soạn hoặc sửa câu hỏi luyện thi Lịch sử 12 trong supabase/content/ngan-hang/*.json (trắc nghiệm, Đúng/Sai, tư liệu) — định dạng, quy tắc phương án nhiễu, lời giải từng phương án kèm bài/mục SGK, checklist tự kiểm.
---

# Soạn câu hỏi luyện thi Lịch sử 12

Đọc trước: docs/huong-dan-soan-cau-hoi.md, lib/sgk/curriculum.ts (slug bài, id mục muc-N), lib/exams/items.ts.

## Định dạng
Theo "Phụ lục A" của docs/ke-hoach-demo-luyen-thi.md. Bắt buộc: content_key, section_id, source_note tới mục;
mcq có đủ 4 choice_notes; ý sai Đúng/Sai có trap.

- `content_key`: `b<bài>-m<mục>-tn-<nn>` (trắc nghiệm) / `b<bài>-m<mục>-ds-<nn>` (Đúng/Sai), ví dụ `b7-m3-tn-05`;
  câu riêng của đề: `de3-ds-01`; lớp 11: `l11-…`. Không trùng giữa các tệp.
- `trap` ∈ `thoi_gian | chu_the | dia_diem | so_lieu | nhan_qua | tuyet_doi | khai_niem | ban_chat` — chỉ ở phương án / ý SAI.
- `choice_notes` theo thứ tự lựa chọn GỐC trong tệp (khi ghép đề, view tự xoay theo `choice_shift`).
- Câu lớp 11: `grade: 11`, `topic_tag`, KHÔNG `lesson_slug`/`section_id`; vị trí ghi ở `ref` ("SGK Lịch sử 11 (KNTT), Bài …, mục …").

## Viết câu
- Một câu kiểm tra một ý; không phủ định kép; không "tất cả các ý trên"; không nhắc chữ cái phương án khác.
- Phương án nhiễu cùng loại, cùng giai đoạn, độ dài tương đương; ít nhất một nhiễu "gần" (cùng bài, khác mục).
- Câu tư liệu: phải đọc tư liệu mới trả lời được. Tư liệu chỉ trích nguyên văn văn kiện công khai; còn lại tóm lược và ghi "Tóm lược của biên tập viên".
- Vận dụng = so sánh / nhận xét / bài học / liên hệ hiện nay, không phải ngày tháng hiếm.
- Đúng/Sai: 4 ý độc lập, 1–3 ý đúng; ý a thường Nhận biết, ý d thường Vận dụng.
- Rải đáp án đúng gốc đều A/B/C/D trong tệp (~25% mỗi chữ).

## Viết lời giải (quan trọng nhất)
- Phương án sai: (1) sự thật của chính phương án đó, (2) vì sao không khớp câu hỏi, (3) bài/mục chứa phương án đó, (4) trap.
  Không viết "B sai vì không đúng".
- Phương án đúng: vì sao đúng, dữ kiện chốt.
- Ý sai Đúng/Sai: chỉ đúng chữ bị đánh tráo ("đề viết 'duy nhất' — thực tế…").
- "remember": 1 câu ≤ 300 ký tự để học sinh chép vào sổ.

## Không bịa
Ngày tháng, số liệu, tên hội nghị không chắc → không dùng, hoặc ghi vào docs/du-lieu-can-kiem-chung.md và đặt review_note.

## Tự kiểm trước khi xong
1. npm run kiem-tra-ngan-hang không lỗi, không cảnh báo.
2. node scripts/thong-ke-ngan-hang.mjs → đạt chỉ tiêu bài (30 TN: 12/9/9, ≥10 tư liệu; 8 Đ/S, ≥5 tư liệu).
3. Đáp án gốc rải đều A/B/C/D.
4. Giao agent soat-cau-hoi soát độc lập, sửa hết điểm nó nêu.
