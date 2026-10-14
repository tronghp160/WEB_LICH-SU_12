import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ActionNoticeScope } from "@/components/admin/ActionNotice";
import { OrderActionButton } from "@/components/admin/payments/OrderActionButton";
import { OrderStatusBadge } from "@/components/admin/payments/OrderStatusBadge";
import {
  adminReconcileAction,
  adminRecordRefundAction,
  adminRemoveDeviceAction,
  adminResolveLatePaymentAction,
  adminRestoreLicenseAction,
  adminRevokeLicenseAction,
  adminWallAction,
} from "@/lib/actions/admin-payments";
import { requireRole } from "@/lib/auth";
import { formatVnd } from "@/lib/payments/pricing";
import { looksShared } from "@/lib/payments/stats";
import { getOrderDetail } from "@/lib/queries/admin-payments";
import { cn } from "@/lib/utils/cn";

export async function generateMetadata({ params }: PageProps<"/quan-tri/don-hang/[ma]">): Promise<Metadata> {
  const { ma } = await params;
  return { title: `Đơn #${ma}` };
}

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }) : "—";
}

const SOURCE_LABELS: Record<string, string> = {
  webhook: "Webhook",
  return: "Quay về",
  reconcile: "Đối soát",
  admin: "Quản trị",
};

const NOTE_LABELS: Record<string, string> = {
  bad_signature: "Chữ ký sai — đã từ chối",
  amount_mismatch: "Số tiền không khớp đơn — không cấp quyền",
  paid_after_cancelled: "Tiền về sau khi đơn đã hủy — cần xử lý tay",
  paid_after_refunded: "Tiền về cho đơn đã hoàn tiền — cần xử lý tay",
  revoke_license: "Thu hồi mã",
  restore_license: "Mở lại mã",
  remove_device: "Gỡ thiết bị",
  record_refund: "Ghi nhận hoàn tiền",
  resolve_late_payment: "Quản trị viên xác nhận tiền về muộn và cấp quyền",
  wall_approve: "Duyệt lời nhắn",
  wall_hide: "Gỡ lời nhắn",
};

function noteLabel(note: string | null): string | null {
  if (!note) return null;
  if (note.startsWith("reconcile_by:")) return "Quản trị viên bấm đối soát";
  return NOTE_LABELS[note] ?? note;
}

