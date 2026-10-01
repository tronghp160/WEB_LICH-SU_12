"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { activeGroup, NAV_GROUPS } from "@/components/layout/nav";
import { openSearch } from "@/components/layout/SearchOverlay";
import { cn } from "@/lib/utils/cn";

const SHORT_LABELS: Record<string, string> = { hoc: "Học", "on-tap": "Ôn tập", "kham-pha": "Khám phá" };

/**
 * Thanh điều hướng dưới cùng cho điện thoại (mục 5.1): Học · Ôn tập · Khám phá · Tìm. Ẩn từ md trở lên và khi in.
 * Trang chiếu bài học (z-[60]) nằm đè lên thanh này.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const current = activeGroup(pathname);
  const itemClass =
    "flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold";

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <ul className="flex h-14">
        {NAV_GROUPS.map(({ id, href, icon: Icon }) => {
          const active = current === id;
          return (
            <li key={id} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined} className={cn(itemClass, active ? "text-accent" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" aria-hidden="true" />
                {SHORT_LABELS[id]}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button type="button" onClick={openSearch} className={cn(itemClass, "w-full text-muted-foreground")}>
            <Search className="h-5 w-5" aria-hidden="true" />
            Tìm
          </button>
        </li>
      </ul>
    </nav>
  );
}
