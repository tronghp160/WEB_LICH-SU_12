import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { readPaymentConfig } from "@/lib/payments/config";
import { getOrderDashboard } from "@/lib/queries/admin-payments";

/** Mục "Thanh toán" trên trang Vận hành: cấu hình cổng, đơn lệch tiền / webhook sai chữ ký 24 giờ qua. */
export async function PaymentOpsSection() {
  const config = readPaymentConfig();
  const dashboard = await getOrderDashboard().catch(() => null);
  const problems = dashboard ? dashboard.mismatches24h + dashboard.badSignatures24h : null;

  return (
    <section aria-labelledby="thanh-toan" className="flex max-w-3xl flex-col gap-3">
      <h2 id="thanh-toan" className="font-serif text-xl font-bold text-foreground">
        Thanh toán
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 rounded-card border border-border bg-surface p-4 text-sm">
        <li className="flex items-start gap-2">
          {config.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          )}
          <span>
            {config.ok
              ? `Cổng ${config.provider} đang bật (${config.env === "test" ? "môi trường thử nghiệm — không thu tiền thật" : "thu tiền thật"}).`
              : `Chưa nhận thanh toán: ${config.reason}`}
          </span>
        </li>
        <li className="flex items-start gap-2">
          {problems === null ? (
            <>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
              <span>Không đọc được nhật ký thanh toán — chưa thể kết luận mục này bình thường.</span>
            </>
          ) : problems === 0 ? (
            <>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              <span>24 giờ qua không có webhook sai chữ ký hay đơn lệch số tiền.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                24 giờ qua: {dashboard!.badSignatures24h} webhook sai chữ ký, {dashboard!.mismatches24h} lần lệch số tiền.{" "}
                <Link href="/quan-tri/don-hang" className="font-medium text-accent underline">
                  Xem đơn hàng
                </Link>
              </span>
            </>
          )}
        </li>
      </ul>
    </section>
  );
}
