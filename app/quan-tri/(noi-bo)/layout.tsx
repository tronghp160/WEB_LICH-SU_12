import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES, staffRoleLabels } from "@/lib/utils/labels";

/**
 * Khung khu vực nội bộ: sidebar theo vai trò. Layout chỉ đảm bảo phải là nhân sự
 * đang hoạt động; TỪNG TRANG con vẫn tự gọi requireRole() cho vai trò cần thiết
 * (layout không tự chạy lại khi điều hướng giữa các trang con).
 */
export default async function AdminLayout({ children }: LayoutProps<"/quan-tri">) {
  const staff = await requireRole(STAFF_ROLES);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b border-border bg-surface p-4 md:min-h-screen md:w-64 md:shrink-0 md:gap-6 md:border-b-0 md:border-r">
        <div className="flex items-start justify-between gap-3 md:flex-col md:items-stretch md:gap-4">
          <div className="min-w-0">
            <Link href="/quan-tri" className="font-serif text-lg font-bold text-foreground">
              Lịch sử <span className="text-accent">Việt Nam 12</span>
            </Link>
            <p className="mt-2 truncate text-sm font-medium text-foreground">
              {staff.fullName ?? staff.email}
            </p>
            <p className="text-xs text-muted-foreground">{staffRoleLabels[staff.role]}</p>
          </div>
          <SignOutButton />
        </div>

        <AdminNav role={staff.role} />

        <Link href="/" className="hidden text-sm text-muted-foreground hover:text-foreground hover:underline md:mt-auto md:block">
          ← Xem trang công khai
        </Link>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
