"use client";

import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { updatePasswordAction, type NewPasswordState } from "@/lib/actions/account";

const initial: NewPasswordState = {};

/** Đặt mật khẩu mới (sau khi bấm link đặt lại trong email). */
export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initial);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormError id="dat-lai-loi" message={state.error} />
      <AccountField
        id="password"
        name="password"
        type="password"
        label="Mật khẩu mới"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        hint="Ít nhất 8 ký tự, gồm cả chữ và số."
        error={state.fieldErrors?.password}
      />
      <AccountField
        id="confirm"
        name="confirm"
        type="password"
        label="Nhập lại mật khẩu mới"
        autoComplete="new-password"
        maxLength={72}
        required
        error={state.fieldErrors?.confirm}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </Button>
    </form>
  );
}
