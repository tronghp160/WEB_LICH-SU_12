-- Kiểm thử GĐ-D1 demo luyện thi — lời giải từng phương án + vị trí kiến thức (migration 20261101000000_exam_item_explain.sql).
--
-- Cách chạy: dán nguyên file vào Supabase SQL Editor và chạy MỘT LẦN (sau migration). Khối DO kết thúc bằng
-- `raise exception` mang báo cáo nên Postgres HOÀN TÁC toàn bộ. Báo cáo nằm trong thông báo lỗi "BAO_CAO_KIEM_THU_LOI_GIAI".

do $test$
declare
  results jsonb := '[]'::jsonb;
  m uuid[] := '{}';
  tf uuid;
  free_set uuid;
  r jsonb; r2 jsonb;
  att uuid;
  answers jsonb := '{}'::jsonb;
  ok boolean;
  msg text;
  k integer;
  dev constant text := repeat('7', 64);
  notes constant jsonb := '[
    {"note": "Giải thích cho lựa chọn Gốc-A (đúng).", "lesson_slug": "7-khang-chien-chong-phap", "section_id": "muc-3"},
    {"note": "Giải thích cho lựa chọn Gốc-B (sai).", "section_id": "muc-2", "trap": "thoi_gian"},
    {"note": "Giải thích cho lựa chọn Gốc-C (sai).", "ref": "SGK Lịch sử 11, Bài 5, mục 2", "trap": "chu_the"},
    {"note": "Giải thích cho lựa chọn Gốc-D (sai).", "trap": "tuyet_doi", "la": "khóa lạ"}
  ]';
