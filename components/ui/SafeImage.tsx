"use client";

import { ImageOff } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Tỉ lệ khung khi ảnh chưa/không tải được, ví dụ "aspect-[4/3]". */
  fallbackClassName?: string;
  style?: CSSProperties;
  /** Kích thước thật (nếu biết) để trình duyệt giữ chỗ, tránh nhảy bố cục. */
  width?: number;
  height?: number;
  srcSet?: string;
  /** Bắt buộc đi kèm srcSet, ví dụ "(min-width: 640px) 50vw, 100vw". */
  sizes?: string;
  /** Ảnh đầu trang (LCP) nên tải ngay. */
  priority?: boolean;
};

/**
 * Ảnh minh họa có phương án dự phòng: ảnh lỗi tải (URL chết, mạng chập chờn…) thì
 * hiện khung với `alt` thay thế thay vì icon ảnh vỡ (Phase 7, mục 7).
 *
 * Dùng <img> thay vì next/image vì `file_url` có thể trỏ tới bất kỳ máy chủ nào
 * (Wikimedia Commons, Supabase Storage…), không cấu hình trước được từng host.
 */
export function SafeImage({ src, alt, className, fallbackClassName, style, width, height, srcSet, sizes, priority }: SafeImageProps) {
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
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      style={style}
      onError={() => setFailed(true)}
      // Ảnh có thể đã lỗi TRƯỚC khi React hydrate (onError khi đó không được gọi).
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
    />
  );
}
