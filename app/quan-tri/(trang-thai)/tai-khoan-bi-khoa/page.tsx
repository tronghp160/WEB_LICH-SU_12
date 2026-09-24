import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { ADMIN_HOME, ADMIN_LOGIN } from "@/lib/admin/routes";
import { getStaffState } from "@/lib/auth";

export const metadata: Metadata = { title: "Tài khoản đã bị khóa" };

/** Đã đăng nhập Auth nhưng tài khoản bị khóa hoặc chưa có hồ sơ nhân sự → không có quyền nội bộ nào. */
export default async function BlockedPage() {
  const state = await getStaffState();
  if (state.status === "anonymous") redirect(ADMIN_LOGIN);
  if (state.status === "active") redirect(ADMIN_HOME);

  const reason =
    state.status === "locked"
      ? "Tài khoản của bạn đã bị khóa."
      : "Tài khoản của bạn chưa được cấp quyền truy cập khu vực nội bộ.";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <Lock className="h-12 w-12 text-accent" aria-hidden="true" />
        <h1 className="font-serif text-2xl font-bold text-foreground">Tài khoản đã bị khóa</h1>
        <p className="text-muted-foreground">
          {reason} Vui lòng liên hệ quản trị viên để được hỗ trợ.
        </p>
        <div className="mt-2">
          <SignOutButton variant="primary" />
        </div>
      </div>
    </main>
  );
}
