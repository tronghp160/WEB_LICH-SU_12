import "server-only";

import { createClient } from "@/lib/supabase/server";
import { parseOrderStatus, type OrderStatus } from "@/lib/payments/order-status";
import { revenueQueryStart, summarizeRevenue, type PaidOrderRow, type RevenueSummary } from "@/lib/payments/stats";

// Truy vấn trang quản trị Đơn hàng (docs/ke-hoach-thanh-toan.md, mục 10). Đọc bằng PHIÊN của quản trị viên → RLS
// `admin_read` áp dụng (chỉ system_admin đọc được); mọi thao tác ghi nằm ở lib/actions/admin-payments.ts.

export const ORDER_PAGE_SIZE = 50;

export type OrderListFilter = { status: OrderStatus | null; query: string };

export type OrderListItem = {
  orderCode: number;
  status: OrderStatus;
  amountVnd: number;
  provider: string;
  productName: string;
  productKind: "exam_pack" | "donation";
  buyerEmail: string | null;
  createdAt: string;
  paidAt: string | null;
  wallPending: boolean;
};

export function parseOrderFilter(params: Record<string, string | string[] | undefined>): OrderListFilter {
  const status = typeof params["trang-thai"] === "string" ? parseOrderStatus(params["trang-thai"]) : null;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  return { status, query };
}

export async function listOrders(filter: OrderListFilter): Promise<OrderListItem[]> {
  const supabase = await createClient();
  let request = supabase
    .from("orders")
    .select("order_code, status, amount_vnd, provider, buyer_email, created_at, paid_at, show_on_wall, wall_approved, products(name, kind)")
    .order("created_at", { ascending: false })
    .limit(ORDER_PAGE_SIZE);
  if (filter.status) request = request.eq("status", filter.status);
  if (filter.query) {
    // Mã đơn (số) hoặc email; email so khớp không phân biệt hoa thường, bỏ ký tự đặc biệt của bộ lọc.
    if (/^\d{1,15}$/.test(filter.query)) request = request.eq("order_code", Number(filter.query));
    else request = request.ilike("buyer_email", `%${filter.query.replace(/[%_,()]/g, "")}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return data.map((order) => ({
    orderCode: order.order_code,
    status: order.status,
    amountVnd: order.amount_vnd,
    provider: order.provider,
    productName: order.products.name,
    productKind: order.products.kind,
    buyerEmail: order.buyer_email,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    wallPending: order.status === "paid" && order.show_on_wall && !order.wall_approved,
  }));
}

export type OrderDashboard = {
  revenue: RevenueSummary;
  statusCounts: Record<OrderStatus, number>;
  activeLicenses: number;
  wallPending: number;
  mismatches24h: number;
  badSignatures24h: number;
};

export async function getOrderDashboard(now = new Date()): Promise<OrderDashboard> {
  const supabase = await createClient();
  const since24h = new Date(now.getTime() - 86_400_000).toISOString();
  const count = (status: OrderStatus) => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", status);

  const [paid, pending, cancelled, expired, refunded, paidRows, licenses, wall, mismatches, badSignatures] = await Promise.all([
    count("paid"),
    count("pending"),
    count("cancelled"),
    count("expired"),
    count("refunded"),
    supabase.from("orders").select("amount_vnd, paid_at, products(kind)").eq("status", "paid").gte("paid_at", revenueQueryStart(now)),
    supabase.from("licenses").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid").eq("show_on_wall", true).eq("wall_approved", false),
    supabase.from("payment_events").select("id", { count: "exact", head: true }).eq("note", "amount_mismatch").gte("received_at", since24h),
    supabase.from("payment_events").select("id", { count: "exact", head: true }).eq("signature_ok", false).gte("received_at", since24h),
  ]);
  const failed = [paid, pending, cancelled, expired, refunded, paidRows, licenses, wall, mismatches, badSignatures].find((result) => result.error);
  if (failed?.error) throw failed.error;

  const rows: PaidOrderRow[] = (paidRows.data ?? []).flatMap((row) =>
    row.paid_at ? [{ amount_vnd: row.amount_vnd, paid_at: row.paid_at, kind: row.products.kind }] : [],
  );
  return {
    revenue: summarizeRevenue(rows, now),
    statusCounts: {
      paid: paid.count ?? 0,
      pending: pending.count ?? 0,
      cancelled: cancelled.count ?? 0,
      expired: expired.count ?? 0,
      refunded: refunded.count ?? 0,
    },
    activeLicenses: licenses.count ?? 0,
    wallPending: wall.count ?? 0,
    mismatches24h: mismatches.count ?? 0,
    badSignatures24h: badSignatures.count ?? 0,
  };
}

export async function getOrderDetail(orderCode: number) {
  if (!Number.isSafeInteger(orderCode)) return null;
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_code, status, amount_vnd, provider, provider_ref, buyer_email, display_name, message, show_on_wall, wall_approved, expires_at, paid_at, created_at, updated_at, products(slug, name, kind), licenses(id, code, status, max_devices, valid_until, created_at, license_activations(device_hash, activated_at, last_seen_at))",
    )
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const { data: events, error: eventsError } = await supabase
    .from("payment_events")
    .select("id, source, signature_ok, status, amount_vnd, provider_ref, note, payload, received_at")
    .eq("order_code", orderCode)
    .order("received_at", { ascending: false })
    .limit(100);
  if (eventsError) throw eventsError;
  return { order, events };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
