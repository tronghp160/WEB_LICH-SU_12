import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { NewPasswordForm } from "@/components/account/NewPasswordForm";
import { hasRecoveryMark } from "@/lib/auth/cookies";
import { FORGOT_PASSWORD } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Đặt mật khẩu mới", robots: { index: false, follow: false } };

/** Chỉ mở được ngay sau khi bấm link đặt lại mật khẩu trong email (/auth/confirm đánh dấu phiên, 15 phút). */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const allowed = Boolean(data.user && (await hasRecoveryMark(data.user.id)));

  return (
    <AccountShell title="Đặt mật khẩu mới">
      {allowed ? (
        <NewPasswordForm />
      ) : (
        <div id="dat-lai-het-han" className="flex flex-col gap-3 text-sm text-foreground">
          <p>Link đặt lại mật khẩu đã hết hạn hoặc đã được dùng.</p>
          <p>
            <Link href={FORGOT_PASSWORD} className="font-medium text-accent underline">
              Yêu cầu link mới
            </Link>
          </p>
        </div>
      )}
    </AccountShell>
  );
}
