-- Luyện thi — GĐ5: đề tự sinh theo ma trận, mục tiêu điểm, lộ trình ôn (docs/ke-hoach-luyen-thi.md, mục 4.4, 4.6, 4.7).
--
-- Chỉ THÊM (và thay thân exam_attempt_view để trả thêm `blueprint`), không xóa dữ liệu:
--   1. `exam_attempts.blueprint` — tên ma trận của lượt đề tự sinh (thpt_2025 | quick_15 | tf_only | chu-de-N); null với
--      đề có sẵn / luyện tập.
--   2. `start_generated_attempt` — server (lib/exams/generate.ts) đã chọn câu theo ma trận; hàm kiểm GÓI, kiểm mọi câu đã
--      công bố, rồi tạo lượt thi (bấm giờ). Đang có lượt dở cùng ma trận (chưa hết giờ) thì trả lượt đó (làm tiếp); lượt quá
--      hạn được chấm. `get_generated_intro` — có gói không, lượt dở. Đều chỉ service_role gọi.
--   3. `learner_profiles.exam_goal` (mục tiêu điểm 1–10) và `study_plan` (lộ trình ôn, JSON ≤ 32 KB) — học sinh tự sửa
--      qua quyền update sẵn có (policy own_update).
-- Chạy một lần trong SQL Editor; kiểm thử: supabase/tests/exam_generated.sql (tự hoàn tác).

begin;

-- ============================================================
-- 1. Cột mới
-- ============================================================
alter table public.exam_attempts
  add column blueprint text constraint exam_attempts_blueprint_check check (blueprint is null or blueprint ~ '^(thpt_2025|quick_15|tf_only|chu-de-[0-9]{1,2})$');
create index idx_exam_attempts_blueprint on public.exam_attempts (blueprint, status) where blueprint is not null;

alter table public.learner_profiles
  add column exam_goal numeric(3, 1) constraint learner_profiles_goal_check check (exam_goal is null or exam_goal between 1 and 10),
  add column study_plan jsonb constraint learner_profiles_plan_check check (study_plan is null or (jsonb_typeof(study_plan) = 'object' and pg_column_size(study_plan) <= 32768));

-- ============================================================
-- 2. Lượt nhìn từ phía học sinh: thêm `blueprint` (thân giống migration 20261027000000)
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

-- ============================================================
-- 3. Hàm cho server (security definer, chỉ service_role)
-- ============================================================

-- Lượt đề tự sinh đang làm dở (chưa hết giờ) của người gọi cho một ma trận.
create or replace function public.exam_open_generated(p_blueprint text, p_user_id uuid, p_device_hash text)
returns public.exam_attempts
language sql
stable
set search_path = ''
as $$
  select a.* from public.exam_attempts a
   where a.blueprint = p_blueprint and a.status = 'in_progress' and a.mode = 'exam'
     and (a.deadline_at is null or a.deadline_at > now())
     and public.exam_attempt_owner_ok(a, p_user_id, p_device_hash)
   order by a.started_at desc limit 1;
$$;

