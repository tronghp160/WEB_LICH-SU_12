-- Luyện thi — lời giải "sai ở đâu – bài nào – mục nào" (docs/ke-hoach-demo-luyen-thi.md, GĐ-D1).
--
-- 1. exam_items thêm: section_id (mục SGK chứa kiến thức chính), choice_notes (lời giải TỪNG lựa chọn của câu trắc
--    nghiệm, theo thứ tự lựa chọn GỐC), remember ("Ghi nhớ" một câu), content_key (khóa ổn định cho seed / đề).
-- 2. Mỗi ý Đúng/Sai và mỗi phần tử choice_notes được thêm tùy chọn: lesson_slug, section_id, ref (vị trí dạng chữ, ví dụ
--    câu lớp 11), trap (kiểu bẫy — chỉ ở ý / lựa chọn SAI). Trigger exam_item_integrity kiểm và chuẩn hóa; công thức dấu
--    vân tay KHÔNG đổi (chỉ dựa vào câu hỏi + nội dung lựa chọn / ý) nên câu cũ không bị tính là câu mới.
-- 3. exam_attempt_view: thêm section_id, remember, topic_tag, choice_notes (xoay theo đúng công thức của choices),
--    statement_refs — tất cả chỉ trả khi câu đã lộ đáp án (reveal), như explanation.
--
-- Không có bảng mới → không cần RLS mới; học sinh vẫn không đọc được bảng exam_items (policy chỉ cho nhân sự).

begin;

