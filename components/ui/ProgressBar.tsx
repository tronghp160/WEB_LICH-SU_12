import { cn } from "@/lib/utils/cn";

type ProgressBarProps = {
  /** 0–1. */
  value: number;
  label: string;
  /** Hiện số phần trăm bên phải thanh. */
  showValue?: boolean;
  className?: string;
};

/** Thanh tiến độ có nhãn cho trình đọc màn hình (role="progressbar"). Màu lấy từ --topic nếu khối cha có màu chủ đề. */
export function ProgressBar({ value, label, showValue, className }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-[var(--topic,var(--success))]" style={{ width: `${percent}%` }} />
      </div>
      {showValue && <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{percent}%</span>}
    </div>
  );
}
