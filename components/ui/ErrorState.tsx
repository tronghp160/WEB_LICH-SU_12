"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

/** Trạng thái lỗi có nút "Thử lại", thông báo tiếng Việt (Mục 6, Quy tắc 5). */
export function ErrorState({
  title = "Có lỗi xảy ra",
  description = "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng và thử lại.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center">
      <AlertTriangle className="h-10 w-10 text-accent" aria-hidden="true" />
      <p className="font-serif text-lg font-semibold text-surface-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
