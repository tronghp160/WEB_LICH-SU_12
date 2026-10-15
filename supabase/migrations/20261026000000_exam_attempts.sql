-- Luyện thi — GĐ2: lượt làm bài, chấm điểm phía server (docs/ke-hoach-luyen-thi.md, mục 3.6, 3.10, 3.11).
--
-- Chỉ THÊM, không xóa gì:
--   1. Kiểu `exam_attempt_mode`, `exam_attempt_status`; bảng `exam_attempts` (một lượt làm một đề: thứ tự câu, độ xoay lựa
--      chọn, câu trả lời đã lưu, hạn nộp theo giờ server, điểm + phân tích sau khi chấm).
--   2. Hàm (security definer, search_path rỗng, CHỈ service_role gọi — server tự xác minh phiên / mã rồi mới gọi):
--        exam_access          — kiểm quyền mở một đề (tách từ get_exam_set): miễn phí | gói của tài khoản | mã + thiết bị
--        get_exam_intro       — trang đề trước khi làm: quyền, số câu, lượt đang làm dở (KHÔNG có câu hỏi)
--        start_exam_attempt   — tạo lượt (hoặc trả lượt đang làm dở); câu hỏi KHÔNG kèm đáp án / lời giải
--        save_attempt_answers — lưu câu trả lời (chỉ câu thuộc lượt; từ chối khi đã nộp hoặc quá hạn 30 giây)
--        submit_exam_attempt  — lưu lần cuối, CHẤM trong SQL, trả kết quả kèm đáp án và lời giải
--        get_attempt_result   — xem lại một lượt (đang làm: như start; đã nộp: kết quả)
--      Chủ lượt: tài khoản (user_id) nếu lượt tạo khi đăng nhập, ngược lại đúng thiết bị (device_hash).
--   3. Thêm loại giới hạn `exam_start`, `exam_save` cho consume_rate_limit.
-- Chấm điểm (mục 3.11) giống hệt lib/exams/scoring.ts — tính bằng phần nghìn điểm (số nguyên) để hai bên không lệch do
-- làm tròn: trắc nghiệm 250; Đúng/Sai theo số ý đúng 0 / 100 / 250 / 500 / 1000; điểm thang 10 = làm tròn (raw / max × 10)
-- tới 0,01, nửa lên.
-- get_exam_set (trả cả đáp án) không còn được code gọi; giữ lại tới migration dọn dẹp.
-- Chạy một lần trong SQL Editor; kiểm thử: supabase/tests/exam_attempts.sql (tự hoàn tác).

begin;

-- ============================================================
-- 1. Kiểu + bảng
-- ============================================================
create type public.exam_attempt_mode as enum ('exam', 'practice', 'review', 'paper');
create type public.exam_attempt_status as enum ('in_progress', 'submitted', 'abandoned');

create table public.exam_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  license_id    uuid references public.licenses(id) on delete set null,
  device_hash   text constraint exam_attempts_device_check check (device_hash is null or device_hash ~ '^[0-9a-f]{64}$'),
  set_id        uuid references public.exam_sets(id) on delete set null,
  mode          public.exam_attempt_mode not null default 'exam',
  -- Thứ tự câu của lượt này + phần (1/2) + độ xoay lựa chọn (0–3) của từng câu — chép từ đề lúc bắt đầu, đề sửa sau
  -- không làm đổi lượt đang làm.
  item_ids      uuid[] not null,
  sections      smallint[] not null,
  choice_shifts smallint[] not null,
  -- { "<item_id>": { "choice": 0-3 } | { "tf": [true,false,null,true] }, kèm "flagged": bool, "ms": số mili giây }
  answers       jsonb not null default '{}'::jsonb
                constraint exam_attempts_answers_check check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 65536),
  started_at    timestamptz not null default now(),
  deadline_at   timestamptz,
  submitted_at  timestamptz,
  status        public.exam_attempt_status not null default 'in_progress',
  score10       numeric(4, 2),
  raw_score     numeric(6, 2),
  max_score     numeric(6, 2),
  breakdown     jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint exam_attempts_items_check check (
    cardinality(item_ids) between 1 and 200
    and cardinality(sections) = cardinality(item_ids)
    and cardinality(choice_shifts) = cardinality(item_ids)
  ),
  constraint exam_attempts_owner_check check (user_id is not null or device_hash is not null),
  constraint exam_attempts_submitted_check check ((status = 'submitted') = (submitted_at is not null and score10 is not null))
);
create index idx_exam_attempts_user on public.exam_attempts (user_id, submitted_at desc) where user_id is not null;
create index idx_exam_attempts_license on public.exam_attempts (license_id, device_hash, submitted_at desc) where license_id is not null;
create index idx_exam_attempts_device on public.exam_attempts (device_hash, set_id, status) where device_hash is not null;
create index idx_exam_attempts_set on public.exam_attempts (set_id, status);
create trigger trg_exam_attempts_updated_at before update on public.exam_attempts for each row execute function public.set_updated_at();

