"use client";

import { useActionState, useEffect } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { updateProfileAction, type ProfileState } from "@/lib/actions/account";
import { SESSION_REFRESH_EVENT } from "@/lib/hooks/useSession";

/** Sửa tên hiển thị + trường. Lưu xong báo Header đọc lại tên. */
export function ProfileForm({ displayName, school }: { displayName: string; school: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "saved") window.dispatchEvent(new Event(SESSION_REFRESH_EVENT));
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <FormError id="ho-so-loi" message={state.error} />
      {state.status === "saved" && (
        <p id="ho-so-da-luu" role="status" className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground">
          Đã lưu hồ sơ.
        </p>
      )}
      <AccountField
        id="displayName"
        name="displayName"
        label="Tên hiển thị"
        autoComplete="nickname"
        defaultValue={state.values?.displayName ?? displayName}
        maxLength={60}
        required
        hint="Tên hiện trên Hộ chiếu học tập. Không cần họ tên đầy đủ."
        error={errors.displayName}
      />
      <AccountField
        id="school"
        name="school"
        label="Trường (không bắt buộc)"
        autoComplete="organization"
        defaultValue={state.values?.school ?? school}
        maxLength={120}
        error={errors.school}
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu hồ sơ"}
        </Button>
      </div>
    </form>
  );
}
