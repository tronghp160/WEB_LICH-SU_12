import { FlaskConical } from "lucide-react";

/** Nhãn "Môi trường thử nghiệm" trên mọi trang thanh toán khi PAYMENT_ENV=test (không thu tiền thật). */
export function TestModeNotice() {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning-bg px-3 py-1 text-xs font-semibold text-foreground">
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      Môi trường thử nghiệm — không thu tiền thật
    </p>
  );
}
