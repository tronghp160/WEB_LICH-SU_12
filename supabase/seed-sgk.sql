-- GĐ7 nâng cấp giao diện: dữ liệu ban đầu của bảng sgk_lesson_events (sự kiện nào thuộc bài/mục SGK nào).
-- TỆP SINH TỰ ĐỘNG bởi scripts/build-sgk-sql.mjs từ lib/sgk/curriculum.ts — sửa ở đó rồi chạy lại script.
-- KHÔNG phải migration: là dữ liệu, chạy SAU migration 20261001000000_sgk_lesson_events.sql và SAU seed-content-gd7.sql
-- (sự kiện mới chưa có trong database thì dòng gán của nó tự bỏ qua; chạy lại sau sẽ bổ sung).
--
-- 40 dòng gán. Chỉ INSERT, "on conflict do nothing" nên chạy lại không tạo trùng và không đè cách gán đã sửa
-- trong trang quản trị "Bài SGK".

begin;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '1-lien-hop-quoc', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'hoi-nghi-ianta-1945'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '1-lien-hop-quoc', 'muc-1', e.id, 2
from public.historical_events e
where e.slug = 'thanh-lap-lien-hop-quoc-1945'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '2-trat-tu-the-gioi-trong-chien-tranh-lanh', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'hoi-nghi-ianta-1945'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '2-trat-tu-the-gioi-trong-chien-tranh-lanh', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'hoi-nghi-manta-1989'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '2-trat-tu-the-gioi-trong-chien-tranh-lanh', 'muc-2', e.id, 2
from public.historical_events e
where e.slug = 'lien-xo-tan-ra-1991'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '3-trat-tu-the-gioi-sau-chien-tranh-lanh', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'lien-xo-tan-ra-1991'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '4-su-ra-doi-va-phat-trien-cua-asean', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'thanh-lap-asean-1967'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '4-su-ra-doi-va-phat-trien-cua-asean', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'viet-nam-gia-nhap-asean-1995'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '5-cong-dong-asean', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'cong-dong-asean-2015'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '6-cach-mang-thang-tam-nam-1945', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '6-cach-mang-thang-tam-nam-1945', 'muc-1', e.id, 2
from public.historical_events e
where e.slug = 'tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '6-cach-mang-thang-tam-nam-1945', 'muc-1', e.id, 3
from public.historical_events e
where e.slug = 'tuyen-ngon-doc-lap'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '7-khang-chien-chong-phap', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'hiep-dinh-so-bo-6-3-1946'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '7-khang-chien-chong-phap', 'muc-1', e.id, 2
from public.historical_events e
where e.slug = 'toan-quoc-khang-chien-19-12-1946'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '7-khang-chien-chong-phap', 'muc-3', e.id, 1
from public.historical_events e
where e.slug = 'chien-dich-dien-bien-phu'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '7-khang-chien-chong-phap', 'muc-3', e.id, 2
from public.historical_events e
where e.slug = 'hiep-dinh-geneve-ve-dong-duong'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '8-khang-chien-chong-my-cuu-nuoc', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'tong-tien-cong-va-noi-day-tet-mau-than-1968'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '8-khang-chien-chong-my-cuu-nuoc', 'muc-2', e.id, 2
from public.historical_events e
where e.slug = 'ha-noi-dien-bien-phu-tren-khong-1972'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '8-khang-chien-chong-my-cuu-nuoc', 'muc-2', e.id, 3
from public.historical_events e
where e.slug = 'hiep-dinh-paris-ve-viet-nam'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '8-khang-chien-chong-my-cuu-nuoc', 'muc-3', e.id, 1
from public.historical_events e
where e.slug = 'chien-dich-ho-chi-minh'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '9-bao-ve-to-quoc-tu-sau-thang-4-1975', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'chien-tranh-bao-ve-bien-gioi-tay-nam'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '9-bao-ve-to-quoc-tu-sau-thang-4-1975', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'chien-tranh-bao-ve-bien-gioi-phia-bac-1979'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '9-bao-ve-to-quoc-tu-sau-thang-4-1975', 'muc-3', e.id, 1
from public.historical_events e
where e.slug = 'bao-ve-chu-quyen-gac-ma-1988'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '10-khai-quat-ve-cong-cuoc-doi-moi', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'dai-hoi-dang-lan-thu-vi'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '10-khai-quat-ve-cong-cuoc-doi-moi', 'muc-3', e.id, 1
from public.historical_events e
where e.slug = 'viet-nam-gia-nhap-wto-2007'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '12-doi-ngoai-dau-the-ki-xx-den-1945', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '12-doi-ngoai-dau-the-ki-xx-den-1945', 'muc-2', e.id, 2
from public.historical_events e
where e.slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '13-doi-ngoai-trong-khang-chien-1945-1975', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'hiep-dinh-so-bo-6-3-1946'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '13-doi-ngoai-trong-khang-chien-1945-1975', 'muc-1', e.id, 2
from public.historical_events e
where e.slug = 'hiep-dinh-geneve-ve-dong-duong'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '13-doi-ngoai-trong-khang-chien-1945-1975', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'hiep-dinh-paris-ve-viet-nam'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '14-doi-ngoai-tu-nam-1975-den-nay', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'viet-nam-gia-nhap-lien-hop-quoc-1977'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '14-doi-ngoai-tu-nam-1975-den-nay', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'viet-nam-gia-nhap-asean-1995'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '14-doi-ngoai-tu-nam-1975-den-nay', 'muc-2', e.id, 2
from public.historical_events e
where e.slug = 'binh-thuong-hoa-quan-he-viet-my-1995'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '14-doi-ngoai-tu-nam-1975-den-nay', 'muc-2', e.id, 3
from public.historical_events e
where e.slug = 'viet-nam-gia-nhap-wto-2007'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '15-khai-quat-cuoc-doi-va-su-nghiep-ho-chi-minh', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '16-ho-chi-minh-anh-hung-giai-phong-dan-toc', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'nguyen-tat-thanh-ra-di-tim-duong-cuu-nuoc'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '16-ho-chi-minh-anh-hung-giai-phong-dan-toc', 'muc-1', e.id, 2
from public.historical_events e
where e.slug = 'ban-yeu-sach-cua-nhan-dan-an-nam-1919'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '16-ho-chi-minh-anh-hung-giai-phong-dan-toc', 'muc-2', e.id, 1
from public.historical_events e
where e.slug = 'nguyen-ai-quoc-ve-nuoc-lanh-dao-cach-mang'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '16-ho-chi-minh-anh-hung-giai-phong-dan-toc', 'muc-2', e.id, 2
from public.historical_events e
where e.slug = 'tuyen-ngon-doc-lap'
on conflict (lesson_slug, section_id, event_id) do nothing;

insert into public.sgk_lesson_events (lesson_slug, section_id, event_id, sort_order)
select '17-dau-an-ho-chi-minh', 'muc-1', e.id, 1
from public.historical_events e
where e.slug = 'unesco-ton-vinh-ho-chi-minh-1987'
on conflict (lesson_slug, section_id, event_id) do nothing;

commit;

-- Kiểm tra: select lesson_slug, count(*) from public.sgk_lesson_events group by 1 order by 1;
