"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { signUpAction, type SignUpState } from "@/lib/actions/account";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/auth/routes";

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
      <div className="flex flex-col gap-1.5">
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="agree"
            aria-invalid={errors.agree ? true : undefined}
            aria-describedby={errors.agree ? "agree-loi" : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            Em đã đọc và đồng ý{" "}
            <Link href={TERMS_PATH} target="_blank" className="text-accent underline">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href={PRIVACY_PATH} target="_blank" className="text-accent underline">
              Chính sách bảo mật
            </Link>
            .
          </span>
        </label>
        {errors.agree && (
          <p id="agree-loi" className="text-sm text-accent">
            {errors.agree}
          </p>
        )}
        <p className="text-xs text-muted-foreground">Nếu em dưới 16 tuổi, hãy nhờ bố mẹ đồng ý trước khi tạo tài khoản.</p>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
