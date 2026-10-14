"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_HOME, ACCOUNT_SECURITY } from "@/lib/auth/routes";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: ACCOUNT_HOME, label: "Hồ sơ" },
  { href: ACCOUNT_SECURITY, label: "Bảo mật" },
] as const;

/** Menu con của khu Tài khoản (đơn hàng thêm ở giai đoạn B6). */
export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tài khoản" className="mb-6 border-b border-border">
      <ul className="-mb-px flex gap-1">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                  active ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