-- ============================================================
-- 1. Cột mới
-- ============================================================
alter table public.exam_items
  add column section_id   text,
  add column choice_notes jsonb,
  add column remember     text,
  add column content_key  text,
  add constraint exam_items_section_check check (section_id is null or (section_id ~ '^muc-[0-9]{1,2}$' and lesson_slug is not null)),
  add constraint exam_items_choice_notes_kind_check check (choice_notes is null or kind = 'mcq'),
  add constraint exam_items_remember_check check (remember is null or char_length(btrim(remember)) between 10 and 300),
  add constraint exam_items_content_key_check check (content_key is null or content_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint exam_items_content_key_key unique (content_key);

comment on column public.exam_items.section_id is 'Mục SGK (muc-N) chứa kiến thức chính của câu, cùng lesson_slug.';
comment on column public.exam_items.choice_notes is 'Câu trắc nghiệm: 4 lời giải theo thứ tự lựa chọn GỐC — { note, lesson_slug?, section_id?, ref?, trap? }.';
comment on column public.exam_items.remember is '"Ghi nhớ": một câu chốt kiến thức, hiện sau khi lộ đáp án.';
comment on column public.exam_items.content_key is 'Khóa ổn định (vd. b7-m3-tn-05) để seed chạy lại được và đề tham chiếu câu.';

-- ============================================================
-- 2. Trigger kiểm tra (thân cũ ở 20261025000000_exam_bank.sql + phần mới)
-- ============================================================
create or replace function public.exam_item_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r record;
  traps constant text[] := array['thoi_gian', 'chu_the', 'dia_diem', 'so_lieu', 'nhan_qua', 'tuyet_doi', 'khai_niem', 'ban_chat'];
begin
  if new.kind = 'mcq' then
    -- Trigger BEFORE chạy trước CHECK nên tự kiểm null.
    if new.choices is null or cardinality(new.choices) <> 4 then
      raise exception 'Câu trắc nghiệm cần đúng 4 lựa chọn.';
    end if;
    if exists (select 1 from unnest(new.choices) as c where c is null or btrim(c) = '' or char_length(c) > 300) then
      raise exception 'Mỗi lựa chọn phải có nội dung (tối đa 300 ký tự).';
    end if;
    if (select count(distinct lower(btrim(c))) from unnest(new.choices) as c) <> 4 then
      raise exception 'Bốn lựa chọn không được trùng nhau.';
    end if;
    if new.choice_notes is not null then
      if jsonb_typeof(new.choice_notes) is distinct from 'array' then
        raise exception 'Lời giải từng lựa chọn cần đúng 4 phần tử.';
      end if;
      if jsonb_array_length(new.choice_notes) <> 4 then
        raise exception 'Lời giải từng lựa chọn cần đúng 4 phần tử.';
      end if;
      if exists (
        select 1 from jsonb_array_elements(new.choice_notes) as n(value)
         where jsonb_typeof(n.value) is distinct from 'object'
            or jsonb_typeof(n.value -> 'note') is distinct from 'string'
      ) then
        raise exception 'Mỗi lựa chọn cần một lời giải (note).';
      end if;
      if exists (select 1 from jsonb_array_elements(new.choice_notes) as n(value) where char_length(btrim(n.value ->> 'note')) not between 10 and 500) then
        raise exception 'Lời giải từng lựa chọn dài 10–500 ký tự.';
      end if;
    end if;
  else
    if new.choice_notes is not null then
      raise exception 'Câu Đúng/Sai không có lời giải theo lựa chọn — ghi lời giải ở từng ý.';
    end if;
    -- Hai lệnh if riêng: OR không bảo đảm thứ tự, jsonb_array_length lỗi khi không phải mảng.
    if jsonb_typeof(new.statements) is distinct from 'array' then
      raise exception 'Câu Đúng/Sai cần đúng 4 ý.';
    end if;
    if jsonb_array_length(new.statements) <> 4 then
      raise exception 'Câu Đúng/Sai cần đúng 4 ý.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.statements) as s(value)
       where jsonb_typeof(s.value -> 'text') is distinct from 'string'
          or jsonb_typeof(s.value -> 'is_true') is distinct from 'boolean'
          or jsonb_typeof(s.value -> 'explanation') is distinct from 'string'
    ) then
      raise exception 'Mỗi ý Đúng/Sai cần nội dung, đáp án Đúng hoặc Sai và lời giải riêng.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(new.statements) as s(value)
       where char_length(btrim(s.value ->> 'text')) not between 5 and 500
          or char_length(btrim(s.value ->> 'explanation')) not between 5 and 1000
    ) then
      raise exception 'Mỗi ý Đúng/Sai dài 5–500 ký tự, lời giải từng ý dài 5–1000 ký tự.';
    end if;
  end if;

  -- Vị trí kiến thức + kiểu bẫy của từng lựa chọn / từng ý (đều tùy chọn; JSON null coi như không có).
  for r in
    select n.value as e, n.ord::int - 1 as slot, true as is_choice
      from jsonb_array_elements(case when new.kind = 'mcq' then coalesce(new.choice_notes, '[]'::jsonb) else '[]'::jsonb end) with ordinality as n(value, ord)
    union all
    select s.value, s.ord::int - 1, false
      from jsonb_array_elements(case when new.kind = 'true_false' then new.statements else '[]'::jsonb end) with ordinality as s(value, ord)
  loop
    if nullif(r.e -> 'lesson_slug', 'null'::jsonb) is not null
       and (jsonb_typeof(r.e -> 'lesson_slug') <> 'string' or (r.e ->> 'lesson_slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$') then
      raise exception 'Bài SGK của lựa chọn / ý không hợp lệ.';
    end if;
    if nullif(r.e -> 'section_id', 'null'::jsonb) is not null
       and (jsonb_typeof(r.e -> 'section_id') <> 'string' or (r.e ->> 'section_id') !~ '^muc-[0-9]{1,2}$') then
      raise exception 'Mục SGK của lựa chọn / ý phải có dạng muc-N.';
    end if;
    if nullif(r.e -> 'ref', 'null'::jsonb) is not null
       and (jsonb_typeof(r.e -> 'ref') <> 'string' or char_length(btrim(r.e ->> 'ref')) not between 3 and 160) then
      raise exception 'Vị trí kiến thức (ref) dài 3–160 ký tự.';
    end if;
    if nullif(r.e -> 'trap', 'null'::jsonb) is not null then
      if jsonb_typeof(r.e -> 'trap') <> 'string' or not ((r.e ->> 'trap') = any (traps)) then
        raise exception 'Kiểu bẫy không hợp lệ.';
      end if;
      if (r.is_choice and r.slot = new.correct_index) or (not r.is_choice and (r.e -> 'is_true')::boolean) then
        raise exception 'Kiểu bẫy chỉ ghi ở lựa chọn / ý SAI.';
      end if;
    end if;
  end loop;

  -- Chỉ giữ các khóa đã biết, bỏ khoảng trắng thừa — khóa lạ không lọt vào dữ liệu trả cho học sinh.
  if new.kind = 'mcq' and new.choice_notes is not null then
    new.choice_notes := (
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'note', btrim(n.value ->> 'note'), 'lesson_slug', n.value ->> 'lesson_slug', 'section_id', n.value ->> 'section_id',
               'ref', btrim(n.value ->> 'ref'), 'trap', n.value ->> 'trap')) order by n.ord)
        from jsonb_array_elements(new.choice_notes) with ordinality as n(value, ord)
    );
  end if;
  if new.kind = 'true_false' then
    new.statements := (
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'text', btrim(s.value ->> 'text'), 'is_true', (s.value -> 'is_true')::boolean, 'explanation', btrim(s.value ->> 'explanation'),
               'lesson_slug', s.value ->> 'lesson_slug', 'section_id', s.value ->> 'section_id', 'ref', btrim(s.value ->> 'ref'),
               'trap', s.value ->> 'trap')) order by s.ord)
        from jsonb_array_elements(new.statements) with ordinality as s(value, ord)
    );
  end if;
  new.fingerprint := public.exam_item_fingerprint(new.kind, new.stem, new.choices, new.statements);
  return new;
end;
$$;

