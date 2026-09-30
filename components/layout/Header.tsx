"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Stamp, X } from "lucide-react";
import { useProgress } from "@/lib/hooks/useProgress";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { label: "Trang chủ", href: "/" },
  { label: "Bài học", href: "/bai-hoc" },
  { label: "Trắc nghiệm", href: "/trac-nghiem" },
  { label: "Dòng thời gian", href: "/dong-thoi-gian" },
  { label: "Bản đồ", href: "/ban-do" },
  { label: "Tra cứu", href: "/tra-cuu" },
];

/** Mục đang mở: trùng đường dẫn hoặc là trang con của nó (trừ trang chủ). */
function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Lối vào "Hộ chiếu lịch sử" (GĐ4.4) kèm số con dấu đã có trên máy này. */
function PassportLink({ active }: { active: boolean }) {
  const progress = useProgress();
  const stamps = progress ? Object.values(progress.quizzes).filter((record) => record.passedAt).length : 0;
  return (
    <Link
      href="/ho-chieu"
      aria-current={active ? "page" : undefined}
      aria-label={stamps > 0 ? `Hộ chiếu lịch sử: ${stamps} con dấu` : "Hộ chiếu lịch sử"}
      className={cn(
        "relative inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium hover:bg-muted hover:text-accent md:ml-2",
        active ? "text-accent" : "text-foreground",
      )}
    >
      <Stamp className="h-5 w-5" aria-hidden="true" />
      <span className="hidden lg:inline">Hộ chiếu</span>
      {stamps > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-accent px-1 text-center text-xs leading-5 text-accent-foreground lg:static"
        >
          {stamps}
        </span>
      )}
    </Link>
  );
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-serif text-lg font-bold text-foreground">
          Lịch sử <span className="text-accent">Việt Nam 12</span>
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden md:block">
          <ul className="flex items-center gap-4 lg:gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-accent",
                      isActive ? "text-accent" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <PassportLink active={isNavItemActive(pathname, "/ho-chieu")} />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted md:hidden"
            aria-label={isMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Điều hướng chính (di động)"
          className="border-t border-border bg-background md:hidden"
        >
          <ul className="flex flex-col px-4 py-2">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "block py-3 text-sm font-medium",
                      isActive ? "text-accent" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