begin
  -- 4 câu trắc nghiệm giống nhau về lời giải, khác câu hỏi; đáp án gốc = 0 (Gốc-A).
  for k in 0..3 loop
    insert into public.exam_items (kind, stem, choices, correct_index, choice_notes, explanation, lesson_slug, section_id, remember,
                                   content_key, level, competency, source_note, workflow_status)
      values ('mcq', format('ZZ-KT lời giải câu %s?', k), array['Gốc-A', 'Gốc-B', 'Gốc-C', 'Gốc-D'], 0, notes, 'Giải thích chung',
              '7-khang-chien-chong-phap', 'muc-3', 'Ghi nhớ: một câu chốt kiến thức.', format('zz-kt-loi-giai-%s', k),
              'nhan_biet', 'tim_hieu_lich_su', 'SGK Lịch sử 12 (KNTT), Bài 7, mục 3', 'published');
  end loop;
  select array_agg(id order by content_key) into m from public.exam_items where content_key like 'zz-kt-loi-giai-%';

  insert into public.exam_items (kind, stem, statements, explanation, lesson_slug, section_id, level, competency, source_note, workflow_status)
    values ('true_false', 'ZZ-KT lời giải Đúng/Sai', '[
      {"text": "Ý a đúng của câu thử", "is_true": true, "explanation": "Vì a đúng", "section_id": "muc-3"},
      {"text": "Ý b sai của câu thử", "is_true": false, "explanation": "Vì b sai", "section_id": "muc-1", "trap": "khai_niem"},
      {"text": "Ý c đúng của câu thử", "is_true": true, "explanation": "Vì c đúng"},
      {"text": "Ý d sai của câu thử", "is_true": false, "explanation": "Vì d sai", "lesson_slug": "8-khang-chien-chong-my-cuu-nuoc", "section_id": "muc-1", "trap": "tuyet_doi"}
    ]', 'Nhận xét chung', '7-khang-chien-chong-phap', 'muc-3', 'van_dung', 'nhan_thuc_tu_duy', 'SGK', 'published')
    returning id into tf;

  results := results || jsonb_build_object('ca','E1','mo_ta','trigger giữ khóa đã biết của choice_notes, bỏ khóa lạ; ý Đúng/Sai giữ section_id / trap',
    'ky_vong','4 phần tử, không có "la", ý b có trap',
    'ket_qua', (select jsonb_array_length(choice_notes) || ', la=' || (choice_notes -> 3 ? 'la')::text from public.exam_items where id = m[1])
               || ', trap b=' || coalesce((select statements -> 1 ->> 'trap' from public.exam_items where id = tf), 'không'),
    'dat', (select jsonb_array_length(choice_notes) = 4 and not (choice_notes -> 3 ? 'la') from public.exam_items where id = m[1])
           and (select statements -> 1 ->> 'trap' = 'khai_niem' and statements -> 0 ->> 'section_id' = 'muc-3' from public.exam_items where id = tf));

  -- E2–E6: các trường hợp bị từ chối.
  begin
    insert into public.exam_items (kind, stem, choices, correct_index, choice_notes, explanation, level, competency, source_note)
      values ('mcq', 'ZZ-KT ba lời giải?', array['A1', 'B1', 'C1', 'D1'], 0, (notes - 3), 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK');
    ok := false; msg := 'ghi được';
  exception when others then ok := true; msg := sqlerrm;
  end;
  results := results || jsonb_build_object('ca','E2','mo_ta','câu trắc nghiệm có 3 lời giải bị từ chối','ky_vong','lỗi','ket_qua', msg, 'dat', ok);

  begin
    insert into public.exam_items (kind, stem, statements, choice_notes, explanation, level, competency, source_note)
      values ('true_false', 'ZZ-KT Đúng/Sai có choice_notes', (select statements from public.exam_items where id = tf), notes, 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK');
    ok := false; msg := 'ghi được';
  exception when others then ok := true; msg := sqlerrm;
  end;
  results := results || jsonb_build_object('ca','E3','mo_ta','câu Đúng/Sai có choice_notes bị từ chối','ky_vong','lỗi','ket_qua', msg, 'dat', ok);

  begin
    insert into public.exam_items (kind, stem, choices, correct_index, choice_notes, explanation, level, competency, source_note)
      values ('mcq', 'ZZ-KT bẫy ở đáp án đúng?', array['A2', 'B2', 'C2', 'D2'], 1, notes, 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK');
    ok := false; msg := 'ghi được';
  exception when others then ok := true; msg := sqlerrm;
  end;
  results := results || jsonb_build_object('ca','E4','mo_ta','kiểu bẫy ghi ở lựa chọn ĐÚNG bị từ chối (đáp án = Gốc-B có trap)','ky_vong','lỗi','ket_qua', msg, 'dat', ok);

  begin
    insert into public.exam_items (kind, stem, choices, correct_index, choice_notes, explanation, level, competency, source_note)
      values ('mcq', 'ZZ-KT mục sai dạng?', array['A3', 'B3', 'C3', 'D3'], 0,
              jsonb_set(notes, '{1,section_id}', '"muc-abc"'), 'Giải thích', 'nhan_biet', 'tim_hieu_lich_su', 'SGK');
    ok := false; msg := 'ghi được';
  exception when others then ok := true; msg := sqlerrm;
  end;
  results := results || jsonb_build_object('ca','E5','mo_ta','section_id sai dạng / trap lạ bị từ chối','ky_vong','lỗi','ket_qua', msg, 'dat', ok);

  begin
    insert into public.exam_items (kind, stem, choices, correct_index, explanation, section_id, content_key, level, competency, source_note)
      values ('mcq', 'ZZ-KT mục không có bài?', array['A4', 'B4', 'C4', 'D4'], 0, 'Giải thích', 'muc-1', 'zz-kt-loi-giai-0', 'nhan_biet', 'tim_hieu_lich_su', 'SGK');
    ok := false; msg := 'ghi được';
  exception when others then ok := true; msg := sqlerrm;
  end;
  results := results || jsonb_build_object('ca','E6','mo_ta','section_id không kèm lesson_slug / content_key trùng bị từ chối','ky_vong','lỗi','ket_qua', msg, 'dat', ok);

  -- Đề miễn phí: 4 câu trắc nghiệm với độ xoay 0, 1, 2, 3 + 1 câu Đúng/Sai.
  insert into public.exam_sets (slug, title, format, duration_min, workflow_status, published_at)
    values ('zz-kt-loi-giai', 'ZZ-KT lời giải', 'mini', 15, 'published', now()) returning id into free_set;
  insert into public.exam_set_items (set_id, item_id, section, position, choice_shift)
    select free_set, m[g.j + 1], 1, g.j + 1, g.j from generate_series(0, 3) as g(j);
  insert into public.exam_set_items (set_id, item_id, section, position, choice_shift) values (free_set, tf, 2, 5, 0);

  r := public.start_exam_attempt('zz-kt-loi-giai', null, dev, null);
  att := (r -> 'attempt' ->> 'id')::uuid;
  results := results || jsonb_build_object('ca','V1','mo_ta','lượt CHƯA nộp: không có choice_notes / section_id / remember / statement_refs / topic_tag','ky_vong','không lộ',
    'ket_qua', jsonb_array_length(r -> 'questions') || ' câu, lộ=' || (r::text ~ '"(choice_notes|section_id|remember|statement_refs|topic_tag|correct_index|truths)"')::text,
    'dat', jsonb_array_length(r -> 'questions') = 5 and r::text !~ '"(choice_notes|section_id|remember|statement_refs|topic_tag|correct_index|truths)"');

  for k in 1..4 loop
    answers := answers || jsonb_build_object(m[k]::text, '{"choice": 0}'::jsonb);
  end loop;
  r := public.submit_exam_attempt(att, null, dev, answers);

  -- Ở mọi vị trí hiển thị: lời giải phải nói về đúng lựa chọn đang hiện ở vị trí đó.
  select bool_and(q -> 'choice_notes' -> slot ->> 'note' like '%' || (q -> 'choices' ->> slot) || '%'),
         string_agg((q ->> 'n') || ':' || (q -> 'choices' ->> 0) || '/' || coalesce(q -> 'choice_notes' -> 0 ->> 'note', '∅'), '; ')
    into ok, msg
    from jsonb_array_elements(r -> 'questions') as x(q), generate_series(0, 3) as slot
   where x.q ->> 'kind' = 'mcq';
  results := results || jsonb_build_object('ca','V2','mo_ta','sau khi nộp: choice_notes[vị trí hiển thị] khớp choices[vị trí hiển thị] với độ xoay 0, 1, 2, 3','ky_vong','khớp cả 16 ô',
    'ket_qua', msg, 'dat', coalesce(ok, false));

  results := results || jsonb_build_object('ca','V3','mo_ta','sau khi nộp: đáp án đúng hiển thị = lựa chọn có lời giải không có trap; có section_id, remember','ky_vong','khớp, muc-3, có ghi nhớ',
    'ket_qua', (select string_agg((q ->> 'correct_index') || '→' || coalesce(q -> 'choice_notes' -> (q ->> 'correct_index')::int ->> 'trap', 'không bẫy'), ', ')
                  from jsonb_array_elements(r -> 'questions') as x(q) where q ->> 'kind' = 'mcq')
               || ', mục=' || coalesce(r -> 'questions' -> 0 ->> 'section_id', '∅') || ', ghi nhớ=' || (r -> 'questions' -> 0 ? 'remember')::text,
    'dat', (select bool_and(q -> 'choice_notes' -> (q ->> 'correct_index')::int ->> 'trap' is null
                            and (q -> 'choices' ->> (q ->> 'correct_index')::int) = 'Gốc-A')
              from jsonb_array_elements(r -> 'questions') as x(q) where q ->> 'kind' = 'mcq')
           and r -> 'questions' -> 0 ->> 'section_id' = 'muc-3' and r -> 'questions' -> 0 ? 'remember');

  r2 := (select q from jsonb_array_elements(r -> 'questions') as x(q) where q ->> 'kind' = 'true_false');
  results := results || jsonb_build_object('ca','V4','mo_ta','câu Đúng/Sai sau khi nộp: statement_refs 4 phần tử theo thứ tự ý, ý không ghi gì là object rỗng','ky_vong','muc-3 / khai_niem / {} / 8-…+tuyet_doi',
    'ket_qua', coalesce((r2 -> 'statement_refs')::text, '∅'),
    'dat', jsonb_array_length(r2 -> 'statement_refs') = 4 and r2 -> 'statement_refs' -> 0 ->> 'section_id' = 'muc-3'
           and r2 -> 'statement_refs' -> 1 ->> 'trap' = 'khai_niem' and r2 -> 'statement_refs' -> 2 = '{}'::jsonb
           and r2 -> 'statement_refs' -> 3 ->> 'lesson_slug' = '8-khang-chien-chong-my-cuu-nuoc' and not (r2 ? 'choice_notes'));

  results := results || jsonb_build_object('ca','V5','mo_ta','điểm không đổi: chọn Gốc-A (vị trí hiển thị = độ xoay) mà gửi choice 0 → chỉ câu xoay 0 đúng','ky_vong','1/4 câu trắc nghiệm đạt',
    'ket_qua', (select count(*) from jsonb_array_elements(r -> 'questions') as x(q) where q ->> 'kind' = 'mcq' and (q ->> 'earned_milli')::int = 250) || ' câu',
    'dat', (select count(*) from jsonb_array_elements(r -> 'questions') as x(q) where q ->> 'kind' = 'mcq' and (q ->> 'earned_milli')::int = 250) = 1);

  raise exception E'BAO_CAO_KIEM_THU_LOI_GIAI\n%', jsonb_pretty(jsonb_build_object(
    'tong', jsonb_array_length(results),
    'dat', (select count(*) from jsonb_array_elements(results) e where (e->>'dat')::boolean),
    'khong_dat', (select coalesce(jsonb_agg(e->>'ca'), '[]'::jsonb) from jsonb_array_elements(results) e where not coalesce((e->>'dat')::boolean, false)),
    'chi_tiet', results));
end
$test$;
