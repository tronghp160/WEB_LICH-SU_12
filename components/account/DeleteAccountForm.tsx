"use client";

import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { deleteAccountAction, type DeleteAccountState } from "@/lib/actions/account";

/** Xóa tài khoản: gõ lại email để xác nhận (mục 10). Nút đỏ chỉ là `secondary` viền đỏ — mỗi màn hình một nút primary. */
export function DeleteAccountForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<DeleteAccountState, FormData>(deleteAccountAction, {});

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormError id="xoa-tai-khoan-loi" message={state.error} />
      <AccountField
        id="confirmEmail"
        name="confirmEmail"
        type="email"
        label={`Gõ “${email}” để xác nhận`}
        autoComplete="off"
        spellCheck={false}
        maxLength={254}
        required
        error={state.fieldError}
      />
      <div>
        <Button type="submit" variant="secondary" disabled={pending} className="border-accent! text-accent! hover:bg-accent/10!">
          {pending ? "Đang xóa…" : "Xóa vĩnh viễn tài khoản"}
        </Button>
      </div>
    </form>
  );
}
