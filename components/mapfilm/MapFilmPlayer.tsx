"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Clapperboard, Crosshair, Info, Layers, Maximize2, Minimize2, Pause, Play, Repeat, Subtitles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { CHAPTER_CARD_SECONDS, formatTime, subtitleAt } from "@/lib/cinema/timeline";
import { smoothstep } from "@/lib/cinema/math";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { getMapFilm } from "@/lib/mapfilm";
import type { MapFilmRuntime, MapFilmState } from "@/components/mapfilm/runtime";
import type { Basemap } from "@/components/mapfilm/map-base";

type Phase = "idle" | "loading" | "ready" | "unsupported" | "error";

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

type MapFilmPlayerProps = {
  slug: string;
  /** Ảnh nền khung giới thiệu; mặc định lấy từ kịch bản. */
  posterSrc?: string;
  posterAlt?: string;
  /** Tự bắt đầu ngay khi hiện (dùng khi người xem đã bấm nút "3D" ở ngoài). */
  autoStart?: boolean;
  /** true: bật `window.__mapfilm` cho kiểm thử tự động. */
  debug?: boolean;
  /** Gọi khi không chạy được 3D, để trang chuyển về bản đồ 2D. */
  onFallback?: () => void;
  className?: string;
};

const ICON_BUTTON =
  "flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2 text-xs hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45";

/**
 * "Phim trên bản đồ 3D": bấm từng giai đoạn, bản đồ địa hình 3D tự bay, nghiêng, xoay; quân tiến theo mũi tên, pháo bắn,
 * cứ điểm nổ và đổi cờ; có thuyết minh, phụ đề. Trong lúc chạy vẫn kéo/xoay/phóng bản đồ được (camera tự do).
 * MapLibre, Three.js và dữ liệu địa hình chỉ tải SAU KHI người xem bấm.
 */
