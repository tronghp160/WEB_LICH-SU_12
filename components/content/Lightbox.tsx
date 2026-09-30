"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MediaCredit, MediaLabels } from "@/components/content/MediaCredit";
import type { MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils/cn";
import { responsiveImage } from "@/lib/utils/text";

type LightboxContextValue = { open: (mediaId: string) => void };

const LightboxContext = createContext<LightboxContextValue | null>(null);

/**
 * Xem ảnh cỡ lớn (GĐ2): một <dialog> dùng chung cho mọi ảnh của trang. Phím ←/→ chuyển ảnh, Esc đóng
 * (mặc định của <dialog>), vuốt ngang trên điện thoại; hiện nhãn trung thực, chú thích và ghi công đầy đủ.
 */
export function LightboxProvider({ items, children }: { items: MediaItem[]; children: ReactNode }) {
  const images = items.filter((item) => item.type === "image");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const swipeStart = useRef<number | null>(null);

  const open = useCallback(
    (mediaId: string) => {
      const found = images.findIndex((item) => item.id === mediaId);
      if (found === -1) return;
      setIndex(found);
      dialogRef.current?.showModal();
    },
    [images],
  );

  const step = useCallback(
    (delta: number) => setIndex((current) => (current === null ? current : (current + delta + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    const onClose = () => setIndex(null);
    dialog.addEventListener("keydown", onKey);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("keydown", onKey);
      dialog.removeEventListener("close", onClose);
    };
  }, [step]);

  const item = index === null ? null : images[index];
  const many = images.length > 1;

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label={item ? `Ảnh ${index! + 1}/${images.length}: ${item.caption ?? item.altText ?? ""}` : "Xem ảnh"}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        // Bấm ra nền tối (chính <dialog>, không phải nội dung bên trong) thì đóng.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        onPointerDown={(event) => {
          swipeStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (swipeStart.current === null) return;
          const delta = event.clientX - swipeStart.current;
          swipeStart.current = null;
          if (many && Math.abs(delta) > 60) step(delta < 0 ? 1 : -1);
        }}
      >
        {item && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-white/80">
              <span>{many ? `${index! + 1} / ${images.length}` : ""}</span>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                aria-label="Đóng (Esc)"
                autoFocus
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tự lưu nhiều cỡ, dùng srcset */}
              <img
                key={item.id}
                {...responsiveImage(item.url, 2000)}
                sizes="100vw"
                alt={item.altText ?? item.caption ?? ""}
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
              />
              {many && (
                <>
                  <NavButton side="left" onClick={() => step(-1)} label="Ảnh trước (←)" />
                  <NavButton side="right" onClick={() => step(1)} label="Ảnh sau (→)" />
                </>
              )}
            </div>

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-4 text-sm">
              <MediaLabels item={item} className="[&_li]:border-white/20 [&_li]:bg-white/10 [&_li]:text-white/85" />
              {item.caption && <p className="text-white/90">{item.caption}</p>}
              <MediaCredit item={item} className="text-white/65 [&_a:hover]:text-white" />
            </div>
          </div>
        )}
      </dialog>
    </LightboxContext.Provider>
  );
}

function NavButton({ side, onClick, label }: { side: "left" | "right"; onClick: () => void; label: string }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sm:inline-flex",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="h-7 w-7" aria-hidden="true" />
    </button>
  );
}

/**
 * Nút bọc quanh ảnh: bấm để xem cỡ lớn. Ngoài LightboxProvider (ví dụ trang không cần xem lớn) thì chỉ hiện
 * nội dung, không có nút.
 */
export function LightboxTrigger({
  mediaId,
  label,
  className,
  children,
}: {
  mediaId: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const context = useContext(LightboxContext);
  if (!context) return <>{children}</>;
  return (
    <button
      type="button"
      onClick={() => context.open(mediaId)}
      aria-label={`Xem ảnh lớn: ${label}`}
      className={cn(
        "block w-full cursor-zoom-in text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
        className,
      )}
    >
      {children}
    </button>
  );
}
