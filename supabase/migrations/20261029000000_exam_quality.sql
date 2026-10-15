-- Luyện thi — GĐ7: thống kê câu hỏi, báo lỗi câu hỏi, chấm lại khi sửa đáp án, tổng quan quản trị
-- (docs/ke-hoach-luyen-thi.md, mục 3.8, 3.9, 4.10).
--
-- Chỉ THÊM (và thay thân exam_attempt_view để trả thêm `regraded_items`, đổi danh sách bucket giới hạn tần suất):
--   1. Bảng `exam_item_reports` — học sinh báo lỗi một câu ĐÃ THẤY ĐÁP ÁN (sau khi nộp / kiểm tra). Ghi chỉ qua hàm
--      `report_exam_item` (service_role); nhân sự đọc; kiểm duyệt viên / quản trị viên đổi trạng thái. Học sinh không đọc
--      được báo cáo nào (kể cả của mình).
--   2. Bảng `exam_regrade_log` + hàm `regrade_item` — sau khi quản trị viên sửa đáp án một câu, chấm lại câu đó trong mọi
--      lượt đã nộp: tính lại ĐIỂM CỦA CÂU ĐÓ, cộng phần chênh vào điểm lượt và các nhóm phân tích (không chấm lại cả lượt,
--      không đụng giờ nộp / sổ câu sai), ghi nhật ký. Trang kết quả hiện "Điểm đã được cập nhật do sửa đáp án câu …".
--   3. `exam_item_stats` — thống kê từng câu từ các lượt THI đã nộp: số lượt, tỉ lệ điểm đạt (p), độ phân hóa (27% điểm
--      cao nhất − 27% thấp nhất), phân bố lựa chọn (trắc nghiệm, theo thứ tự GỐC), tỉ lệ đúng từng ý (Đúng/Sai).
--   4. `exam_admin_overview` — số lượt theo ngày, người dùng hoạt động, phân bố điểm, báo lỗi đang mở (không có thông tin
--      cá nhân).
-- Hàm đều security definer, search_path rỗng, chỉ service_role gọi (server kiểm vai trò nhân sự trước).
-- Chạy một lần; kiểm thử: supabase/tests/exam_quality.sql (tự hoàn tác).

begin;

-- ============================================================
-- 1. Báo lỗi câu hỏi
-- ============================================================
create type public.exam_report_reason as enum ('sai_dap_an', 'loi_chinh_ta', 'khong_ro_nghia', 'sai_kien_thuc', 'khac');

create table public.exam_item_reports (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.exam_items(id) on delete cascade,
  attempt_id  uuid references public.exam_attempts(id) on delete set null,
  user_id     uuid references auth.users(id) on delete set null,
  device_hash text,
  reason      public.exam_report_reason not null,
  note        text constraint exam_item_reports_note_check check (note is null or char_length(note) <= 500),
  status      text not null default 'open' constraint exam_item_reports_status_check check (status in ('open', 'fixed', 'rejected')),
  admin_note  text constraint exam_item_reports_admin_note_check check (admin_note is null or char_length(admin_note) <= 500),
  handled_by  uuid references auth.users(id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_exam_item_reports_status on public.exam_item_reports (status, created_at desc);
create index idx_exam_item_reports_item on public.exam_item_reports (item_id);
-- Một người (tài khoản hoặc thiết bị) chỉ có một báo cáo đang mở cho mỗi câu.
create unique index uq_exam_item_reports_open on public.exam_item_reports (item_id, coalesce(user_id::text, device_hash)) where status = 'open';

alter table public.exam_item_reports enable row level security;
revoke all on public.exam_item_reports from anon, authenticated;
grant select on public.exam_item_reports to authenticated;
grant update (status, admin_note, handled_by, handled_at) on public.exam_item_reports to authenticated;
create policy "staff_read" on public.exam_item_reports for select to authenticated using (public.current_staff_role() is not null);
create policy "reviewer_admin_handle" on public.exam_item_reports for update to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));

