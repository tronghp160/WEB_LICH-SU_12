"use client";

import { Button } from "@/components/ui/Button";

// Error boundary gốc (cho các khu vực ngoài nhóm (public), và lỗi ở layout của nhóm đó).
// Dùng retry() (ổn định từ Next.js 16.3): tải lại dữ liệu từ server rồi vẽ lại;
// reset() thì không refetch nên không cứu được lỗi phát sinh ở Server Component.
export default function RootError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold text-foreground">Đã có lỗi xảy ra</h1>
      <p className="max-w-md text-muted-foreground">
        Rất tiếc, trang gặp sự cố ngoài ý muốn. Bạn có thể thử tải lại trang này.
      </p>
      <Button variant="primary" onClick={() => retry()}>
        Thử lại
      </Button>
    </div>
  );
}
