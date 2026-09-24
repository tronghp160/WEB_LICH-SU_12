"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Tỉ lệ khung khi ảnh chưa/không tải được, ví dụ "aspect-[4/3]". */
  fallbackClassName?: string;
};

/**
 * Ảnh minh họa có phương án dự phòng: ảnh lỗi tải (URL chết, mạng chập chờn…) thì
 * hiện khung với `alt` thay thế thay vì icon ảnh vỡ (Phase 7, mục 7).
 *
 * Dùng <img> thay vì next/image vì `file_url` có thể trỏ tới bất kỳ máy chủ nào
 * (Wikimedia Commons, Supabase Storage…), không cấu hình trước được từng host.
 */
export function SafeImage({ src, alt, className, fallbackClassName }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-muted p-4 text-center text-sm text-muted-foreground",
          fallbackClassName,
        )}
      >
        <ImageOff className="h-8 w-8" aria-hidden="true" />
        <span>Không tải được ảnh</span>
        {alt && <span className="line-clamp-3 text-xs">{alt}</span>}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- host ảnh tùy ý, xem chú thích ở đầu component
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailed(true)}
      // Ảnh có thể đã lỗi TRƯỚC khi React hydrate (onError khi đó không được gọi).
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
    />
  );
}
