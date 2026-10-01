"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Ghi chú biên soạn (các chi tiết đang đối chiếu SGK) chỉ dành cho người biên tập: hiện khi mở trang bằng ?bien-tap=1
 * (V-28). Đọc tham số ở trình duyệt để trang chuyên đề vẫn được dựng sẵn lúc build.
 */
export function EditorNotes({ items }: { items: string[] }) {
  const visible = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get("bien-tap") === "1",
    () => false,
  );
  if (!visible || items.length === 0) return null;
  return (
    <details className="mt-4 rounded-card border border-border bg-muted p-4 text-sm">
      <summary className="cursor-pointer font-medium">Ghi chú biên soạn: các chi tiết đang được đối chiếu với SGK</summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}
