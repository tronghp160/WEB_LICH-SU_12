import type { Metadata } from "next";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { TestModeNotice } from "@/components/payments/TestModeNotice";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { mockBankAction } from "@/lib/actions/payments";
import { mockSecret } from "@/lib/payments/config";
import { getOrderForCheckout } from "@/lib/payments/orders";
import { formatVnd, paymentDescription } from "@/lib/payments/pricing";
import { verifyMockCheckoutSignature } from "@/lib/payments/providers/mock";

// Trang "ngân hàng giả lập" (docs/ke-hoach-thanh-toan.md, mục 8.1) — chỉ có khi PAYMENT_PROVIDER=mock và
// PAYMENT_ENV=test. Đóng vai trang của cổng thanh toán: người dùng xác nhận → gửi webhook có chữ ký về server.

export const metadata: Metadata = {
  title: "Ngân hàng giả lập",
  robots: { index: false, follow: false },
};

function Unavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Callout variant="warning" title="Không mở được giao dịch">
        {message}
      </Callout>
    </div>
  );
}

export default async function MockBankPage({ searchParams }: PageProps<"/thanh-toan/gia-lap">) {
  const params = await searchParams;
  const secret = mockSecret();
  if (!secret) return <Unavailable message="Cổng thanh toán giả lập đang tắt." />;

  const orderCode = Number(params.don);
  const signature = typeof params.sig === "string" ? params.sig : "";
  if (params.loi || !Number.isSafeInteger(orderCode) || !verifyMockCheckoutSignature(secret, orderCode, signature)) {
    return <Unavailable message="Link thanh toán không hợp lệ hoặc đã bị sửa. Em quay lại trang mua và thử lại nhé." />;
  }

  const order = await getOrderForCheckout(orderCode);
  if (!order) return <Unavailable message="Không tìm thấy đơn hàng." />;
  const payable = order.status === "pending" || order.status === "expired";

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-10">
      <div className="flex flex-col gap-5 rounded-card border-2 border-border-strong bg-surface p-6 shadow-card">
        <TestModeNotice provider="mock" />
        <div className="flex items-center gap-3">
          <Landmark className="h-8 w-8 text-gold-deep" aria-hidden="true" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Ngân hàng giả lập</h1>
            <p className="text-sm text-muted-foreground">Đóng vai trang của cổng thanh toán (quét VietQR / nhập thẻ).</p>
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-muted p-4 text-sm">
          <dt className="text-muted-foreground">Nội dung</dt>
          <dd className="font-mono font-semibold text-foreground">{paymentDescription(order.products.kind, order.order_code)}</dd>
          <dt className="text-muted-foreground">Mặt hàng</dt>
          <dd className="text-foreground">{order.products.name}</dd>
          <dt className="text-muted-foreground">Số tiền</dt>
          <dd className="text-lg font-bold text-foreground" data-testid="mock-amount">
            {formatVnd(order.amount_vnd)}
          </dd>
        </dl>

        {payable ? (
          <form action={mockBankAction} className="flex flex-col gap-3">
            <input type="hidden" name="don" value={order.order_code} />
            <input type="hidden" name="sig" value={signature} />
            <Button type="submit" name="outcome" value="paid" size="lg">
              Xác nhận chuyển khoản {formatVnd(order.amount_vnd)}
            </Button>
            <Button type="submit" name="outcome" value="cancelled" variant="secondary">
              Hủy giao dịch
            </Button>
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer">Dành cho kiểm thử</summary>
              <p className="mt-2">Gửi webhook có chữ ký đúng nhưng số tiền lệch 1.000đ — server phải từ chối, không cấp mã.</p>
              <Button type="submit" name="outcome" value="wrong_amount" variant="ghost" size="sm" className="mt-2">
                Chuyển sai số tiền
              </Button>
            </details>
          </form>
        ) : (
          <Callout variant="info" title="Đơn đã xử lý xong">
            Đơn này không còn chờ thanh toán.{" "}
            <Link className="text-accent underline" href={`/thanh-toan/ket-qua?don=${order.order_code}`}>
              Xem kết quả
            </Link>
          </Callout>
        )}
      </div>
    </div>
  );
}
