"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ghi log lỗi phía client để phục vụ gỡ lỗi (chưa gắn dịch vụ theo dõi lỗi).
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold text-foreground">Đã có lỗi xảy ra</h1>
      <p className="max-w-md text-muted-foreground">
        Rất tiếc, trang gặp sự cố ngoài ý muốn. Bạn có thể thử tải lại trang này.
      </p>
      <Button variant="primary" onClick={() => reset()}>
        Thử lại
      </Button>
    </div>
  );
}
