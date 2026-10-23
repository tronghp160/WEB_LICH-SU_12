-- Chuyển Đề luyện thi số 3 từ miễn phí sang thuộc Gói luyện thi (10/2026). Đề 3 dùng cùng sản phẩm với đề 2 — gói tháng /
-- năm cấp giấy phép cho sản phẩm gốc này (grants_product_id), nên ai có gói là mở được. Sửa luôn mô tả đề 2 (đang ghi "Đề
-- đầy đủ miễn phí … số 3"). Chỉ UPDATE theo slug, không xóa gì; lượt làm đề 3 đã có vẫn giữ nguyên. Chạy một lần.

do $$
declare
  pack uuid;
begin
  select product_id into pack from public.exam_sets where slug = 'de-2';
  if pack is null then
    raise exception 'Đề de-2 không gắn sản phẩm — không biết gắn đề 3 vào gói nào.';
  end if;

  update public.exam_sets set product_id = pack where slug = 'de-3' and product_id is null;
  if not found then
    raise exception 'Đề de-3 không có hoặc đã thuộc gói.';
  end if;

  update public.exam_sets
     set description = 'Đề mẫu 10 câu trắc nghiệm, 15 phút — thuộc Gói luyện thi. Đề đầy đủ (24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút): Đề luyện thi số 3.'
   where slug = 'de-2';
end
$$;

-- Kiểm tra:
--   select slug, product_id is null as mien_phi, workflow_status from public.exam_sets where slug in ('de-1', 'de-2', 'de-3') order by slug;
--   → de-1 true · de-2 false · de-3 false (cả ba published)
