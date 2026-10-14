import type { ReactNode } from "react";

type AccountShellProps = {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  /** Dòng liên kết dưới khung (chuyển sang đăng ký / đăng nhập…). */
  footer?: ReactNode;
};

/** Khung chung của các trang đăng nhập / đăng ký / mật khẩu: một cột hẹp, thẻ trắng ở giữa. */
export function AccountShell({ title, intro, children, footer }: AccountShellProps) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-10 sm:px-6">
      <h1 className="font-serif text-3xl font-bold text-foreground">{title}</h1>
      {intro && <div className="mt-2 text-muted-foreground">{intro}</div>}
      <div className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">{children}</div>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
