"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INTERVAL_MS = 3000;
const MAX_TRIES = 40; // ≈ 2 phút

/** Đơn đang chờ xác nhận: tải lại dữ liệu trang mỗi 3 giây (tối đa 2 phút), rồi gợi ý tải lại thủ công. */
export function PendingRefresher() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= MAX_TRIES) return;
    const timer = window.setTimeout(() => {
      router.refresh();
      setTries((value) => value + 1);
    }, INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [router, tries]);

  return tries >= MAX_TRIES ? (
    <p className="text-sm text-muted-foreground">
      Chưa nhận được xác nhận. Nếu em đã chuyển khoản, hãy tải lại trang sau ít phút — tiền đã vào thì mã sẽ hiện ra.
    </p>
  ) : (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      Trang tự cập nhật khi có kết quả…
    </p>
  );
}