-- Trang đề tự sinh: có gói không, lượt dở. Không có câu hỏi.
create or replace function public.get_generated_intro(p_user_id uuid, p_code text, p_device_hash text, p_blueprint text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack uuid;
  open_attempt public.exam_attempts%rowtype;
begin
  pack := public.exam_pack_license(p_code, p_device_hash, p_user_id);
  if pack is null then
    return jsonb_build_object('ok', false, 'reason', 'pack_required');
  end if;
  open_attempt := public.exam_open_generated(p_blueprint, p_user_id, p_device_hash);
  return jsonb_build_object(
    'ok', true,
    'access', case when p_user_id is not null and exists (select 1 from public.licenses where id = pack and user_id = p_user_id) then 'account' else 'code' end,
    'in_progress', case when open_attempt.id is not null
                        then jsonb_build_object('id', open_attempt.id, 'deadline_at', open_attempt.deadline_at, 'server_now', now()) end
  );
end;
$$;

-- Tạo lượt đề tự sinh từ danh sách câu server đã chọn. Đang có lượt dở cùng ma trận → trả lượt đó (bỏ qua danh sách mới).
create or replace function public.start_generated_attempt(
  p_user_id uuid, p_code text, p_device_hash text, p_blueprint text,
  p_item_ids uuid[], p_sections smallint[], p_shifts smallint[], p_duration_min integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack uuid;
  a public.exam_attempts%rowtype;
  stale uuid;
begin
  if p_user_id is null and coalesce(p_device_hash, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_device');
  end if;
  if p_blueprint is null or p_blueprint !~ '^(thpt_2025|quick_15|tf_only|chu-de-[0-9]{1,2})$' then
    return jsonb_build_object('ok', false, 'reason', 'unsupported_mode');
  end if;
  pack := public.exam_pack_license(p_code, p_device_hash, p_user_id);
  if pack is null then
    return jsonb_build_object('ok', false, 'reason', 'pack_required');
  end if;

  for stale in
    select x.id from public.exam_attempts x
     where x.blueprint = p_blueprint and x.status = 'in_progress' and x.deadline_at is not null and x.deadline_at <= now()
       and public.exam_attempt_owner_ok(x, p_user_id, p_device_hash)
  loop
    perform public.exam_grade_attempt(stale);
  end loop;

  a := public.exam_open_generated(p_blueprint, p_user_id, p_device_hash);
  if a.id is null then
    if p_item_ids is null or cardinality(p_item_ids) not between 1 and 200
       or cardinality(p_sections) is distinct from cardinality(p_item_ids) or cardinality(p_shifts) is distinct from cardinality(p_item_ids)
       or p_duration_min not between 5 and 180
       or exists (select 1 from unnest(p_sections) as s where s not in (1, 2))
       or exists (select 1 from unnest(p_shifts) as s where s not between 0 and 3)
       or (select count(distinct x) from unnest(p_item_ids) as x) <> cardinality(p_item_ids)
       or (select count(*) from public.exam_items i where i.id = any(p_item_ids) and i.workflow_status = 'published') <> cardinality(p_item_ids) then
      return jsonb_build_object('ok', false, 'reason', 'invalid_items');
    end if;
    insert into public.exam_attempts (user_id, license_id, device_hash, set_id, mode, blueprint, item_ids, sections, choice_shifts, deadline_at)
    values (p_user_id, pack, nullif(p_device_hash, ''), null, 'exam', p_blueprint, p_item_ids, p_sections, p_shifts,
            now() + make_interval(mins => p_duration_min))
    returning * into a;
  end if;
  return jsonb_build_object('ok', true,
           'access', case when p_user_id is not null and exists (select 1 from public.licenses where id = pack and user_id = p_user_id) then 'account' else 'code' end)
         || public.exam_attempt_view(a, false);
end;
$$;

-- ============================================================
-- 4. Quyền
-- ============================================================
revoke all on function public.exam_attempt_view(public.exam_attempts, boolean) from public, anon, authenticated;
revoke all on function public.exam_open_generated(text, uuid, text) from public, anon, authenticated;
revoke all on function public.get_generated_intro(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.start_generated_attempt(uuid, text, text, text, uuid[], smallint[], smallint[], integer) from public, anon, authenticated;
grant execute on function public.get_generated_intro(uuid, text, text, text) to service_role;
grant execute on function public.start_generated_attempt(uuid, text, text, text, uuid[], smallint[], smallint[], integer) to service_role;

commit;

-- Kiểm tra sau khi chạy:
--   select column_name from information_schema.columns where table_name = 'exam_attempts' and column_name = 'blueprint';  → 1 dòng
--   select column_name from information_schema.columns where table_name = 'learner_profiles' and column_name in ('exam_goal', 'study_plan'); → 2
--   select has_function_privilege('authenticated', 'public.start_generated_attempt(uuid, text, text, text, uuid[], smallint[], smallint[], integer)', 'execute'); → false
--   Rồi chạy supabase/tests/exam_generated.sql (tự hoàn tác) và gọi thử hàm qua API (bẫy pg_safeupdate).
