import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

/** Khối chờ tải (loading placeholder) — dùng khi danh sách/nội dung đang fetch. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
