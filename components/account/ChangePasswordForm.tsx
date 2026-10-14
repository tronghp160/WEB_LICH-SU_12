"use client";

import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { changePasswordAction, type ChangePasswordState } from "@/lib/actions/account";

/**
 * Đổi mật khẩu (`hasPassword`: phải nhập mật khẩu hiện tại) hoặc đặt mật khẩu lần đầu cho tài khoản chỉ có Google.
 * Ô email ẩn giúp trình quản lý mật khẩu biết mật khẩu mới thuộc tài khoản nào.
 */
export function ChangePasswordForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <FormError id="mat-khau-loi" message={state.error} />
      {state.status === "saved" && (
        <p id="mat-khau-da-luu" role="status" className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground">
          {state.message}
        </p>
      )}
      {hasPassword && (
        <AccountField
          id="current"
          name="current"
          type="password"
          label="Mật khẩu hiện tại"
          autoComplete="current-password"
          maxLength={200}
          required
          error={errors.current}
        />
      )}
      <AccountField
        id="password"
        name="password"
        type="password"
        label={hasPassword ? "Mật khẩu mới" : "Mật khẩu"}
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        hint="Ít nhất 8 ký tự, gồm cả chữ và số."
        error={errors.password}
      />
      <AccountField
        id="confirm"
        name="confirm"
        type="password"
        label="Nhập lại mật khẩu"
        autoComplete="new-password"
        maxLength={72}
        required
        error={errors.confirm}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}
        </Button>
      </div>
    </form>
  );
}