/** Chi tiết một đơn: thông tin, mã kích hoạt + thiết bị, lời nhắn ủng hộ, nhật ký, thao tác quản trị. */
export default async function OrderDetailPage({ params }: PageProps<"/quan-tri/don-hang/[ma]">) {
  await requireRole(["system_admin"]);
  const { ma } = await params;
  const detail = await getOrderDetail(Number(ma));
  if (!detail) notFound();
  const { order, events } = detail;
  const license = order.licenses;
  const activations = license?.license_activations ?? [];
  const fields = { don: String(order.order_code) };
  const isDonation = order.products.kind === "donation";
  // Tiền về sau khi đơn đã hủy (cổng gửi, chữ ký đúng) → cho quản trị viên xác nhận và cấp quyền.
  const latePayment = order.status === "cancelled" && events.some((event) => event.note === "paid_after_cancelled" && event.signature_ok);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/quan-tri/don-hang" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tất cả đơn hàng
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-bold text-foreground">Đơn #{order.order_code}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <section aria-labelledby="thong-tin" className="rounded-card border border-border bg-surface p-5">
        <h2 id="thong-tin" className="mb-3 font-serif text-xl font-semibold text-foreground">
          Thông tin đơn
        </h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Mặt hàng</dt>
          <dd className="text-foreground">{order.products.name}</dd>
          <dt className="text-muted-foreground">Số tiền</dt>
          <dd className="font-semibold text-foreground">{formatVnd(order.amount_vnd)}</dd>
          <dt className="text-muted-foreground">Cổng / mã giao dịch</dt>
          <dd className="font-mono text-foreground">
            {order.provider} · {order.provider_ref ?? "—"}
          </dd>
          <dt className="text-muted-foreground">Email người mua</dt>
          <dd className="text-foreground">{order.buyer_email ?? "—"}</dd>
          <dt className="text-muted-foreground">Tạo lúc</dt>
          <dd className="text-foreground">{formatDateTime(order.created_at)}</dd>
          <dt className="text-muted-foreground">Hạn thanh toán</dt>
          <dd className="text-foreground">{formatDateTime(order.expires_at)}</dd>
          <dt className="text-muted-foreground">Thanh toán lúc</dt>
          <dd className="text-foreground">{formatDateTime(order.paid_at)}</dd>
        </dl>
        {/* Thông báo giữ ở khung: sau đối soát / hoàn tiền, trạng thái đơn đổi và nút vừa bấm biến mất. */}
        <ActionNoticeScope className="mt-4 flex flex-col gap-3">
          {latePayment && (
            <p role="alert" className="flex items-start gap-2 text-sm text-accent">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Cổng báo tiền đã về sau khi đơn bị hủy. Đối chiếu sao kê; nếu đúng đã nhận tiền thì xác nhận để cấp quyền cho người mua.
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            {latePayment && (
              <OrderActionButton
                action={adminResolveLatePaymentAction}
                label={isDonation ? "Xác nhận đã nhận tiền" : "Xác nhận đã nhận tiền và cấp mã"}
                confirm="Chỉ bấm khi sao kê ngân hàng đã có khoản tiền này. Đơn sẽ chuyển sang Đã thanh toán. Tiếp tục?"
                fields={fields}
                variant="primary"
              />
            )}
            {(order.status === "pending" || order.status === "expired") && (
              <OrderActionButton action={adminReconcileAction} label="Đối soát với cổng" fields={fields} />
            )}
            {order.status === "paid" && (
              <OrderActionButton
                action={adminRecordRefundAction}
                label="Ghi nhận đã hoàn tiền"
                confirm="Chỉ bấm khi đã hoàn tiền xong ở cổng/ngân hàng. Đơn sẽ chuyển sang Đã hoàn tiền và mã bị thu hồi. Tiếp tục?"
                fields={fields}
                danger
              />
            )}
          </div>
        </ActionNoticeScope>
      </section>

      {license && (
        <section aria-labelledby="ma-kich-hoat" className="rounded-card border border-border bg-surface p-5">
          <h2 id="ma-kich-hoat" className="mb-3 font-serif text-xl font-semibold text-foreground">
            Mã kích hoạt
          </h2>
          <p className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg font-bold text-foreground">{license.code}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                license.status === "active" ? "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-100" : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
              )}
            >
              {license.status === "active" ? "Đang hoạt động" : "Đã thu hồi"}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activations.length}/{license.max_devices} thiết bị · hết hạn {formatDateTime(license.valid_until)}
          </p>
          {looksShared(activations, license.max_devices) && (
            <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-accent">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Mã dùng hết lượt thiết bị trong vòng 24 giờ — có thể đang bị chia sẻ.
            </p>
          )}
          {/* Thông báo giữ ở khung: gỡ thiết bị làm dòng thiết bị (cùng nút) biến mất; thu hồi / mở lại đổi nút. */}
          <ActionNoticeScope className="mt-3 flex flex-col gap-4">
            {activations.length > 0 && (
              <ul className="flex flex-col gap-2">
                {activations.map((activation) => (
                  <li key={activation.device_hash} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <span>
                      <span className="font-mono text-foreground">Thiết bị {activation.device_hash.slice(0, 8)}…</span>
                      <span className="ml-2 text-muted-foreground">
                        kích hoạt {formatDateTime(activation.activated_at)} · dùng gần nhất {formatDateTime(activation.last_seen_at)}
                      </span>
                    </span>
                    <OrderActionButton
                      action={adminRemoveDeviceAction}
                      label="Gỡ thiết bị"
                      confirm="Gỡ thiết bị này? Máy đó sẽ phải kích hoạt lại (tốn một lượt)."
                      fields={{ ...fields, "thiet-bi": activation.device_hash }}
                      variant="ghost"
                    />
                  </li>
                ))}
              </ul>
            )}
            <div>
              {license.status === "active" ? (
                <OrderActionButton
                  action={adminRevokeLicenseAction}
                  label="Thu hồi mã"
                  confirm="Thu hồi mã này? Mọi máy đã kích hoạt sẽ không mở được đề nữa."
                  fields={fields}
                  danger
                />
              ) : (
                order.status === "paid" && <OrderActionButton action={adminRestoreLicenseAction} label="Mở lại mã" fields={fields} />
              )}
            </div>
          </ActionNoticeScope>
        </section>
      )}

      {isDonation && (
        <section aria-labelledby="loi-nhan" className="rounded-card border border-border bg-surface p-5">
          <h2 id="loi-nhan" className="mb-3 font-serif text-xl font-semibold text-foreground">
            Lời nhắn ủng hộ
          </h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Tên hiển thị</dt>
            <dd className="text-foreground">{order.display_name ?? "(ẩn danh)"}</dd>
            <dt className="text-muted-foreground">Lời nhắn</dt>
            <dd className="whitespace-pre-wrap text-foreground">{order.message ?? "—"}</dd>
            <dt className="text-muted-foreground">Bức tường cảm ơn</dt>
            <dd className="text-foreground">
              {!order.show_on_wall ? "Người ủng hộ không muốn hiện" : order.wall_approved ? "Đang hiện" : "Chờ duyệt"}
            </dd>
          </dl>
          {order.show_on_wall && order.status === "paid" && (
            <ActionNoticeScope className="mt-4 flex flex-col gap-3">
              <div>
                {order.wall_approved ? (
                  <OrderActionButton action={adminWallAction} label="Gỡ khỏi bức tường" fields={{ ...fields, "quyet-dinh": "go" }} danger />
                ) : (
                  <OrderActionButton action={adminWallAction} label="Duyệt lời nhắn" fields={{ ...fields, "quyet-dinh": "duyet" }} variant="primary" />
                )}
              </div>
            </ActionNoticeScope>
          )}
        </section>
      )}

      <section aria-labelledby="nhat-ky" className="flex flex-col gap-3">
        <h2 id="nhat-ky" className="font-serif text-xl font-semibold text-foreground">
          Nhật ký thanh toán ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có sự kiện nào.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2 p-0" data-testid="event-log">
            {events.map((event) => (
              <li
                key={event.id}
                className={cn("rounded-lg border p-3 text-sm", event.signature_ok ? "border-border bg-surface" : "border-accent/50 bg-accent/5")}
              >
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold text-foreground">{SOURCE_LABELS[event.source] ?? event.source}</span>
                  <span className="text-muted-foreground">{formatDateTime(event.received_at)}</span>
                  {event.status && <span className="font-mono text-foreground">{event.status}</span>}
                  {event.amount_vnd !== null && <span className="text-foreground">{formatVnd(event.amount_vnd)}</span>}
                  {!event.signature_ok && <span className="font-semibold text-accent">chữ ký sai</span>}
                </p>
                {noteLabel(event.note) && <p className="mt-1 text-foreground">{noteLabel(event.note)}</p>}
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted-foreground">Dữ liệu gốc</summary>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(event.payload, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
