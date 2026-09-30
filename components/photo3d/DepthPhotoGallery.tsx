"use client";

import { Box, Info, Maximize2, Minimize2, MousePointer2, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDepthRenderer, sampleDepths, type DepthRenderer } from "@/components/photo3d/depth-renderer";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import type { LessonImage } from "@/lib/lessons/types";
import { approach, clamp, FOCUS_DEPTH, idleSway, projectPoint, tiltFromPointer, ZOOM_STEPS, zoomCenter, type Vec2 } from "@/lib/photo3d/parallax";
import { cn } from "@/lib/utils/cn";

export type DepthPhotoItem = {
  id: string;
  title: string;
  /** Lời giải thích chung (hiện khi chưa chọn điểm chú thích nào). */
  text?: string;
  image: LessonImage;
};

type Phase = "idle" | "loading" | "ready" | "unsupported";

const IDLE_AFTER_MS = 2500;
const CENTER: Vec2 = { x: 0.5, y: 0.5 };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Không tải được ${src}`));
    image.src = src;
  });
}

function Credit({ image }: { image: LessonImage }) {
  return (
    <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
      {image.credit}
    </a>
  );
}

/**
 * Một khung "ảnh thật có chiều sâu": ban đầu là ảnh tĩnh (nhẹ, đọc được khi chưa có JS); bấm "Xem ảnh 3D" thì dựng WebGL,
 * rê/kéo để nghiêng nhìn, phóng to, các điểm chú thích đánh số di chuyển theo đúng lớp sâu của chúng.
 */
function DepthPhotoStage({ item, autoStart, onStarted }: { item: DepthPhotoItem; autoStart: boolean; onStarted: () => void }) {
  const { image } = item;
  const hotspots = useMemo(() => image.hotspots ?? [], [image.hotspots]);
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<number | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rendererRef = useRef<DepthRenderer | null>(null);
  const depthsRef = useRef<number[]>(hotspots.map(() => FOCUS_DEPTH));
  // Trạng thái chuyển động đọc trong vòng vẽ (không qua React để không render lại mỗi khung hình).
  const motion = useRef({ tilt: { x: 0, y: 0 }, target: { x: 0, y: 0 }, pointer: { x: 0.5, y: 0.5 }, lastInput: 0, zoom: 1, center: CENTER });

  const zoom = ZOOM_STEPS[zoomIndex];
  useEffect(() => {
    motion.current.zoom = zoom;
  }, [zoom]);

  const placeMarkers = useCallback(() => {
    const { tilt, zoom: z, center } = motion.current;
    hotspots.forEach((hotspot, index) => {
      const element = markerRefs.current[index];
      if (!element) return;
      const at = projectPoint({ x: hotspot.x / 100, y: hotspot.y / 100 }, depthsRef.current[index], tilt, z, center);
      const visible = at.x > 0.02 && at.x < 0.98 && at.y > 0.02 && at.y < 0.98;
      element.style.left = `${at.x * 100}%`;
      element.style.top = `${at.y * 100}%`;
      element.style.visibility = visible ? "visible" : "hidden";
    });
  }, [hotspots]);

  const start = useCallback(async () => {
    if (phase !== "idle") return;
    onStarted();
    setPhase("loading");
    try {
      const [photo, depth] = await Promise.all([loadImage(image.src), loadImage(image.depthSrc ?? image.src)]);
      depthsRef.current = sampleDepths(depth, hotspots.map((h) => ({ x: h.x / 100, y: h.y / 100 })));
      const renderer = canvasRef.current ? createDepthRenderer(canvasRef.current, photo, depth) : null;
      if (!renderer) {
        setPhase("unsupported");
        return;
      }
      rendererRef.current = renderer;
      setPhase("ready");
    } catch {
      setPhase("unsupported");
    }
  }, [phase, image.src, image.depthSrc, hotspots, onStarted]);

  // Người xem đã bấm xem một ảnh cùng nhóm → ảnh mới chọn tự dựng luôn (hoãn sang khung hình sau, không setState trong effect).
  useEffect(() => {
    if (!autoStart) return;
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
  }, [autoStart, start]);

  // Vòng vẽ: chỉ chạy khi đã dựng xong và khung đang hiện trên màn hình.
  useEffect(() => {
    if (phase !== "ready") return;
    const renderer = rendererRef.current;
    const frame = frameRef.current;
    if (!renderer || !frame) return;
    let frameId = 0;
    let visible = true;
    let last = performance.now();
    const startedAt = last;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = motion.current;
      const idle = now - m.lastInput > IDLE_AFTER_MS;
      const goal = idle && !reducedMotion && m.zoom === 1 ? idleSway((now - startedAt) / 1000) : m.target;
      m.tilt = approach(m.tilt, goal, dt, idle ? 2 : 7);
      m.center = approach(m.center, m.zoom === 1 ? CENTER : zoomCenter(m.pointer, m.zoom), dt, 5);
      renderer.draw(m.tilt, m.zoom, m.center);
      placeMarkers();
      // Nghiêng nhẹ cả khung theo phối cảnh cho cảm giác cầm tấm ảnh 3D trên tay.
      if (stageRef.current) stageRef.current.style.transform = `rotateY(${m.tilt.x * 4}deg) rotateX(${-m.tilt.y * 3}deg)`;
      if (visible) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    const observer = new IntersectionObserver(([entry]) => {
      const nowVisible = entry.isIntersecting;
      if (nowVisible && !visible) {
        last = performance.now();
        frameId = requestAnimationFrame(tick);
      }
      visible = nowVisible;
    });
    observer.observe(frame);
    const onResize = () => renderer.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [phase, reducedMotion, placeMarkers]);

  // Giải phóng WebGL khi đổi ảnh / rời trang.
  useEffect(() => () => rendererRef.current?.dispose(), []);

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === frameRef.current);
      requestAnimationFrame(() => rendererRef.current?.resize());
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function onPointer(event: React.PointerEvent) {
    if (phase !== "ready") return;
    // Chuột: rê là nghiêng. Cảm ứng: chỉ khi đang kéo (để vẫn cuộn trang được).
    if (event.pointerType !== "mouse" && event.buttons === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    const m = motion.current;
    m.pointer = pointer;
    m.target = tiltFromPointer(pointer);
    m.lastInput = performance.now();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (phase !== "ready") return;
    const m = motion.current;
    const step = 0.25;
    const moves: Record<string, Vec2> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      m.target = { x: clamp(m.target.x + move.x, -1, 1), y: clamp(m.target.y + move.y, -1, 1) };
      m.pointer = { x: 0.5 + m.target.x / 2, y: 0.5 + m.target.y / 2 };
      m.lastInput = performance.now();
    } else if (event.key === "+" || event.key === "=") {
      setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1));
    } else if (event.key === "-") {
      setZoomIndex((i) => Math.max(0, i - 1));
    }
  }

  function resetView() {
    const m = motion.current;
    m.target = { x: 0, y: 0 };
    m.pointer = { x: 0.5, y: 0.5 };
    m.lastInput = performance.now();
    setZoomIndex(0);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frameRef.current?.requestFullscreen?.().catch(() => undefined);
  }

  const ready = phase === "ready";
  const selectedHotspot = selected === null ? null : hotspots[selected];
  const aspect = image.width && image.height ? `${image.width} / ${image.height}` : "4 / 3";

  return (
    <div className="flex flex-col gap-3">
      <div ref={frameRef} className={cn("relative [perspective:1200px]", fullscreen && "flex items-center justify-center bg-black")}>
        <div
          ref={stageRef}
          role="group"
          tabIndex={ready ? 0 : -1}
          aria-label={`Ảnh 3D: ${item.title}. ${image.alt}. Rê chuột hoặc dùng phím mũi tên để nghiêng nhìn, phím + và − để phóng to.`}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onKeyDown={onKeyDown}
          className={cn(
            "relative isolate mx-auto w-full touch-pan-y overflow-hidden rounded-card border border-border bg-black shadow-card transition-transform duration-75 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
            fullscreen ? "max-h-full max-w-full rounded-none border-0" : "max-h-[70vh]",
          )}
          style={{ aspectRatio: aspect, maxWidth: fullscreen ? undefined : `calc(70vh * ${image.width ?? 4} / ${image.height ?? 3})` }}
          data-testid="photo3d-stage"
          data-phase={phase}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh đã nén trong public/, hiện ngay trước khi dựng 3D */}
          <img src={image.src} alt={image.alt} className={cn("absolute inset-0 h-full w-full object-cover", ready && "invisible")} loading="lazy" />
          <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", !ready && "invisible")} aria-hidden="true" data-testid="photo3d-canvas" />

          {hotspots.map((hotspot, index) => (
            <button
              key={hotspot.label}
              ref={(element) => {
                markerRefs.current[index] = element;
              }}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Chi tiết ${index + 1}: ${hotspot.label}`}
              aria-pressed={selected === index}
              className={cn(
                "absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                selected === index ? "bg-gold text-black" : "bg-accent text-white hover:bg-accent/90",
              )}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
              data-testid="photo3d-hotspot"
            >
              {index + 1}
            </button>
          ))}

          {phase !== "ready" && (
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10 text-center text-white">
              {phase === "idle" && (
                <Button onClick={() => void start()} data-testid="photo3d-start">
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Xem ảnh 3D
                </Button>
              )}
              {phase === "loading" && (
                <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm">
                  <Box className="h-4 w-4" aria-hidden="true" />
                  Đang dựng ảnh 3D…
                </p>
              )}
              {phase === "unsupported" && (
                <p role="alert" className="text-sm">
                  Thiết bị này không hiển thị được ảnh 3D (WebGL). Ảnh thật và các chú thích vẫn xem được bình thường.
                </p>
              )}
            </div>
          )}

          {ready && (
            <>
              <div className="absolute right-2 top-2 z-20 flex gap-1 text-white">
                <button type="button" onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/75 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label="Phóng to">
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} disabled={zoomIndex === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/75 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label="Thu nhỏ">
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={resetView} className="flex h-9 items-center gap-1 rounded-full bg-black/55 px-3 text-xs hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label="Về góc nhìn ban đầu">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Góc ban đầu</span>
                </button>
                <button type="button" onClick={() => void toggleFullscreen()} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                  {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded bg-black/55 px-2 py-1 text-[11px] text-white/85" aria-hidden="true">
                <MousePointer2 className="h-3 w-3" />
                Rê chuột (hoặc kéo) để nghiêng nhìn
                {zoom > 1 && ` · phóng ${zoom}×`}
              </p>
            </>
          )}
        </div>
      </div>

      {hotspots.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`Các chi tiết trong ảnh ${item.title}`}>
          {hotspots.map((hotspot, index) => (
            <li key={hotspot.label}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-pressed={selected === index}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  selected === index ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:bg-muted",
                )}
              >
                <span className="text-xs font-bold opacity-70">{index + 1}</span>
                {hotspot.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div aria-live="polite" className="min-h-[3.25rem] rounded-card border border-border bg-muted p-3 text-sm" data-testid="photo3d-text">
        {selectedHotspot ? (
          <>
            <p className="font-serif font-bold text-foreground">{selectedHotspot.label}</p>
            <p className="mt-1 text-surface-foreground">{selectedHotspot.text}</p>
          </>
        ) : (
          <p className="flex items-start gap-1.5 text-surface-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {item.text ?? image.caption}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Ảnh: {image.caption} (<Credit image={image} />). Chiều sâu 3D do máy tính ước lượng từ chính ảnh chụp này; điểm ảnh là ảnh thật, không vẽ thêm.
      </p>
    </div>
  );
}

/** Nhiều ảnh 3D cùng chủ đề, chọn bằng thẻ; chỉ một khung WebGL hoạt động tại một thời điểm (giống thư viện mô hình cũ). */
export function DepthPhotoGallery({ items, label }: { items: DepthPhotoItem[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const item = items[index];
  const onStarted = useCallback(() => setStarted(true), []);
  if (!item) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : items.length - 1)) % items.length;
    setIndex(next);
    document.getElementById(`photo3d-tab-${items[next].id}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      {items.length > 1 && (
        <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-2 overflow-x-auto pb-1">
          {items.map((entry, i) => (
            <button
              key={entry.id}
              id={`photo3d-tab-${entry.id}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-controls={`photo3d-panel-${items[0].id}`}
              tabIndex={i === index ? 0 : -1}
              onClick={() => setIndex(i)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                i === index ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:bg-muted",
              )}
              data-testid="photo3d-tab"
            >
              {entry.title}
            </button>
          ))}
        </div>
      )}
      <div
        id={`photo3d-panel-${items[0].id}`}
        role={items.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={items.length > 1 ? `photo3d-tab-${item.id}` : undefined}
      >
        <DepthPhotoStage key={item.id} item={item} autoStart={started} onStarted={onStarted} />
      </div>
    </div>
  );
}
