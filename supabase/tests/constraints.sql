-- Kiểm thử RÀNG BUỘC CƠ SỞ DỮ LIỆU (Phase 13, mục 8.1 KE_HOACH_DU_AN.md): mỗi ca có trường hợp HỢP LỆ và KHÔNG HỢP LỆ.
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor (hoặc pgAdmin 4) và chạy MỘT LẦN.
-- An toàn: là MỘT khối DO duy nhất, kết thúc bằng `raise exception` mang theo báo cáo nên Postgres HOÀN TÁC toàn bộ
-- (mọi dữ liệu thử biến mất). Báo cáo JSON nằm trong thông báo lỗi "BAO_CAO_KIEM_THU_RANG_BUOC" — đó là kết quả, không phải sự cố.
-- Chạy bằng role postgres (bỏ qua RLS) vì đây là kiểm tra ràng buộc của bảng, không phải phân quyền (xem tests/rls/).
--
-- Mã SQLSTATE kỳ vọng: 23514 CHECK · 23505 UNIQUE · 23503 khóa ngoại · 23502 NOT NULL · 22P02 sai kiểu/enum · P0001 raise exception.

do $test$
declare
  results jsonb := '[]'::jsonb;
  t uuid;          -- chủ đề thử
  src uuid;        -- nguồn thử
  ev uuid;         -- sự kiện thử
  ev2 uuid;
  fig uuid;
  loc1 uuid;
  loc2 uuid;
  med uuid;
  c record;
  outcome text;
  ok boolean;
  cnt integer;
