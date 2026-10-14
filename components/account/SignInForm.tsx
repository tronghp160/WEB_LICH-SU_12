"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { ResendConfirmationForm } from "@/components/account/ResendConfirmationForm";
import { Button } from "@/components/ui/Button";
import { signInLearnerAction, type LearnerSignInState } from "@/lib/actions/account";
import { FORGOT_PASSWORD } from "@/lib/auth/routes";

const initial: LearnerSignInState = {};

/** Đăng nhập học sinh bằng email + mật khẩu. Email giữ lại khi lỗi, mật khẩu thì không. */
export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInLearnerAction, initial);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <FormError id="dang-nhap-loi" message={state.error} />
        <AccountField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          defaultValue={state.email}
          maxLength={254}
          required
          error={state.fieldErrors?.email}
        />
        <AccountField
          id="password"
          name="password"
          type="password"
          label="Mật khẩu"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
        <p className="-mt-2 text-right text-sm">
          <Link href={FORGOT_PASSWORD} className="text-accent underline-offset-4 hover:underline">
            Quên mật khẩu?
          </Link>
        </p>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </form>
      {state.needsConfirmation && state.email && <ResendConfirmationForm email={state.email} next={next} />}
    </div>
  );
}
