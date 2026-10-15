-- Luyện thi — GĐ1: ngân hàng câu hỏi, dạng Đúng/Sai, đoạn tư liệu (docs/ke-hoach-luyen-thi.md, mục 3.1–3.5).
--
-- Chỉ THÊM và CHUYỂN dữ liệu, không xóa gì:
--   1. Kiểu `exam_item_kind`, `exam_item_level`, `exam_competency` (enum lượt làm bài để GĐ2).
--   2. Bảng `exam_passages` (đoạn tư liệu dùng chung), `exam_items` (ngân hàng câu: trắc nghiệm 4 lựa chọn hoặc Đúng/Sai
--      4 ý), `exam_set_items` (câu trong đề; `choice_shift` xoay vòng thứ tự lựa chọn khi ghép đề để rải đều A/B/C/D —
--      đáp án đúng hiển thị = (correct_index + choice_shift) mod 4).
--   3. `exam_sets` thêm `format` (thpt_2025 | mini | chuyen_de), `published_at` (tự đặt khi công bố lần đầu), `difficulty`.
--   4. Chuyển mỗi dòng `exam_questions` thành một câu `mcq` + một dòng `exam_set_items` (Phần I, giữ thứ tự, không xoay).
--      Đề đã có câu (de-1, de-2) → format 'mini'. Bảng `exam_questions` GIỮ NGUYÊN (bỏ ở migration dọn dẹp sau).
--   5. `get_exam_set` đọc từ bảng mới (chỉ câu trắc nghiệm đã công bố, đã xoay lựa chọn). Vẫn trả đáp án như cũ — chấm
--      phía server ở GĐ2.
--   6. RLS theo mẫu exam_sets / exam_questions: khách và học sinh KHÔNG đọc được; nhân sự đọc hết; biên tập viên chỉ sửa
--      câu / tư liệu đang nháp hoặc cần chỉnh sửa và câu trong đề đang nháp; kiểm duyệt viên và quản trị viên quản lý hết.
--
-- Chống trùng: `fingerprint` = câu hỏi + các lựa chọn / các ý đã "gấp" (chữ thường, bỏ dấu, đ→d, chỉ giữ a–z0–9; lựa
-- chọn / ý sắp xếp) — trigger tự tính, UNIQUE. Bản TypeScript: lib/exams/items.ts (chỉ để cảnh báo sớm).
-- Chạy một lần trong SQL Editor; kiểm thử: supabase/tests/exam_bank.sql (tự hoàn tác).

begin;

-- ============================================================
-- 1. Kiểu
-- ============================================================
create type public.exam_item_kind as enum ('mcq', 'true_false');
create type public.exam_item_level as enum ('nhan_biet', 'thong_hieu', 'van_dung');
-- Năng lực theo chương trình Lịch sử 2018.
create type public.exam_competency as enum ('tim_hieu_lich_su', 'nhan_thuc_tu_duy', 'van_dung_kien_thuc');

-- ============================================================
-- 2. Hàm gấp chữ + dấu vân tay câu hỏi (thuần, không đọc bảng)
-- ============================================================
create or replace function public.exam_fold(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
           replace(regexp_replace(normalize(lower(coalesce(p_text, '')), NFD), '[̀-ͯ]', '', 'g'), 'đ', 'd'),
           '[^a-z0-9]+', '', 'g');
$$;

create or replace function public.exam_item_fingerprint(p_kind public.exam_item_kind, p_stem text, p_choices text[], p_statements jsonb)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.exam_fold(p_stem) || '|' || coalesce(
    case when p_kind = 'mcq'
      then (select string_agg(f, '|' order by f collate "C") from (select public.exam_fold(c) as f from unnest(p_choices) as c) as x)
      else (select string_agg(f, '|' order by f collate "C")
              from (select public.exam_fold(s ->> 'text') as f from jsonb_array_elements(p_statements) as s) as x)
    end, '');
$$;

