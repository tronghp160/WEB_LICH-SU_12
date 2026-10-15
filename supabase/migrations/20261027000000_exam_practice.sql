-- Luyện thi — GĐ4: luyện tập theo bài / dạng, sổ câu sai, ôn ngắt quãng (docs/ke-hoach-luyen-thi.md, mục 3.7, 4.3, 4.5).
--
-- Chỉ THÊM (và thay thân một số hàm của GĐ2, giữ nguyên chữ ký), không xóa dữ liệu:
--   1. Bảng `learner_item_state` — mỗi (tài khoản, câu): hộp Leitner 1–5, hạn ôn, số lần sai / đúng, đang trong sổ câu
--      sai hay không. CHỈ cho tài khoản đăng nhập (mục 9, quyết định 2). Học sinh đọc được dòng của mình; ghi qua hàm.
--   2. Lượt luyện tập dùng chung bảng exam_attempts: chế độ `practice` (chọn câu theo bài / dạng / mức độ), `review` (câu
--      đến hạn ôn trong sổ), và "làm lại câu sai" của một lượt — không bấm giờ. Mỗi câu "Kiểm tra" riêng
--      (check_attempt_item): lưu câu trả lời, KHÓA câu đó, chấm, cập nhật sổ câu sai, trả lời giải của ĐÚNG câu đó.
--   3. Lượt luyện tập chỉ lộ đáp án của câu đã kiểm tra — kể cả sau khi nộp (không lách được hạn mức miễn phí bằng cách
--      bắt đầu 30 câu rồi nộp). Chấm lượt luyện tập chỉ tính các câu đã kiểm tra.
--   4. Hạn mức miễn phí: 10 câu kiểm tra mỗi ngày (theo giờ Việt Nam) cho người chưa có gói — loại giới hạn
--      `practice_free`. Có gói (mã + máy, hoặc gói của tài khoản) thì không giới hạn.
--   5. Lượt THI (mode exam) của tài khoản khi nộp: câu làm mà chưa đạt điểm tối đa vào sổ câu sai; câu bỏ trống không tính.
-- Lịch Leitner (giống lib/exams/leitner.ts): sai → hộp 1, hạn ôn sau 1 ngày; đúng khi đang trong sổ → lên hộp kế, hạn
-- ôn sau 3 / 7 / 14 / 30 ngày (hộp 2 / 3 / 4 / 5); đúng ở hộp 5 → ra khỏi sổ. Ngày tính theo Asia/Ho_Chi_Minh, hạn ôn là
-- 0 giờ của ngày đến hạn.
-- Chạy một lần trong SQL Editor; kiểm thử: supabase/tests/exam_practice.sql (tự hoàn tác).

begin;

-- ============================================================
-- 1. Bảng
-- ============================================================
create table public.learner_item_state (
  user_id        uuid not null references auth.users(id) on delete cascade,
  item_id        uuid not null references public.exam_items(id) on delete cascade,
  box            smallint not null default 1 constraint learner_item_state_box_check check (box between 1 and 5),
  due_at         timestamptz,
  wrong_count    integer not null default 0 constraint learner_item_state_wrong_check check (wrong_count >= 0),
  right_count    integer not null default 0 constraint learner_item_state_right_check check (right_count >= 0),
  last_answer_at timestamptz not null default now(),
  in_notebook    boolean not null default false,
  primary key (user_id, item_id),
  constraint learner_item_state_due_check check (not in_notebook or due_at is not null)
);
create index idx_learner_item_state_due on public.learner_item_state (user_id, due_at) where in_notebook;

alter table public.rate_limit_hits drop constraint rate_limit_hits_bucket_check;
alter table public.rate_limit_hits add constraint rate_limit_hits_bucket_check
  check (bucket in ('order_lookup', 'license_activation', 'license_claim', 'progress_write', 'exam_start', 'exam_save', 'practice_free'));

-- ============================================================
-- 2. Hàm nội bộ
-- ============================================================

-- Điểm đạt (phần nghìn) của một câu với câu trả lời (như exam_grade_attempt).
create or replace function public.exam_item_earned(p_item public.exam_items, p_shift smallint, p_answer jsonb)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when p_item.kind = 'mcq' then
                case when (p_answer ->> 'choice') = ((p_item.correct_index + p_shift) % 4)::text then 250 else 0 end
              else (array[0, 100, 250, 500, 1000])[1 + (
                     select count(*) from jsonb_array_elements(p_item.statements) with ordinality as s(st, ord)
                      where (p_answer -> 'tf' -> (s.ord::int - 1)) = (s.st -> 'is_true'))]
         end;
