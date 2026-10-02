import { FileText, PenLine, Sparkles } from "lucide-react";
import type { SgkLessonStatus } from "@/lib/sgk/curriculum";
import { cn } from "@/lib/utils/cn";

const STATUS: Record<SgkLessonStatus, { label: string; icon: typeof Sparkles; className: string }> = {
  ready: { label: "Có chuyên đề tương tác", icon: Sparkles, className: "text-accent" },
  partial: { label: "Có sự kiện liên quan", icon: FileText, className: "text-gold-deep" },
  drafting: { label: "Đang biên soạn", icon: PenLine, className: "text-muted-foreground" },
};

/** Nội dung của bài trên web đã có tới đâu (khác tiến độ của người học). */
export function LessonStatusBadge({ status, compact, className }: { status: SgkLessonStatus; compact?: boolean; className?: string }) {
  const { label, icon: Icon, className: tone } = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", tone, className)} title={label}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {compact ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}
