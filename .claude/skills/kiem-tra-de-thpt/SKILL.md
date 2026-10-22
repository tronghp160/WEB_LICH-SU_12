---
name: kiem-tra-de-thpt
description: Dùng khi ghép, sửa hoặc kiểm một đề luyện thi định dạng thpt_2025 (supabase/content/de-thi/*.json) — kiểm cấu trúc 24 trắc nghiệm + 4 Đúng/Sai, 50 phút, ma trận bài/mức độ/tư liệu/lớp 11, rải đáp án.
---

# Kiểm đề thi tốt nghiệp THPT môn Lịch sử

Cấu trúc (từ 2025, giữ cho 2026; xem lib/exams/format.ts):
- Phần I: 24 câu trắc nghiệm 4 lựa chọn, 0,25 điểm/câu.
- Phần II: 4 câu Đúng/Sai × 4 ý; 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1 điểm.
- 50 phút, tối đa 10 điểm.

Ma trận chi tiết đề số 3: docs/ke-hoach-demo-luyen-thi.md, mục 6.2.

Chạy: node scripts/kiem-tra-de.mjs <slug>. Đạt khi:
1. Đúng 24 mcq ở section 1, 4 true_false ở section 2, không câu trùng (kể cả với de-1, de-2).
2. Phân bố lớp 12 theo số tiết chủ đề (Chủ đề 1:3 · 2:2 · 3:5 · 4:3 · 5:3 · 6:4) + câu lớp 11 theo ma trận đề.
3. Mức độ toàn đề sát 40/30/30 (lệch ≤ 10 điểm %).
4. ≥ 2 câu Phần I có tư liệu; cả 4 câu Phần II có tư liệu; mỗi câu Phần II 1–3 ý đúng, ý a NB … ý d VD.
5. Sau khi xoay: đáp án Phần I đúng 6 A · 6 B · 6 C · 6 D, không quá 3 câu liền cùng chữ.
6. Mọi câu có section_id (lớp 12) hoặc ref (lớp 11), choice_notes / trap đầy đủ.

Sinh SQL: node scripts/build-exam-set-sql.mjs <slug> → supabase/seed-<slug>.sql (chỉ đưa chủ dự án xem, không tự chạy).
In bảng ma trận ra và dán vào docs/test-report.md.