-- Giới hạn tần suất báo lỗi (server đếm qua consume_rate_limit).
alter table public.rate_limit_hits drop constraint rate_limit_hits_bucket_check;
alter table public.rate_limit_hits add constraint rate_limit_hits_bucket_check
  check (bucket in ('order_lookup', 'license_activation', 'license_claim', 'progress_write', 'exam_start', 'exam_save', 'practice_free', 'exam_report'));

-- ============================================================
-- 2. Nhật ký chấm lại
-- ============================================================
create table public.exam_regrade_log (
  id          bigint generated always as identity primary key,
  item_id     uuid not null references public.exam_items(id) on delete cascade,
  attempt_id  uuid not null references public.exam_attempts(id) on delete cascade,
  old_earned  integer not null,
  new_earned  integer not null,
  old_score10 numeric(4, 2),
  new_score10 numeric(4, 2),
  actor       uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index idx_exam_regrade_log_attempt on public.exam_regrade_log (attempt_id);
create index idx_exam_regrade_log_item on public.exam_regrade_log (item_id, created_at desc);

alter table public.exam_regrade_log enable row level security;
revoke all on public.exam_regrade_log from anon, authenticated;
grant select on public.exam_regrade_log to authenticated;
create policy "admin_read" on public.exam_regrade_log for select to authenticated using (public.current_staff_role() = 'system_admin');

-- ============================================================
-- 3. Lượt nhìn từ phía học sinh: thêm `regraded_items` (thân giống migration 20261028000000)
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
-- 4. Hàm cho server
-- ============================================================

-- Học sinh báo lỗi một câu của lượt CỦA MÌNH mà đã thấy đáp án (lượt thi đã nộp, hoặc câu luyện tập đã kiểm tra).
create or replace function public.report_exam_item(
  p_user_id uuid, p_device_hash text, p_attempt_id uuid, p_item_id uuid, p_reason text, p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.exam_attempts%rowtype;
begin
  if p_reason is null or p_reason not in ('sai_dap_an', 'loi_chinh_ta', 'khong_ro_nghia', 'sai_kien_thuc', 'khac')
     or char_length(coalesce(p_note, '')) > 500 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  select * into a from public.exam_attempts where id = p_attempt_id;
  if not found or not public.exam_attempt_owner_ok(a, p_user_id, p_device_hash) or not (p_item_id = any(a.item_ids))
     or not ((a.status = 'submitted' and a.mode in ('exam', 'paper')) or coalesce(a.answers -> p_item_id::text ->> 'checked', '') = 'true') then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  insert into public.exam_item_reports (item_id, attempt_id, user_id, device_hash, reason, note)
  values (p_item_id, a.id, p_user_id, case when p_user_id is null then nullif(p_device_hash, '') end,
          p_reason::public.exam_report_reason, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (item_id, coalesce(user_id::text, device_hash)) where status = 'open' do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

-- Chấm lại một câu (sau khi sửa đáp án) trong mọi lượt đã nộp có câu đó. Trả số lượt đổi điểm.
create or replace function public.regrade_item(p_item_id uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  it public.exam_items%rowtype;
  a public.exam_attempts%rowtype;
  pos integer;
  v_old integer;
  v_new integer;
  v_delta integer;
  v_max integer;
  b jsonb;
  v_raw bigint;
  v_total_max bigint;
  v_score numeric(4, 2);
  k text;
  checked_count integer := 0;
  changed integer := 0;
begin
  select * into it from public.exam_items where id = p_item_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  v_max := case when it.kind = 'mcq' then 250 else 1000 end;

  for a in
    select * from public.exam_attempts x
     where x.status = 'submitted' and x.breakdown is not null and p_item_id = any(x.item_ids)
     for update
  loop
    pos := array_position(a.item_ids, p_item_id);
    -- Câu không được chấm trong lượt này (luyện tập mà chưa kiểm tra) → bỏ qua.
    continue when not (a.mode in ('exam', 'paper') or coalesce(a.answers -> p_item_id::text ->> 'checked', '') = 'true');
    checked_count := checked_count + 1;
    v_old := coalesce((a.breakdown -> 'items' ->> (pos - 1))::int, 0);
    v_new := public.exam_item_earned(it, a.choice_shifts[pos], a.answers -> p_item_id::text);
    continue when v_new = v_old;
    v_delta := v_new - v_old;

    b := jsonb_set(a.breakdown, array['items', (pos - 1)::text], to_jsonb(v_new));
    b := jsonb_set(b, '{raw_milli}', to_jsonb(coalesce((b ->> 'raw_milli')::bigint, 0) + v_delta));
    b := jsonb_set(b, '{correct}', to_jsonb(coalesce((b ->> 'correct')::int, 0)
                                             - (case when v_old = v_max then 1 else 0 end) + (case when v_new = v_max then 1 else 0 end)));
    -- Các nhóm phân tích chứa câu này (bỏ qua nhóm không còn trong breakdown — ví dụ câu đã đổi bài).
    foreach k in array array[
      'sections/' || a.sections[pos]::text, 'lessons/' || coalesce(it.lesson_slug, '_'), 'levels/' || it.level::text, 'kinds/' || it.kind::text
    ] || case when it.passage_id is not null then array['kinds/passage'] else array[]::text[] end
    loop
      if b #> string_to_array(k, '/') is not null then
        b := jsonb_set(b, string_to_array(k || '/earned', '/'), to_jsonb(coalesce((b #>> string_to_array(k || '/earned', '/'))::bigint, 0) + v_delta));
      end if;
    end loop;

    v_raw := (b ->> 'raw_milli')::bigint;
    v_total_max := (b ->> 'max_milli')::bigint;
    v_score := case when coalesce(v_total_max, 0) = 0 then 0 else ((2000 * v_raw + v_total_max) / (2 * v_total_max)) / 100.0 end;
    update public.exam_attempts
       set breakdown = b, score10 = v_score, raw_score = round(v_raw / 1000.0, 2)
     where id = a.id;
    insert into public.exam_regrade_log (item_id, attempt_id, old_earned, new_earned, old_score10, new_score10, actor)
    values (p_item_id, a.id, v_old, v_new, a.score10, v_score, p_actor);
    changed := changed + 1;
  end loop;

  return jsonb_build_object('ok', true, 'attempts', checked_count, 'changed', changed);
end;
$$;

-- Thống kê các câu (chỉ lượt THI đã nộp). Trả { "<item_id>": { n, p, disc, choices[4], blank, statements[4] } }.
create or replace function public.exam_item_stats(p_item_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with picks as (
    select a.score10, o.item_id, a.choice_shifts[o.n] as shift, a.answers -> o.item_id::text as ans,
           (a.breakdown -> 'items' ->> (o.n::int - 1))::int as earned
      from public.exam_attempts a
      cross join lateral unnest(a.item_ids) with ordinality as o(item_id, n)
     where a.status = 'submitted' and a.mode = 'exam' and a.breakdown is not null
       and o.item_id = any(p_item_ids)
  ), ranked as (
    select p.*, i.kind, i.statements,
           p.earned::numeric / (case when i.kind = 'mcq' then 250 else 1000 end) as ratio,
           percent_rank() over (partition by p.item_id order by p.score10) as pr,
           case when i.kind = 'mcq' and (p.ans ->> 'choice') is not null
                then (((p.ans ->> 'choice')::int - p.shift + 4) % 4) end as original_choice
      from picks p
      join public.exam_items i on i.id = p.item_id
  )
  select coalesce(jsonb_object_agg(item_id, stats), '{}'::jsonb)
    from (
      select r.item_id, jsonb_build_object(
               'n', count(*),
               'p', round(avg(r.ratio), 3),
               'disc', round(coalesce(avg(r.ratio) filter (where r.pr >= 0.73), 0) - coalesce(avg(r.ratio) filter (where r.pr <= 0.27), 0), 3),
               'choices', case when r.kind = 'mcq' then jsonb_build_array(
                            count(*) filter (where r.original_choice = 0), count(*) filter (where r.original_choice = 1),
                            count(*) filter (where r.original_choice = 2), count(*) filter (where r.original_choice = 3)) end,
               'blank', count(*) filter (where r.kind = 'mcq' and r.original_choice is null),
               'statements', case when r.kind = 'true_false' then (
                 select jsonb_agg(t.v order by t.k)
                   from (select s.k, round(avg(case when (x.ans -> 'tf' ->> s.k) is not null
                                                     and (x.ans -> 'tf' ->> s.k)::boolean = (x.statements -> s.k ->> 'is_true')::boolean
                                                    then 1 else 0 end), 3) as v
                           from ranked x cross join generate_series(0, 3) as s(k)
                          where x.item_id = r.item_id
                          group by s.k) as t) end
             ) as stats
        from ranked r
       group by r.item_id, r.kind
    ) as per_item;
$$;

-- Tổng quan quản trị trong `p_days` ngày gần nhất (ngày theo giờ Việt Nam). Không có thông tin cá nhân.
create or replace function public.exam_admin_overview(p_days integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select a.*, (a.started_at at time zone 'Asia/Ho_Chi_Minh')::date as day
      from public.exam_attempts a
     where a.started_at > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365))
  )
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'exam', exam, 'practice', practice, 'submitted', submitted) order by day)
        from (select day, count(*) filter (where mode in ('exam', 'paper')) as exam,
                     count(*) filter (where mode in ('practice', 'review')) as practice,
                     count(*) filter (where status = 'submitted') as submitted
                from recent group by day) as d), '[]'::jsonb),
    'active_7', (select count(distinct coalesce(user_id::text, device_hash)) from recent where started_at > now() - interval '7 days'),
    'active_period', (select count(distinct coalesce(user_id::text, device_hash)) from recent),
    'accounts_period', (select count(distinct user_id) from recent where user_id is not null),
    'scores', (select jsonb_agg(c order by b) from (
                 select b, (select count(*) from recent r where r.status = 'submitted' and r.mode = 'exam' and r.score10 is not null
                                                          and least(floor(r.score10), 9) = b) as c
                   from generate_series(0, 9) as b) as h),
    'submitted_exams', (select count(*) from recent where status = 'submitted' and mode = 'exam'),
    'reports_open', (select count(*) from public.exam_item_reports where status = 'open')
  );
$$;

-- ============================================================
-- 5. Quyền
-- ============================================================
revoke all on function public.exam_attempt_view(public.exam_attempts, boolean) from public, anon, authenticated;
revoke all on function public.report_exam_item(uuid, text, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.regrade_item(uuid, uuid) from public, anon, authenticated;
revoke all on function public.exam_item_stats(uuid[]) from public, anon, authenticated;
revoke all on function public.exam_admin_overview(integer) from public, anon, authenticated;
grant execute on function public.report_exam_item(uuid, text, uuid, uuid, text, text) to service_role;
grant execute on function public.regrade_item(uuid, uuid) to service_role;
grant execute on function public.exam_item_stats(uuid[]) to service_role;
grant execute on function public.exam_admin_overview(integer) to service_role;

commit;

-- Kiểm tra sau khi chạy:
--   select rowsecurity from pg_tables where tablename in ('exam_item_reports', 'exam_regrade_log');  → true, true
--   select has_table_privilege('anon', 'public.exam_item_reports', 'select'),
--          has_function_privilege('authenticated', 'public.regrade_item(uuid, uuid)', 'execute');  → false, false
--   Rồi gọi thử các hàm qua supabase-js bằng khóa bí mật (bẫy pg_safeupdate — ở đây mọi UPDATE đều có WHERE).
