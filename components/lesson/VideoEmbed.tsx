"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import type { LessonVideo } from "@/lib/lessons/types";

/**
 * Video YouTube tải lười: trước khi bấm chỉ là ảnh thu nhỏ (không tải trình phát, không cookie theo dõi);
 * bấm "Phát" mới chèn iframe youtube-nocookie. Luôn có link mở thẳng trên YouTube làm phương án dự phòng.
 */
export function VideoEmbed({ video, priority = false }: { video: LessonVideo; priority?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-card border border-border bg-black">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-gold"
            aria-label={`Phát video: ${video.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh thu nhỏ của YouTube, host ngoài */}
            <img
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              loading={priority ? "eager" : "lazy"}
              className="absolute inset-0 h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
            />
            <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform group-hover:scale-110">
              <Play className="ml-1 h-8 w-8" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex flex-col gap-1">
        <span className="font-semibold text-foreground">{video.title}</span>
        <span className="text-sm text-muted-foreground">
          {video.channel} · {video.note}
        </span>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          Xem trên YouTube
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(mở tab mới)</span>
        </a>
      </figcaption>
    </figure>
  );
}
