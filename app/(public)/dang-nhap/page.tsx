import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { SignInForm } from "@/components/account/SignInForm";
import { getLearner } from "@/lib/auth/learner";
import { safeNext, signUpPath } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập để lưu tiến độ học và gói luyện thi vào tài khoản.",
  robots: { index: false, follow: true },
};

/** Đăng nhập học sinh. Đã đăng nhập thì chuyển thẳng tới trang cần đến (`next`, chỉ nhận đường dẫn nội bộ). */
export default async function SignInPage({ searchParams }: PageProps<"/dang-nhap">) {
  const next = safeNext((await searchParams).next);
  if (await getLearner()) redirect(next);

  return (
    <AccountShell
      title="Đăng nhập"
      intro="Đăng nhập để tiến độ học và gói luyện thi đi theo em trên mọi máy."
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link href={signUpPath(next)} className="font-medium text-accent underline-offset-4 hover:underline">
            Đăng ký
          </Link>
        </>
      }
    >
      <SignInForm next={next} />
    </AccountShell>
  );
}
