-- Sửa lỗi GĐ4 (migration 20261027000000_exam_practice.sql): hàm exam_grade_attempt làm rỗng bảng tạm bằng
-- `delete from pg_temp.exam_graded;` — Supabase bật tiện ích pg_safeupdate cho các kết nối qua API (PostgREST), nên mọi
-- DELETE không có WHERE bị chặn ("DELETE requires a WHERE clause", mã 21000) → NỘP BÀI THI và kết thúc luyện tập đều lỗi.
-- Chỉ thay thân hàm (thêm `where true`), giữ nguyên chữ ký và quyền (revoke ở migration trước vẫn áp dụng).
-- Chạy một lần trong SQL Editor.

begin;

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
  -- Supabase bật pg_safeupdate cho kết nối qua API: DELETE phải có WHERE.
  delete from pg_temp.exam_graded where true;
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

revoke all on function public.exam_grade_attempt(uuid) from public, anon, authenticated;

commit;

-- Kiểm tra sau khi chạy (thay giá trị thật nếu muốn thử tay): nộp một bài trên web phải ra điểm, không còn lỗi 21000.
