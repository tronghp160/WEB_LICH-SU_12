-- Luyện thi — GĐ8: in đề + phiếu trả lời giấy (docs/ke-hoach-luyen-thi.md, mục 4.9).
--
-- Chỉ THÊM một hàm: `start_paper_attempt` — tạo lượt chế độ `paper` (không bấm giờ) cho một đề người gọi được làm (cùng
-- quyền như làm online: đề miễn phí, hoặc gói của tài khoản / mã trên máy). Trang in hiện câu hỏi của lượt (thứ tự lựa
-- chọn đúng như sẽ chấm), KHÔNG có đáp án; làm xong trên giấy thì nhập đáp án vào lượt đó và nộp như bài thi thường
-- (save_attempt_answers / submit_exam_attempt đã chấm được lượt paper). Đang có lượt in chưa nộp của cùng đề → trả lượt đó.
-- Lượt in không dùng exam_open_attempt (chỉ lượt `exam`) nên không lẫn với bài làm online.
-- Chạy một lần; kiểm thử: supabase/tests/exam_paper.sql (tự hoàn tác).

begin;

create or replace function public.start_paper_attempt(p_slug text, p_code text, p_device_hash text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  access jsonb;
  a public.exam_attempts%rowtype;
begin
  if p_user_id is null and coalesce(p_device_hash, '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_device');
  end if;
  access := public.exam_access(p_slug, p_code, p_device_hash, p_user_id);
  if (access ->> 'ok')::boolean is not true then
    return access;
  end if;

  select x.* into a from public.exam_attempts x
   where x.set_id = (access ->> 'set_id')::uuid and x.mode = 'paper' and x.status = 'in_progress'
     and public.exam_attempt_owner_ok(x, p_user_id, p_device_hash)
   order by x.started_at desc limit 1;
  if a.id is null then
    insert into public.exam_attempts (user_id, license_id, device_hash, set_id, mode, item_ids, sections, choice_shifts, deadline_at)
    select p_user_id, (access ->> 'license_id')::uuid, nullif(p_device_hash, ''), (access ->> 'set_id')::uuid, 'paper',
           array_agg(si.item_id order by si.section, si.position),
           array_agg(si.section order by si.section, si.position),
           array_agg(si.choice_shift order by si.section, si.position),
           null
      from public.exam_set_items si
      join public.exam_items i on i.id = si.item_id and i.workflow_status = 'published'
     where si.set_id = (access ->> 'set_id')::uuid
    having count(*) > 0
    returning * into a;
    if a.id is null then
      return jsonb_build_object('ok', false, 'reason', 'empty');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'access', access ->> 'access') || public.exam_attempt_view(a, false);
end;
$$;

revoke all on function public.start_paper_attempt(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.start_paper_attempt(text, text, text, uuid) to service_role;

commit;

-- Kiểm tra sau khi chạy:
--   select has_function_privilege('authenticated', 'public.start_paper_attempt(text, text, text, uuid)', 'execute'),
--          has_function_privilege('service_role', 'public.start_paper_attempt(text, text, text, uuid)', 'execute');  → false, true
