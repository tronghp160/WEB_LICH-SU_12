"use client";

import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { AgreeTermsField } from "@/components/account/AgreeTermsField";
import { Button } from "@/components/ui/Button";
import { completeSignUpAction, type CompleteSignUpState } from "@/lib/actions/account";

const initial: CompleteSignUpState = {};

/** Người vào lần đầu bằng Google: sửa tên hiển thị (gợi ý từ Google) và tự tích ô đồng ý. */
export function CompleteSignUpForm({ next, suggestedName }: { next: string; suggestedName: string }) {
  const [state, formAction, pending] = useActionState(completeSignUpAction, initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormError id="hoan-tat-loi" message={state.error} />
      <AccountField
        id="displayName"
        name="displayName"
        label="Tên hiển thị"
        autoComplete="nickname"
        defaultValue={state.displayName ?? suggestedName}
        maxLength={60}
        required
        hint="Tên hiện trên Hộ chiếu học tập của em. Không cần họ tên đầy đủ."
        error={errors.displayName}
      />
      <AgreeTermsField error={errors.agree} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang lưu…" : "Hoàn tất"}
      </Button>
    </form>
  );
}
