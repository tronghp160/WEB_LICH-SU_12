"use client";

import { catchError, type ErrorInfo } from "next/error";
import { ErrorState } from "@/components/ui/ErrorState";

type SectionErrorProps = {
  title?: string;
  description?: string;
};

function SectionErrorFallback({ title, description }: SectionErrorProps, { retry }: ErrorInfo) {
  // retry() tải lại dữ liệu từ server rồi vẽ lại (reset() thì không refetch nên
  // không cứu được lỗi phát sinh ở Server Component).
  return <ErrorState title={title} description={description} onRetry={() => retry()} />;
}

/**
 * Error boundary theo từng khu vực của trang (Next.js `catchError`): một khu
 * vực lỗi chỉ hiện ErrorState + nút "Thử lại" ở chỗ đó, phần còn lại của trang
 * vẫn dùng được.
 */
export const SectionErrorBoundary = catchError(SectionErrorFallback);
