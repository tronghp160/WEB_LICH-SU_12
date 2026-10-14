"use client";

import { useActionState } from "react";
import { AccountField, FormError } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { claimLicenseAction, type ClaimLicenseState } from "@/lib/actions/account";

type ClaimLicenseFormProps = {
  /** Mã có sẵn (trang kết quả / kích hoạt) → chỉ hiện nút "Lưu vào tài khoản". */
  presetCode?: string;
  /** Trang quay lại nếu phiên hết hạn giữa chừng. */
  next?: string;
};

/**
 * "Thêm mã đã mua vào tài khoản" (docs/ke-hoach-tai-khoan.md, mục 7.2). Nhãn ô cố ý KHÔNG chứa chữ "Mã kích hoạt" — ô
 * kích hoạt trên máy (ActivateLicenseForm) có thể nằm cùng trang.
 */
export function ClaimLicenseForm({ presetCode, next }: ClaimLicenseFormProps) {
  const [state, formAction, pending] = useActionState<ClaimLicenseState, FormData>(claimLicenseAction, {});
  const done = state.status === "claimed" || state.status === "already";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      {presetCode ? (
        <input type="hidden" name="code" value={presetCode} />
      ) : (
        <AccountField
          id="claim-code"
          name="code"
          label="Mã đã mua"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          placeholder="LT12-XXXX-XXXX-XXXX"
          defaultValue={state.error ? state.code : ""}
          required
        />
      )}
      <FormError id="them-ma-loi" message={state.error} />
      {done && (
        <p id="them-ma-xong" role="status" className="rounded-lg border border-success bg-success/10 px-3 py-2 text-sm text-foreground">
          {state.message}
        </p>
      )}
      {!(presetCode && done) && (
        <div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Đang lưu…" : presetCode ? "Lưu mã vào tài khoản" : "Thêm mã vào tài khoản"}
          </Button>
        </div>
      )}
    </form>
  );
}
