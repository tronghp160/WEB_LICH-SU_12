"use client";

import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { AgreeTermsField } from "@/components/account/AgreeTermsField";
import { Button } from "@/components/ui/Button";
import { signUpAction, type SignUpState } from "@/lib/actions/account";

const initial: SignUpState = {};

/** Đăng ký bằng email. Ô đồng ý KHÔNG tích sẵn (docs/ke-hoach-tai-khoan.md, mục 11). */
export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormError id="dang-ky-loi" message={state.error} />
      <AccountField
        id="displayName"
        name="displayName"
        label="Tên hiển thị"
        autoComplete="nickname"
        defaultValue={state.values?.displayName}
        maxLength={60}
        required
        hint="Tên hiện trên Hộ chiếu học tập của em. Không cần họ tên đầy đủ."
        error={errors.displayName}
      />
      <AccountField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={state.values?.email}
        maxLength={254}
        required
        error={errors.email}
      />
      <AccountField
        id="password"
        name="password"
        type="password"
        label="Mật khẩu"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        hint="Ít nhất 8 ký tự, gồm cả chữ và số."
        error={errors.password}
      />
      <AgreeTermsField error={errors.agree} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
