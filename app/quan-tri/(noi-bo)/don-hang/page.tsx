import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, MessageSquareQuote } from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/payments/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireRole } from "@/lib/auth";
import { readPaymentConfig } from "@/lib/payments/config";
import { ORDER_STATUSES, orderStatusLabels } from "@/lib/payments/order-status";
import { formatVnd } from "@/lib/payments/pricing";
import type { RevenueWindow } from "@/lib/payments/stats";
import { getOrderDashboard, listOrders, ORDER_PAGE_SIZE, parseOrderFilter } from "@/lib/queries/admin-payments";

export const metadata: Metadata = { title: "Đơn hàng" };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
}

function RevenueCard({ title, window }: { title: string; window: RevenueWindow }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold text-foreground">{formatVnd(window.amountVnd)}</p>
      <p className="text-xs text-muted-foreground">
        {window.count} đơn · gói {formatVnd(window.examPackVnd)} · ủng hộ {formatVnd(window.donationVnd)}
      </p>
    </div>
  );
}

/** Quản trị đơn hàng (docs/ke-hoach-thanh-toan.md, mục 10): thống kê, lọc, danh sách. Chỉ quản trị viên. */
export default async function OrdersPage({ searchParams }: PageProps<"/quan-tri/don-hang">) {
  await requireRole(["system_admin"]);
  const filter = parseOrderFilter(await searchParams);
  const [dashboard, orders] = await Promise.all([getOrderDashboard(), listOrders(filter)]);
  const config = readPaymentConfig();
  const filtered = Boolean(filter.status || filter.query);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Đơn hàng</h1>
        <p className="mt-1 text-muted-foreground">
          Gói luyện thi và ủng hộ. Cổng đang dùng:{" "}
          <strong className="text-foreground">{config.ok ? `${config.provider} (${config.env === "test" ? "thử nghiệm" : "thật"})` : "chưa cấu hình"}</strong>.
        </p>
      </div>

      {!config.ok && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-900 dark:text-orange-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {config.reason} Web đang không nhận thanh toán.
        </p>
      )}

      <section aria-labelledby="doanh-thu" className="flex flex-col gap-3">
        <h2 id="doanh-thu" className="font-serif text-xl font-semibold text-foreground">
          Doanh thu (giờ Việt Nam)
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <RevenueCard title="Hôm nay" window={dashboard.revenue.today} />
          <RevenueCard title="7 ngày" window={dashboard.revenue.last7Days} />
          <RevenueCard title="30 ngày" window={dashboard.revenue.last30Days} />
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-sm">
          {ORDER_STATUSES.map((status) => (
            <li key={status}>
              <Link
                href={`/quan-tri/don-hang?trang-thai=${status}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 hover:border-accent"
              >
                <OrderStatusBadge status={status} />
                <span className="font-semibold text-foreground">{dashboard.statusCounts[status]}</span>
              </Link>
            </li>
          ))}
          <li className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1">
            Mã đang hoạt động: <strong className="ml-1 text-foreground">{dashboard.activeLicenses}</strong>
          </li>
        </ul>
        {(dashboard.wallPending > 0 || dashboard.mismatches24h > 0 || dashboard.badSignatures24h > 0) && (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            {dashboard.wallPending > 0 && (
              <li className="flex items-center gap-2 text-foreground">
                <MessageSquareQuote className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                {dashboard.wallPending} lời nhắn ủng hộ đang chờ duyệt (mở đơn để duyệt).
              </li>
            )}
            {dashboard.mismatches24h > 0 && (
              <li className="flex items-center gap-2 text-accent">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {dashboard.mismatches24h} lần cổng báo số tiền không khớp đơn trong 24 giờ qua — cần kiểm tra.
              </li>
            )}
            {dashboard.badSignatures24h > 0 && (
              <li className="flex items-center gap-2 text-accent">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                {dashboard.badSignatures24h} webhook sai chữ ký trong 24 giờ qua (đã bị từ chối).
              </li>
            )}
          </ul>
        )}
      </section>

      <section aria-labelledby="danh-sach" className="flex flex-col gap-4">
        <h2 id="danh-sach" className="font-serif text-xl font-semibold text-foreground">
          Danh sách đơn
        </h2>
        <form method="get" role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="loc-don" className="text-sm font-medium text-foreground">
              Mã đơn hoặc email
            </label>
            <Input id="loc-don" name="q" defaultValue={filter.query} placeholder="100123 hoặc em@vidu.com" maxLength={100} />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-52">
            <label htmlFor="loc-trang-thai-don" className="text-sm font-medium text-foreground">
              Trạng thái
            </label>
            <Select id="loc-trang-thai-don" name="trang-thai" defaultValue={filter.status ?? ""}>
              <option value="">Tất cả</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabels[status]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary">
              Lọc
            </Button>
            {filtered && (
              <Link href="/quan-tri/don-hang" className="text-sm font-medium text-accent hover:underline">
                Xóa lọc
              </Link>
            )}
          </div>
        </form>

        {orders.length === 0 ? (
          <EmptyState title={filtered ? "Không có đơn khớp bộ lọc" : "Chưa có đơn hàng nào"} />
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="order-list">
              {orders.map((order) => (
                <li key={order.orderCode}>
                  <Link
                    href={`/quan-tri/don-hang/${order.orderCode}`}
                    className="flex flex-col gap-1 rounded-card border border-border bg-surface p-3 hover:border-accent sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="font-mono font-semibold text-foreground sm:w-24">#{order.orderCode}</span>
                    <span className="flex-1 text-sm text-foreground">
                      {order.productKind === "donation" ? "Ủng hộ" : "Gói luyện thi"}
                      {order.buyerEmail && <span className="text-muted-foreground"> · {order.buyerEmail}</span>}
                      {order.wallPending && <span className="ml-2 text-xs font-semibold text-gold-deep">lời nhắn chờ duyệt</span>}
                    </span>
                    <span className="text-sm font-semibold text-foreground sm:w-28 sm:text-right">{formatVnd(order.amountVnd)}</span>
                    <span className="text-xs text-muted-foreground sm:w-32">{formatDateTime(order.createdAt)}</span>
                    <span className="text-xs text-muted-foreground sm:w-12">{order.provider}</span>
                    <OrderStatusBadge status={order.status} />
                  </Link>
                </li>
              ))}
            </ul>
            {orders.length === ORDER_PAGE_SIZE && (
              <p className="text-sm text-muted-foreground">Đang hiện {ORDER_PAGE_SIZE} đơn mới nhất — dùng bộ lọc để tìm đơn cũ hơn.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
