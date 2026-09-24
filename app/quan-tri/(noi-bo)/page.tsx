import type { Metadata } from "next";
import Link from "next/link";
import { menuForRole, roleDescriptions } from "@/components/admin/menu";
import { Card } from "@/components/ui/Card";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES, staffRoleLabels } from "@/lib/utils/labels";

export const metadata: Metadata = { title: "Tổng quan" };

/** Bảng điều khiển theo vai trò: lời chào, mô tả quyền hạn và lối tắt tới các khu vực được phép. */
export default async function AdminDashboardPage() {
  const staff = await requireRole(STAFF_ROLES);
  const shortcuts = menuForRole(staff.role).filter((item) => item.href !== "/quan-tri");

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-foreground">
        Xin chào, {staff.fullName ?? staff.email}
      </h1>
      <p className="mt-1 text-sm font-medium text-gold-deep">{staffRoleLabels[staff.role]}</p>
      <p className="mt-3 max-w-2xl text-muted-foreground">{roleDescriptions[staff.role]}</p>

      <h2 className="mb-4 mt-10 font-serif text-xl font-bold text-foreground">Lối tắt</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group block h-full rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <Card className="flex h-full flex-col gap-2 p-5 transition-all group-hover:border-gold group-hover:shadow-lg">
                  <Icon className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                  <h3 className="font-serif text-lg font-semibold text-surface-foreground group-hover:text-accent">
                    {item.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
