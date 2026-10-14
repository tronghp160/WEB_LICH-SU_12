import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ActivateLicenseForm } from "@/components/payments/ActivateLicenseForm";
import { LicenseCodeBox } from "@/components/payments/LicenseCodeBox";
import { PendingRefresher } from "@/components/payments/PendingRefresher";
import { TestModeNotice } from "@/components/payments/TestModeNotice";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { readPaymentConfig } from "@/lib/payments/config";
import { orderStatusLabels, orderStatusMessages } from "@/lib/payments/order-status";
import { getOrderForBuyer, orderCookieName, type OrderView } from "@/lib/payments/orders";
import { formatVnd } from "@/lib/payments/pricing";

// Kết quả thanh toán (docs/ke-hoach-thanh-toan.md, mục 9). Chỉ hiện đơn khi cookie của chính đơn đó khớp token;
// đơn còn chờ thì đối soát với cổng (lib/payments/orders.ts) và tự tải lại mỗi 3 giây.

export const metadata: Metadata = {
  title: "Kết quả thanh toán",
  robots: { index: false, follow: false },
};

function retryHref(order: OrderView): string {
  return order.productKind === "donation" ? "/ung-ho" : "/luyen-thi";
}

function StatusBody({ order }: { order: OrderView }) {
  switch (order.status) {
    case "paid":
      return (
        <>
          <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CheckCircle2 className="h-6 w-6 text-green-700 dark:text-green-400" aria-hidden="true" />
            {orderStatusMessages.paid}
          </p>
          {order.licenseCode ? (
            <>
              <LicenseCodeBox code={order.licenseCode} />
              {order.licenseActive && <ActivateLicenseForm presetCode={order.licenseCode} />}
              <Callout variant="note" title="Hãy lưu mã lại">
                Chụp màn hình hoặc chép mã vào nơi an toàn. Mã dùng được trên tối đa 3 thiết bị; nhập mã ở máy khác bằng trang
                Kích hoạt.
              </Callout>
            </>
          ) : order.productKind === "donation" ? (
            <p className="text-muted-foreground">
              Khoản ủng hộ giúp web tiếp tục miễn phí cho các bạn học sinh.
              {order.showOnWall && " Lời nhắn của em sẽ lên Bức tường cảm ơn sau khi được duyệt."}
            </p>
          ) : null}
        </>
      );
    case "pending":
      return (
        <>
          <p className="flex items-center gap-2 text-lg font-semibold text-foreground" role="status">
            <Clock className="h-6 w-6 animate-pulse text-gold-deep" aria-hidden="true" />
            {orderStatusMessages.pending}
          </p>
          <PendingRefresher />
          {order.checkoutUrl && (
            <LinkButton href={order.checkoutUrl} variant="secondary">
              Quay lại trang thanh toán
            </LinkButton>
          )}
        </>
      );
    default:
      return (
        <>
          <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <XCircle className="h-6 w-6 text-accent" aria-hidden="true" />
            {orderStatusMessages[order.status]}
          </p>
          {(order.status === "cancelled" || order.status === "expired") && (
            <LinkButton href={retryHref(order)}>Thử lại</LinkButton>
          )}
        </>
      );
  }
}

export default async function PaymentResultPage({ searchParams }: PageProps<"/thanh-toan/ket-qua">) {
  const params = await searchParams;
  const orderCode = Number(params.don);
  const token = Number.isSafeInteger(orderCode) ? (await cookies()).get(orderCookieName(orderCode))?.value : undefined;
  const order = await getOrderForBuyer(orderCode, token);
  const config = readPaymentConfig();

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-10">
      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card">
        {config.ok && config.env === "test" && <TestModeNotice provider={config.provider} />}
        <h1 className="font-serif text-2xl font-bold text-foreground">Kết quả thanh toán</h1>
        {order ? (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Mã đơn</dt>
              <dd className="font-mono text-foreground" data-testid="order-code">
                {order.orderCode}
              </dd>
              <dt className="text-muted-foreground">Mặt hàng</dt>
              <dd className="text-foreground">{order.productName}</dd>
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="text-foreground">{formatVnd(order.amountVnd)}</dd>
              <dt className="text-muted-foreground">Trạng thái</dt>
              <dd className="font-semibold text-foreground" data-testid="order-status">
                {orderStatusLabels[order.status]}
              </dd>
            </dl>
            <StatusBody order={order} />
          </>
        ) : (
          <Callout variant="warning" title="Không xem được đơn hàng">
            Chỉ trình duyệt đã tạo đơn mới xem được kết quả (để không ai đoán mã đơn mà lấy được mã kích hoạt của em). Nếu em đã
            thanh toán trên máy khác, hãy mở trang kết quả trên máy đó.
          </Callout>
        )}
      </div>
    </div>
  );
}
