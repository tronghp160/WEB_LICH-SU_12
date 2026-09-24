"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuForRole } from "@/components/admin/menu";
import { cn } from "@/lib/utils/cn";
import type { StaffRole } from "@/lib/utils/labels";

/** Menu khu vực nội bộ: chỉ hiện các mục của vai trò hiện tại (điện thoại: cuộn ngang; md+: cột dọc). */
export function AdminNav({ role }: { role: StaffRole }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu khu vực nội bộ" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:flex-col">
        {menuForRole(role).map((item) => {
          // "Tổng quan" chỉ sáng khi đúng trang chính; các mục khác sáng cả ở trang con.
          const isActive =
            item.href === "/quan-tri" ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
