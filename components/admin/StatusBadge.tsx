import { cn } from "@/lib/utils/cn";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

// Màu nhất quán theo Mục 6: draft xám · pending_review vàng · needs_revision cam · published xanh lá · hidden đỏ nhạt.
const statusClasses: Record<WorkflowStatus, string> = {
  draft: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100",
  pending_review: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100",
  needs_revision: "bg-orange-200 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100",
  published: "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-100",
  hidden: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function StatusBadge({ status, className }: { status: WorkflowStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        statusClasses[status],
        className,
      )}
    >
      {workflowStatusLabels[status]}
    </span>
  );
}