alter table public.rate_limit_hits drop constraint rate_limit_hits_bucket_check;
alter table public.rate_limit_hits add constraint rate_limit_hits_bucket_check
  check (bucket in ('order_lookup', 'license_activation', 'license_claim', 'progress_write', 'exam_start', 'exam_save'));

-- ============================================================
-- 2. Hàm nội bộ (chỉ các hàm security definer bên dưới dùng)
-- ============================================================

-- Người gọi có phải chủ lượt không: lượt tạo khi đăng nhập → đúng tài khoản; ngược lại → đúng thiết bị.
create or replace function public.exam_attempt_owner_ok(a public.exam_attempts, p_user_id uuid, p_device_hash text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case when a.user_id is not null then p_user_id is not null and a.user_id = p_user_id
              else coalesce(p_device_hash, '') <> '' and a.device_hash = p_device_hash end;
$$;

-- Chỉ giữ câu trả lời hợp lệ của các câu THUỘC lượt: trắc nghiệm choice 0–3 hoặc null (bỏ chọn), Đúng/Sai tf 4 phần tử
-- true/false/null, flagged, ms (0 – 1 ngày). Câu lạ, khóa lạ, kiểu sai bị bỏ. Mỗi câu gửi lên THAY câu trả lời cũ của
-- câu đó (client gửi đủ cả object của câu).
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
             -- CASE lồng nhau: AND không bảo đảm thứ tự, jsonb_array_length lỗi khi không phải mảng.
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
    ) as x
   where x.answer <> '{}'::jsonb;
$$;

-- Lượt nhìn từ phía học sinh. p_reveal = false: câu hỏi KHÔNG có đáp án / lời giải (đang làm). true: thêm đáp án đúng,
-- lời giải, bài / sự kiện, điểm từng câu (đã nộp).
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
               'n', o.n, 'item_id', i.id, 'section', a.sections[o.n], 'kind', i.kind, 'stem', i.stem,
               'choices', case when i.kind = 'mcq' then
                            to_jsonb(array(select i.choices[((k - a.choice_shifts[o.n] + 4) % 4) + 1] from generate_series(0, 3) as k order by k)) end,
               'statements', case when i.kind = 'true_false' then
                            (select jsonb_agg(s.st -> 'text' order by s.ord) from jsonb_array_elements(i.statements) with ordinality as s(st, ord)) end,
               'passage', case when p.id is not null then jsonb_build_object('body', p.body, 'source_citation', p.source_citation) end,
               'correct_index', case when p_reveal and i.kind = 'mcq' then (i.correct_index + a.choice_shifts[o.n]) % 4 end,
               'truths', case when p_reveal and i.kind = 'true_false' then
                            (select jsonb_agg(s.st -> 'is_true' order by s.ord) from jsonb_array_elements(i.statements) with ordinality as s(st, ord)) end,
               'statement_explanations', case when p_reveal and i.kind = 'true_false' then
                            (select jsonb_agg(s.st -> 'explanation' order by s.ord) from jsonb_array_elements(i.statements) with ordinality as s(st, ord)) end,
               'explanation', case when p_reveal then i.explanation end,
               'level', case when p_reveal then i.level end,
               'lesson_slug', case when p_reveal then i.lesson_slug end,
               'event_slug', case when p_reveal then e.slug end,
               'event_title', case when p_reveal then e.title end,
               'earned_milli', case when p_reveal then a.breakdown -> 'items' -> (o.n::int - 1) end
             )) order by o.n)
        from unnest(a.item_ids) with ordinality as o(item_id, n)
        join public.exam_items i on i.id = o.item_id
        left join public.exam_passages p on p.id = i.passage_id
        left join public.historical_events e on e.id = i.event_id and e.workflow_status = 'published'
    ), '[]'::jsonb)
  );
