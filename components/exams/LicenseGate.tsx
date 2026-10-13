"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { examPaths } from "@/lib/exams/exam";
import { useLicense } from "@/lib/hooks/useLicense";

/** Máy đã kích hoạt gói → thay khối mua bằng trạng thái gói; chưa có → hiện `children` (form mua). */
export function LicenseGate({ children }: { children: ReactNode }) {
  const license = useLicense();
  if (!license) {
    return (
      <>
        {children}
        <p className="text-sm text-muted-foreground">
          Đã có mã?{" "}
          <Link href={examPaths.activate} className="text-accent underline">
            Kích hoạt trên máy này
          </Link>
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
      </p>
    </div>
  );
}
