import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

/** Trạng thái danh sách rỗng, dùng tiếng Việt (Mục 6, Quy tắc 5). */
export function EmptyState({
  title = "Chưa có nội dung",
  description = "Không tìm thấy dữ liệu phù hợp. Vui lòng thử lại với điều kiện khác.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <p className="font-serif text-lg font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