-- ============================================================
-- 3. Lượt nhìn từ phía học sinh (thân giống 20261029000000_exam_quality.sql + các trường lời giải mới)
-- ============================================================
create or replace function public.exam_attempt_view(a public.exam_attempts, p_reveal boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt', jsonb_strip_nulls(jsonb_build_object(
      'id', a.id, 'status', a.status, 'mode', a.mode, 'blueprint', a.blueprint, 'started_at', a.started_at, 'deadline_at', a.deadline_at,
      'submitted_at', a.submitted_at, 'server_now', now(),
      'score10', case when p_reveal then a.score10 end, 'raw_score', case when p_reveal then a.raw_score end,
      'max_score', case when p_reveal then a.max_score end, 'breakdown', case when p_reveal then a.breakdown end,
      'regraded_items', case when p_reveal then (select jsonb_agg(distinct l.item_id) from public.exam_regrade_log l where l.attempt_id = a.id) end)),
    'set', (select jsonb_build_object('slug', s.slug, 'title', s.title, 'duration_min', s.duration_min, 'format', s.format,
                                      'free', s.product_id is null)
              from public.exam_sets s where s.id = a.set_id),
    'answers', a.answers,
    'questions', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'n', q.n, 'item_id', q.id, 'section', a.sections[q.n], 'kind', q.kind, 'stem', q.stem,
               'choices', case when q.kind = 'mcq' then
                            to_jsonb(array(select q.choices[((k - a.choice_shifts[q.n] + 4) % 4) + 1] from generate_series(0, 3) as k order by k)) end,
               'statements', case when q.kind = 'true_false' then
                            (select jsonb_agg(s.st -> 'text' order by s.ord) from jsonb_array_elements(q.statements) with ordinality as s(st, ord)) end,
               'passage', case when p.id is not null then jsonb_build_object('body', p.body, 'source_citation', p.source_citation) end,
               'checked', case when q.checked then true end,
               'correct_index', case when q.reveal and q.kind = 'mcq' then (q.correct_index + a.choice_shifts[q.n]) % 4 end,
               'truths', case when q.reveal and q.kind = 'true_false' then
                            (select jsonb_agg(s.st -> 'is_true' order by s.ord) from jsonb_array_elements(q.statements) with ordinality as s(st, ord)) end,
               'statement_explanations', case when q.reveal and q.kind = 'true_false' then
                            (select jsonb_agg(s.st -> 'explanation' order by s.ord) from jsonb_array_elements(q.statements) with ordinality as s(st, ord)) end,
               -- Vị trí kiến thức + kiểu bẫy của từng ý (object rỗng khi ý không ghi gì).
               'statement_refs', case when q.reveal and q.kind = 'true_false' then
                            (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('lesson_slug', s.st -> 'lesson_slug', 'section_id', s.st -> 'section_id',
                                                                                   'ref', s.st -> 'ref', 'trap', s.st -> 'trap')) order by s.ord)
                               from jsonb_array_elements(q.statements) with ordinality as s(st, ord)) end,
               -- Lựa chọn gốc i hiện ở vị trí (i + shift) mod 4 → lời giải xoay đúng như choices.
               'choice_notes', case when q.reveal and q.kind = 'mcq' and q.choice_notes is not null then
                            to_jsonb(array(select q.choice_notes -> ((k - a.choice_shifts[q.n] + 4) % 4) from generate_series(0, 3) as k order by k)) end,
               'explanation', case when q.reveal then q.explanation end,
               'remember', case when q.reveal then q.remember end,
               'level', case when q.reveal then q.level end,
               'lesson_slug', case when q.reveal then q.lesson_slug end,
               'section_id', case when q.reveal then q.section_id end,
               'topic_tag', case when q.reveal then q.topic_tag end,
               'event_slug', case when q.reveal then e.slug end,
               'event_title', case when q.reveal then e.title end,
               'earned_milli', case when q.reveal then
                                 coalesce((a.breakdown -> 'items' -> (q.n::int - 1))::int,
                                          public.exam_item_earned(q.item_row, a.choice_shifts[q.n], a.answers -> q.id::text)) end
             )) order by q.n)
        from (
          select o.n, i.*, i as item_row,
                 coalesce(a.answers -> i.id::text ->> 'checked', '') = 'true' as checked,
                 (p_reveal and a.mode in ('exam', 'paper')) or coalesce(a.answers -> i.id::text ->> 'checked', '') = 'true' as reveal
            from unnest(a.item_ids) with ordinality as o(item_id, n)
            join public.exam_items i on i.id = o.item_id
        ) as q
        left join public.exam_passages p on p.id = q.passage_id
        left join public.historical_events e on e.id = q.event_id and e.workflow_status = 'published'
    ), '[]'::jsonb)
  );
$$;

-- Giữ đúng quyền như bản cũ (create or replace không đổi quyền, ghi lại cho rõ).
revoke all on function public.exam_attempt_view(public.exam_attempts, boolean) from public, anon, authenticated;
grant execute on function public.exam_attempt_view(public.exam_attempts, boolean) to service_role;

commit;
