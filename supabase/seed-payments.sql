-- Dữ liệu ban đầu cho chức năng thanh toán (docs/ke-hoach-thanh-toan.md, mục 6.4).
-- Chạy SAU migration 20261015000000_payments.sql. Chạy lại được (on conflict do nothing) — không ghi đè giá đã sửa tay.
--
-- • 2 sản phẩm: gói luyện thi năm học 2026–2027 (29.000đ, dùng đến hết 31/7/2027, 3 thiết bị) và ủng hộ (10.000–2.000.000đ).
-- • 10 đề luyện thi ở trạng thái NHÁP, chưa có câu hỏi: đề 1 miễn phí (dùng thử), đề 2–10 thuộc gói.
--   Câu hỏi soạn ở trang quản trị và đi qua kiểm duyệt trước khi công bố (giai đoạn 3/5).

begin;

insert into public.products (slug, kind, name, description, price_vnd, max_devices, valid_until)
values (
  'goi-luyen-thi-2027', 'exam_pack',
  'Gói Luyện thi tốt nghiệp THPT – Lịch sử (năm học 2026–2027)',
  'Đề luyện thi tốt nghiệp THPT môn Lịch sử bấm giờ theo cấu trúc đề thi, có giải thích từng câu và liên kết về bài SGK. Gói cập nhật dần đến 10 đề; đề mới thêm vào tự mở cho người đã mua.',
  29000, 3, '2027-07-31 23:59:59+07'
)
on conflict (slug) do nothing;

insert into public.products (slug, kind, name, description, min_vnd, max_vnd)
values (
  'ung-ho', 'donation',
  'Ủng hộ dự án Lịch sử Việt Nam 12',
  'Ủng hộ tự nguyện để duy trì và phát triển web học Lịch sử 12.',
  10000, 2000000
)
on conflict (slug) do nothing;

insert into public.exam_sets (slug, title, product_id, sort_order)
select format('de-%s', n),
       format('Đề luyện thi số %s', n),
       case when n = 1 then null else (select id from public.products where slug = 'goi-luyen-thi-2027') end,
       n
  from generate_series(1, 10) as n
on conflict (slug) do nothing;

commit;

-- Kiểm tra:
--   select slug, kind, price_vnd, min_vnd, max_vnd, valid_until from public.products order by slug;   → 2 dòng
--   select slug, product_id is null as mien_phi, workflow_status from public.exam_sets order by sort_order;   → 10 dòng, de-1 miễn phí
