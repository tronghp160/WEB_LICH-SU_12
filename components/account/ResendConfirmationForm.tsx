"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { resendConfirmationAction, type ResendState } from "@/lib/actions/account";

type State = ResendState & { sentAt?: number };

const initial: State = { status: "idle" };
/** Chờ giữa hai lần gửi (Supabase cũng tự giới hạn; đây là để người dùng không bấm liên tục). */
const COOLDOWN_MS = 60_000;

/** Gửi lại rồi ghi thời điểm gửi theo đồng hồ của trình duyệt (để đếm ngược). */
async function resendWithTime(previous: State, formData: FormData): Promise<State> {
  const result = await resendConfirmationAction(previous, formData);
  return result.status === "sent" ? { ...result, sentAt: Date.now() } : result;
}

/** Nút "Gửi lại email xác nhận", khóa 60 giây sau mỗi lần gửi. `email` bỏ trống → server lấy từ cookie đăng ký. */
export function ResendConfirmationForm({ email, next }: { email?: string; next: string }) {
  const [state, formAction, pending] = useActionState(resendWithTime, initial);
  const [now, setNow] = useState(() => Date.now());
  const waiting = state.sentAt !== undefined && now - state.sentAt < COOLDOWN_MS;

  useEffect(() => {
    if (state.sentAt === undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const stop = setTimeout(() => clearInterval(timer), COOLDOWN_MS + 1000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [state.sentAt]);

  const seconds = state.sentAt === undefined ? 0 : Math.min(60, Math.ceil((COOLDOWN_MS - (now - state.sentAt)) / 1000));

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {email && <input type="hidden" name="email" value={email} />}
      <input type="hidden" name="next" value={next} />
      <div>
        <Button type="submit" variant="secondary" disabled={pending || waiting}>
          {pending ? "Đang gửi…" : waiting ? `Gửi lại email xác nhận (${seconds} giây)` : "Gửi lại email xác nhận"}
        </Button>
      </div>
      {state.message && (
        <p id="gui-lai-ket-qua" role="status" className={state.status === "error" ? "text-sm text-accent" : "text-sm text-muted-foreground"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
