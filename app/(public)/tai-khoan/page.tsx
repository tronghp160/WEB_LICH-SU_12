import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/account/Avatar";
import { OpenSignOutButton } from "@/components/account/OpenSignOutButton";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ADMIN_HOME } from "@/lib/admin/routes";
import { requireLearner } from "@/lib/auth/learner";
import { ACCOUNT_HOME, ACCOUNT_SECURITY } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Tài khoản của em", robots: { index: false, follow: false } };

const NOTICES: Record<string, string> = {
  "xac-nhan": "Đã xác nhận email. Chào mừng em!",
  "doi-mat-khau": "Đã đặt mật khẩu mới. Các máy khác đã được đăng xuất.",
  "doi-email": "Đã xác nhận email mới.",
  // Học sinh mở /quan-tri (requireRole → LEARNER_STAFF_ONLY).
  "khu-noi-bo": "Khu vực quản trị chỉ dành cho nhân sự của trang. Em vẫn học và luyện thi bình thường nhé.",
};

const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

/** Tài khoản học sinh: hồ sơ (tên, trường), cách đăng nhập, đăng xuất. Tiến độ, gói, đơn hàng thêm ở B5–B6. */
export default async function AccountPage({ searchParams }: PageProps<"/tai-khoan">) {
  const learner = await requireLearner(ACCOUNT_HOME);
  const notice = (await searchParams)["thong-bao"];
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;
  const name = learner.profile?.display_name ?? learner.suggestedName;
  const methods = [learner.methods.password && "Email + mật khẩu", learner.methods.google && "Google"].filter(Boolean).join(" · ");

  return (
    <>
      {message && (
        <p id="tai-khoan-thong-bao" role="status" className="mb-6 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm text-foreground">
          {message}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Avatar src={learner.avatarUrl} name={name} className="h-16 w-16" letterClassName="font-serif text-2xl font-bold" />
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-bold text-foreground">Tài khoản của em</h1>
          <p className="truncate text-muted-foreground" data-testid="account-name">
            {name}
          </p>
        </div>
      </div>

      <section aria-labelledby="ho-so" className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <h2 id="ho-so" className="font-serif text-xl font-bold text-foreground">
          Hồ sơ
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all text-foreground" data-testid="account-email">
            {learner.email}
          </dd>
          <dt className="text-muted-foreground">Đăng nhập bằng</dt>
          <dd className="text-foreground">
            {methods || "—"}{" "}
            <Link href={ACCOUNT_SECURITY} className="text-accent underline-offset-4 hover:underline">
              Đổi trong Bảo mật
            </Link>
          </dd>
          <dt className="text-muted-foreground">Tạo lúc</dt>
          <dd className="text-foreground">{dateFormat.format(new Date(learner.createdAt))}</dd>
        </dl>
        <div className="mt-5 border-t border-border pt-5">
          {learner.profile ? (
            <ProfileForm displayName={learner.profile.display_name} school={learner.profile.school ?? ""} />
          ) : (
            <p className="text-sm text-muted-foreground">Tài khoản nhân sự này chưa có hồ sơ học sinh nên chưa có gì để sửa ở đây.</p>
          )}
        </div>
      </section>

      {learner.isStaff && (
        <p className="mt-4 text-sm">
          Em cũng là nhân sự của trang.{" "}
          <Link href={ADMIN_HOME} className="text-accent underline">
            Vào khu quản trị
          </Link>
        </p>
      )}

      <div className="mt-6">
        <OpenSignOutButton />
      </div>
    </>
  );
}
