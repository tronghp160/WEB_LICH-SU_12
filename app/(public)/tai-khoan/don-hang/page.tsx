import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ClaimLicenseForm } from "@/components/account/ClaimLicenseForm";
import { requireLearner } from "@/lib/auth/learner";
import { ACCOUNT_ORDERS } from "@/lib/auth/routes";
import { examPaths } from "@/lib/exams/exam";
import { orderStatusLabels } from "@/lib/payments/order-status";
import { formatVnd } from "@/lib/payments/pricing";
import { getAccountLicenses, getAccountOrders, usableLicenses } from "@/lib/queries/account";

export const metadata: Metadata = { title: "Gói và đơn hàng", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
      <h2 id={id} className="font-serif text-xl font-bold text-foreground">
        {title}
      </h2>
      {intro && <p className="mb-4 mt-1 text-sm text-muted-foreground">{intro}</p>}
      <div className={intro ? undefined : "mt-4"}>{children}</div>
    </section>
  );
}

/**
 * Gói luyện thi + đơn hàng của tài khoản (docs/ke-hoach-tai-khoan.md, mục 7.2–7.3). Đọc bằng khóa bí mật, lọc theo user
 * id của phiên đã xác minh (requireLearner) — người mua đăng nhập không cần cookie đơn hay tra cứu bằng email.
 */
export default async function AccountOrdersPage() {
  const learner = await requireLearner(ACCOUNT_ORDERS);
  const [orders, licenses] = await Promise.all([getAccountOrders(learner.id), getAccountLicenses(learner.id)]);
  const usable = usableLicenses(licenses);

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-foreground">Gói và đơn hàng</h1>

      <Section
        id="goi-luyen-thi"
        title="Gói luyện thi"
        intro={
          usable.length
            ? "Gói đã gắn với tài khoản: đăng nhập ở máy nào cũng mở được đề, không cần nhập mã, không tốn lượt thiết bị."
            : "Tài khoản chưa có gói luyện thi nào."
        }
      >
        {licenses.length > 0 && (
          <ul className="mb-5 flex flex-col gap-2" data-testid="goi-trong-tai-khoan">
            {licenses.map((license) => (
              <li key={license.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">{license.productName}</p>
                  <p className="select-all font-mono text-sm text-foreground">{license.code}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {license.status !== "active"
                    ? "Đã thu hồi"
                    : license.validUntil && new Date(license.validUntil) < new Date()
                      ? "Hết hạn"
                      : license.validUntil
                        ? `Dùng đến ${dateFormat.format(new Date(license.validUntil))}`
                        : "Đang dùng"}
                </p>
              </li>
            ))}
          </ul>
        )}
        {usable.length > 0 ? (
          <p className="mb-5 text-sm">
            <Link href={examPaths.hub} className="font-medium text-accent underline-offset-4 hover:underline">
              Vào Luyện thi →
            </Link>
          </p>
        ) : (
          <p className="mb-5 text-sm">
            <Link href={examPaths.hub} className="font-medium text-accent underline-offset-4 hover:underline">
              Xem Gói luyện thi →
            </Link>
          </p>
        )}
        <div className="border-t border-border pt-5">
          <h3 className="mb-1 font-semibold text-foreground">Đã mua khi chưa đăng nhập?</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Nhập mã đã mua (trên trang kết quả thanh toán hoặc trong email) để thêm vào tài khoản. Mỗi mã chỉ thuộc một tài
            khoản.
          </p>
          <ClaimLicenseForm next={ACCOUNT_ORDERS} />
        </div>
      </Section>

      <Section id="don-hang" title="Đơn hàng" intro={orders.length ? undefined : "Chưa có đơn hàng nào đặt khi đăng nhập."}>
        {orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm" data-testid="don-hang-cua-em">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">Mã đơn</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Ngày</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Mặt hàng</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Số tiền</th>
                  <th scope="col" className="py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.orderCode}>
                    <td className="py-2 pr-3 font-mono">
                      <Link href={`/thanh-toan/ket-qua?don=${order.orderCode}`} className="text-accent underline-offset-4 hover:underline">
                        {order.orderCode}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{dateFormat.format(new Date(order.createdAt))}</td>
                    <td className="py-2 pr-3">{order.productName}</td>
                    <td className="py-2 pr-3 text-right">{formatVnd(order.amountVnd)}</td>
                    <td className="py-2">{orderStatusLabels[order.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
