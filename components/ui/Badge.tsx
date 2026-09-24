import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "accent" | "gold" | "muted" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  accent: "bg-accent text-accent-foreground",
  gold: "bg-gold text-gold-foreground",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-foreground",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

/**
 * Nhãn nhỏ. Mặc định rút gọn bằng "…" khi hẹp chỗ (max-w-full + truncate) để
 * nhãn dài (ví dụ tên chủ đề) không làm vỡ bố cục. Nhãn quan trọng, không được
 * cắt (ví dụ độ chính xác thời gian) thì thêm className="shrink-0".
 */
export function Badge({ variant = "muted", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
