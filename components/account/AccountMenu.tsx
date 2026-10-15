"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "@/components/account/Avatar";
import { openSignOut } from "@/components/account/SignOutDialog";
import { ADMIN_HOME } from "@/lib/admin/routes";
import { ACCOUNT_HOME, ACCOUNT_SECURITY, LEARNER_SIGNUP, loginPath } from "@/lib/auth/routes";
import { refreshSession, useSession, type SessionView } from "@/lib/hooks/useSession";

/** Đang ở trang đăng nhập / đăng ký / tài khoản thì "Đăng nhập" không mang `next` về chính các trang đó. */
const AUTH_PAGES = /^\/(dang-nhap|dang-ky|quen-mat-khau|dat-lai-mat-khau|auth)(\/|$)/;
const signInHref = (pathname: string) => (AUTH_PAGES.test(pathname) ? loginPath() : loginPath(pathname));

const itemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold";

/** Đọc lại phiên mỗi lần chuyển trang (đăng nhập / đăng xuất bằng Server Action là chuyển trang mềm, Header không render lại từ đầu). */
function useSessionOnNavigate(): SessionView {
  const session = useSession();
  const pathname = usePathname();
  useEffect(() => {
    void refreshSession();
  }, [pathname]);
  return session;
}

/**
 * Nút tài khoản trên Header (máy tính, từ md): chưa đăng nhập → "Đăng nhập"; đã đăng nhập → ảnh đại diện mở menu
 * (Tài khoản của em · Bảo mật · Khu quản trị nếu là nhân sự · Đăng xuất). Chỉ hiển thị — quyền kiểm ở server.
 */
export function AccountMenu() {
  const session = useSessionOnNavigate();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      document.getElementById("account-menu-trigger")?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Giữ chỗ cùng cỡ khi chưa biết phiên → không xô lệch Header.
  if (session.status === "loading") return <span className="hidden h-10 w-10 md:block" aria-hidden="true" />;

  if (session.status === "anonymous") {
    return (
      <Link
        href={signInHref(pathname)}
        className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold md:inline-flex"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {/* md–lg chật chỗ: chỉ còn biểu tượng (tên nút vẫn là chữ cho trình đọc màn hình). */}
        <span className="sr-only lg:not-sr-only">Đăng nhập</span>
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        id="account-menu-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Tài khoản: ${session.name}`}
        title={session.name}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      >
        <Avatar src={session.avatarUrl} name={session.name} className="h-8 w-8" />
      </button>
      {open && (
        <div id="account-menu" className="absolute right-0 top-full mt-2 w-64 rounded-card border border-border bg-surface p-2 shadow-xl">
          <div className="flex items-center gap-3 border-b border-border px-3 pb-3 pt-2">
            <Avatar src={session.avatarUrl} name={session.name} className="h-10 w-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{session.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session.email}</p>
            </div>
          </div>
          <ul className="mt-2 flex flex-col gap-0.5">
            <li>
              <Link href={ACCOUNT_HOME} className={itemClass}>
                <UserRound className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                Tài khoản của em
              </Link>
            </li>
            <li>
              <Link href={ACCOUNT_SECURITY} className={itemClass}>
                <ShieldCheck className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                Bảo mật
              </Link>
            </li>
            {session.isStaff && (
              <li>
                <Link href={ADMIN_HOME} className={itemClass}>
                  <LayoutDashboard className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                  Khu quản trị
                </Link>
              </li>
            )}
            <li className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  setOpen(false);
                  openSignOut();
                }}
              >
                <LogOut className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                Đăng xuất
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Khối tài khoản trong menu điện thoại (Header → nút menu). */
export function MobileAccountSection({ onNavigate }: { onNavigate: () => void }) {
  const session = useSession();
  const pathname = usePathname();

  if (session.status === "loading") return null;

  if (session.status === "anonymous") {
    return (
      <section aria-labelledby="mobile-account" className="border-t border-border pt-4">
        <h2 id="mobile-account" className="mb-2 font-serif text-lg font-bold text-foreground">
          Tài khoản
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">Đăng nhập để tiến độ và gói luyện thi đi theo em trên mọi máy.</p>
        <div className="flex gap-2">
          <Link
            href={signInHref(pathname)}
            onClick={onNavigate}
            className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Đăng nhập
          </Link>
          <Link
            href={LEARNER_SIGNUP}
            onClick={onNavigate}
            className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Đăng ký
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="mobile-account" className="border-t border-border pt-4">
      <h2 id="mobile-account" className="sr-only">
        Tài khoản
      </h2>
      <div className="mb-2 flex items-center gap-3 px-3">
        <Avatar src={session.avatarUrl} name={session.name} className="h-10 w-10" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{session.name}</p>
          <p className="truncate text-xs text-muted-foreground">{session.email}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-0.5">
        <li>
          <Link href={ACCOUNT_HOME} onClick={onNavigate} className={itemClass}>
            <UserRound className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            Tài khoản của em
          </Link>
        </li>
        <li>
          <Link href={ACCOUNT_SECURITY} onClick={onNavigate} className={itemClass}>
            <ShieldCheck className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            Bảo mật
          </Link>
        </li>
        {session.isStaff && (
          <li>
            <Link href={ADMIN_HOME} onClick={onNavigate} className={itemClass}>
              <LayoutDashboard className="h-4 w-4 text-gold-deep" aria-hidden="true" />
              Khu quản trị
            </Link>
          </li>
        )}
        <li>
          <button type="button" className={itemClass} onClick={openSignOut}>
            <LogOut className="h-4 w-4 text-gold-deep" aria-hidden="true" />
            Đăng xuất
          </button>
        </li>
      </ul>
    </section>
  );
}
