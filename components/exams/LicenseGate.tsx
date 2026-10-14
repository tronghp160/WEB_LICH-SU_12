"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ACCOUNT_ORDERS, loginPath } from "@/lib/auth/routes";
import { examPaths } from "@/lib/exams/exam";
import { useLicense } from "@/lib/hooks/useLicense";
import { useSession } from "@/lib/hooks/useSession";

type AccountPack = { code: string; productSlug: string; productName: string };

/** Gói còn dùng được của tài khoản đang đăng nhập (null = chưa biết / khách). */
function useAccountPacks(userId: string | null): AccountPack[] | null {
  const [state, setState] = useState<{ userId: string; packs: AccountPack[] } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/tai-khoan/goi", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? (response.json() as Promise<{ packs?: AccountPack[] }>) : null))
      .then((body) => {
        if (!cancelled) setState({ userId, packs: body?.packs ?? [] });
      })
      .catch(() => {
        if (!cancelled) setState({ userId, packs: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return userId && state?.userId === userId ? state.packs : null;
}

/**
 * Gói đã có → thay khối mua bằng trạng thái gói: gói gắn với tài khoản đang đăng nhập (mở đề ở mọi máy, docs/ke-hoach-
 * tai-khoan.md mục 7.2) hoặc gói kích hoạt trên máy này. Chưa có → hiện `children` (form mua) + lối kích hoạt / tra cứu.
 */
export function LicenseGate({ productSlug, children }: { productSlug: string; children: ReactNode }) {
  const license = useLicense();
  const session = useSession();
  const userId = session.status === "signed-in" ? session.userId : null;
  const packs = useAccountPacks(userId);
  const accountPack = packs?.find((pack) => pack.productSlug === productSlug);

  if (accountPack) {
    return (
      <div className="flex flex-col gap-2 rounded-card border border-success bg-success/10 p-4" data-testid="pack-account">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
          Gói đã gắn với tài khoản của em
        </p>
        <p className="font-mono text-sm text-foreground">{accountPack.code}</p>
        <p className="text-sm text-muted-foreground">
          Đăng nhập ở máy nào cũng làm được đề, không cần nhập mã. Chọn một đề bên dưới để bắt đầu.{" "}
          <Link href={ACCOUNT_ORDERS} className="text-accent underline">
            Gói và đơn hàng
          </Link>
        </p>
      </div>
    );
  }

  if (!license) {
    return (
      <>
        {children}
        <p className="text-sm text-muted-foreground">
          Đã có mã?{" "}
          <Link href={examPaths.activate} className="text-accent underline">
            Kích hoạt trên máy này
          </Link>
          {" · "}Mất mã?{" "}
          <Link href="/thanh-toan/tra-cuu" className="text-accent underline">
            Tra cứu đơn
          </Link>
          {session.status === "anonymous" && (
            <>
              {" · "}
              <Link href={loginPath(examPaths.hub)} className="text-accent underline">
                Đăng nhập
              </Link>{" "}
              để gói gắn với tài khoản, dùng được trên mọi máy.
            </>
          )}
        </p>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-card border border-success bg-success/10 p-4" data-testid="pack-active">
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
        Gói đã kích hoạt trên máy này
      </p>
      <p className="font-mono text-sm text-foreground">{license.code}</p>
      <p className="text-sm text-muted-foreground">
        Đang dùng {license.devicesUsed}/{license.maxDevices} thiết bị. Chọn một đề bên dưới để bắt đầu.
        {userId && (
          <>
            {" "}
            <Link href={ACCOUNT_ORDERS} className="text-accent underline">
              Lưu mã vào tài khoản
            </Link>{" "}
            để dùng trên mọi máy.
          </>
        )}
      </p>
    </div>
  );
}