$$;

-- 0 giờ ngày (hôm nay theo giờ Việt Nam + p_days), dạng timestamptz.
create or replace function public.exam_vn_day(p_days integer)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (((now() at time zone 'Asia/Ho_Chi_Minh')::date + p_days)::timestamp) at time zone 'Asia/Ho_Chi_Minh';
$$;

-- Cập nhật sổ câu sai theo một lần trả lời (lịch Leitner ở đầu file).
create or replace function public.exam_leitner_apply(p_user_id uuid, p_item_id uuid, p_right boolean)
returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.learner_item_state%rowtype;
  intervals constant integer[] := array[1, 3, 7, 14, 30];
begin
  select * into s from public.learner_item_state where user_id = p_user_id and item_id = p_item_id for update;
  if not found then
    insert into public.learner_item_state (user_id, item_id, box, due_at, wrong_count, right_count, in_notebook)
    values (p_user_id, p_item_id, 1, case when p_right then null else public.exam_vn_day(1) end,
            case when p_right then 0 else 1 end, case when p_right then 1 else 0 end, not p_right);
    return;
  end if;
  if not p_right then
    update public.learner_item_state
       set box = 1, due_at = public.exam_vn_day(1), wrong_count = wrong_count + 1, in_notebook = true, last_answer_at = now()
     where user_id = p_user_id and item_id = p_item_id;
  elsif s.in_notebook and s.box >= 5 then
    update public.learner_item_state
       set in_notebook = false, due_at = null, right_count = right_count + 1, last_answer_at = now()
     where user_id = p_user_id and item_id = p_item_id;
  elsif s.in_notebook then
    update public.learner_item_state
       set box = s.box + 1, due_at = public.exam_vn_day(intervals[s.box + 1]), right_count = right_count + 1, last_answer_at = now()
     where user_id = p_user_id and item_id = p_item_id;
  else
    update public.learner_item_state set right_count = right_count + 1, last_answer_at = now()
     where user_id = p_user_id and item_id = p_item_id;
  end if;
end;
$$;

-- Mã gói còn hiệu lực của người gọi (gói của tài khoản, hoặc mã + máy đã kích hoạt); không có → null.
create or replace function public.exam_pack_license(p_code text, p_device_hash text, p_user_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select l.id from public.licenses l join public.products p on p.id = l.product_id and p.kind = 'exam_pack'
      where p_user_id is not null and l.user_id = p_user_id and l.status = 'active' and (l.valid_until is null or l.valid_until >= now())
      order by l.created_at limit 1),
    (select l.id from public.licenses l join public.products p on p.id = l.product_id and p.kind = 'exam_pack'
       join public.license_activations la on la.license_id = l.id and la.device_hash = p_device_hash
      where l.code = upper(btrim(coalesce(p_code, ''))) and l.status = 'active' and (l.valid_until is null or l.valid_until >= now())
      limit 1)
  );
$$;

-- Thay thân (GĐ2): bỏ qua câu đã "Kiểm tra" (đã khóa) — lưu / nộp không đổi được câu trả lời của câu đó.
create or replace function public.exam_clean_answers(a public.exam_attempts, p_answers jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(x.item_id::text, x.answer), '{}'::jsonb)
    from (
      select o.item_id,
             (case when i.kind = 'mcq' and jsonb_typeof(v -> 'choice') = 'number' and (v ->> 'choice') ~ '^[0-3]$'
                     then jsonb_build_object('choice', v -> 'choice')
                   when i.kind = 'mcq' and jsonb_typeof(v -> 'choice') = 'null' then '{"choice": null}'::jsonb
                   else '{}'::jsonb end)
             || (case when i.kind = 'true_false' and jsonb_typeof(v -> 'tf') = 'array' then
                        case when jsonb_array_length(v -> 'tf') = 4
                             then jsonb_build_object('tf', (select jsonb_agg(case when jsonb_typeof(t.e) = 'boolean' then t.e else 'null'::jsonb end order by t.ord)
                                                             from jsonb_array_elements(v -> 'tf') with ordinality as t(e, ord)))
                             else '{}'::jsonb end
                      else '{}'::jsonb end)
             || (case when jsonb_typeof(v -> 'flagged') = 'boolean' then jsonb_build_object('flagged', v -> 'flagged') else '{}'::jsonb end)
             || (case when jsonb_typeof(v -> 'ms') = 'number' and (v ->> 'ms') ~ '^[0-9]{1,8}$' then jsonb_build_object('ms', v -> 'ms') else '{}'::jsonb end)
               as answer
        from unnest(a.item_ids) with ordinality as o(item_id, n)
        join public.exam_items i on i.id = o.item_id
        cross join lateral (select p_answers -> o.item_id::text as v) as given
       where jsonb_typeof(given.v) = 'object'
         and coalesce(a.answers -> o.item_id::text ->> 'checked', '') <> 'true'
    ) as x
   where x.answer <> '{}'::jsonb;
