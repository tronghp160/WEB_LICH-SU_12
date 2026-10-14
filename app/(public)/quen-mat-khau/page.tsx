import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { ResetRequestForm } from "@/components/account/ResetRequestForm";
import { LEARNER_LOGIN } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false, follow: true } };

export default function ForgotPasswordPage() {
  return (
    <AccountShell
      title="Quên mật khẩu"
      intro="Nhập email đã đăng ký. Em sẽ nhận được link để đặt mật khẩu mới."
      footer={
        <Link href={LEARNER_LOGIN} className="font-medium text-accent underline-offset-4 hover:underline">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      <ResetRequestForm />
    </AccountShell>
  );
}