begin
  -- Dữ liệu nền (nằm trong giao dịch, bị hoàn tác ở cuối)
  insert into public.curriculum_topics (name, slug, workflow_status) values ('ZZ-KT-CHU-DE', 'zz-kt-chu-de', 'draft') returning id into t;
  insert into public.sources (title, source_type, citation) values ('ZZ-KT-NGUON', 'book', 'trích dẫn thử') returning id into src;
  insert into public.historical_events (topic_id, title, slug, start_year, date_text, date_precision, summary)
    values (t, 'ZZ-KT sự kiện gốc', 'zz-kt-su-kien-goc', 1954, '1954', 'year', 's') returning id into ev;
  insert into public.historical_figures (name, slug) values ('ZZ-KT nhân vật', 'zz-kt-nhan-vat') returning id into fig;
  insert into public.historical_locations (name, slug, accuracy_level) values ('ZZ-KT địa điểm 1', 'zz-kt-dia-diem-1', 'unknown') returning id into loc1;
  insert into public.historical_locations (name, slug, accuracy_level) values ('ZZ-KT địa điểm 2', 'zz-kt-dia-diem-2', 'unknown') returning id into loc2;

  -- ===== Các ca "một câu lệnh": (mã, mô tả, câu lệnh, SQLSTATE kỳ vọng — 'OK' nghĩa là phải chạy được) =====
  for c in
    select * from (values
      ('C1',  'không hợp lệ: end_year < start_year',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,end_year,date_text,date_precision,summary) values (%L,'x','zz-kt-c1',1954,1953,'x','year','s')$q$, t), '23514'),
      ('C1v', 'hợp lệ: end_year >= start_year',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,end_year,date_text,date_precision,summary) values (%L,'x','zz-kt-c1v',1954,1955,'x','year','s')$q$, t), 'OK'),
      ('C2',  'không hợp lệ: năm của start_date khác start_year',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,start_date,date_text,date_precision,summary) values (%L,'x','zz-kt-c2',1954,'1955-03-13','x','year','s')$q$, t), '23514'),
      ('C2b', 'không hợp lệ: end_date trước start_date',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,start_date,end_date,date_text,date_precision,summary) values (%L,'x','zz-kt-c2b',1954,'1954-05-07','1954-03-13','x','year','s')$q$, t), '23514'),
      ('C2c', 'không hợp lệ: năm của end_date khác end_year',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,end_year,end_date,date_text,date_precision,summary) values (%L,'x','zz-kt-c2c',1954,1954,'1955-01-01','x','year','s')$q$, t), '23514'),
      ('C2v', 'hợp lệ: ngày khớp năm',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,end_year,start_date,end_date,date_text,date_precision,summary) values (%L,'x','zz-kt-c2v',1954,1954,'1954-03-13','1954-05-07','x','period','s')$q$, t), 'OK'),
      ('C3',  'không hợp lệ: date_precision = ''abc''',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,date_text,date_precision,summary) values (%L,'x','zz-kt-c3',1954,'x','abc','s')$q$, t), '23514'),
      ('C3v', 'hợp lệ: date_precision = ''disputed''',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,date_text,date_precision,summary) values (%L,'x','zz-kt-c3v',1954,'x','disputed','s')$q$, t), 'OK'),
      ('C4',  'không hợp lệ: chỉ có latitude, thiếu longitude',
        $q$insert into public.historical_locations (name,slug,accuracy_level,latitude) values ('x','zz-kt-c4','exact',21.0)$q$, '23514'),
      ('C4b', 'không hợp lệ: chỉ có longitude, thiếu latitude',
        $q$insert into public.historical_locations (name,slug,accuracy_level,longitude) values ('x','zz-kt-c4b','exact',105.0)$q$, '23514'),
      ('C5',  'không hợp lệ: latitude = 100',
        $q$insert into public.historical_locations (name,slug,accuracy_level,latitude,longitude) values ('x','zz-kt-c5','exact',100,105)$q$, '23514'),
      ('C5b', 'không hợp lệ: longitude = 181',
        $q$insert into public.historical_locations (name,slug,accuracy_level,latitude,longitude) values ('x','zz-kt-c5b','exact',21,181)$q$, '23514'),
      ('C5v', 'hợp lệ: tọa độ trong khoảng',
        $q$insert into public.historical_locations (name,slug,accuracy_level,latitude,longitude) values ('x','zz-kt-c5v','exact',21.0285,105.8542)$q$, 'OK'),
      ('C5c', 'không hợp lệ: accuracy_level ngoài tập cho phép',
        $q$insert into public.historical_locations (name,slug,accuracy_level) values ('x','zz-kt-c5c','chinh-xac')$q$, '23514'),
      ('C7',  'không hợp lệ: trùng slug sự kiện',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,date_text,date_precision,summary) values (%L,'x','zz-kt-su-kien-goc',1954,'x','year','s')$q$, t), '23505'),
      ('C7b', 'không hợp lệ: trùng tên chủ đề',
        $q$insert into public.curriculum_topics (name,slug) values ('ZZ-KT-CHU-DE','zz-kt-khac')$q$, '23505'),
      ('C9',  'không hợp lệ: event_figures trỏ tới nhân vật không tồn tại',
        format($q$insert into public.event_figures (event_id,figure_id) values (%L,gen_random_uuid())$q$, ev), '23503'),
      ('C9b', 'không hợp lệ: sự kiện trỏ tới chủ đề không tồn tại',
        $q$insert into public.historical_events (topic_id,title,slug,start_year,date_text,date_precision,summary) values (gen_random_uuid(),'x','zz-kt-c9b',1954,'x','year','s')$q$, '23503'),
      ('C9v', 'hợp lệ: event_figures trỏ tới nhân vật có thật',
        format($q$insert into public.event_figures (event_id,figure_id) values (%L,%L)$q$, ev, fig), 'OK'),
      ('N1',  'không hợp lệ: sự kiện thiếu topic_id (NOT NULL)',
        $q$insert into public.historical_events (title,slug,start_year,date_text,date_precision,summary) values ('x','zz-kt-n1',1954,'x','year','s')$q$, '23502'),
      ('N2',  'không hợp lệ: workflow_status ngoài enum',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,date_text,date_precision,summary,workflow_status) values (%L,'x','zz-kt-n2',1954,'x','year','s','dang-xu-ly')$q$, t), '22P02'),
      ('N3',  'không hợp lệ: nhân vật mất trước khi sinh',
        $q$insert into public.historical_figures (name,slug,birth_year,death_year) values ('x','zz-kt-n3',1900,1800)$q$, '23514'),
      ('N3v', 'hợp lệ: nhân vật chỉ có năm sinh',
        $q$insert into public.historical_figures (name,slug,birth_year) values ('x','zz-kt-n3v',1900)$q$, 'OK'),
      ('N4',  'không hợp lệ: source_type ngoài tập cho phép',
        $q$insert into public.sources (title,source_type,citation) values ('x','blog','c')$q$, '23514'),
      ('N5',  'không hợp lệ: media_type ngoài tập cho phép',
        format($q$insert into public.media_assets (event_id,file_url,media_type) values (%L,'https://x','video')$q$, ev), '23514'),
      ('N5v', 'hợp lệ: media_type = image',
        format($q$insert into public.media_assets (event_id,file_url,media_type,alt_text) values (%L,'https://x','image','alt')$q$, ev), 'OK'),
      ('G4',  'trigger G4: chuyển sự kiện sang published khi chưa có nguồn',
        format($q$update public.historical_events set workflow_status='published' where id=%L$q$, ev), 'P0001'),
      ('G4b', 'trigger G4: chèn thẳng sự kiện published (không thể có nguồn)',
        format($q$insert into public.historical_events (topic_id,title,slug,start_year,date_text,date_precision,summary,workflow_status) values (%L,'x','zz-kt-g4b',1954,'x','year','s','published')$q$, t), 'P0001'),
      ('C13', 'hàm bán kính: bán kính âm',
        $q$select * from public.find_published_locations_within_radius(21.0285,105.8542,-5)$q$, 'P0001'),
      ('C13b','hàm bán kính: bán kính bằng 0',
        $q$select * from public.find_published_locations_within_radius(21.0285,105.8542,0)$q$, 'P0001'),
      ('C13c','hàm bán kính: bán kính vượt trần 2.000.000 m',
        $q$select * from public.find_published_locations_within_radius(21.0285,105.8542,2000001)$q$, 'P0001'),
      ('C13d','hàm bán kính: vĩ độ tâm ngoài khoảng',
        $q$select * from public.find_published_locations_within_radius(95,105.8542,1000)$q$, 'P0001'),
      ('C13v','hợp lệ: hàm bán kính với tham số đúng',
        $q$select * from public.find_published_locations_within_radius(21.0285,105.8542,50000)$q$, 'OK')
    ) as v(code, descr, stmt, expected)
  loop
    begin
      execute c.stmt;
      outcome := 'OK';
    exception when others then
      outcome := sqlstate;
    end;
    ok := (outcome = c.expected);
    results := results || jsonb_build_object('ca', c.code, 'mo_ta', c.descr, 'ky_vong', c.expected, 'ket_qua', outcome, 'dat', ok);
  end loop;

  -- ===== C6: địa điểm có tọa độ thì `geom` tự sinh khác null; không có tọa độ thì null =====
  update public.historical_locations set latitude = 21.0285, longitude = 105.8542 where id = loc1;
  results := results || jsonb_build_object('ca','C6','mo_ta','có tọa độ → geom tự sinh khác null','ky_vong','geom khác null',
    'ket_qua', (select case when geom is not null then 'geom khác null' else 'geom NULL' end from public.historical_locations where id = loc1),
    'dat', (select geom is not null from public.historical_locations where id = loc1));
  results := results || jsonb_build_object('ca','C6b','mo_ta','không có tọa độ → geom null','ky_vong','geom null',
    'ket_qua', (select case when geom is null then 'geom null' else 'geom KHÔNG null' end from public.historical_locations where id = loc2),
    'dat', (select geom is null from public.historical_locations where id = loc2));

  -- ===== C8: mỗi sự kiện tối đa 1 địa điểm chính (partial unique index) =====
  insert into public.event_locations (event_id, location_id, is_primary) values (ev, loc1, true);
  begin
    insert into public.event_locations (event_id, location_id, is_primary) values (ev, loc2, true);
    outcome := 'OK';
  exception when others then outcome := sqlstate; end;
  results := results || jsonb_build_object('ca','C8','mo_ta','không hợp lệ: 2 địa điểm chính cho 1 sự kiện','ky_vong','23505','ket_qua',outcome,'dat',outcome='23505');
  begin
    insert into public.event_locations (event_id, location_id, is_primary) values (ev, loc2, false);
    outcome := 'OK';
  exception when others then outcome := sqlstate; end;
  results := results || jsonb_build_object('ca','C8v','mo_ta','hợp lệ: địa điểm phụ (is_primary = false) cùng sự kiện','ky_vong','OK','ket_qua',outcome,'dat',outcome='OK');

  -- ===== C12 (phần cấu trúc): trigger cập nhật updated_at của sự kiện tồn tại và chạy BEFORE UPDATE =====
  -- Lưu ý: KHÔNG kiểm tra được "updated_at mới hơn" ở đây vì trong MỘT giao dịch now() luôn là thời điểm bắt đầu giao dịch.
  -- Hành vi thật (hai giao dịch riêng) được kiểm bằng API ở tests/rls/matrix.mjs (ca C12).
  select count(*) into cnt from pg_trigger
    where tgname = 'trg_historical_events_updated_at' and tgrelid = 'public.historical_events'::regclass and not tgisinternal
      and (tgtype & 2) = 2   -- BEFORE
      and (tgtype & 16) = 16; -- UPDATE
  results := results || jsonb_build_object('ca','C12','mo_ta','trigger updated_at của sự kiện tồn tại (BEFORE UPDATE)','ky_vong','1 trigger','ket_qua',cnt || ' trigger','dat',cnt = 1);

  -- ===== C11: xóa nguồn đang được ảnh tham chiếu → media_assets.source_id = null =====
  update public.media_assets set source_id = src where event_id = ev and file_url = 'https://x' returning id into med;
  delete from public.sources where id = src;
  results := results || jsonb_build_object('ca','C11','mo_ta','xóa nguồn → ảnh vẫn còn, source_id = null','ky_vong','ảnh còn, source_id null',
    'ket_qua', (select case when count(*) > 0 and bool_and(source_id is null) then 'ảnh còn, source_id null' else 'SAI' end from public.media_assets where id = med),
    'dat', (select count(*) > 0 and bool_and(source_id is null) from public.media_assets where id = med));

  -- ===== C10: xóa sự kiện → liên kết + ảnh bị xóa theo; nhân vật/địa điểm/nguồn còn nguyên =====
  insert into public.sources (title, source_type, citation) values ('ZZ-KT-NGUON-2', 'book', 'c') returning id into src;
  insert into public.event_sources (event_id, source_id) values (ev, src);
  delete from public.historical_events where id = ev;
  select (select count(*) from public.event_figures where event_id = ev)
       + (select count(*) from public.event_locations where event_id = ev)
       + (select count(*) from public.event_sources where event_id = ev)
       + (select count(*) from public.media_assets where event_id = ev) into cnt;
  results := results || jsonb_build_object('ca','C10','mo_ta','xóa sự kiện → liên kết và ảnh bị xóa theo','ky_vong','0 dòng liên kết/ảnh còn lại','ket_qua',cnt || ' dòng còn lại','dat',cnt = 0);
  results := results || jsonb_build_object('ca','C10b','mo_ta','xóa sự kiện → nhân vật, địa điểm, nguồn còn nguyên','ky_vong','còn đủ','ket_qua',
    (select (select count(*) from public.historical_figures where id = fig) || ' nhân vật, ' || (select count(*) from public.historical_locations where id in (loc1, loc2)) || ' địa điểm, ' || (select count(*) from public.sources where id = src) || ' nguồn'),
    'dat', (select count(*) from public.historical_figures where id = fig) = 1 and (select count(*) from public.historical_locations where id in (loc1, loc2)) = 2 and (select count(*) from public.sources where id = src) = 1);

  -- ===== Hoàn tác toàn bộ và trả báo cáo trong thông báo lỗi =====
  raise exception E'BAO_CAO_KIEM_THU_RANG_BUOC\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not (e->>'dat')::boolean),
    'chi_tiet', results));
end
$test$;
