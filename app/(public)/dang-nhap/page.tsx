import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/AccountShell";
import { GoogleButton, OrDivider } from "@/components/account/GoogleButton";
import { SignInForm } from "@/components/account/SignInForm";
import { getLearner } from "@/lib/auth/learner";
import { isGoogleAuthEnabled } from "@/lib/auth/providers";
import { safeNext, signUpPath } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập để lưu tiến độ học và gói luyện thi vào tài khoản.",
  robots: { index: false, follow: true },
};

const NOTICES: Record<string, string> = {
  "da-xoa-tai-khoan": "Đã xóa tài khoản của em. Cảm ơn em đã học cùng Lịch sử 12.",
  "dang-xuat-moi-may": "Đã đăng xuất trên mọi thiết bị.",
};

/** Đăng nhập học sinh. Đã đăng nhập thì chuyển thẳng tới trang cần đến (`next`, chỉ nhận đường dẫn nội bộ). */
export default async function SignInPage({ searchParams }: PageProps<"/dang-nhap">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getLearner()) redirect(next);
  const google = await isGoogleAuthEnabled();
  const notice = typeof params["thong-bao"] === "string" ? NOTICES[params["thong-bao"]] : undefined;

  return (
    <AccountShell
      title="Đăng nhập"
      intro={
        <>
          {notice && (
            <span id="dang-nhap-thong-bao" role="status" className="mb-3 block rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-foreground">
              {notice}
            </span>
          )}
          Đăng nhập để tiến độ học và gói luyện thi đi theo em trên mọi máy.
        </>
      }
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link href={signUpPath(next)} className="font-medium text-accent underline-offset-4 hover:underline">
            Đăng ký
          </Link>
        </>
      }
    >
      {google && (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      )}
      <SignInForm next={next} />
      {google && (
        <p className="mt-4 text-xs text-muted-foreground">
          Em từng vào bằng Google? Hãy bấm “Tiếp tục với Google” ở trên — tài khoản tạo bằng Google chưa có mật khẩu riêng.
        </p>
      )}
    </AccountShell>
  );
}
