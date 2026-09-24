import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { LinkButton } from "@/components/ui/Button";
import { ADMIN_BLOCKED, ADMIN_HOME, ADMIN_LOGIN } from "@/lib/admin/routes";
import { getStaffState } from "@/lib/auth";
import { redirect } from "next/navigation";
import { staffRoleLabels } from "@/lib/utils/labels";

export const metadata: Metadata = { title: "Không có quyền" };

/** Đã đăng nhập nhưng vai trò không được phép vào trang vừa mở (khác với chưa đăng nhập hoặc bị khóa). */
export default async function ForbiddenPage() {
  const state = await getStaffState();
  if (state.status === "anonymous") redirect(ADMIN_LOGIN);
  if (state.status !== "active") redirect(ADMIN_BLOCKED);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-accent" aria-hidden="true" />
        <h1 className="font-serif text-2xl font-bold text-foreground">Bạn không có quyền truy cập</h1>
        <p className="text-muted-foreground">
          Tài khoản của bạn ({staffRoleLabels[state.staff.role]}) không được phép mở trang này.
          Nếu bạn cần thêm quyền, hãy liên hệ quản trị viên.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <LinkButton href={ADMIN_HOME}>Về trang tổng quan</LinkButton>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
