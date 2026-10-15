-- Kiểm thử GĐ1 luyện thi — ngân hàng câu hỏi (migration 20261025000000_exam_bank.sql; docs/ke-hoach-luyen-thi.md, GĐ1).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Giống supabase/tests/payments.sql:
-- một khối DO kết thúc bằng `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ (câu, đề, tài khoản thử biến
-- mất). Báo cáo JSON nằm trong thông báo lỗi "BAO_CAO_KIEM_THU_NGAN_HANG" — đó là kết quả, không phải sự cố.
--
-- Phần RLS chạy THẬT bằng role `authenticated` với `request.jwt.claims` của từng người (như PostgREST làm), rồi trả về
-- role postgres. Mã SQLSTATE kỳ vọng: 42501 RLS/quyền · 23514 CHECK · 23505 UNIQUE · 23503 khóa ngoại · P0001 trigger.

do $test$
declare
  results jsonb := '[]'::jsonb;
  ed uuid := gen_random_uuid();       -- biên tập viên thử
  rv uuid := gen_random_uuid();       -- kiểm duyệt viên thử
  lk uuid := gen_random_uuid();       -- biên tập viên bị khóa
  hs uuid := gen_random_uuid();       -- học sinh (không có hồ sơ nhân sự)
  draft_set uuid;
  pub_set uuid;
  p1 uuid;          -- tư liệu
  i_mcq uuid;       -- trắc nghiệm đã công bố, đáp án gốc 0
  i_mcq2 uuid;      -- trắc nghiệm đã công bố, đáp án gốc 2
  i_draft uuid;     -- trắc nghiệm nháp
  i_tf uuid;        -- Đúng/Sai đã công bố
  i_new uuid;
  c record;
  r jsonb;
  outcome text;
  cnt integer;
  cnt2 integer;
  stamp timestamptz;
  tf4 constant jsonb := '[{"text":"ZZ-KT ý a đúng","is_true":true,"explanation":"Giải thích a"},
                          {"text":"ZZ-KT ý b sai","is_true":false,"explanation":"Giải thích b"},
                          {"text":"ZZ-KT ý c sai","is_true":false,"explanation":"Giải thích c"},
                          {"text":"ZZ-KT ý d đúng","is_true":true,"explanation":"Giải thích d","thua":"khóa lạ"}]';
begin
  -- ---------- Dữ liệu nền ----------
  insert into auth.users (id, email, aud, role, created_at, updated_at) values
    (ed, 'zz-kt-nh-ed-' || replace(ed::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (rv, 'zz-kt-nh-rv-' || replace(rv::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (lk, 'zz-kt-nh-lk-' || replace(lk::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now()),
    (hs, 'zz-kt-nh-hs-' || replace(hs::text, '-', '') || '@test.local', 'authenticated', 'authenticated', now(), now());
  insert into public.staff_profiles (id, full_name, role, account_status) values
    (ed, 'ZZ-KT biên tập', 'editor', 'active'),
    (rv, 'ZZ-KT kiểm duyệt', 'reviewer', 'active'),
    (lk, 'ZZ-KT bị khóa', 'editor', 'locked');

  insert into public.exam_sets (slug, title, format, duration_min, workflow_status) values ('zz-kt-nh-nhap', 'ZZ-KT đề nháp', 'mini', 15, 'draft') returning id into draft_set;
  insert into public.exam_sets (slug, title, format, duration_min, workflow_status) values ('zz-kt-nh-cong-bo', 'ZZ-KT đề công bố', 'mini', 15, 'published') returning id into pub_set;
  insert into public.exam_passages (title, body, source_citation, workflow_status)
    values ('ZZ-KT tư liệu', 'ZZ-KT đoạn tư liệu thử, đủ ba mươi ký tự để qua ràng buộc độ dài.', 'ZZ-KT nguồn thử, tr. 1', 'published') returning id into p1;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT câu trắc nghiệm một?', array['Đúng một', 'Sai một', 'Sai hai', 'Sai ba'], 0, 'Giải thích thử', 'nhan_biet', 'tim_hieu_lich_su', 'SGK thử', 'published')
    returning id into i_mcq;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note, workflow_status)
    values ('mcq', 'ZZ-KT câu trắc nghiệm hai?', array['X', 'Y', 'Đúng hai', 'Z'], 2, 'Giải thích thử', 'thong_hieu', 'tim_hieu_lich_su', 'SGK thử', 'published')
    returning id into i_mcq2;
  insert into public.exam_items (kind, stem, choices, correct_index, explanation, level, competency, source_note)
    values ('mcq', 'ZZ-KT câu trắc nghiệm nháp?', array['A', 'B', 'C', 'D'], 1, 'Giải thích thử', 'nhan_biet', 'tim_hieu_lich_su', 'SGK thử')
    returning id into i_draft;
  insert into public.exam_items (kind, stem, passage_id, statements, explanation, level, competency, source_note, workflow_status)
    values ('true_false', 'ZZ-KT đọc tư liệu sau:', p1, tf4, 'Nhận xét chung thử', 'van_dung', 'van_dung_kien_thuc', 'SGK thử', 'published')
    returning id into i_tf;
  -- Đề công bố: câu 2 (Phần I vị trí 1, xoay 1), câu 1 (vị trí 2, không xoay), câu nháp (vị trí 3), Đúng/Sai (Phần II).
  insert into public.exam_set_items (set_id, item_id, section, position, choice_shift) values
    (pub_set, i_mcq2, 1, 1, 1), (pub_set, i_mcq, 1, 2, 0), (pub_set, i_draft, 1, 3, 0), (pub_set, i_tf, 2, 1, 0),
    (draft_set, i_mcq, 1, 1, 0), (draft_set, i_mcq2, 1, 2, 0);

  -- ===== Ràng buộc "một câu lệnh" (chạy bằng postgres) =====
  for c in
    select * from (values
      ('B1', 'trắc nghiệm chỉ 3 lựa chọn',
        $q$insert into public.exam_items (kind,stem,choices,correct_index,explanation,level,competency,source_note) values ('mcq','ZZ-KT ba lựa chọn?',array['A','B','C'],0,'Giải thích','nhan_biet','tim_hieu_lich_su','SGK')$q$, 'P0001'),
      ('B2', 'trắc nghiệm có 2 lựa chọn trùng (khác hoa thường, khoảng trắng)',
        $q$insert into public.exam_items (kind,stem,choices,correct_index,explanation,level,competency,source_note) values ('mcq','ZZ-KT trùng lựa chọn?',array['A','a ','C','D'],0,'Giải thích','nhan_biet','tim_hieu_lich_su','SGK')$q$, 'P0001'),
      ('B3', 'trắc nghiệm thiếu đáp án đúng',
        $q$insert into public.exam_items (kind,stem,choices,explanation,level,competency,source_note) values ('mcq','ZZ-KT thiếu đáp án?',array['A','B','C','D'],'Giải thích','nhan_biet','tim_hieu_lich_su','SGK')$q$, '23514'),
      ('B4', 'Đúng/Sai chỉ 3 ý',
        $q$insert into public.exam_items (kind,stem,statements,explanation,level,competency,source_note) values ('true_false','ZZ-KT ba ý?','[{"text":"Ý một đủ","is_true":true,"explanation":"Giải a"},{"text":"Ý hai đủ","is_true":true,"explanation":"Giải b"},{"text":"Ý ba đủ","is_true":false,"explanation":"Giải c"}]','Giải thích','van_dung','van_dung_kien_thuc','SGK')$q$, 'P0001'),
      ('B5', 'Đúng/Sai có ý thiếu is_true',
        $q$insert into public.exam_items (kind,stem,statements,explanation,level,competency,source_note) values ('true_false','ZZ-KT thiếu đúng sai?','[{"text":"Ý một đủ","explanation":"Giải a"},{"text":"Ý hai đủ","is_true":true,"explanation":"Giải b"},{"text":"Ý ba đủ","is_true":false,"explanation":"Giải c"},{"text":"Ý bốn đủ","is_true":false,"explanation":"Giải d"}]','Giải thích','van_dung','van_dung_kien_thuc','SGK')$q$, 'P0001'),
      ('B6', 'Đúng/Sai lại có lựa chọn A–D',
        $q$insert into public.exam_items (kind,stem,choices,statements,explanation,level,competency,source_note) values ('true_false','ZZ-KT lẫn dạng?',array['A','B','C','D'],'[{"text":"Ý một đủ","is_true":true,"explanation":"Giải a"},{"text":"Ý hai đủ","is_true":true,"explanation":"Giải b"},{"text":"Ý ba đủ","is_true":false,"explanation":"Giải c"},{"text":"Ý bốn đủ","is_true":false,"explanation":"Giải d"}]','Giải thích','van_dung','van_dung_kien_thuc','SGK')$q$, '23514'),
      ('B7', 'trùng câu: cùng câu hỏi + lựa chọn (đảo thứ tự, khác hoa thường, dấu câu)',
        $q$insert into public.exam_items (kind,stem,choices,correct_index,explanation,level,competency,source_note) values ('mcq','zz-kt CÂU trắc nghiệm một',array['sai ba','Sai hai','ĐÚNG MỘT','Sai một.'],2,'Giải thích','nhan_biet','tim_hieu_lich_su','SGK')$q$, '23505'),
      ('B8', 'trùng câu viết bằng Unicode tổ hợp (NFD)',
        format($q$insert into public.exam_items (kind,stem,choices,correct_index,explanation,level,competency,source_note) values ('mcq',%L,array['Đúng một','Sai một','Sai hai','Sai ba'],0,'Giải thích','nhan_biet','tim_hieu_lich_su','SGK')$q$,
               normalize('ZZ-KT câu trắc nghiệm một?', NFD)), '23505'),
      ('B9', 'lớp 10 không hợp lệ',
        $q$insert into public.exam_items (kind,stem,choices,correct_index,explanation,grade,level,competency,source_note) values ('mcq','ZZ-KT lớp mười?',array['A','B','C','D'],0,'Giải thích',10,'nhan_biet','tim_hieu_lich_su','SGK')$q$, '23514'),
      ('B10', 'tư liệu quá ngắn',
        $q$insert into public.exam_passages (title,body,source_citation) values ('ZZ-KT ngắn','ngắn quá','Nguồn thử 1')$q$, '23514'),
      ('B11', 'câu trong đề ở Phần 3',
        format($q$insert into public.exam_set_items (set_id,item_id,section,position) values (%L,%L,3,1)$q$, draft_set, i_draft), '23514'),
      ('B12', 'hai câu cùng vị trí trong một phần',
        format($q$insert into public.exam_set_items (set_id,item_id,section,position) values (%L,%L,1,1)$q$, draft_set, i_draft), '23505'),
      ('B13', 'đổi chỗ hai câu trong MỘT câu lệnh (ràng buộc vị trí DEFERRABLE)',
        format($q$insert into public.exam_set_items (set_id,item_id,section,position) values (%L,%L,1,2),(%L,%L,1,1) on conflict (set_id,item_id) do update set position = excluded.position$q$,
               draft_set, i_mcq, draft_set, i_mcq2), 'OK'),
      ('B14', 'xóa câu đang nằm trong đề',
        format($q$delete from public.exam_items where id = %L$q$, i_draft), '23503'),
      ('B15', 'xóa tư liệu đang có câu dùng',
        format($q$delete from public.exam_passages where id = %L$q$, p1), '23503'),
      ('B16', 'hợp lệ: trắc nghiệm lớp 11 có chủ đề',
        $q$insert into public.exam_items (kind,stem,choices,correct_index,explanation,grade,topic_tag,level,competency,source_note) values ('mcq','ZZ-KT khởi nghĩa Lam Sơn bắt đầu năm nào?',array['1418','1407','1427','1428'],0,'Giải thích',11,'Khởi nghĩa Lam Sơn','nhan_biet','tim_hieu_lich_su','SGK Lịch sử 11')$q$, 'OK')
    ) as t(ca, mo_ta, stmt, ky_vong)
  loop
    begin
      execute c.stmt;
      outcome := 'OK';
    exception when others then
      outcome := sqlstate;
    end;
    results := results || jsonb_build_object('ca', c.ca, 'mo_ta', c.mo_ta, 'ky_vong', c.ky_vong, 'ket_qua', outcome, 'dat', outcome = c.ky_vong);
  end loop;

  -- B17: ý Đúng/Sai được chuẩn hóa (bỏ khóa lạ), dấu vân tay tự tính.
  select count(*) into cnt from jsonb_array_elements((select statements from public.exam_items where id = i_tf)) as s(v) where v ? 'thua';
  results := results || jsonb_build_object('ca','B17','mo_ta','ý Đúng/Sai bỏ khóa lạ; có dấu vân tay','ky_vong','0 khóa lạ, có vân tay',
    'ket_qua', cnt || ' khóa lạ, ' || coalesce((select left(fingerprint, 12) from public.exam_items where id = i_tf), 'null'),
    'dat', cnt = 0 and (select fingerprint like 'zzktdoctulieusau|%' from public.exam_items where id = i_tf));

  -- B18: published_at — tự đặt khi công bố, giữ nguyên khi sửa, không ghi tay được.
  select published_at into stamp from public.exam_sets where id = pub_set;
  update public.exam_sets set title = 'ZZ-KT đề công bố (sửa)', published_at = '2000-01-01' where id = pub_set;
  update public.exam_sets set workflow_status = 'published' where id = draft_set;
  results := results || jsonb_build_object('ca','B18','mo_ta','published_at do database đặt, không sửa tay được','ky_vong','giữ nguyên; đề mới công bố có ngày',
    'ket_qua', ((select published_at from public.exam_sets where id = pub_set) = stamp)::text || ', '
               || ((select published_at from public.exam_sets where id = draft_set) is not null)::text,
    'dat', stamp is not null and (select published_at from public.exam_sets where id = pub_set) = stamp
           and (select published_at from public.exam_sets where id = draft_set) is not null);
  update public.exam_sets set workflow_status = 'draft' where id = draft_set;

  -- ===== get_exam_set đọc bảng mới =====
  r := public.get_exam_set('zz-kt-nh-cong-bo', null, null, null);
  results := results || jsonb_build_object('ca','G1','mo_ta','chỉ câu trắc nghiệm ĐÃ CÔNG BỐ, đánh số liền 1..n theo phần + vị trí','ky_vong','2 câu: hai, một',
    'ket_qua', jsonb_array_length(r->'questions') || ' câu: ' || coalesce((r->'questions'->0->>'question'), '') || ' | ' || coalesce((r->'questions'->1->>'question'), ''),
    'dat', jsonb_array_length(r->'questions') = 2
           and (r->'questions'->0->>'position')::int = 1 and (r->'questions'->0->>'question') = 'ZZ-KT câu trắc nghiệm hai?'
           and (r->'questions'->1->>'position')::int = 2);
  results := results || jsonb_build_object('ca','G2','mo_ta','xoay lựa chọn: đáp án gốc 2, xoay 1 → hiện ở vị trí 3, đúng nội dung','ky_vong','3, Đúng hai',
    'ket_qua', (r->'questions'->0->>'correct_index') || ', ' || (r->'questions'->0->'choices'->>((r->'questions'->0->>'correct_index')::int)),
    'dat', (r->'questions'->0->>'correct_index')::int = 3
           and (r->'questions'->0->'choices'->>3) = 'Đúng hai'
           and (r->'questions'->0->'choices') = '["Z", "X", "Y", "Đúng hai"]'::jsonb);

  -- ===== Quyền bảng =====
  select count(*) into cnt from (values
    (has_table_privilege('anon', 'public.exam_items', 'select')),
    (has_table_privilege('anon', 'public.exam_passages', 'select')),
    (has_table_privilege('anon', 'public.exam_set_items', 'select')),
    (has_table_privilege('anon', 'public.exam_items', 'insert'))
  ) as t(granted) where granted;
  select count(*) into cnt2 from pg_tables where schemaname = 'public' and tablename in ('exam_items', 'exam_passages', 'exam_set_items') and rowsecurity;
  results := results || jsonb_build_object('ca','Q1','mo_ta','anon không có quyền gì; 3 bảng bật RLS','ky_vong','0 quyền, 3 RLS',
    'ket_qua', cnt || ' quyền, ' || cnt2 || ' RLS', 'dat', cnt = 0 and cnt2 = 3);
  results := results || jsonb_build_object('ca','Q2','mo_ta','get_exam_set chỉ service_role gọi được','ky_vong','false, false, true',
    'ket_qua', has_function_privilege('anon', 'public.get_exam_set(text, text, text, uuid)', 'execute')::text || ', '
               || has_function_privilege('authenticated', 'public.get_exam_set(text, text, text, uuid)', 'execute')::text || ', '
               || has_function_privilege('service_role', 'public.get_exam_set(text, text, text, uuid)', 'execute')::text,
    'dat', not has_function_privilege('anon', 'public.get_exam_set(text, text, text, uuid)', 'execute')
           and not has_function_privilege('authenticated', 'public.get_exam_set(text, text, text, uuid)', 'execute')
           and has_function_privilege('service_role', 'public.get_exam_set(text, text, text, uuid)', 'execute'));

  -- ===== RLS: học sinh (đăng nhập, không phải nhân sự) =====
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', hs, 'role', 'authenticated')::text, true);
  select (select count(*) from public.exam_items) + (select count(*) from public.exam_passages) + (select count(*) from public.exam_set_items) into cnt;
  begin
    insert into public.exam_items (kind,stem,choices,correct_index,explanation,level,competency,source_note)
      values ('mcq','ZZ-KT học sinh chèn?',array['A','B','C','D'],0,'Giải thích','nhan_biet','tim_hieu_lich_su','SGK');
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','L1','mo_ta','học sinh không đọc / ghi được ngân hàng câu hỏi','ky_vong','0 dòng, 42501',
    'ket_qua', cnt || ' dòng, ' || outcome, 'dat', cnt = 0 and outcome = '42501');

  -- ===== RLS: biên tập viên bị khóa =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub', lk, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.exam_items;
  results := results || jsonb_build_object('ca','L2','mo_ta','biên tập viên bị khóa không đọc được','ky_vong','0',
    'ket_qua', cnt, 'dat', cnt = 0);

  -- ===== RLS: biên tập viên =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ed, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.exam_items where stem like 'ZZ-KT%';
  results := results || jsonb_build_object('ca','E1','mo_ta','biên tập viên đọc mọi câu (cả câu đã công bố)','ky_vong','≥ 4',
    'ket_qua', cnt, 'dat', cnt >= 4);

  begin
    insert into public.exam_items (kind,stem,choices,correct_index,explanation,level,competency,source_note)
      values ('mcq','ZZ-KT biên tập tạo nháp?',array['A','B','C','D'],0,'Giải thích','nhan_biet','tim_hieu_lich_su','SGK')
      returning id into i_new;
    update public.exam_items set workflow_status = 'pending_review' where id = i_new;
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','E2','mo_ta','biên tập viên tạo câu nháp rồi gửi duyệt','ky_vong','OK',
    'ket_qua', outcome, 'dat', outcome = 'OK' and (select workflow_status::text from public.exam_items where id = i_new) = 'pending_review');

  begin
    insert into public.exam_items (kind,stem,choices,correct_index,explanation,level,competency,source_note,workflow_status)
      values ('mcq','ZZ-KT biên tập tự công bố?',array['A','B','C','D'],0,'Giải thích','nhan_biet','tim_hieu_lich_su','SGK','published');
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','E3','mo_ta','biên tập viên không tạo câu ở trạng thái đã công bố','ky_vong','42501',
    'ket_qua', outcome, 'dat', outcome = '42501');

  update public.exam_items set stem = 'ZZ-KT bị biên tập sửa?' where id in (i_mcq, i_new);
  get diagnostics cnt = row_count;
  results := results || jsonb_build_object('ca','E4','mo_ta','biên tập viên không sửa câu đã công bố / đang chờ duyệt','ky_vong','0 dòng',
    'ket_qua', cnt || ' dòng', 'dat', cnt = 0);

  begin
    insert into public.exam_set_items (set_id, item_id, section, position) values (draft_set, i_draft, 1, 3);
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  results := results || jsonb_build_object('ca','E5','mo_ta','biên tập viên thêm câu vào đề nháp','ky_vong','OK',
    'ket_qua', outcome, 'dat', outcome = 'OK');

  begin
    insert into public.exam_set_items (set_id, item_id, section, position) values (pub_set, i_new, 1, 9);
    outcome := 'OK';
  exception when others then outcome := sqlstate;
  end;
  delete from public.exam_set_items where set_id = pub_set and item_id = i_mcq;
  get diagnostics cnt = row_count;
  results := results || jsonb_build_object('ca','E6','mo_ta','biên tập viên không thêm / gỡ câu của đề đã công bố','ky_vong','42501, 0 dòng',
    'ket_qua', outcome || ', ' || cnt || ' dòng', 'dat', outcome = '42501' and cnt = 0);

  -- ===== RLS: kiểm duyệt viên =====
  perform set_config('request.jwt.claims', jsonb_build_object('sub', rv, 'role', 'authenticated')::text, true);
  update public.exam_items set workflow_status = 'published' where id = i_new and workflow_status = 'pending_review';
  get diagnostics cnt = row_count;
  results := results || jsonb_build_object('ca','V1','mo_ta','kiểm duyệt viên công bố câu chờ duyệt','ky_vong','1 dòng',
    'ket_qua', cnt || ' dòng', 'dat', cnt = 1);

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- ===== Hoàn tác toàn bộ và trả báo cáo trong thông báo lỗi =====
  raise exception E'BAO_CAO_KIEM_THU_NGAN_HANG\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
