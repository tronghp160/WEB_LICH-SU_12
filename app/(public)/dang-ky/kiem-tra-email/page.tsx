import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { ResendConfirmationForm } from "@/components/account/ResendConfirmationForm";
import { readSignUpEmail } from "@/lib/auth/cookies";
import { loginPath, safeNext } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Kiểm tra email", robots: { index: false, follow: false } };

/**
 * Sau khi đăng ký. Thông báo giống nhau dù email đã có tài khoản hay chưa (không lộ email). Email lấy từ cookie ngắn hạn
 * của chính trình duyệt này, không nằm trên URL.
 */
export default async function CheckEmailPage({ searchParams }: PageProps<"/dang-ky/kiem-tra-email">) {
  const next = safeNext((await searchParams).next);
  const email = await readSignUpEmail();

  return (
    <AccountShell
      title="Kiểm tra email của em"
      footer={
        <Link href={loginPath(next)} className="font-medium text-accent underline-offset-4 hover:underline">
          Đã xác nhận? Đăng nhập
        </Link>
      }
    >
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground" id="kiem-tra-email">
        <p>
          Hệ thống đã gửi email xác nhận tới{" "}
          {email ? <strong className="break-all">{email}</strong> : "địa chỉ em vừa nhập"}. Em mở email và bấm{" "}
          <strong>Xác nhận email</strong> để hoàn tất. Có thể mở trên điện thoại cũng được.
        </p>
        <p className="text-muted-foreground">
          Không thấy email sau vài phút? Xem thư mục Spam / Quảng cáo, hoặc gửi lại. Nếu email này đã có tài khoản, em
          đăng nhập luôn hoặc dùng “Quên mật khẩu”.
        </p>
        {email && <ResendConfirmationForm next={next} />}
      </div>
    </AccountShell>
  );
}
