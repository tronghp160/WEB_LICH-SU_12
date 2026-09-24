"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initialState: SignInState = {};

/** Form đăng nhập nhân sự (UC06). Lỗi hiển thị tiếng Việt; email được giữ lại khi lỗi, mật khẩu thì không. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
        {state.fieldErrors?.email && (
          <p id="email-error" className="text-sm text-accent">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Mật khẩu
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
        {state.fieldErrors?.password && (
          <p id="password-error" className="text-sm text-accent">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}
