import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { FORGOT_PASSWORD, LEARNER_LOGIN, LEARNER_SIGNUP } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Không mở được link", robots: { index: false, follow: false } };

type Reason = { title: string; message: string; google?: boolean };

const REASONS: Record<string, Reason> = {
  "het-han": {
    title: "Không mở được link",
    message: "Link đã hết hạn hoặc đã được dùng. Mỗi link trong email chỉ dùng được một lần.",
  },
  "khong-hop-le": {
    title: "Không mở được link",
    message: "Link không hợp lệ. Có thể em đã chép thiếu một phần của link.",
  },
  // Luồng Google (app/auth/callback/route.ts, lib/auth/oauth.ts).
  "google-huy": {
    title: "Chưa đăng nhập bằng Google",
    message: "Em đã hủy ở màn hình của Google. Em có thể thử lại, hoặc dùng email và mật khẩu.",
    google: true,
  },
  "google-het-han": {
    title: "Chưa đăng nhập bằng Google",
    message:
      "Phiên đăng nhập Google đã hết hạn, hoặc được mở ở một trình duyệt khác. Em bấm “Tiếp tục với Google” lại trên cùng trình duyệt nhé.",
    google: true,
  },
  "google-loi": {
    title: "Chưa đăng nhập bằng Google",
    message: "Không đăng nhập được bằng Google. Em thử lại sau ít phút, hoặc dùng email và mật khẩu.",
    google: true,
  },
};

/** Trang lỗi chung của các link xác nhận / đặt lại mật khẩu và của đăng nhập Google. */
export default async function AuthErrorPage({ searchParams }: PageProps<"/auth/loi">) {
  const key = (await searchParams)["ly-do"];
  const reason = (typeof key === "string" && REASONS[key]) || REASONS["khong-hop-le"];

  return (
    <AccountShell title={reason.title}>
      <div className="flex flex-col gap-4 text-sm text-foreground">
        <p id="auth-loi">{reason.message}</p>
        {reason.google ? (
          <ul className="flex flex-col gap-2">
            <li>
              <Link href={LEARNER_LOGIN} className="text-accent underline">
                Quay lại trang đăng nhập
              </Link>
            </li>
            <li>
              Chưa có tài khoản?{" "}
              <Link href={LEARNER_SIGNUP} className="text-accent underline">
                Đăng ký
              </Link>
            </li>
          </ul>
        ) : (
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
        )}
      </div>
    </AccountShell>
  );
}
