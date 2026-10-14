import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { signOutLearnerAction } from "@/lib/actions/account";
import { ADMIN_HOME } from "@/lib/admin/routes";
import { requireLearner } from "@/lib/auth/learner";
import { ACCOUNT_HOME } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Tài khoản của em", robots: { index: false, follow: false } };

const NOTICES: Record<string, string> = {
  "xac-nhan": "Đã xác nhận email. Chào mừng em!",
  "doi-mat-khau": "Đã đặt mật khẩu mới. Các máy khác đã được đăng xuất.",
  "doi-email": "Đã xác nhận email mới.",
};

/**
 * Tài khoản học sinh — bản tối thiểu của giai đoạn B2 (hồ sơ, đăng xuất). Tiến độ, gói luyện thi, đơn hàng, bảo mật
 * thêm ở B4–B6 (docs/ke-hoach-tai-khoan.md, mục 13).
 */
export default async function AccountPage({ searchParams }: PageProps<"/tai-khoan">) {
  const learner = await requireLearner(ACCOUNT_HOME);
  const notice = (await searchParams)["thong-bao"];
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;
  const name = learner.profile?.display_name ?? learner.email;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6">
      {message && (
        <p id="tai-khoan-thong-bao" role="status" className="mb-6 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}
      <h1 className="font-serif text-3xl font-bold text-foreground">Tài khoản của em</h1>
      <section aria-labelledby="ho-so" className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 id="ho-so" className="sr-only">
          Hồ sơ
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Tên hiển thị</dt>
          <dd className="font-semibold text-foreground" data-testid="account-name">
            {name}
          </dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all text-foreground" data-testid="account-email">
            {learner.email}
          </dd>
        </dl>
        {learner.isStaff && (
          <p className="mt-4 text-sm">
            Em cũng là nhân sự của trang.{" "}
            <Link href={ADMIN_HOME} className="text-accent underline">
              Vào khu quản trị
            </Link>
          </p>
        )}
        <form action={signOutLearnerAction} className="mt-6">
          <Button type="submit" variant="secondary">
            Đăng xuất
          </Button>
        </form>
      </section>
    </div>
  );
}
