import { AlertTriangle, BookMarked, Lightbulb, Target } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type CalloutVariant = "info" | "note" | "warning" | "goal";

const variants: Record<CalloutVariant, { className: string; icon: typeof Lightbulb; label: string }> = {
  info: { className: "border-info/40 bg-info-bg text-foreground [--callout:var(--info)]", icon: Lightbulb, label: "Em có biết?" },
  note: { className: "border-note/40 bg-note-bg text-foreground [--callout:var(--note)]", icon: BookMarked, label: "Ghi nhớ" },
  warning: { className: "border-warning/40 bg-warning-bg text-foreground [--callout:var(--warning)]", icon: AlertTriangle, label: "Lưu ý" },
  goal: { className: "border-border-strong bg-surface-raised text-foreground [--callout:var(--accent)]", icon: Target, label: "Yêu cầu cần đạt" },
};

type CalloutProps = {
  variant: CalloutVariant;
  /** Tiêu đề hộp; mặc định theo loại ("Em có biết?", "Ghi nhớ"…). */
  title?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Hộp nội dung có ngữ nghĩa, dùng thống nhất toàn web: `info` (Em có biết?), `note` (Ghi nhớ), `warning` (minh họa /
 * gần đúng), `goal` (Yêu cầu cần đạt). Màu luôn đi kèm biểu tượng và tiêu đề chữ.
 */
export function Callout({ variant, title, children, className }: CalloutProps) {
  const { className: variantClass, icon: Icon, label } = variants[variant];
  return (
    <aside className={cn("rounded-card border border-l-4 border-l-[var(--callout)] p-4 sm:p-5", variantClass, className)}>
      <p className="flex items-center gap-2 font-semibold text-[var(--callout)]">
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {title ?? label}
      </p>
      <div className="mt-2 text-[0.95rem] leading-relaxed">{children}</div>
    </aside>
  );
}