-- ============================================================
-- 3. Bảng
-- ============================================================
create table public.exam_passages (
  id              uuid primary key default gen_random_uuid(),
  title           text not null constraint exam_passages_title_check check (char_length(btrim(title)) between 3 and 160),
  body            text not null constraint exam_passages_body_check check (char_length(btrim(body)) between 30 and 2000),
  source_citation text not null constraint exam_passages_source_check check (char_length(btrim(source_citation)) between 5 and 500),
  lesson_slug     text constraint exam_passages_lesson_check check (lesson_slug is null or lesson_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  workflow_status public.content_workflow_status not null default 'draft',
  review_note     text,
  created_by      uuid default auth.uid() references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_exam_passages_status on public.exam_passages (workflow_status, lesson_slug);

create table public.exam_items (
  id                 uuid primary key default gen_random_uuid(),
  kind               public.exam_item_kind not null,
  -- Câu hỏi (trắc nghiệm) hoặc câu dẫn (Đúng/Sai).
  stem               text not null constraint exam_items_stem_check check (char_length(btrim(stem)) between 5 and 800),
  passage_id         uuid references public.exam_passages(id) on delete restrict,
  choices            text[],
  correct_index      smallint constraint exam_items_correct_check check (correct_index between 0 and 3),
  -- Đúng/Sai: đúng 4 phần tử { text, is_true, explanation } (trigger kiểm và chuẩn hóa).
  statements         jsonb,
  explanation        text not null constraint exam_items_explanation_check check (char_length(btrim(explanation)) between 5 and 2000),
  grade              smallint not null default 12 constraint exam_items_grade_check check (grade in (11, 12)),
  lesson_slug        text constraint exam_items_lesson_check check (lesson_slug is null or lesson_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  topic_tag          text constraint exam_items_topic_check check (topic_tag is null or char_length(btrim(topic_tag)) between 2 and 60),
  level              public.exam_item_level not null,
  competency         public.exam_competency not null,
  event_id           uuid references public.historical_events(id) on delete set null,
  source_note        text not null constraint exam_items_source_check check (char_length(btrim(source_note)) between 3 and 500),
  workflow_status    public.content_workflow_status not null default 'draft',
  review_note        text,
  fingerprint        text not null,
  -- Câu chuyển từ exam_questions (không đặt khóa ngoại để bỏ được bảng cũ sau này).
  legacy_question_id uuid,
  created_by         uuid default auth.uid() references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint exam_items_fingerprint_key unique (fingerprint),
  constraint exam_items_legacy_key unique (legacy_question_id),
  constraint exam_items_shape_check check (
    (kind = 'mcq' and choices is not null and correct_index is not null and statements is null)
    or (kind = 'true_false' and statements is not null and choices is null and correct_index is null)
  )
);
create index idx_exam_items_kind_lesson on public.exam_items (workflow_status, kind, lesson_slug);
create index idx_exam_items_grade_level on public.exam_items (workflow_status, grade, level);
create index idx_exam_items_passage on public.exam_items (passage_id) where passage_id is not null;
create index idx_exam_items_event on public.exam_items (event_id) where event_id is not null;

create table public.exam_set_items (
  set_id       uuid not null references public.exam_sets(id) on delete cascade,
  item_id      uuid not null references public.exam_items(id) on delete restrict,
  -- 1 = Phần I (trắc nghiệm), 2 = Phần II (Đúng/Sai).
  section      smallint not null constraint exam_set_items_section_check check (section in (1, 2)),
  position     smallint not null constraint exam_set_items_position_check check (position between 1 and 200),
  choice_shift smallint not null default 0 constraint exam_set_items_shift_check check (choice_shift between 0 and 3),
  created_at   timestamptz not null default now(),
  primary key (set_id, item_id),
  -- DEFERRABLE: đổi thứ tự nhiều câu trong một câu lệnh (upsert) không vướng trùng vị trí giữa chừng.
  constraint exam_set_items_position_key unique (set_id, section, position) deferrable initially immediate
);
create index idx_exam_set_items_item on public.exam_set_items (item_id);

alter table public.exam_sets
  add column format text not null default 'thpt_2025'
    constraint exam_sets_format_check check (format in ('thpt_2025', 'mini', 'chuyen_de')),
  add column published_at timestamptz,
  add column difficulty smallint constraint exam_sets_difficulty_check check (difficulty between 1 and 3);

-- ============================================================
-- 4. Trigger
-- ============================================================
create trigger trg_exam_passages_updated_at before update on public.exam_passages for each row execute function public.set_updated_at();
create trigger trg_exam_items_updated_at    before update on public.exam_items    for each row execute function public.set_updated_at();

-- Câu hỏi: kiểm nội dung theo dạng (không viết được bằng CHECK), chuẩn hóa các ý Đúng/Sai, tính dấu vân tay.
create or replace function public.exam_item_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
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
  else
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
    -- Chỉ giữ 3 khóa, bỏ khoảng trắng thừa — khóa lạ không lọt vào dữ liệu trả cho học sinh.
    new.statements := (
      select jsonb_agg(jsonb_build_object('text', btrim(s.value ->> 'text'), 'is_true', (s.value -> 'is_true')::boolean,
                                          'explanation', btrim(s.value ->> 'explanation')) order by s.ord)
        from jsonb_array_elements(new.statements) with ordinality as s(value, ord)
    );
  end if;
  new.fingerprint := public.exam_item_fingerprint(new.kind, new.stem, new.choices, new.statements);
  return new;
end;
$$;

create trigger trg_exam_item_integrity
  before insert or update on public.exam_items
  for each row execute function public.exam_item_integrity();

-- Ngày công bố lần đầu: chỉ database đặt (để báo "đề mới"), người sửa đề không tự ghi được.
create or replace function public.exam_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.published_at := old.published_at;
  else
    new.published_at := null;
  end if;
  if new.workflow_status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

-- ============================================================
-- 5. Chuyển dữ liệu từ exam_questions
-- ============================================================
-- Đề đã công bố: ngày công bố lấy theo lần sửa cuối (trước khi gắn trigger, trong cùng câu lệnh nên dùng giá trị cũ).
update public.exam_sets s
   set format = 'mini',
       published_at = case when s.workflow_status = 'published' then s.updated_at end
 where exists (select 1 from public.exam_questions q where q.set_id = s.id) or s.workflow_status = 'published';

create trigger trg_exam_sets_published_at
  before insert or update on public.exam_sets
  for each row execute function public.exam_set_published_at();

insert into public.exam_items (kind, stem, choices, correct_index, explanation, grade, lesson_slug, level, competency,
                               event_id, source_note, workflow_status, legacy_question_id, created_by, created_at)
select 'mcq', q.question, q.choices, q.correct_index, q.explanation, 12, q.lesson_slug, 'nhan_biet', 'tim_hieu_lich_su',
       q.event_id, q.source_note, s.workflow_status, q.id, null, q.created_at
  from public.exam_questions q
  join public.exam_sets s on s.id = q.set_id;

insert into public.exam_set_items (set_id, item_id, section, position, choice_shift)
select q.set_id, i.id, 1, q.position, 0
  from public.exam_questions q
  join public.exam_items i on i.legacy_question_id = q.id;

-- ============================================================
-- 6. get_exam_set đọc bảng mới (cùng chữ ký, cùng dạng kết quả)
-- ============================================================
-- Chỉ câu trắc nghiệm đã công bố: trình làm đề hiện tại chưa hiển thị câu Đúng/Sai / tư liệu (phòng thi mới ở GĐ3) —
-- trang quản trị cũng chặn công bố đề có các câu đó cho tới khi đó.
create or replace function public.get_exam_set(p_slug text, p_code text, p_device_hash text, p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.exam_sets%rowtype;
  l public.licenses%rowtype;
  access text := 'free';
begin
  select * into s from public.exam_sets where slug = p_slug and workflow_status = 'published';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if s.product_id is not null then
    if p_user_id is not null and exists (
      select 1 from public.licenses
       where user_id = p_user_id and product_id = s.product_id and status = 'active'
         and (valid_until is null or valid_until >= now())
    ) then
      access := 'account';
    else
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
      update public.license_activations set last_seen_at = now()
       where license_id = l.id and device_hash = p_device_hash;
      if not found then
        return jsonb_build_object('ok', false, 'reason', 'not_activated');
      end if;
      access := 'code';
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'access', access,
    'set', jsonb_build_object('slug', s.slug, 'title', s.title, 'description', s.description,
                              'duration_min', s.duration_min, 'free', s.product_id is null),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'position', x.n, 'question', x.stem,
               -- lựa chọn ở vị trí mới k lấy từ vị trí gốc (k - shift) mod 4
               'choices', to_jsonb(array(select x.choices[((k - x.choice_shift + 4) % 4) + 1] from generate_series(0, 3) as k order by k)),
               'correct_index', (x.correct_index + x.choice_shift) % 4,
               'explanation', x.explanation, 'lesson_slug', x.lesson_slug,
               'event_slug', x.event_slug, 'event_title', x.event_title
             ) order by x.n)
      from (
        select row_number() over (order by si.section, si.position) as n, i.stem, i.choices, i.correct_index,
               si.choice_shift, i.explanation, i.lesson_slug, e.slug as event_slug, e.title as event_title
          from public.exam_set_items si
          join public.exam_items i on i.id = si.item_id and i.workflow_status = 'published' and i.kind = 'mcq'
          left join public.historical_events e on e.id = i.event_id and e.workflow_status = 'published'
         where si.set_id = s.id
      ) as x
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_exam_set(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.get_exam_set(text, text, text, uuid) to service_role;

-- ============================================================
-- 7. RLS
-- ============================================================
alter table public.exam_passages  enable row level security;
alter table public.exam_items     enable row level security;
alter table public.exam_set_items enable row level security;

revoke all on public.exam_passages, public.exam_items, public.exam_set_items from anon, authenticated;
-- Khách / học sinh: không có quyền gì (câu hỏi chỉ đi qua get_exam_set). Nhân sự: theo policy bên dưới.
grant select, insert, update, delete on public.exam_passages, public.exam_items, public.exam_set_items to authenticated;

create policy "staff_read_all" on public.exam_passages
  for select to authenticated using (public.current_staff_role() is not null);
create policy "reviewer_admin_manage" on public.exam_passages
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));
-- Biên tập viên: chỉ sửa tư liệu đang nháp / cần chỉnh sửa, và chỉ đưa về nháp hoặc gửi duyệt (không tự công bố).
create policy "editor_manage_editable" on public.exam_passages
  for all to authenticated
  using (public.current_staff_role() = 'editor' and workflow_status in ('draft', 'needs_revision'))
  with check (public.current_staff_role() = 'editor' and workflow_status in ('draft', 'needs_revision', 'pending_review'));

create policy "staff_read_all" on public.exam_items
  for select to authenticated using (public.current_staff_role() is not null);
create policy "reviewer_admin_manage" on public.exam_items
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));
create policy "editor_manage_editable" on public.exam_items
  for all to authenticated
  using (public.current_staff_role() = 'editor' and workflow_status in ('draft', 'needs_revision'))
  with check (public.current_staff_role() = 'editor' and workflow_status in ('draft', 'needs_revision', 'pending_review'));

