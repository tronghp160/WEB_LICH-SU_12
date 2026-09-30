"use client";

import { useId, useState } from "react";
import { MediaCredit } from "@/components/content/MediaCredit";
import { LightboxTrigger } from "@/components/content/Lightbox";
import type { MediaItem } from "@/lib/media";
import { responsiveImage } from "@/lib/utils/text";

/**
 * "Xưa và nay" (GĐ2): ảnh tư liệu và ảnh ngày nay của cùng một nơi chồng lên nhau, kéo thanh giữa để so sánh.
 * Điều khiển là <input type="range"> nên dùng được bằng bàn phím (←/→) và trình đọc màn hình.
 */
export function BeforeAfterSlider({ before, after }: { before: MediaItem; after: MediaItem }) {
  const [position, setPosition] = useState(50);
  const id = useId();

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] w-full select-none overflow-hidden rounded-card bg-muted has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-gold">
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tự lưu nhiều cỡ, dùng srcset */}
        <img
          {...responsiveImage(after.url, 1200)}
          sizes="(min-width: 1024px) 720px, 100vw"
          alt={after.altText ?? ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={after.focalPoint ? { objectPosition: after.focalPoint } : undefined}
          draggable={false}
        />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tự lưu nhiều cỡ, dùng srcset */}
          <img
            {...responsiveImage(before.url, 1200)}
            sizes="(min-width: 1024px) 720px, 100vw"
            alt={before.altText ?? ""}
            loading="lazy"
            className="h-full w-full object-cover"
            style={before.focalPoint ? { objectPosition: before.focalPoint } : undefined}
            draggable={false}
          />
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
          {before.labels[0] ?? "Xưa"}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
          {after.labels[0] ?? "Nay"}
        </span>

        {/* Vạch chia và tay nắm (trang trí); thao tác thật nằm ở ô range phủ toàn khung bên dưới. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{ left: `${position}%` }}
        >
          <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/60 text-sm font-bold text-white">
            ⇆
          </span>
        </div>

        <label htmlFor={id} className="sr-only">
          Kéo để so sánh ảnh xưa và ảnh nay (đang hiện {position}% ảnh xưa)
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>

      <figcaption className="grid gap-3 text-sm sm:grid-cols-2">
        {[before, after].map((item) => (
          <div key={item.id} className="flex flex-col gap-1">
            <LightboxTrigger mediaId={item.id} label={item.caption ?? item.altText ?? ""} className="w-auto underline-offset-2 hover:underline">
              <span className="font-medium text-foreground">{item.labels[0]}:</span>{" "}
              <span className="text-muted-foreground">{item.caption}</span>
            </LightboxTrigger>
            <MediaCredit item={item} />
          </div>
        ))}
      </figcaption>
    </figure>
  );
}
