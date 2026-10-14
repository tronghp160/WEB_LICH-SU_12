import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { CompleteSignUpForm } from "@/components/account/CompleteSignUpForm";
import { Button } from "@/components/ui/Button";
import { signOutLearnerAction } from "@/lib/actions/account";
import { getLearner } from "@/lib/auth/learner";
import { loginPath, safeNext } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Hoàn tất đăng ký", robots: { index: false, follow: false } };

/**
 * Bước cuối khi vào lần đầu bằng Google (docs/ke-hoach-tai-khoan.md, mục 6.1 và 11): Google đã xác minh email, chỉ còn
 * đồng ý điều khoản và chọn tên hiển thị. Chưa đăng nhập → /dang-nhap; đã có hồ sơ → đi tiếp.
 */
export default async function CompleteSignUpPage({ searchParams }: PageProps<"/dang-ky/hoan-tat">) {
  const next = safeNext((await searchParams).next);
  const learner = await getLearner();
  if (!learner) redirect(loginPath(next));
  if (learner.profile) redirect(next);

  return (
    <AccountShell
      title="Hoàn tất đăng ký"
      intro={
        <>
          Em đang đăng nhập bằng <span className="break-all font-medium text-foreground">{learner.email}</span>. Còn một bước
          nữa là xong.
        </>
      }
      footer={
        <form action={signOutLearnerAction}>
          Không muốn tạo tài khoản?{" "}
          <Button type="submit" variant="link">
            Đăng xuất
          </Button>
        </form>
      }
    >
      <CompleteSignUpForm next={next} suggestedName={learner.suggestedName} />
    </AccountShell>
  );
}