export function MapFilmPlayer({ slug, posterSrc, posterAlt, autoStart = false, debug = false, onFallback, className }: MapFilmPlayerProps) {
  const script = getMapFilm(slug);
  const reducedMotion = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<MapFilmRuntime | null>(null);
  const startedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ fraction: 0, label: "" });
  const [state, setState] = useState<MapFilmState>({ scene: 0, t: 0, playing: false, sceneEnded: false, freeCamera: false, factVisible: false });
  const [muted, setMuted] = useState(false);
  const [narration, setNarration] = useState(true);
  const [narrationAvailable, setNarrationAvailable] = useState(true);
  // Mặc định nền "cổ điển" (tô màu theo độ cao, kiểu bản đồ SGK): ảnh vệ tinh là cảnh NGÀY NAY, dễ bị hiểu là năm 1954.
  const [basemap, setBasemap] = useState<Basemap>("classic");
  const [continuous, setContinuous] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Giai đoạn mà người xem đã đóng thẻ "Bạn có biết?" (sang giai đoạn khác thì thẻ hiện lại). */
  const [factDismissedAt, setFactDismissedAt] = useState<number | null>(null);

  const dispose = useCallback(() => {
    runtimeRef.current?.dispose();
    runtimeRef.current = null;
  }, []);
  useEffect(() => dispose, [dispose]);

  const start = useCallback(async () => {
    if (!script || startedRef.current) return;
    if (!webglAvailable()) {
      setPhase("unsupported");
      return;
    }
    startedRef.current = true;
    setPhase("loading");
    setProgress({ fraction: 0.05, label: "Đang tải bộ máy bản đồ 3D…" });
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const { createMapFilmRuntime } = await import("@/components/mapfilm/runtime");
      const container = mapRef.current;
      if (!container) throw new Error("Không có khung bản đồ");
      const runtime = await createMapFilmRuntime({
        container,
        script,
        basemap,
        reducedMotion,
        debug,
        onState: setState,
        onNarrationAvailability: setNarrationAvailable,
        onProgress: (fraction, label) => setProgress({ fraction, label }),
      });
      runtimeRef.current = runtime;
      setPhase("ready");
      runtime.resize();
      await runtime.play();
    } catch (error) {
      console.error("Không khởi động được bản đồ 3D", error);
      dispose();
      startedRef.current = false;
      setPhase("error");
    }
    // basemap chỉ dùng làm giá trị ban đầu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug, dispose, reducedMotion, script]);

  useEffect(() => {
    if (!autoStart) return;
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
  }, [autoStart, start]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element || phase !== "ready") return;
    const observer = new ResizeObserver(() => runtimeRef.current?.resize());
    observer.observe(element);
    return () => observer.disconnect();
  }, [phase]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!script) return null;
  const scenes = script.scenes;
  const scene = scenes[state.scene];
  const step = script.scenario.steps.find((s) => s.id === scene.stepId)!;
  const subtitle = subtitleAt(scene, state.t);
  const cardAlpha = state.t <= CHAPTER_CARD_SECONDS ? smoothstep(0, 0.5, state.t) * (1 - smoothstep(CHAPTER_CARD_SECONDS - 0.9, CHAPTER_CARD_SECONDS, state.t)) : 0;
  const isLast = state.scene === scenes.length - 1;
  const showFact = factDismissedAt !== state.scene;

  const goTo = (index: number) => runtimeRef.current?.goToScene(index, true);
  const toggle = () => void runtimeRef.current?.toggle();
  const toggleMute = () => {
    setMuted(!muted);
    runtimeRef.current?.setMuted(!muted);
  };
  const toggleNarration = () => {
    setNarration(!narration);
    runtimeRef.current?.setNarration(!narration);
  };
  const toggleBasemap = () => {
    const next = basemap === "satellite" ? "classic" : "satellite";
    setBasemap(next);
    runtimeRef.current?.setBasemap(next);
  };
  const toggleContinuous = () => {
    setContinuous(!continuous);
    runtimeRef.current?.setContinuous(!continuous);
  };
  const toggleFullscreen = async () => {
    const element = stageRef.current;
    if (!element) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await element.requestFullscreen?.();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const runtime = runtimeRef.current;
    if (phase !== "ready" || !runtime || (event.target as HTMLElement).closest("input")) return;
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") {
      event.preventDefault();
      toggle();
    } else if (key === "n" || key === "pagedown") goTo(Math.min(scenes.length - 1, state.scene + 1));
    else if (key === "p" || key === "pageup") goTo(Math.max(0, state.scene - 1));
    else if (key === "arrowleft" && event.shiftKey) runtime.seek(state.t - 5);
    else if (key === "arrowright" && event.shiftKey) runtime.seek(state.t + 5);
    else if (key === "m") toggleMute();
    else if (key === "f") void toggleFullscreen();
    else if (key === "c") runtime.recenter();
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div
          ref={stageRef}
          tabIndex={-1}
          role="region"
          aria-label={`Bản đồ 3D: ${script.title}. Phím Cách phát/tạm dừng, N và P chuyển giai đoạn, Shift + mũi tên tua 5 giây, M tắt tiếng, C về góc máy phim, F toàn màn hình. Kéo chuột để xoay, cuộn để phóng to bản đồ.`}
          onKeyDown={onKeyDown}
          className={cn(
            "relative isolate w-full overflow-hidden rounded-card border border-border bg-[#0d1117] text-white",
            fullscreen ? "h-full rounded-none border-0" : "aspect-[4/5] sm:aspect-video",
          )}
          data-testid="mapfilm-stage"
          data-phase={phase}
          data-scene={state.scene}
        >
          <div ref={mapRef} className={cn("absolute inset-0", phase !== "ready" && "invisible")} />

          {phase !== "ready" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh đã nén trong public/ */}
              <img src={posterSrc ?? script.poster.src} alt={posterAlt ?? script.poster.alt} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/30" aria-hidden="true" />
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[#f3d9a4]">
                <Clapperboard className="h-4 w-4" aria-hidden="true" />
                Bản đồ 3D · {scenes.length} giai đoạn
              </p>
              <h3 className="font-serif text-2xl font-bold text-balance sm:text-4xl">{script.title}</h3>
              {phase === "idle" && (
                <>
                  <p className="max-w-xl text-sm text-white/85 sm:text-base">
                    Chiến dịch diễn ra ngay trên bản đồ địa hình 3D: camera bay vào lòng chảo, pháo bắn, bộ đội xung phong theo mũi tên, cứ điểm nổ tung và đổi cờ.
                    Bấm từng giai đoạn để xem; trong lúc chạy vẫn kéo, xoay, phóng to bản đồ được.
                  </p>
                  <Button size="lg" onClick={() => void start()} data-testid="mapfilm-start">
                    <Play className="h-5 w-5" aria-hidden="true" />
                    Xem bản đồ 3D
                  </Button>
                  <p className="text-xs text-white/60">Cần Internet để tải địa hình và ảnh vệ tinh. Nên bật loa.</p>
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
              {(phase === "unsupported" || phase === "error") && (
                <div role="alert" className="flex max-w-lg flex-col items-center gap-3 rounded-card border border-white/30 bg-black/60 p-4 text-sm">
                  <p>
                    {phase === "unsupported"
                      ? "Trình duyệt hoặc thiết bị này không hỗ trợ đồ họa 3D (WebGL 2). Bạn vẫn xem được bản đồ 2D."
                      : "Không khởi động được bản đồ 3D (có thể do mạng hoặc thiết bị). Bạn vẫn xem được bản đồ 2D."}
                  </p>
                  <div className="flex gap-2">
                    {phase === "error" && (
                      <Button variant="secondary" className="text-white" onClick={() => setPhase("idle")}>
                        Thử lại
                      </Button>
                    )}
                    {onFallback && (
                      <Button variant="secondary" className="text-white" onClick={onFallback}>
                        Về bản đồ 2D
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "ready" && (
            <>
              {cardAlpha > 0 && (
                <div className="pointer-events-none absolute inset-x-0 top-[10%] z-10 flex flex-col items-center gap-1 px-4 text-center" style={{ opacity: cardAlpha }} aria-hidden="true">
                  {scene.chapter.clock && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f3d9a4] drop-shadow sm:text-sm">{scene.chapter.clock}</p>}
                  <p className="font-serif text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-5xl">{scene.chapter.title}</p>
                </div>
              )}

              <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[70%] rounded-lg bg-black/55 px-3 py-1.5 text-xs backdrop-blur-sm sm:text-sm" aria-hidden="true">
                <span className="font-semibold text-[#f3d9a4]">
                  {state.scene + 1}/{scenes.length}
                </span>{" "}
                {step.title}
                {step.dateText && <span className="text-white/70"> · {step.dateText}</span>}
              </div>

              {basemap === "satellite" && (
                <p className="pointer-events-none absolute left-3 top-12 z-10 rounded-lg bg-black/55 px-3 py-1 text-xs text-white/85 backdrop-blur-sm" data-testid="mapfilm-satellite-note">
                  Nền: ảnh vệ tinh ngày nay, không phải cảnh năm 1954
                </p>
              )}

              {state.freeCamera && (
                <button
                  type="button"
                  onClick={() => runtimeRef.current?.recenter()}
                  className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  data-testid="mapfilm-recenter"
                >
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                  Về góc máy phim
                </button>
              )}

              {state.factVisible && showFact && step.fact && (
                <aside className="absolute right-3 top-14 z-10 hidden w-72 rounded-card border border-white/15 bg-black/70 p-3 text-sm backdrop-blur md:block" data-testid="mapfilm-fact">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-semibold text-[#f3d9a4]">
                      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {step.fact.title}
                    </p>
                    <button type="button" onClick={() => setFactDismissedAt(state.scene)} className="rounded px-1 text-white/70 hover:text-white" aria-label="Đóng thẻ">
                      ×
                    </button>
                  </div>
                  <p className="text-white/85">{step.fact.text}</p>
                </aside>
              )}

              {scene.stepId === "dot-3" && state.t > 9 && state.t < 20 && (
                <Link
                  href="/phim-3d/doi-a1"
                  className="absolute right-3 top-14 z-10 flex items-center gap-1.5 rounded-full border border-white/30 bg-black/65 px-3 py-1.5 text-xs font-semibold hover:bg-black/80"
                >
                  <Clapperboard className="h-4 w-4" aria-hidden="true" />
                  Xem cận cảnh: phim 3D Đồi A1
                </Link>
              )}

              {subtitle && (
                <p className="pointer-events-none absolute inset-x-3 bottom-[5.25rem] z-10 mx-auto max-w-3xl rounded-lg bg-black/72 px-3 py-2 text-center text-sm leading-snug text-white sm:bottom-24 sm:px-4 sm:text-lg" aria-hidden="true">
                  {subtitle.text}
                </p>
              )}

              {state.sceneEnded && (
                <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center sm:bottom-28">
                  {isLast ? (
                    <Button size="lg" onClick={() => goTo(0)}>
                      <Repeat className="h-5 w-5" aria-hidden="true" />
                      Xem lại từ đầu
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => goTo(state.scene + 1)} data-testid="mapfilm-next">
                      Giai đoạn tiếp: {script.scenario.steps.find((s) => s.id === scenes[state.scene + 1].stepId)?.title}
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              )}

              {/* Thanh điều khiển */}
              <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-2 pb-2 pt-6 sm:px-3">
                <input
                  type="range"
                  min={0}
                  max={scene.duration}
                  step={0.1}
                  value={state.t}
                  onChange={(event) => runtimeRef.current?.seek(Number(event.target.value))}
                  aria-label="Tua trong giai đoạn"
                  aria-valuetext={`${formatTime(state.t)} trên ${formatTime(scene.duration)}`}
                  className="h-2 w-full cursor-pointer accent-[var(--accent)]"
                />
                <div className="flex items-center gap-0.5 sm:gap-1.5">
                  <button type="button" className={ICON_BUTTON} onClick={() => goTo(Math.max(0, state.scene - 1))} disabled={state.scene === 0} aria-label="Giai đoạn trước">
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button type="button" className={ICON_BUTTON} onClick={toggle} aria-label={state.playing ? "Tạm dừng" : "Phát"} data-testid="mapfilm-toggle">
                    {state.playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                  </button>
                  <button type="button" className={ICON_BUTTON} onClick={() => goTo(Math.min(scenes.length - 1, state.scene + 1))} disabled={isLast} aria-label="Giai đoạn sau">
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <span className="ml-1 min-w-[4.5rem] text-xs tabular-nums text-white/85">
                    {formatTime(state.t)} / {formatTime(scene.duration)}
                  </span>
                  <span className="ml-auto flex items-center gap-0.5 sm:gap-1">
                    <button type="button" className={cn(ICON_BUTTON, continuous && "bg-white/15")} onClick={toggleContinuous} aria-pressed={continuous} title="Phát liên tục qua mọi giai đoạn">
                      <Repeat className="h-5 w-5" aria-hidden="true" />
                      <span className="hidden sm:inline">Liên tục</span>
                    </button>
                    <button type="button" className={ICON_BUTTON} onClick={toggleBasemap} aria-label={basemap === "satellite" ? "Đổi sang nền bản đồ cổ điển" : "Đổi sang nền ảnh vệ tinh"} data-testid="mapfilm-basemap">
                      <Layers className="h-5 w-5" aria-hidden="true" />
                      <span className="hidden sm:inline">{basemap === "satellite" ? "Vệ tinh" : "Cổ điển"}</span>
                    </button>
                    <button type="button" className={ICON_BUTTON} onClick={toggleMute} aria-label={muted ? "Bật tiếng" : "Tắt tiếng"} aria-pressed={muted}>
                      {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      className={cn(ICON_BUTTON, narration && narrationAvailable && "bg-white/15")}
                      onClick={toggleNarration}
                      disabled={!narrationAvailable}
                      aria-pressed={narration && narrationAvailable}
                      aria-label={narrationAvailable ? (narration ? "Tắt giọng thuyết minh" : "Bật giọng thuyết minh") : "Máy này chưa có giọng đọc tiếng Việt"}
                      title={narrationAvailable ? "Giọng thuyết minh" : "Máy này chưa có giọng đọc tiếng Việt — chỉ có phụ đề"}
                    >
                      <Subtitles className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button type="button" className={ICON_BUTTON} onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                      {fullscreen ? <Minimize2 className="h-5 w-5" aria-hidden="true" /> : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </span>
                </div>
              </div>
              <div className="sr-only" aria-live="polite">
                {subtitle?.text ?? ""}
              </div>
            </>
          )}
        </div>

        {/* Danh sách giai đoạn */}
        <nav aria-label="Các giai đoạn của chiến dịch" className="min-w-0 rounded-card border border-border bg-surface p-2">
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {scenes.map((s, index) => {
              const stepInfo = script.scenario.steps.find((st) => st.id === s.stepId)!;
              const active = index === state.scene && phase === "ready";
              return (
                <li key={s.stepId} className="min-w-[11rem] lg:min-w-0">
                  <button
                    type="button"
                    onClick={() => (phase === "ready" ? goTo(index) : void start())}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                      active && "bg-accent text-accent-foreground hover:bg-accent",
                    )}
                    data-testid="mapfilm-scene"
                  >
                    <span className={cn("text-xs font-semibold", active ? "text-accent-foreground/85" : "text-gold-deep")}>
                      {index + 1}. {stepInfo.dateText}
                    </span>
                    <span className="font-medium">{stepInfo.title}</span>
                    {active && (
                      <span className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/30" aria-hidden="true">
                        <span className="block h-full bg-white" style={{ width: `${(state.t / s.duration) * 100}%` }} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {phase === "ready" && state.factVisible && step.fact && (
        <aside className="rounded-card border border-border bg-muted p-3 text-sm md:hidden">
          <p className="font-semibold text-foreground">{step.fact.title}</p>
          <p className="text-muted-foreground">{step.fact.text}</p>
        </aside>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Chú giải bản đồ 3D">
        <li className="flex items-center gap-1.5"><span className="mapfilm-legend mapfilm-legend--held" aria-hidden="true" />Cứ điểm của Pháp (cờ Pháp)</li>
        <li className="flex items-center gap-1.5"><span className="mapfilm-legend mapfilm-legend--attacked" aria-hidden="true" />Đang bị tiến công</li>
        <li className="flex items-center gap-1.5"><span className="mapfilm-legend mapfilm-legend--captured" aria-hidden="true" />Ta đã tiêu diệt (cờ đỏ sao vàng)</li>
        <li className="flex items-center gap-1.5"><span className="mapfilm-legend mapfilm-legend--arrow" aria-hidden="true" />Hướng tiến công của ta</li>
        <li className="flex items-center gap-1.5"><span className="mapfilm-legend mapfilm-legend--siege" aria-hidden="true" />Vòng vây</li>
      </ul>
      <p className="text-xs text-muted-foreground">
        Mô phỏng minh họa: quân, pháo, cứ điểm được phóng to như quân cờ trên sa bàn để dễ nhìn, không theo tỉ lệ; thời gian trong mỗi giai đoạn được nén lại.
        Vị trí cứ điểm theo di tích trên OpenStreetMap (Bản Kéo, Hồng Cúm và các hướng tiến công Đông – Xuân là gần đúng). Nền: ảnh vệ tinh Esri, Maxar, Earthstar
        Geographics; độ cao Terrain Tiles (Mapzen, AWS Open Data; SRTM – NASA/USGS); biên giới Natural Earth. Mô hình, âm thanh do chương trình tự tạo.
      </p>

      <details className="rounded-card border border-border bg-muted p-4 text-sm">
        <summary className="cursor-pointer font-medium">Lời thuyết minh (văn bản)</summary>
        <ol className="mt-3 flex flex-col gap-3 text-foreground">
          {scenes.map((s, index) => (
            <li key={s.stepId}>
              <p className="font-semibold">
                {index + 1}. {s.chapter.title}
                {s.chapter.clock && <span className="font-normal text-muted-foreground"> — {s.chapter.clock}</span>}
              </p>
              <p className="text-muted-foreground">{s.subtitles.map((sub) => sub.text).join(" ")}</p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
