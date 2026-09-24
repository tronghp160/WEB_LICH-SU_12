"use client";

import { Dices, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { Field, FormMessage, valueReader } from "@/components/admin/forms/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createStaffAction } from "@/lib/actions/staff";
import { initialActionState } from "@/lib/actions/state";
import { staffRoleLabels } from "@/lib/utils/labels";

/** Sinh mật khẩu tạm 12 ký tự gồm chữ hoa, chữ thường và số (không có ký tự dễ nhầm như 0/O, 1/l/I). */
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (chars: string) => chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];
  const chars = [pick(upper), pick(lower), pick(digits), ...Array.from({ length: 9 }, () => pick(all))];
  // Xáo trộn (Fisher–Yates) để ký tự bắt buộc không luôn nằm đầu chuỗi.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Form tạo tài khoản nhân sự (UC13). Mật khẩu KHÔNG bao giờ được server trả lại form; người tạo nhớ/gửi cho người dùng. */
export function CreateStaffForm({ disabledReason }: { disabledReason: string | null }) {
  const [state, formAction, pending] = useActionState(createStaffAction, initialActionState);
  const value = valueReader(state, {});
  const errors = state.fieldErrors ?? {};
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} noValidate className="flex max-w-xl flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-surface-foreground">
        <UserPlus className="h-5 w-5 text-gold-deep" aria-hidden="true" />
        Tạo nhân sự mới
      </h2>

      {disabledReason && (
        <p role="note" className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-900 dark:text-orange-200">
          {disabledReason}
        </p>
      )}
      <FormMessage state={state} />

      <fieldset disabled={Boolean(disabledReason)} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Field name="full_name" label="Họ tên" required error={errors.full_name}>
          {(props) => <Input {...props} defaultValue={value("full_name")} maxLength={100} />}
        </Field>
        <Field name="email" label="Email đăng nhập" required error={errors.email}>
          {(props) => <Input {...props} type="email" autoComplete="off" defaultValue={value("email")} />}
        </Field>
        <Field name="role" label="Vai trò" required error={errors.role}>
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
        <Field
          name="password"
          label="Mật khẩu tạm"
          required
          error={errors.password}
          hint="Tối thiểu 8 ký tự, gồm chữ và số. Hiển thị để bạn sao chép gửi cho người dùng — họ nên đổi sau khi đăng nhập."
        >
          {(props) => (
            <div className="flex gap-2">
              <Input {...props} autoComplete="off" spellCheck={false} value={password} onChange={(event) => setPassword(event.target.value)} />
              <Button type="button" variant="secondary" onClick={() => setPassword(generatePassword())} aria-label="Tạo mật khẩu ngẫu nhiên">
                <Dices className="h-4 w-4" aria-hidden="true" />
                Ngẫu nhiên
              </Button>
            </div>
          )}
        </Field>
      </fieldset>

      <div>
        <Button type="submit" disabled={pending || Boolean(disabledReason)}>
          {pending ? "Đang tạo…" : "Tạo tài khoản"}
        </Button>
      </div>
    </form>
  );
}
