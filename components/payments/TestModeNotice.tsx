import { FlaskConical } from "lucide-react";
import type { ProviderName } from "@/lib/payments/types";

/**
 * Nhãn khi PAYMENT_ENV=test. Cổng giả lập không thu tiền; payOS thì kể cả lúc thử nghiệm vẫn là CHUYỂN KHOẢN THẬT
 * (tiền vào tài khoản ngân hàng gắn với kênh payOS) — phải nói rõ để người thử không hiểu nhầm.
 */
export function TestModeNotice({ provider }: { provider: ProviderName }) {
  const text = provider === "mock" ? "Môi trường thử nghiệm — không thu tiền thật" : "Đang thử nghiệm — chuyển khoản là tiền thật";
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning-bg px-3 py-1 text-xs font-semibold text-foreground">
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </p>
  );
}
