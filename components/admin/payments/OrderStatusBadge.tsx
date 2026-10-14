import { orderStatusLabels, type OrderStatus } from "@/lib/payments/order-status";
import { cn } from "@/lib/utils/cn";

// Cùng bảng màu với StatusBadge của nội dung: chờ vàng · đã trả xanh lá · hủy/hết hạn xám · hoàn tiền đỏ nhạt.
const classes: Record<OrderStatus, string> = {
  pending: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100",
  paid: "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-100",
  cancelled: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100",
  expired: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100",
  refunded: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn("inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", classes[status], className)}>
      {orderStatusLabels[status]}
    </span>
  );
}