-- Câu trong đề: biên tập viên chỉ ghép / sắp xếp khi ĐỀ đang nháp hoặc cần chỉnh sửa (như exam_questions).
create policy "staff_read_all" on public.exam_set_items
  for select to authenticated using (public.current_staff_role() is not null);
create policy "reviewer_admin_manage" on public.exam_set_items
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));
create policy "editor_manage_editable" on public.exam_set_items
  for all to authenticated
  using (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.exam_sets s where s.id = set_id and s.workflow_status in ('draft', 'needs_revision'))
  )
  with check (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.exam_sets s where s.id = set_id and s.workflow_status in ('draft', 'needs_revision'))
  );

commit;

-- Kiểm tra sau khi chạy:
--   select tablename, rowsecurity from pg_tables where schemaname = 'public'
--    and tablename in ('exam_passages', 'exam_items', 'exam_set_items');                  → 3 dòng, true
--   select count(*) from pg_policies where schemaname = 'public'
--    and tablename in ('exam_passages', 'exam_items', 'exam_set_items');                  → 9
--   select has_table_privilege('anon', 'public.exam_items', 'select'),
--          has_table_privilege('authenticated', 'public.exam_items', 'select');            → false, true (RLS lọc nhân sự)
--   select (select count(*) from public.exam_questions) as cu, (select count(*) from public.exam_items) as moi,
--          (select count(*) from public.exam_set_items) as trong_de;                       → ba số bằng nhau
--   select slug, format, published_at is not null from public.exam_sets where slug in ('de-1', 'de-2'); → mini, true
--   Rồi chạy supabase/tests/exam_bank.sql (tự hoàn tác).
