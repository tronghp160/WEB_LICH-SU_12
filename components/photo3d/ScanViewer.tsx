"use client";

import { ExternalLink, Rotate3d } from "lucide-react";
import { useState } from "react";
import type { LessonScan3D } from "@/lib/lessons/types";

/**
 * Mô hình quét 3D xoay 360° (Sketchfab) tải lười: trước khi bấm chỉ là ảnh xem trước; bấm "Xoay 360°" mới chèn trình xem
 * chính thức của Sketchfab (`dnt=1`: không theo dõi). Luôn có link mở trang gốc và ghi công tác giả.
 */
export function ScanViewer({ scan, autoStart = false, onStarted }: { scan: LessonScan3D; autoStart?: boolean; onStarted?: () => void }) {
  const [started, setStarted] = useState(autoStart);
  const pageUrl = `https://sketchfab.com/3d-models/${scan.sketchfabId}`;
  const embedUrl = `https://sketchfab.com/models/${scan.sketchfabId}/embed?autostart=1&ui_theme=dark&dnt=1&ui_hint=2`;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-border bg-[#1b1d22] sm:aspect-[16/10]" data-testid="scan-stage">
        {started ? (
          <iframe
            src={embedUrl}
            title={`Mô hình 3D xoay 360°: ${scan.title}`}
            allow="autoplay; fullscreen; xr-spatial-tracking"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            data-testid="scan-iframe"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setStarted(true);
              onStarted?.();
            }}
            className="group absolute inset-0 flex flex-col items-center justify-end gap-2 p-5 focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-gold"
            aria-label={`Xoay 360°: ${scan.title}`}
            data-testid="scan-start"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước do Sketchfab lưu trữ */}
            <img src={scan.poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
            <span className="relative inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-accent-foreground shadow-lg transition-transform group-hover:scale-105">
              <Rotate3d className="h-5 w-5" aria-hidden="true" />
              Xoay 360°
            </span>
            <span className="relative rounded bg-black/55 px-2 py-0.5 text-xs text-white/85">
              Mô hình 3D · kéo để xoay mọi phía, cuộn để phóng to · tải khoảng {scan.sizeMb} MB
              {scan.sizeMb >= 20 && " (nên dùng Wi-Fi)"}
            </span>
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Mô hình 3D:{" "}
        <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          {scan.title}
        </a>{" "}
        — tác giả{" "}
        <a href={scan.authorUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          {scan.author}
        </a>
        , đăng trên Sketchfab. {scan.note}{" "}
        <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
          Mở trang gốc
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">(mở tab mới)</span>
        </a>
      </p>
    </div>
  );
}
