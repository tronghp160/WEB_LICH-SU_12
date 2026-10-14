"use client";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";
import { Field, FormMessage, valueReader } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { grantExistingStaffAction } from "@/lib/actions/staff";
import { initialActionState } from "@/lib/actions/state";
import { staffRoleLabels } from "@/lib/utils/labels";

/**
 * Cấp quyền nhân sự cho tài khoản đã có (docs/ke-hoach-tai-khoan.md, mục 7.4) — ví dụ giáo viên đã đăng ký làm học sinh
 * nên "Tạo nhân sự mới" báo trùng email. Không tạo mật khẩu: người đó giữ cách đăng nhập của mình (mật khẩu / Google).
 */
export function GrantExistingStaffForm({ disabledReason }: { disabledReason: string | null }) {
  const [state, formAction, pending] = useActionState(grantExistingStaffAction, initialActionState);
  const value = valueReader(state, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="flex max-w-xl flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-surface-foreground">
        <KeyRound className="h-5 w-5 text-gold-deep" aria-hidden="true" />
        Cấp quyền cho tài khoản đã có
      </h2>
      <p className="text-sm text-muted-foreground">
        Dùng khi người đó đã có tài khoản trên trang (vd. đã đăng ký làm học sinh). Không đặt lại mật khẩu, không đổi gì ở tài
        khoản của họ.
      </p>

      {disabledReason && (
        <p role="note" className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-900 dark:text-orange-200">
          {disabledReason}
        </p>
      )}
      <FormMessage state={state} />

      <fieldset disabled={Boolean(disabledReason)} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Field idPrefix="grant" name="email" label="Email của tài khoản" required error={errors.email}>
          {(props) => <Input {...props} type="email" autoComplete="off" defaultValue={value("email")} />}
        </Field>
        <Field idPrefix="grant" name="full_name" label="Họ tên (hiện trong khu quản trị)" required error={errors.full_name}>
          {(props) => <Input {...props} defaultValue={value("full_name")} maxLength={100} />}
        </Field>
        <Field idPrefix="grant" name="role" label="Vai trò được cấp" required error={errors.role}>
          {(props) => (
            <Select key={value("role")} {...props} defaultValue={value("role")}>
              <option value="">— Chọn vai trò —</option>
              {Object.entries(staffRoleLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </fieldset>

      <div>
        <Button type="submit" variant="secondary" disabled={pending || Boolean(disabledReason)}>
          {pending ? "Đang cấp quyền…" : "Cấp quyền"}
        </Button>
      </div>
    </form>
  );
}