$$;

-- Thay thân (GĐ2): câu đã "Kiểm tra" lộ đáp án + điểm câu ngay khi đang làm; lượt luyện tập chỉ lộ câu đã kiểm tra, kể cả
-- sau khi nộp.
create or replace function public.exam_attempt_view(a public.exam_attempts, p_reveal boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'attempt', jsonb_strip_nulls(jsonb_build_object(
      'id', a.id, 'status', a.status, 'mode', a.mode, 'started_at', a.started_at, 'deadline_at', a.deadline_at,
      'submitted_at', a.submitted_at, 'server_now', now(),
      'score10', case when p_reveal then a.score10 end, 'raw_score', case when p_reveal then a.raw_score end,
      'max_score', case when p_reveal then a.max_score end, 'breakdown', case when p_reveal then a.breakdown end)),
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
               'explanation', case when q.reveal then q.explanation end,
               'level', case when q.reveal then q.level end,
               'lesson_slug', case when q.reveal then q.lesson_slug end,
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

-- Thay thân (GĐ2): lượt luyện tập chỉ chấm câu đã kiểm tra (câu chưa kiểm tra: 0 / 0); lượt thi của tài khoản → cập
-- nhật sổ câu sai (câu đã làm mà chưa đạt tối đa vào sổ; bỏ trống không tính).
create or replace function public.exam_grade_attempt(p_attempt_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  a public.exam_attempts%rowtype;
  v_raw bigint;
  v_max bigint;
  v_hundredths bigint;
  v_breakdown jsonb;
  g record;
begin
  select * into a from public.exam_attempts where id = p_attempt_id for update;
  if not found or a.status <> 'in_progress' then
    return;
  end if;

  create temporary table if not exists pg_temp.exam_graded (
    n bigint, item_id uuid, kind public.exam_item_kind, lesson_slug text, level public.exam_item_level, has_passage boolean,
    section smallint, max_milli integer, earned integer, answered boolean
  ) on commit drop;
  delete from pg_temp.exam_graded;
  insert into pg_temp.exam_graded
  select o.n, i.id, i.kind, i.lesson_slug, i.level, i.passage_id is not null, a.sections[o.n],
         case when included then (case when i.kind = 'mcq' then 250 else 1000 end) else 0 end,
         case when included then public.exam_item_earned(i, a.choice_shifts[o.n], v) else 0 end,
         included and (case when i.kind = 'mcq' then (v ->> 'choice') is not null
                            else exists (select 1 from jsonb_array_elements(coalesce(v -> 'tf', '[]'::jsonb)) as t(e) where jsonb_typeof(t.e) = 'boolean') end)
    from unnest(a.item_ids) with ordinality as o(item_id, n)
    join public.exam_items i on i.id = o.item_id
    cross join lateral (select a.answers -> o.item_id::text as v) as given
    cross join lateral (select a.mode in ('exam', 'paper') or coalesce(v ->> 'checked', '') = 'true' as included) as inc;

  select coalesce(sum(earned), 0), coalesce(sum(max_milli), 0) into v_raw, v_max from pg_temp.exam_graded;
  v_breakdown := jsonb_build_object(
    'items', coalesce((select jsonb_agg(earned order by n) from pg_temp.exam_graded), '[]'::jsonb),
    'correct', (select count(*) from pg_temp.exam_graded where max_milli > 0 and earned = max_milli),
    'unanswered', (select count(*) from pg_temp.exam_graded where max_milli > 0 and not answered),
    'total', (select count(*) from pg_temp.exam_graded where max_milli > 0),
    'raw_milli', v_raw,
    'max_milli', v_max
  ) || coalesce((
    select jsonb_object_agg(dim, by_key) from (
      select dim, jsonb_object_agg(key, jsonb_build_object('earned', earned, 'max', max, 'n', n)) as by_key
        from (
          select 'sections' as dim, section::text as key, sum(earned) as earned, sum(max_milli) as max, count(*) as n
            from pg_temp.exam_graded where max_milli > 0 group by section
          union all
          select 'lessons', coalesce(lesson_slug, '_'), sum(earned), sum(max_milli), count(*) from pg_temp.exam_graded where max_milli > 0 group by lesson_slug
          union all
          select 'levels', level::text, sum(earned), sum(max_milli), count(*) from pg_temp.exam_graded where max_milli > 0 group by level
          union all
          select 'kinds', kind::text, sum(earned), sum(max_milli), count(*) from pg_temp.exam_graded where max_milli > 0 group by kind
          union all
          select 'kinds', 'passage', sum(earned), sum(max_milli), count(*) from pg_temp.exam_graded where max_milli > 0 and has_passage having count(*) > 0
        ) as groups
       group by dim
    ) as d
  ), '{}'::jsonb);

  v_hundredths := case when v_max = 0 then 0 else (2000 * v_raw + v_max) / (2 * v_max) end;
  update public.exam_attempts
     set status = 'submitted', submitted_at = now(), score10 = v_hundredths / 100.0,
         raw_score = round(v_raw / 1000.0, 2), max_score = round(v_max / 1000.0, 2), breakdown = v_breakdown
   where id = a.id;

  -- Sổ câu sai: chỉ lượt thi của tài khoản (luyện tập cập nhật ngay lúc kiểm tra từng câu).
  if a.user_id is not null and a.mode = 'exam' then
    for g in select item_id, earned = max_milli as right from pg_temp.exam_graded where answered loop
      perform public.exam_leitner_apply(a.user_id, g.item_id, g.right);
    end loop;
  end if;
end;
$$;

-- ============================================================
-- 3. Hàm cho server (security definer, chỉ service_role)
-- ============================================================

-- Bắt đầu lượt luyện tập. p_options:
--   { "mode": "practice", "lessons": [slug…], "kinds": ["mcq"|"true_false"], "levels": [...], "passage": true|false|null,
--     "count": 10|20|30, "only_new": bool, "prefer_wrong": bool }   — chọn ngẫu nhiên câu đã công bố
--   { "mode": "review" }                                            — câu đến hạn ôn (tài khoản có gói), tối đa 30
--   { "mode": "retry", "from_attempt": uuid }                       — câu chưa đạt tối đa của một lượt đã nộp của mình
-- Lượt luyện tập cũ còn dở của cùng người được chấm (theo câu đã kiểm tra) trước khi mở lượt mới.
create or replace function public.start_practice_attempt(p_user_id uuid, p_code text, p_device_hash text, p_options jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mode_name text := coalesce(p_options ->> 'mode', 'practice');
  pack uuid;
  wanted integer;
  ids uuid[];
  source public.exam_attempts%rowtype;
  stale uuid;
  a public.exam_attempts%rowtype;
begin
  if p_user_id is null and coalesce(p_device_hash, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_device');
  end if;
  if mode_name not in ('practice', 'review', 'retry') then
    return jsonb_build_object('ok', false, 'reason', 'unsupported_mode');
  end if;
  pack := public.exam_pack_license(p_code, p_device_hash, p_user_id);

  if mode_name = 'review' then
    if p_user_id is null then
      return jsonb_build_object('ok', false, 'reason', 'login_required');
    end if;
    if pack is null then
      return jsonb_build_object('ok', false, 'reason', 'pack_required');
    end if;
    select array_agg(x.item_id order by x.due_at) into ids from (
      select s.item_id, s.due_at from public.learner_item_state s
        join public.exam_items i on i.id = s.item_id and i.workflow_status = 'published'
       where s.user_id = p_user_id and s.in_notebook and s.due_at <= now()
       order by s.due_at limit 30
    ) as x;
  elsif mode_name = 'retry' then
    select * into source from public.exam_attempts where id = nullif(p_options ->> 'from_attempt', '')::uuid;
    if not found or not public.exam_attempt_owner_ok(source, p_user_id, p_device_hash) or source.status <> 'submitted' then
      return jsonb_build_object('ok', false, 'reason', 'not_found');
    end if;
    select array_agg(o.item_id order by o.n) into ids
      from unnest(source.item_ids) with ordinality as o(item_id, n)
      join public.exam_items i on i.id = o.item_id and i.workflow_status = 'published'
     where coalesce((source.breakdown -> 'items' ->> (o.n::int - 1))::int, 0) < (case when i.kind = 'mcq' then 250 else 1000 end)
       and (source.mode in ('exam', 'paper') or coalesce(source.answers -> o.item_id::text ->> 'checked', '') = 'true');
  else
    wanted := case when (p_options ->> 'count') in ('10', '20', '30') then (p_options ->> 'count')::int else 10 end;
    select array_agg(x.id) into ids from (
      select i.id
        from public.exam_items i
        left join public.learner_item_state s on p_user_id is not null and s.user_id = p_user_id and s.item_id = i.id
       where i.workflow_status = 'published'
         and (jsonb_typeof(p_options -> 'lessons') is distinct from 'array' or jsonb_array_length(p_options -> 'lessons') = 0
              or i.lesson_slug in (select jsonb_array_elements_text(p_options -> 'lessons')))
         and (jsonb_typeof(p_options -> 'kinds') is distinct from 'array' or jsonb_array_length(p_options -> 'kinds') = 0
              or i.kind::text in (select jsonb_array_elements_text(p_options -> 'kinds')))
         and (jsonb_typeof(p_options -> 'levels') is distinct from 'array' or jsonb_array_length(p_options -> 'levels') = 0
              or i.level::text in (select jsonb_array_elements_text(p_options -> 'levels')))
         and (jsonb_typeof(p_options -> 'passage') is distinct from 'boolean' or (i.passage_id is not null) = (p_options ->> 'passage')::boolean)
         and (coalesce(p_options ->> 'only_new', 'false') <> 'true' or p_user_id is null or s.item_id is null)
       order by case when coalesce(p_options ->> 'prefer_wrong', 'false') = 'true' then coalesce(s.in_notebook, false) end desc nulls last, random()
       limit wanted
    ) as x;
  end if;

  if ids is null or cardinality(ids) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;

  for stale in
    select x.id from public.exam_attempts x
     where x.status = 'in_progress' and x.mode in ('practice', 'review') and public.exam_attempt_owner_ok(x, p_user_id, p_device_hash)
  loop
    perform public.exam_grade_attempt(stale);
  end loop;

  insert into public.exam_attempts (user_id, license_id, device_hash, set_id, mode, item_ids, sections, choice_shifts, deadline_at)
  select p_user_id, pack, nullif(p_device_hash, ''), null, case when mode_name = 'review' then 'review' else 'practice' end::public.exam_attempt_mode,
         array_agg(i.id order by o.n),
         array_agg(case when i.kind = 'mcq' then 1 else 2 end::smallint order by o.n),
         array_agg(case when i.kind = 'mcq' then floor(random() * 4) else 0 end::smallint order by o.n),
         null
    from unnest(ids) with ordinality as o(item_id, n)
    join public.exam_items i on i.id = o.item_id
  returning * into a;
  return jsonb_build_object('ok', true, 'pack', pack is not null) || public.exam_attempt_view(a, false);
end;
$$;

-- "Kiểm tra" một câu của lượt luyện tập: lưu câu trả lời, khóa câu, chấm, cập nhật sổ câu sai (tài khoản), trả lượt (câu
-- vừa kiểm tra có đáp án + lời giải). Chưa có gói: tối đa 10 câu / ngày theo giờ Việt Nam. Kiểm tra lại câu đã khóa →
-- trả kết quả cũ, không tính hạn mức.
create or replace function public.check_attempt_item(p_attempt_id uuid, p_user_id uuid, p_device_hash text, p_item_id uuid, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.exam_attempts%rowtype;
  item public.exam_items%rowtype;
  slot integer;
  cleaned jsonb;
  earned integer;
  has_pack boolean;
  today_seconds integer;
begin
  select * into a from public.exam_attempts where id = p_attempt_id for update;
  if not found or not public.exam_attempt_owner_ok(a, p_user_id, p_device_hash) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if a.mode not in ('practice', 'review') then
    return jsonb_build_object('ok', false, 'reason', 'not_practice');
  end if;
  if a.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'reason', 'submitted');
  end if;
  slot := array_position(a.item_ids, p_item_id);
  if slot is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if coalesce(a.answers -> p_item_id::text ->> 'checked', '') = 'true' then
    return jsonb_build_object('ok', true, 'already', true) || public.exam_attempt_view(a, false);
  end if;

  has_pack := a.license_id is not null or public.exam_pack_license(null, null, a.user_id) is not null;
  if not has_pack then
    today_seconds := greatest(1, extract(epoch from now() - public.exam_vn_day(0))::integer);
    -- Khóa đếm phải là hex 64 ký tự: mã thiết bị đã là băm; id tài khoản thì băm SHA-256.
    if not public.consume_rate_limit('practice_free',
                                     coalesce(encode(sha256(convert_to('user:' || a.user_id::text, 'UTF8')), 'hex'), a.device_hash),
                                     today_seconds, 10) then
      return jsonb_build_object('ok', false, 'reason', 'quota');
    end if;
  end if;

  cleaned := coalesce(public.exam_clean_answers(a, jsonb_build_object(p_item_id::text, coalesce(p_answer, '{}'::jsonb))) -> p_item_id::text, '{}'::jsonb);
  cleaned := cleaned || jsonb_build_object('checked', true);
  update public.exam_attempts set answers = answers || jsonb_build_object(p_item_id::text, cleaned) where id = a.id returning * into a;

  select * into item from public.exam_items where id = p_item_id;
  earned := public.exam_item_earned(item, a.choice_shifts[slot], cleaned);
  if a.user_id is not null then
    perform public.exam_leitner_apply(a.user_id, p_item_id, earned = (case when item.kind = 'mcq' then 250 else 1000 end));
  end if;
  return jsonb_build_object('ok', true, 'checked_item', p_item_id, 'earned_milli', earned) || public.exam_attempt_view(a, false);
end;
$$;

-- Sổ câu sai của một tài khoản: số câu trong sổ, số câu đến hạn hôm nay, và danh sách câu (KHÔNG có đáp án) theo hạn ôn.
create or replace function public.get_notebook(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.learner_item_state s join public.exam_items i on i.id = s.item_id and i.workflow_status = 'published'
               where s.user_id = p_user_id and s.in_notebook),
    'due', (select count(*) from public.learner_item_state s join public.exam_items i on i.id = s.item_id and i.workflow_status = 'published'
             where s.user_id = p_user_id and s.in_notebook and s.due_at <= now()),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('item_id', i.id, 'kind', i.kind, 'stem', i.stem, 'lesson_slug', i.lesson_slug, 'box', s.box,
                                          'due_at', s.due_at, 'wrong_count', s.wrong_count) order by s.due_at, i.stem)
        from public.learner_item_state s
        join public.exam_items i on i.id = s.item_id and i.workflow_status = 'published'
       where s.user_id = p_user_id and s.in_notebook
    ), '[]'::jsonb)
  );
