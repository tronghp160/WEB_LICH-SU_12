"use client";

import { Search } from "lucide-react";
import { useActionState } from "react";
import { ActivateLicenseForm } from "@/components/payments/ActivateLicenseForm";
import { LicenseCodeBox } from "@/components/payments/LicenseCodeBox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { lookupOrderAction, type LookupState } from "@/lib/actions/payments";
import { orderStatusLabels } from "@/lib/payments/order-status";
import { formatVnd } from "@/lib/payments/pricing";

const initial: LookupState = { status: "idle" };

/** Tra cứu đơn bằng mã đơn + email đã nhập lúc mua (khi mất mã kích hoạt hoặc đổi máy). */
export function OrderLookupForm() {
  const [state, formAction, pending] = useActionState(lookupOrderAction, initial);
  const result = state.status === "found" ? state.result : undefined;

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tra-cuu-don" className="text-sm font-medium text-foreground">
              Mã đơn
            </label>
            <Input id="tra-cuu-don" name="don" inputMode="numeric" defaultValue={state.values?.don ?? ""} placeholder="100123" maxLength={15} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tra-cuu-email" className="text-sm font-medium text-foreground">
              Email đã nhập khi mua
            </label>
            <Input id="tra-cuu-email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email ?? ""} maxLength={254} />
          </div>
        </div>
        {state.status === "error" && (
          <p id="tra-cuu-loi" role="alert" className="text-sm text-accent">
            {state.message}
          </p>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            <Search className="h-4 w-4" aria-hidden="true" />
            {pending ? "Đang tra cứu…" : "Tra cứu"}
          </Button>
        </div>
      </form>

      {result && (
        <section aria-label="Kết quả tra cứu" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5" role="status">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Mã đơn</dt>
            <dd className="font-mono text-foreground">{result.orderCode}</dd>
            <dt className="text-muted-foreground">Mặt hàng</dt>
            <dd className="text-foreground">{result.productName}</dd>
            <dt className="text-muted-foreground">Số tiền</dt>
            <dd className="text-foreground">{formatVnd(result.amountVnd)}</dd>
            <dt className="text-muted-foreground">Trạng thái</dt>
            <dd className="font-semibold text-foreground" data-testid="lookup-status">
              {orderStatusLabels[result.status]}
            </dd>
          </dl>
          {result.licenseCode && (
            <>
              <LicenseCodeBox code={result.licenseCode} />
              {result.licenseActive ? (
                <ActivateLicenseForm presetCode={result.licenseCode} />
              ) : (
                <p className="text-sm text-accent">Mã này đã bị thu hồi. Liên hệ quản trị viên nếu em nghĩ đây là nhầm lẫn.</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
