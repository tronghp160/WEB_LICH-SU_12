import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type DisclosureProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

/** Khối thu gọn (thẻ <details> có kiểu): ghi công ảnh, nguồn, "Xem thêm". Không cần JavaScript. */
export function Disclosure({ summary, children, defaultOpen, className }: DisclosureProps) {
  return (
    <details open={defaultOpen} className={cn("group rounded-card border border-border bg-surface", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}