$$;

-- ============================================================
-- 4. Quyền
-- ============================================================
revoke all on function public.exam_item_earned(public.exam_items, smallint, jsonb)          from public, anon, authenticated;
revoke all on function public.exam_vn_day(integer)                                          from public, anon, authenticated;
revoke all on function public.exam_leitner_apply(uuid, uuid, boolean)                       from public, anon, authenticated;
revoke all on function public.exam_pack_license(text, text, uuid)                           from public, anon, authenticated;
revoke all on function public.exam_clean_answers(public.exam_attempts, jsonb)               from public, anon, authenticated;
revoke all on function public.exam_attempt_view(public.exam_attempts, boolean)              from public, anon, authenticated;
revoke all on function public.exam_grade_attempt(uuid)                                      from public, anon, authenticated;
revoke all on function public.start_practice_attempt(uuid, text, text, jsonb)               from public, anon, authenticated;
revoke all on function public.check_attempt_item(uuid, uuid, text, uuid, jsonb)             from public, anon, authenticated;
revoke all on function public.get_notebook(uuid)                                            from public, anon, authenticated;
grant execute on function public.start_practice_attempt(uuid, text, text, jsonb)            to service_role;
grant execute on function public.check_attempt_item(uuid, uuid, text, uuid, jsonb)          to service_role;
grant execute on function public.get_notebook(uuid)                                         to service_role;

-- Sổ câu sai: học sinh đọc được dòng của mình (trang tổng quan sau này); ghi chỉ qua hàm trên. Khách không có quyền gì.
alter table public.learner_item_state enable row level security;
revoke all on public.learner_item_state from anon, authenticated;
grant select on public.learner_item_state to authenticated;
create policy "own_select" on public.learner_item_state for select to authenticated using (user_id = (select auth.uid()));

commit;

-- Kiểm tra sau khi chạy:
--   select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'learner_item_state';      → true
--   select count(*) from pg_policies where schemaname = 'public' and tablename = 'learner_item_state';      → 1
--   select has_function_privilege('authenticated', 'public.check_attempt_item(uuid, uuid, text, uuid, jsonb)', 'execute'),
--          has_function_privilege('service_role', 'public.start_practice_attempt(uuid, text, text, jsonb)', 'execute'); → false, true
--   Rồi chạy supabase/tests/exam_practice.sql (tự hoàn tác).
