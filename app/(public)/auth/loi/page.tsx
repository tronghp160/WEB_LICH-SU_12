import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { FORGOT_PASSWORD, LEARNER_LOGIN, LEARNER_SIGNUP } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Không mở được link", robots: { index: false, follow: false } };

const REASONS: Record<string, string> = {
  "het-han": "Link đã hết hạn hoặc đã được dùng. Mỗi link trong email chỉ dùng được một lần.",
  "khong-hop-le": "Link không hợp lệ. Có thể em đã chép thiếu một phần của link.",
};

/** Trang lỗi chung của các link xác nhận / đặt lại mật khẩu. */
export default async function AuthErrorPage({ searchParams }: PageProps<"/auth/loi">) {
  const reason = (await searchParams)["ly-do"];
  const message = (typeof reason === "string" && REASONS[reason]) || REASONS["khong-hop-le"];

  return (
    <AccountShell title="Không mở được link">
      <div className="flex flex-col gap-4 text-sm text-foreground">
        <p id="auth-loi">{message}</p>
        <ul className="flex flex-col gap-2">
          <li>
            Xác nhận email: đăng nhập rồi bấm <em>Gửi lại email xác nhận</em> —{" "}
            <Link href={LEARNER_LOGIN} className="text-accent underline">
              Đăng nhập
            </Link>
          </li>
          <li>
            Đặt lại mật khẩu:{" "}
            <Link href={FORGOT_PASSWORD} className="text-accent underline">
              Yêu cầu link mới
            </Link>
          </li>
          <li>
            Chưa có tài khoản?{" "}
            <Link href={LEARNER_SIGNUP} className="text-accent underline">
              Đăng ký
            </Link>
          </li>
        </ul>
      </div>
    </AccountShell>
  );
}
