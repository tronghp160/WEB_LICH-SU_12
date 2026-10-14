"use client";

import { useActionState } from "react";
import { AccountField } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { requestPasswordResetAction, type ResetRequestState } from "@/lib/actions/account";

const initial: ResetRequestState = { status: "idle" };

/** Nhập email để nhận link đặt lại mật khẩu. Kết quả luôn giống nhau dù email có tài khoản hay không. */
export function ResetRequestForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initial);

  if (state.status === "sent") {
    return (
      <p id="quen-mat-khau-da-gui" role="status" className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-foreground">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <AccountField
        id="email"
        name="email"
        type="email"
        label="Email đã đăng ký"
        autoComplete="email"
        defaultValue={state.email}
        maxLength={254}
        required
        error={state.fieldError ?? (state.status === "error" ? state.message : undefined)}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}
      </Button>
    </form>
  );
}
