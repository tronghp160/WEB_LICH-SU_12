"use client";

import { ClaimLicenseForm } from "@/components/account/ClaimLicenseForm";
import { useSession } from "@/lib/hooks/useSession";

/** Trang tĩnh (/kich-hoat): chỉ khi đã đăng nhập mới hiện ô "Thêm mã vào tài khoản" (docs/ke-hoach-tai-khoan.md, 7.2). */
export function SignedInClaim({ next }: { next: string }) {
  const session = useSession();
  if (session.status !== "signed-in") return null;
  return (
    <section aria-labelledby="them-vao-tai-khoan" className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 id="them-vao-tai-khoan" className="font-serif text-xl font-bold text-foreground">
        Hoặc thêm mã vào tài khoản
      </h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Mã trong tài khoản mở được đề ở mọi máy em đăng nhập, không tốn lượt thiết bị.
      </p>
      <ClaimLicenseForm next={next} />
    </section>
  );
}
