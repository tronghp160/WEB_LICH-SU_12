import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { ClaimLicenseForm } from "@/components/account/ClaimLicenseForm";
import { ActivateLicenseForm } from "@/components/payments/ActivateLicenseForm";
import { LicenseCodeBox } from "@/components/payments/LicenseCodeBox";
import { PendingRefresher } from "@/components/payments/PendingRefresher";
import { TestModeNotice } from "@/components/payments/TestModeNotice";
import { LinkButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { readPaymentConfig } from "@/lib/payments/config";
import { orderStatusLabels, orderStatusMessages } from "@/lib/payments/order-status";
import { getOrderForBuyer, orderCookieName, resultPath, type OrderView } from "@/lib/payments/orders";
import { formatVnd } from "@/lib/payments/pricing";
import { ACCOUNT_ORDERS, loginPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Kết quả thanh toán (docs/ke-hoach-thanh-toan.md, mục 9). Chỉ hiện đơn khi cookie của chính đơn đó khớp token, hoặc
// người đang đăng nhập là chủ đơn (docs/ke-hoach-tai-khoan.md, mục 7.3); đơn còn chờ thì đối soát với cổng (lib/payments/orders.ts) và tự tải lại mỗi 3 giây.

export const metadata: Metadata = {
  title: "Kết quả thanh toán",
  robots: { index: false, follow: false },
};

function retryHref(order: OrderView): string {
  return order.productKind === "donation" ? "/ung-ho" : "/luyen-thi";
}

/** Gói gắn với tài khoản → dùng ở mọi máy; chưa gắn mà đang đăng nhập → nút lưu; khách → gợi ý đăng nhập (Q3). */
function AccountHint({ order, signedIn }: { order: OrderView; signedIn: boolean }) {
  if (!order.licenseCode || !order.licenseActive) return null;
  if (order.licenseInAccount) {
    return (
      <Callout variant="note" title="Gói đã gắn với tài khoản của em">
        <span data-testid="goi-gan-tai-khoan">
          Đăng nhập ở máy nào cũng mở được đề, không cần nhập mã. Xem lại ở{" "}
          <Link href={ACCOUNT_ORDERS} className="text-accent underline">
            Gói và đơn hàng
          </Link>
          .
        </span>
      </Callout>
    );
  }
  if (signedIn) return <ClaimLicenseForm presetCode={order.licenseCode} next={resultPath(order.orderCode)} />;
  return (
    <p className="text-sm text-muted-foreground">
      Có tài khoản?{" "}
      <Link href={loginPath(resultPath(order.orderCode))} className="text-accent underline">
        Đăng nhập
      </Link>{" "}
      rồi lưu mã vào tài khoản để mở đề trên mọi máy.
    </p>
  );
}

function StatusBody({ order, signedIn }: { order: OrderView; signedIn: boolean }) {
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
              {order.licenseActive && !order.licenseInAccount && <ActivateLicenseForm presetCode={order.licenseCode} />}
              <AccountHint order={order} signedIn={signedIn} />
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
  const { data: auth } = await (await createClient()).auth.getUser();
  const userId = auth.user?.id ?? null;
  const order = await getOrderForBuyer(orderCode, token, userId);
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
            <StatusBody order={order} signedIn={Boolean(userId)} />
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
