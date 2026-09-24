"use client";

import { Clapperboard, Maximize2, Minimize2, Move3d, Pause, Play, RotateCcw, Subtitles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { chapters, FILM_DURATION, FILM_TITLE, subtitles } from "@/lib/cinema/film-a1-text";
import { chapterAt, chapterCardAt, dawnAt, formatTime, subtitleAt } from "@/lib/cinema/timeline";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import type { Runtime } from "@/components/cinema3d/runtime";

type Phase = "idle" | "loading" | "ready" | "unsupported" | "error";

const TEXT = { subtitles, chapters };
const DAWN = { dawn: [84, 106] as [number, number] };

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

type CinemaPlayerProps = {
  /** Ảnh nền của khung giới thiệu (đã có sẵn trong bài học). */
  posterSrc: string;
  posterAlt: string;
  /** true: bật chế độ gỡ lỗi (`window.__cinema`) cho kiểm thử tự động. */
  debug?: boolean;
  className?: string;
};

/**
 * Trình phát "phim 3D" dựng ngay trong trình duyệt bằng Three.js. Mọi thứ nặng (Three.js, địa hình, âm thanh) chỉ được nạp
 * SAU KHI người xem bấm "Xem phim 3D" nên không ảnh hưởng tốc độ tải trang bài học.
 */
export function CinemaPlayer({ posterSrc, posterAlt, debug = false, className }: CinemaPlayerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ fraction: 0, label: "" });
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [narration, setNarration] = useState(true);
  const [narrationAvailable, setNarrationAvailable] = useState(true);
  const [freeCamera, setFreeCamera] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [degraded, setDegraded] = useState(false);

  const subtitle = subtitleAt(TEXT, time);
  const card = chapterCardAt(TEXT, time);
  const chapter = chapterAt(TEXT, time).chapter;
  const dawn = dawnAt(DAWN, time);

  const disposeRuntime = useCallback(() => {
    runtimeRef.current?.dispose();
    runtimeRef.current = null;
  }, []);
  useEffect(() => disposeRuntime, [disposeRuntime]);

  const start = useCallback(async () => {
    if (!webglAvailable()) {
      setPhase("unsupported");
      return;
    }
    setPhase("loading");
    setProgress({ fraction: 0.05, label: "Đang tải bộ máy 3D…" });
    try {
      // Bấm nút là cử chỉ của người dùng: dựng bộ máy 3D rồi phát ngay để trình duyệt cho phép âm thanh
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const { createRuntime } = await import("@/components/cinema3d/runtime");
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Không có canvas");
      const runtime = await createRuntime({
        canvas,
        demUrl: "/cinema/dbp-dem-a1.png",
        reducedMotion,
        debug,
        onTime: setTime,
        onPlaying: (isPlaying, isEnded) => {
          setPlaying(isPlaying);
          setEnded(isEnded);
        },
        onNarrationAvailability: setNarrationAvailable,
        onProgress: (fraction, label) => setProgress({ fraction, label }),
      });
      runtimeRef.current = runtime;
      const box = containerRef.current?.getBoundingClientRect();
      if (box) runtime.resize(box.width, box.height);
      setPhase("ready");
      await runtime.play();
      containerRef.current?.focus();
    } catch (error) {
      console.error("Không khởi động được phim 3D", error);
      disposeRuntime();
      setPhase("error");
    }
  }, [debug, disposeRuntime, reducedMotion]);

  // Co giãn theo khung
  useEffect(() => {
    const element = containerRef.current;
    if (!element || phase !== "ready") return;
    const observer = new ResizeObserver(([entry]) => runtimeRef.current?.resize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [phase]);

  // Ghi nhận chất lượng đồ họa bị tự hạ
  useEffect(() => {
    if (phase !== "ready") return;
    const id = window.setInterval(() => setDegraded((runtimeRef.current?.quality() ?? 0) > 0), 2000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const wake = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2800);
  }, []);
  useEffect(() => () => void (hideTimer.current && clearTimeout(hideTimer.current)), []);

  const toggle = () => void runtimeRef.current?.toggle();
  const seek = (value: number) => runtimeRef.current?.seek(value);
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    runtimeRef.current?.setMuted(next);
  };
  const toggleNarration = () => {
    const next = !narration;
    setNarration(next);
    runtimeRef.current?.setNarration(next);
  };
  const toggleCamera = () => {
    const next = !freeCamera;
    setFreeCamera(next);
    runtimeRef.current?.setFreeCamera(next);
  };
  const toggleFullscreen = async () => {
    const element = containerRef.current;
    if (!element) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await element.requestFullscreen?.();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (phase !== "ready") return;
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") {
      event.preventDefault();
      toggle();
    } else if (key === "arrowleft") {
      event.preventDefault();
      seek(runtime.time() - 5);
    } else if (key === "arrowright") {
      event.preventDefault();
      seek(runtime.time() + 5);
    } else if (key === "m") toggleMute();
    else if (key === "f") void toggleFullscreen();
    else if (key === "c") toggleCamera();
    wake();
  };

  const chapterMarks = useMemo(() => chapters.map((c) => ({ ...c, left: (c.t / FILM_DURATION) * 100 })), []);
  const showControls = phase === "ready" && (controlsVisible || !playing);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={containerRef}
        tabIndex={0}
        role="group"
        aria-label={`Phim 3D: ${FILM_TITLE}. Dùng phím Cách để phát hoặc tạm dừng, mũi tên trái phải để tua 5 giây, M tắt tiếng, C đổi camera, F toàn màn hình.`}
        onKeyDown={onKeyDown}
        onPointerMove={phase === "ready" ? wake : undefined}
        className={cn(
          "relative isolate w-full overflow-hidden rounded-card border border-border bg-black text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          // Khi đang phát luôn là khung 16:9; ở khung giới thiệu trên điện thoại cần cao hơn để đủ chỗ cho chữ và nút
          phase === "ready" ? "aspect-video" : "min-h-[27rem] sm:aspect-video sm:min-h-0",
          fullscreen && "rounded-none border-0",
        )}
        data-testid="cinema-stage"
        data-phase={phase}
      >
        <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full", phase !== "ready" && "invisible")} aria-hidden="true" />

        {/* Khung giới thiệu / đang tải / lỗi */}
        {phase !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh đã nén trong public/ */}
            <img src={posterSrc} alt={posterAlt} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/30" aria-hidden="true" />
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#f3d9a4]">
              <Clapperboard className="h-4 w-4" aria-hidden="true" />
              Phim 3D · {formatTime(FILM_DURATION)}
            </p>
            <h3 className="font-serif text-3xl font-bold text-balance sm:text-5xl">{FILM_TITLE}</h3>
            {phase === "idle" && (
              <>
                <p className="max-w-xl text-sm text-white/85 sm:text-base">
                  Trận đánh đồi A1 dựng lại bằng đồ họa 3D trên địa hình lòng chảo Điện Biên Phủ thật: vụ nổ bộc phá, bộ đội xung phong, rạng sáng
                  cắm cờ. Có âm thanh, thuyết minh tiếng Việt và phụ đề.
                </p>
                <Button size="lg" onClick={() => void start()} data-testid="cinema-start">
                  <Play className="h-5 w-5" aria-hidden="true" />
                  Xem phim 3D
                </Button>
                <p className="text-xs text-white/60">Chỉ tải khi bạn bấm xem (chưa đầy 1 MB). Nên bật loa hoặc tai nghe.</p>
              </>
            )}
            {phase === "loading" && (
              <div role="status" aria-live="polite" className="flex w-full max-w-md flex-col items-center gap-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
                </div>
                <p className="text-sm text-white/85">{progress.label || "Đang chuẩn bị…"}</p>
              </div>
            )}
            {phase === "unsupported" && (
              <p role="alert" className="max-w-lg rounded-card border border-white/30 bg-black/60 p-4 text-sm">
                Trình duyệt hoặc thiết bị này không hỗ trợ đồ họa 3D (WebGL). Bạn vẫn có thể xem bản đồ diễn biến và video ở trên, hoặc thử lại bằng
                Chrome, Edge hay Firefox mới.
              </p>
            )}
            {phase === "error" && (
              <div role="alert" className="flex max-w-lg flex-col items-center gap-3 rounded-card border border-white/30 bg-black/60 p-4 text-sm">
                <p>Không khởi động được phim 3D trên thiết bị này. Bạn vẫn xem được bản đồ diễn biến và video ở trên.</p>
                <Button variant="secondary" onClick={() => setPhase("idle")}>
                  Thử lại
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "ready" && (
          <>
            {/* Dải đen trên/dưới tạo cảm giác màn ảnh rộng */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[5.5%] bg-black" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[5.5%] bg-black" aria-hidden="true" />

            {!card && (
              <div className="pointer-events-none absolute left-4 top-[8%] text-xs font-semibold uppercase tracking-widest text-white/80 drop-shadow sm:text-sm" aria-hidden="true">
                {chapter.clock ?? chapters.find((c) => c.clock && c.t <= chapter.t)?.clock ?? ""}
              </div>
            )}

            {card && (
              <div
                className="pointer-events-none absolute inset-x-0 top-[14%] flex flex-col items-center gap-1 text-center"
                style={{ opacity: card.alpha }}
                aria-hidden="true"
              >
                {card.chapter.clock && <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#f3d9a4] sm:text-base">{card.chapter.clock}</p>}
                <p className="font-serif text-3xl font-bold text-white drop-shadow-lg sm:text-6xl">{card.chapter.title}</p>
              </div>
            )}

            {subtitle && (
              <p
                className={cn(
                  "pointer-events-none absolute inset-x-4 mx-auto max-w-3xl rounded-lg bg-black/70 px-4 py-2 text-center text-sm leading-snug text-white transition-[bottom] duration-300 sm:text-lg",
                  showControls ? "bottom-[17%] sm:bottom-[15%]" : "bottom-[8%]",
                )}
                aria-live="off"
              >
                {subtitle.text}
              </p>
            )}

            {degraded && (
              <p className="pointer-events-none absolute right-3 top-[7.5%] rounded bg-black/60 px-2 py-1 text-[11px] text-white/80">Đã tự giảm chất lượng đồ họa cho mượt</p>
            )}

            {ended && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                <Button size="lg" onClick={toggle}>
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  Xem lại từ đầu
                </Button>
              </div>
            )}

            {/* Thanh điều khiển */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-8 transition-opacity duration-300",
                showControls ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={FILM_DURATION}
                  step={0.1}
                  value={time}
                  onChange={(event) => seek(Number(event.target.value))}
                  aria-label="Tua phim"
                  aria-valuetext={`${formatTime(time)} trên ${formatTime(FILM_DURATION)}, chương ${chapter.title}`}
                  className="h-2 w-full cursor-pointer accent-[var(--accent)]"
                />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2" aria-hidden="true">
                  {chapterMarks.slice(1).map((mark) => (
                    <span key={mark.t} className="absolute h-3 w-0.5 -translate-y-1/2 bg-white/60" style={{ left: `${mark.left}%` }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button type="button" onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label={playing ? "Tạm dừng" : "Phát"}>
                  {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                </button>
                <span className="min-w-[5.5rem] text-xs tabular-nums text-white/85 sm:text-sm">
                  {formatTime(time)} / {formatTime(FILM_DURATION)}
                </span>
                <span className="hidden truncate text-xs text-white/70 md:inline">{chapter.title}</span>
                <span className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={toggleMute} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label={muted ? "Bật tiếng" : "Tắt tiếng"} aria-pressed={muted}>
                    {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleNarration}
                    disabled={!narrationAvailable}
                    className={cn("flex h-9 items-center gap-1 rounded-full px-2 text-xs hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45", narration && narrationAvailable && "bg-white/15")}
                    aria-label={narrationAvailable ? (narration ? "Tắt giọng thuyết minh" : "Bật giọng thuyết minh") : "Máy này chưa có giọng đọc tiếng Việt"}
                    aria-pressed={narration && narrationAvailable}
                    title={narrationAvailable ? "Giọng thuyết minh" : "Máy này chưa có giọng đọc tiếng Việt — chỉ có phụ đề"}
                  >
                    <Subtitles className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline">Thuyết minh</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={cn("flex h-9 items-center gap-1 rounded-full px-2 text-xs hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold", freeCamera && "bg-white/15")}
                    aria-pressed={freeCamera}
                    aria-label={freeCamera ? "Quay lại camera điện ảnh" : "Bật camera tự do (kéo chuột để xoay, cuộn để phóng to)"}
                    title="Camera tự do: kéo chuột để xoay, cuộn để phóng to"
                  >
                    <Move3d className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline">{freeCamera ? "Tự do" : "Điện ảnh"}</span>
                  </button>
                  <button type="button" onClick={() => void toggleFullscreen()} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                    {fullscreen ? <Minimize2 className="h-5 w-5" aria-hidden="true" /> : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </span>
              </div>
            </div>
            <div className="sr-only" aria-live="polite">
              {card ? card.chapter.title : ""}
            </div>
          </>
        )}
        {/* giữ biến dawn được dùng để mở rộng (đổi màu HUD theo trời sáng) */}
        <span className="hidden" data-dawn={dawn.toFixed(2)} />
      </div>

      <p className="text-xs text-muted-foreground sm:hidden">Mẹo: xoay ngang điện thoại hoặc bấm nút toàn màn hình để xem rõ hơn.</p>
      <p className="text-xs text-muted-foreground">
        Cảnh dựng minh họa bằng đồ họa 3D trên địa hình lòng chảo thật (dữ liệu độ cao mở). Đồi A1, công sự, số lượng và động tác của nhân vật được giản lược;
        không phải tư liệu quay hay ảnh chụp lịch sử. Toàn bộ hình khối, ánh sáng và âm thanh do chương trình tự tạo, không dùng mô hình hay âm thanh có bản quyền.
        Dữ liệu độ cao: Terrain Tiles (Mapzen, AWS Open Data; gồm dữ liệu SRTM của NASA/USGS). Vị trí các địa danh: © OpenStreetMap contributors.
      </p>

      <details className="rounded-card border border-border bg-muted p-4 text-sm">
        <summary className="cursor-pointer font-medium">Lời thuyết minh (văn bản)</summary>
        <ol className="mt-3 flex flex-col gap-2 text-foreground">
          {subtitles.map((s) => (
            <li key={s.t0}>
              <span className="mr-2 font-mono text-xs text-muted-foreground">{formatTime(s.t0)}</span>
              {s.text}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
