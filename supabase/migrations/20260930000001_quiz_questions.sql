-- Giai đoạn 4 (KE_HOACH_CAI_TIEN_WEB_LICH_SU_12.md, mục 4.1): câu hỏi trắc nghiệm SOẠN TAY.
--
-- Trang trắc nghiệm dùng hai loại câu hỏi:
--   1. Câu TỰ SINH từ dữ liệu đã duyệt (ảnh → sự kiện, năm, địa điểm…) — sinh trong code (lib/quiz), không cần bảng.
--   2. Câu SOẠN TAY có giải thích — lưu ở bảng này.
--
-- Mỗi câu hỏi thuộc về MỘT sự kiện và được duyệt CÙNG sự kiện đó (giống ảnh, nguồn, nhân vật gắn với sự kiện):
-- khách chỉ thấy câu hỏi của sự kiện đã công bố; editor chỉ sửa khi sự kiện đang draft/needs_revision.
-- RLS theo đúng mẫu các bảng liên kết (migration 20260925000002).
--
-- Ràng buộc: đúng 4 đáp án, không trống, không trùng nhau; ảnh kèm câu hỏi (nếu có) phải là ảnh của CHÍNH sự kiện đó
-- (để ảnh luôn đi qua cùng quy trình duyệt và hiện được ghi công).
-- Không xóa dữ liệu nào.

begin;

create table public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.historical_events(id) on delete cascade,
  question      text not null constraint quiz_questions_question_check check (char_length(btrim(question)) between 5 and 300),
  choices       text[] not null constraint quiz_questions_choices_check check (cardinality(choices) = 4),
  correct_index smallint not null constraint quiz_questions_correct_check check (correct_index between 0 and 3),
  explanation   text not null constraint quiz_questions_explanation_check check (char_length(btrim(explanation)) between 5 and 1000),
  media_id      uuid references public.media_assets(id) on delete set null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_quiz_questions_event on public.quiz_questions (event_id, sort_order);

create trigger trg_quiz_questions_updated_at
  before update on public.quiz_questions
  for each row execute function public.set_updated_at();

-- Đáp án không trống, không trùng (không viết được bằng CHECK vì cần duyệt mảng); ảnh phải thuộc cùng sự kiện.
create or replace function public.quiz_question_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.choices) as c where c is null or btrim(c) = '' or char_length(c) > 200) then
    raise exception 'Mỗi đáp án phải có nội dung (tối đa 200 ký tự).';
  end if;
  if (select count(distinct lower(btrim(c))) from unnest(new.choices) as c) <> 4 then
    raise exception 'Bốn đáp án không được trùng nhau.';
  end if;
  if new.media_id is not null and not exists (
    select 1 from public.media_assets m where m.id = new.media_id and m.event_id = new.event_id
  ) then
    raise exception 'Ảnh của câu hỏi phải là ảnh của chính sự kiện này.';
  end if;
  return new;
end;
$$;

create trigger trg_quiz_question_integrity
  before insert or update on public.quiz_questions
  for each row execute function public.quiz_question_integrity();

alter table public.quiz_questions enable row level security;

create policy "public_read_published" on public.quiz_questions
  for select to anon, authenticated
  using (exists (select 1 from public.historical_events e where e.id = event_id and e.workflow_status = 'published'));

create policy "staff_read_all" on public.quiz_questions
  for select to authenticated
  using (public.current_staff_role() is not null);

create policy "reviewer_admin_manage" on public.quiz_questions
  for all to authenticated
  using (public.current_staff_role() in ('reviewer', 'system_admin'))
  with check (public.current_staff_role() in ('reviewer', 'system_admin'));

create policy "editor_manage_editable" on public.quiz_questions
  for all to authenticated
  using (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.historical_events e where e.id = event_id and e.workflow_status in ('draft', 'needs_revision'))
  )
  with check (
    public.current_staff_role() = 'editor'
    and exists (select 1 from public.historical_events e where e.id = event_id and e.workflow_status in ('draft', 'needs_revision'))
  );

grant select on public.quiz_questions to anon, authenticated;
grant insert, update, delete on public.quiz_questions to authenticated;

commit;

-- Kiểm tra sau khi chạy:
--   select policyname from pg_policies where schemaname = 'public' and tablename = 'quiz_questions' order by 1;
--     → editor_manage_editable, public_read_published, reviewer_admin_manage, staff_read_all
--   select tgname from pg_trigger where tgrelid = 'public.quiz_questions'::regclass and not tgisinternal order by 1;
--     → trg_quiz_question_integrity, trg_quiz_questions_updated_at
