import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { SignUpForm } from "@/components/account/SignUpForm";
import { getLearner } from "@/lib/auth/learner";
import { loginPath, safeNext } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
  description: "Tạo tài khoản học sinh miễn phí để lưu tiến độ học trên mọi máy.",
  robots: { index: false, follow: true },
};

export default async function SignUpPage({ searchParams }: PageProps<"/dang-ky">) {
  const next = safeNext((await searchParams).next);
  if (await getLearner()) redirect(next);

  return (
    <AccountShell
      title="Đăng ký tài khoản"
      intro="Miễn phí. Không đăng ký em vẫn học được mọi bài; tài khoản giúp lưu tiến độ và gói luyện thi trên mọi máy."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link href={loginPath(next)} className="font-medium text-accent underline-offset-4 hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <SignUpForm next={next} />
    </AccountShell>
  );
}