$$;

-- Chấm một lượt theo câu trả lời đã lưu, ghi điểm + phân tích, chuyển sang "đã nộp". Không kiểm chủ (hàm gọi đã kiểm).
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
begin
  select * into a from public.exam_attempts where id = p_attempt_id for update;
  if not found or a.status <> 'in_progress' then
    return;
  end if;

  with graded as (
    select o.n, i.kind, i.lesson_slug, i.level, i.passage_id is not null as has_passage, a.sections[o.n] as section,
           case when i.kind = 'mcq' then 250 else 1000 end as max_milli,
           v as answer,
           case when i.kind = 'mcq' then
                  case when (v ->> 'choice') = ((i.correct_index + a.choice_shifts[o.n]) % 4)::text then 250 else 0 end
                else (array[0, 100, 250, 500, 1000])[1 + (
                        select count(*) from jsonb_array_elements(i.statements) with ordinality as s(st, ord)
                         where (v -> 'tf' -> (s.ord::int - 1)) = (s.st -> 'is_true'))]
           end as earned,
           case when i.kind = 'mcq' then (v ->> 'choice') is not null
                else exists (select 1 from jsonb_array_elements(coalesce(v -> 'tf', '[]'::jsonb)) as t(e) where jsonb_typeof(t.e) = 'boolean')
           end as answered
      from unnest(a.item_ids) with ordinality as o(item_id, n)
      join public.exam_items i on i.id = o.item_id
      cross join lateral (select a.answers -> o.item_id::text as v) as given
  ),
  groups as (
    select 'sections' as dim, section::text as key, sum(earned) as earned, sum(max_milli) as max, count(*) as n from graded group by section
    union all
    select 'lessons', coalesce(lesson_slug, '_'), sum(earned), sum(max_milli), count(*) from graded group by lesson_slug
    union all
    select 'levels', level::text, sum(earned), sum(max_milli), count(*) from graded group by level
    union all
    select 'kinds', kind::text, sum(earned), sum(max_milli), count(*) from graded group by kind
    union all
    select 'kinds', 'passage', sum(earned), sum(max_milli), count(*) from graded where has_passage having count(*) > 0
  )
  select coalesce(sum(earned), 0), coalesce(sum(max_milli), 0),
         jsonb_build_object(
           'items', coalesce((select jsonb_agg(g.earned order by g.n) from graded g), '[]'::jsonb),
           'correct', (select count(*) from graded g where g.earned = g.max_milli),
           'unanswered', (select count(*) from graded g where not g.answered),
           'total', (select count(*) from graded),
           'raw_milli', coalesce(sum(earned), 0),
           'max_milli', coalesce(sum(max_milli), 0)
         ) || coalesce((
           select jsonb_object_agg(dim, by_key) from (
             select dim, jsonb_object_agg(key, jsonb_build_object('earned', earned, 'max', max, 'n', n)) as by_key from groups group by dim
           ) as d
         ), '{}'::jsonb)
    into v_raw, v_max, v_breakdown
    from graded;

  -- Điểm thang 10 làm tròn 0,01, nửa lên — số nguyên để khớp lib/exams/scoring.ts.
  v_hundredths := case when v_max = 0 then 0 else (2000 * v_raw + v_max) / (2 * v_max) end;
  update public.exam_attempts
     set status = 'submitted', submitted_at = now(), score10 = v_hundredths / 100.0,
         raw_score = round(v_raw / 1000.0, 2), max_score = round(v_max / 1000.0, 2), breakdown = v_breakdown
   where id = a.id;
