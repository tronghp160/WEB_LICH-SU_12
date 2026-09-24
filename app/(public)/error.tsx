"use client";

import { ErrorState } from "@/components/ui/ErrorState";

// Error boundary cho các trang công khai: giữ nguyên header/footer (vì nằm
// TRONG layout của nhóm (public)), chỉ thay phần nội dung bằng ErrorState.
// retry() tải lại dữ liệu từ server rồi vẽ lại — reset() thì không refetch.
export default function PublicError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <ErrorState onRetry={() => retry()} />
    </div>
  );
}
