"use client";

import { Box, Info, Maximize2, Minimize2, MousePointer2, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";
import type { ModelSpec } from "@/lib/models3d/types";
import type { ViewerRuntime } from "@/components/model3d/runtime";

type Phase = "idle" | "loading" | "ready" | "unsupported" | "error";

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

type ModelViewerProps = {
  spec: ModelSpec;
  /** Tự dựng ngay khi hiện (dùng khi người xem đã bấm xem một mô hình cùng nhóm). */
  autoStart?: boolean;
  onStarted?: () => void;
  /** true: bật `window.__model3d` cho kiểm thử tự động. */
  debug?: boolean;
  className?: string;
};

/**
 * Khung xem mô hình 3D: xoay bằng chuột/ngón tay, phóng to bằng cuộn, bấm điểm chú thích để đọc giải thích.
 * Three.js và mô hình chỉ được nạp SAU KHI người xem bấm "Xem mô hình 3D"; khung cuộn ra khỏi màn hình thì tạm dừng vẽ.
 */
export function ModelViewer({ spec, autoStart = false, onStarted, debug = false, className }: ModelViewerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const visibleRef = useRef(true);
  const startedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [selected, setSelected] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const dispose = useCallback(() => {
    runtimeRef.current?.dispose();
    runtimeRef.current = null;
    startedRef.current = false;
  }, []);
  useEffect(() => dispose, [dispose]);

  const start = useCallback(async () => {
    if (startedRef.current) return;
    if (!webglAvailable()) {
      setPhase("unsupported");
      return;
    }
    startedRef.current = true;
    onStarted?.();
    setPhase("loading");
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const { createViewer } = await import("@/components/model3d/runtime");
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Không có canvas");
      const runtime = await createViewer({
        canvas,
        spec,
        reducedMotion,
        onLost: () => {
          runtimeRef.current = null;
          startedRef.current = false;
          setPhase("idle");
        },
      });
      runtimeRef.current = runtime;
      runtime.setVisible(visibleRef.current);
      runtime.resize();
      setPhase("ready");
      if (debug) (window as unknown as Record<string, unknown>).__model3d = {
        stats: () => runtime.stats(),
        runAction: (id: string) => runtime.runAction(id),
        advance: (seconds: number) => runtime.advance(seconds),
        setView: (position: [number, number, number], target: [number, number, number]) => runtime.setView(position, target),
      };
    } catch (error) {
      console.error(`Không dựng được mô hình "${spec.id}"`, error);
      dispose();
      setPhase("error");
    }
  }, [debug, dispose, onStarted, reducedMotion, spec]);

  useEffect(() => {
    if (!autoStart) return;
    const id = requestAnimationFrame(() => void start());
    return () => cancelAnimationFrame(id);
  }, [autoStart, start]);

  // Tạm dừng vẽ khi cuộn ra khỏi màn hình
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        runtimeRef.current?.setVisible(entry.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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

  const toggleFullscreen = async () => {
    const element = stageRef.current;
    if (!element) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await element.requestFullscreen?.();
  };

  const select = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    runtimeRef.current?.focusHotspot(next);
  };

  const selectedHotspot = spec.hotspots.find((h) => h.id === selected) ?? null;
  const ready = phase === "ready";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={stageRef}
        role="group"
        aria-label={`Mô hình 3D: ${spec.title}. ${spec.description} Kéo chuột hoặc dùng phím mũi tên để xoay, cuộn để phóng to.`}
        className={cn("relative isolate w-full overflow-hidden rounded-card border border-border bg-[#11141b] text-white", fullscreen ? "h-full rounded-none border-0" : "aspect-[4/5] sm:aspect-[16/10]")}
        data-testid="model-stage"
        data-phase={phase}
        data-model={spec.id}
      >
        <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full outline-none", !ready && "invisible")} tabIndex={ready ? 0 : -1} data-testid="model-canvas" />

        {!ready && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,#3a4256_0%,#161a24_60%,#0c0e14_100%)]" aria-hidden="true" />
            <Box className="h-9 w-9 text-[#f3d9a4]" aria-hidden="true" />
            <h3 className="font-serif text-2xl font-bold text-balance sm:text-3xl">{spec.title}</h3>
            {phase === "idle" && (
              <>
                <p className="max-w-md text-sm text-white/85">{spec.summary}</p>
                <Button size="lg" onClick={() => void start()} data-testid="model-start">
                  <Play className="h-5 w-5" aria-hidden="true" />
                  Xem mô hình 3D
                </Button>
                <p className="text-xs text-white/55">Chỉ tải khi bạn bấm xem. Kéo để xoay, cuộn để phóng to.</p>
              </>
            )}
            {phase === "loading" && (
              <p role="status" aria-live="polite" className="text-sm text-white/85">
                Đang dựng mô hình 3D…
              </p>
            )}
            {phase === "unsupported" && (
              <p role="alert" className="max-w-md rounded-card border border-white/30 bg-black/60 p-3 text-sm">
                Thiết bị này không hỗ trợ đồ họa 3D (WebGL). Bạn vẫn đọc được phần mô tả và các chú thích bên dưới.
              </p>
            )}
            {phase === "error" && (
              <div role="alert" className="flex max-w-md flex-col items-center gap-3 rounded-card border border-white/30 bg-black/60 p-3 text-sm">
                <p>Không dựng được mô hình 3D trên thiết bị này.</p>
                <Button
                  variant="secondary"
                  className="text-white"
                  onClick={() => {
                    setPhase("idle");
                  }}
                >
                  Thử lại
                </Button>
              </div>
            )}
          </div>
        )}

        {ready && (
          <>
            {spec.hotspots.map((hotspot, index) => (
              <button
                key={hotspot.id}
                type="button"
                ref={(element) => runtimeRef.current?.setHotspotElement(hotspot.id, element)}
                onClick={() => select(hotspot.id)}
                aria-label={hotspot.label}
                aria-pressed={selected === hotspot.id}
                className={cn(
                  "absolute left-0 top-0 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold shadow-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                  selected === hotspot.id ? "bg-gold text-black" : "bg-accent text-white hover:bg-accent/90",
                )}
                style={{ opacity: 0 }}
                data-testid="model-hotspot"
              >
                {index + 1}
              </button>
            ))}
            <div className="absolute right-2 top-2 z-20 flex gap-1">
              <button type="button" onClick={() => runtimeRef.current?.resetView()} className="flex h-9 items-center gap-1 rounded-full bg-black/55 px-3 text-xs hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label="Về góc nhìn ban đầu">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Góc ban đầu</span>
              </button>
              <button type="button" onClick={() => void toggleFullscreen()} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                {fullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <p className="pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-[11px] text-white/80" aria-hidden="true">
              <MousePointer2 className="h-3 w-3" />
              Kéo để xoay · cuộn để phóng to
            </p>
            {spec.actions && spec.actions.length > 0 && (
              <div className="absolute bottom-2 right-2 z-20 flex gap-2">
                {spec.actions.map((action) => (
                  <Button key={action.id} size="sm" onClick={() => runtimeRef.current?.runAction(action.id)} data-testid={`model-action-${action.id}`}>
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {spec.hotspots.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-wrap gap-2" aria-label="Các chi tiết của mô hình">
            {spec.hotspots.map((hotspot, index) => (
              <li key={hotspot.id}>
                <button
                  type="button"
                  onClick={() => select(hotspot.id)}
                  aria-pressed={selected === hotspot.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                    selected === hotspot.id ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-foreground hover:bg-muted",
                  )}
                >
                  <span className="text-xs font-bold opacity-70">{index + 1}</span>
                  {hotspot.label}
                </button>
              </li>
            ))}
          </ul>
          <div aria-live="polite" className="min-h-[3.25rem] rounded-card border border-border bg-muted p-3 text-sm" data-testid="model-hotspot-text">
            {selectedHotspot ? (
              <>
                <p className="font-serif font-bold text-foreground">{selectedHotspot.label}</p>
                <p className="mt-1 text-surface-foreground">{selectedHotspot.text}</p>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                {spec.description}
              </p>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{spec.note}</p>
    </div>
  );
}
