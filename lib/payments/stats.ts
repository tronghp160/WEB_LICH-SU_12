// Thống kê doanh thu cho trang quản trị Đơn hàng (docs/ke-hoach-thanh-toan.md, mục 10) — hàm thuần, unit test được.
// "Hôm nay" tính theo giờ Việt Nam (Asia/Ho_Chi_Minh), không theo giờ của máy chủ (Vercel chạy UTC).

import type { ProductKind } from "@/lib/payments/types";

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

export type PaidOrderRow = { amount_vnd: number; paid_at: string; kind: ProductKind };

export type RevenueWindow = { count: number; amountVnd: number; examPackVnd: number; donationVnd: number };

export type RevenueSummary = { today: RevenueWindow; last7Days: RevenueWindow; last30Days: RevenueWindow };

/** Ngày lịch Việt Nam dạng "YYYY-MM-DD". */
export function vnDate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: VN_TIME_ZONE });
}

const emptyWindow = (): RevenueWindow => ({ count: 0, amountVnd: 0, examPackVnd: 0, donationVnd: 0 });

function add(window: RevenueWindow, row: PaidOrderRow) {
  window.count += 1;
  window.amountVnd += row.amount_vnd;
  if (row.kind === "exam_pack") window.examPackVnd += row.amount_vnd;
  else window.donationVnd += row.amount_vnd;
}

/** Doanh thu hôm nay / 7 ngày / 30 ngày (tính cả hôm nay) theo ngày lịch Việt Nam. Chỉ nhận đơn đã thanh toán. */
export function summarizeRevenue(rows: readonly PaidOrderRow[], now: Date): RevenueSummary {
  const today = vnDate(now);
  const dayStart = (daysAgo: number) => vnDate(new Date(now.getTime() - daysAgo * 86_400_000));
  const from7 = dayStart(6);
  const from30 = dayStart(29);
  const summary: RevenueSummary = { today: emptyWindow(), last7Days: emptyWindow(), last30Days: emptyWindow() };
  for (const row of rows) {
    const day = vnDate(new Date(row.paid_at));
    if (day > today) continue;
    if (day >= from30) add(summary.last30Days, row);
    if (day >= from7) add(summary.last7Days, row);
    if (day === today) add(summary.today, row);
  }
  return summary;
}

/** Thời điểm bắt đầu cửa sổ 30 ngày (để truy vấn chỉ lấy đủ dữ liệu cần tính). */
export function revenueQueryStart(now: Date): string {
  return new Date(now.getTime() - 31 * 86_400_000).toISOString();
}

/** Một mã bị dùng hết lượt thiết bị trong thời gian ngắn → có thể đang bị chia sẻ lên mạng (mục 15). */
export function looksShared(activations: readonly { activated_at: string }[], maxDevices: number, withinHours = 24): boolean {
  if (activations.length < maxDevices || activations.length === 0) return false;
  const times = activations.map((item) => new Date(item.activated_at).getTime()).sort((a, b) => a - b);
  return times[times.length - 1] - times[0] <= withinHours * 3_600_000;
}