end;
$$;

-- ============================================================
-- 3. Hàm cho server (security definer, chỉ service_role)
-- ============================================================

-- Quyền mở một đề đã công bố (như get_exam_set): đề miễn phí; gói còn hiệu lực của tài khoản p_user_id; hoặc mã còn hiệu
-- lực đúng sản phẩm và thiết bị đã kích hoạt. Trả { ok, reason } hoặc { ok, access, set_id, license_id }.
create or replace function public.exam_access(p_slug text, p_code text, p_device_hash text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.exam_sets%rowtype;
  l public.licenses%rowtype;
begin
  select * into s from public.exam_sets where slug = p_slug and workflow_status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if s.product_id is null then
    return jsonb_build_object('ok', true, 'access', 'free', 'set_id', s.id);
  end if;
  if p_user_id is not null then
    select * into l from public.licenses
     where user_id = p_user_id and product_id = s.product_id and status = 'active' and (valid_until is null or valid_until >= now())
     order by created_at limit 1;
    if found then
      return jsonb_build_object('ok', true, 'access', 'account', 'set_id', s.id, 'license_id', l.id);
    end if;
  end if;
  select * into l from public.licenses where code = upper(btrim(coalesce(p_code, '')));
  if not found or l.product_id <> s.product_id then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if l.status <> 'active' then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;
  if l.valid_until is not null and l.valid_until < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  update public.license_activations set last_seen_at = now() where license_id = l.id and device_hash = p_device_hash;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_activated');
  end if;
  return jsonb_build_object('ok', true, 'access', 'code', 'set_id', s.id, 'license_id', l.id);
end;
$$;

-- Lượt đang làm dở (chưa hết hạn) của người gọi cho một đề, mới nhất.
create or replace function public.exam_open_attempt(p_set_id uuid, p_user_id uuid, p_device_hash text)
returns public.exam_attempts
language sql
stable
set search_path = ''
as $$
  select a.* from public.exam_attempts a
   where a.set_id = p_set_id and a.status = 'in_progress' and a.mode = 'exam'
     and (a.deadline_at is null or a.deadline_at > now())
     and public.exam_attempt_owner_ok(a, p_user_id, p_device_hash)
   order by a.started_at desc limit 1;
$$;

-- Trang đề trước khi làm: quyền, số câu, lượt đang làm dở. KHÔNG trả câu hỏi.
create or replace function public.get_exam_intro(p_slug text, p_code text, p_device_hash text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  access jsonb;
  open_attempt public.exam_attempts%rowtype;
begin
  access := public.exam_access(p_slug, p_code, p_device_hash, p_user_id);
  if (access ->> 'ok')::boolean is not true then
    return access;
  end if;
  open_attempt := public.exam_open_attempt((access ->> 'set_id')::uuid, p_user_id, p_device_hash);
  return jsonb_build_object(
    'ok', true,
    'access', access ->> 'access',
    'question_count', (select count(*) from public.exam_set_items si join public.exam_items i on i.id = si.item_id
                        where si.set_id = (access ->> 'set_id')::uuid and i.workflow_status = 'published'),
    'in_progress', case when open_attempt.id is not null
                        then jsonb_build_object('id', open_attempt.id, 'deadline_at', open_attempt.deadline_at, 'server_now', now()) end
  );
end;
$$;

-- Bắt đầu làm đề: có lượt đang làm dở (chưa hết hạn) của đúng người / máy thì trả lại lượt đó (làm tiếp); lượt quá hạn
-- chưa nộp thì chấm theo phần đã lưu. Không thì tạo lượt mới từ các câu ĐÃ CÔNG BỐ trong đề. Câu hỏi không kèm đáp án.
create or replace function public.start_exam_attempt(p_slug text, p_code text, p_device_hash text, p_user_id uuid, p_mode text default 'exam')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  access jsonb;
  set_row public.exam_sets%rowtype;
  a public.exam_attempts%rowtype;
  stale uuid;
begin
  if p_mode is distinct from 'exam' then
    return jsonb_build_object('ok', false, 'reason', 'unsupported_mode');
  end if;
  if p_user_id is null and coalesce(p_device_hash, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_device');
  end if;
  access := public.exam_access(p_slug, p_code, p_device_hash, p_user_id);
  if (access ->> 'ok')::boolean is not true then
    return access;
  end if;
  select * into set_row from public.exam_sets where id = (access ->> 'set_id')::uuid;

  for stale in
    select x.id from public.exam_attempts x
     where x.set_id = set_row.id and x.status = 'in_progress' and x.deadline_at is not null and x.deadline_at <= now()
       and public.exam_attempt_owner_ok(x, p_user_id, p_device_hash)
  loop
    perform public.exam_grade_attempt(stale);
  end loop;

  a := public.exam_open_attempt(set_row.id, p_user_id, p_device_hash);
  if a.id is null then
    insert into public.exam_attempts (user_id, license_id, device_hash, set_id, mode, item_ids, sections, choice_shifts, deadline_at)
    select p_user_id, (access ->> 'license_id')::uuid, nullif(p_device_hash, ''), set_row.id, 'exam',
           array_agg(si.item_id order by si.section, si.position),
           array_agg(si.section order by si.section, si.position),
           array_agg(si.choice_shift order by si.section, si.position),
           now() + make_interval(mins => set_row.duration_min)
      from public.exam_set_items si
      join public.exam_items i on i.id = si.item_id and i.workflow_status = 'published'
     where si.set_id = set_row.id
    having count(*) > 0
    returning * into a;
    if a.id is null then
      return jsonb_build_object('ok', false, 'reason', 'empty');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'access', access ->> 'access') || public.exam_attempt_view(a, false);
end;
$$;

-- Lưu câu trả lời (gộp theo từng câu). Từ chối khi không phải chủ lượt, lượt đã nộp, hoặc quá hạn + 30 giây.
create or replace function public.save_attempt_answers(p_attempt_id uuid, p_user_id uuid, p_device_hash text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.exam_attempts%rowtype;
begin
  select * into a from public.exam_attempts where id = p_attempt_id for update;
  if not found or not public.exam_attempt_owner_ok(a, p_user_id, p_device_hash) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if a.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'reason', 'submitted');
  end if;
  if a.deadline_at is not null and now() > a.deadline_at + interval '30 seconds' then
    return jsonb_build_object('ok', false, 'reason', 'time_up');
  end if;
  if jsonb_typeof(p_answers) = 'object' then
    update public.exam_attempts set answers = answers || public.exam_clean_answers(a, p_answers) where id = a.id;
  end if;
  return jsonb_build_object('ok', true, 'saved_at', now());
end;
$$;

-- Nộp bài: lưu lần cuối (nếu chưa quá hạn + 30 giây), chấm, trả kết quả. Gọi lại khi đã nộp → trả kết quả cũ.
create or replace function public.submit_exam_attempt(p_attempt_id uuid, p_user_id uuid, p_device_hash text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.exam_attempts%rowtype;
begin
  select * into a from public.exam_attempts where id = p_attempt_id for update;
  if not found or not public.exam_attempt_owner_ok(a, p_user_id, p_device_hash) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if a.status = 'in_progress' then
    if jsonb_typeof(p_answers) = 'object' and (a.deadline_at is null or now() <= a.deadline_at + interval '30 seconds') then
      update public.exam_attempts set answers = answers || public.exam_clean_answers(a, p_answers) where id = a.id;
    end if;
    perform public.exam_grade_attempt(a.id);
  elsif a.status <> 'submitted' then
    return jsonb_build_object('ok', false, 'reason', 'abandoned');
  end if;
  select * into a from public.exam_attempts where id = p_attempt_id;
  return jsonb_build_object('ok', true) || public.exam_attempt_view(a, true);
end;
$$;

-- Xem một lượt của mình: đang làm → câu hỏi không đáp án (làm tiếp); quá hạn → chấm rồi trả kết quả; đã nộp → kết quả.
create or replace function public.get_attempt_result(p_attempt_id uuid, p_user_id uuid, p_device_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.exam_attempts%rowtype;
begin
  select * into a from public.exam_attempts where id = p_attempt_id;
  if not found or not public.exam_attempt_owner_ok(a, p_user_id, p_device_hash) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if a.status = 'in_progress' and a.deadline_at is not null and now() > a.deadline_at + interval '30 seconds' then
    perform public.exam_grade_attempt(a.id);
    select * into a from public.exam_attempts where id = p_attempt_id;
  end if;
  return jsonb_build_object('ok', true) || public.exam_attempt_view(a, a.status = 'submitted');
end;
$$;

-- ============================================================
-- 4. Quyền
-- ============================================================
revoke all on function public.exam_attempt_owner_ok(public.exam_attempts, uuid, text)  from public, anon, authenticated;
revoke all on function public.exam_clean_answers(public.exam_attempts, jsonb)            from public, anon, authenticated;
revoke all on function public.exam_attempt_view(public.exam_attempts, boolean)           from public, anon, authenticated;
revoke all on function public.exam_grade_attempt(uuid)                                   from public, anon, authenticated;
revoke all on function public.exam_open_attempt(uuid, uuid, text)                        from public, anon, authenticated;
revoke all on function public.exam_access(text, text, text, uuid)                        from public, anon, authenticated;
revoke all on function public.get_exam_intro(text, text, text, uuid)                     from public, anon, authenticated;
revoke all on function public.start_exam_attempt(text, text, text, uuid, text)           from public, anon, authenticated;
revoke all on function public.save_attempt_answers(uuid, uuid, text, jsonb)              from public, anon, authenticated;
revoke all on function public.submit_exam_attempt(uuid, uuid, text, jsonb)               from public, anon, authenticated;
revoke all on function public.get_attempt_result(uuid, uuid, text)                       from public, anon, authenticated;
grant execute on function public.exam_access(text, text, text, uuid)                     to service_role;
grant execute on function public.get_exam_intro(text, text, text, uuid)                  to service_role;
grant execute on function public.start_exam_attempt(text, text, text, uuid, text)        to service_role;
grant execute on function public.save_attempt_answers(uuid, uuid, text, jsonb)           to service_role;
grant execute on function public.submit_exam_attempt(uuid, uuid, text, jsonb)            to service_role;
grant execute on function public.get_attempt_result(uuid, uuid, text)                    to service_role;

-- Lượt làm bài: mọi thao tác ghi đi qua hàm trên. Học sinh đăng nhập đọc được lượt của mình (trang tổng quan sau này);
-- quản trị viên đọc hết (thống kê). Khách không có quyền gì.
alter table public.exam_attempts enable row level security;
revoke all on public.exam_attempts from anon, authenticated;
grant select on public.exam_attempts to authenticated;
create policy "own_select" on public.exam_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "admin_read" on public.exam_attempts for select to authenticated using (public.current_staff_role() = 'system_admin');

commit;

-- Kiểm tra sau khi chạy:
--   select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'exam_attempts';          → true
--   select count(*) from pg_policies where schemaname = 'public' and tablename = 'exam_attempts';          → 2
--   select has_function_privilege('authenticated', 'public.start_exam_attempt(text, text, text, uuid, text)', 'execute'),
--          has_function_privilege('anon', 'public.submit_exam_attempt(uuid, uuid, text, jsonb)', 'execute'),
--          has_function_privilege('service_role', 'public.get_attempt_result(uuid, uuid, text)', 'execute'); → false, false, true
--   Rồi chạy supabase/tests/exam_attempts.sql (tự hoàn tác).
