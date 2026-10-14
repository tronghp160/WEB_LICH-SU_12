"use client";

import { useActionState } from "react";
import { FormError } from "@/components/account/AccountField";
import { Button } from "@/components/ui/Button";
import { linkGoogleAction, unlinkGoogleAction, type IdentityState } from "@/lib/actions/account";
import type { LoginMethods } from "@/lib/auth/identities";

type LinkedProvidersProps = {
  methods: LoginMethods;
  /** Google đã bật trong Supabase (isGoogleAuthEnabled) — chưa bật thì không mời liên kết. */
  googleEnabled: boolean;
};

/** Các cách đăng nhập: Email + mật khẩu, Google (liên kết / gỡ). */
export function LinkedProviders({ methods, googleEnabled }: LinkedProvidersProps) {
  const [linkState, linkAction, linking] = useActionState<IdentityState>(linkGoogleAction, {});
  const [unlinkState, unlinkAction, unlinking] = useActionState<IdentityState>(unlinkGoogleAction, {});

  return (
    <div className="flex flex-col gap-3">
      <FormError id="lien-ket-loi" message={linkState.error ?? unlinkState.error} />
      <ul className="divide-y divide-border rounded-lg border border-border">
        <li className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div>
            <p className="font-medium text-foreground">Email + mật khẩu</p>
            <p className="text-sm text-muted-foreground" data-testid="phuong-thuc-mat-khau">
              {methods.password ? "Đang dùng" : "Chưa đặt mật khẩu — đặt ở mục Mật khẩu bên trên."}
            </p>
          </div>
        </li>
        <li className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div>
            <p className="font-medium text-foreground">Google</p>
            <p className="text-sm text-muted-foreground" data-testid="phuong-thuc-google">
              {methods.google
                ? methods.canUnlinkGoogle
                  ? "Đã liên kết"
                  : "Đã liên kết — đây là cách đăng nhập chính nên chưa gỡ được."
                : googleEnabled
                  ? "Chưa liên kết. Liên kết để vào bằng một lần bấm."
                  : "Chưa liên kết."}
            </p>
          </div>
          {methods.google
            ? methods.canUnlinkGoogle && (
                <form action={unlinkAction}>
                  <Button type="submit" variant="secondary" size="sm" disabled={unlinking}>
                    {unlinking ? "Đang gỡ…" : "Gỡ Google"}
                  </Button>
                </form>
              )
            : googleEnabled && (
                <form action={linkAction}>
                  <Button type="submit" variant="secondary" size="sm" disabled={linking}>
                    {linking ? "Đang mở Google…" : "Liên kết Google"}
                  </Button>
                </form>
              )}
        </li>
      </ul>
    </div>
  );
}
