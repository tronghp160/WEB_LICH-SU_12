"use client";

import dynamic from "next/dynamic";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { interpolateFrame } from "@/lib/battles/animation";
import type { BattleScenario } from "@/lib/battles/types";
import { cn } from "@/lib/utils/cn";

// Leaflet cần `window` nên chỉ nạp ở trình duyệt.
const BattleMap = dynamic(() => import("@/components/battle/BattleMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

/** Thời gian di chuyển giữa hai bước và thời gian dừng trước khi tự sang bước kế (chế độ "Phát"). */
const MOVE_MS = 2200;
const HOLD_MS = 3400;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Người dùng bật "giảm chuyển động" → nhảy thẳng tới vị trí của bước, không hoạt hình. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

type Motion = {
  from: number;
  to: number;
  /** Tiến độ chuyển động từ bước `from` sang `to`, 0–1. */
  t: number;
  /** Tăng mỗi lần bắt đầu chuyển động mới để hiệu ứng khởi động lại đúng lúc. */
  run: number;
};

const legendItems = [
  { kind: "invader-ship", label: "Thuyền chiến Nam Hán" },
  { kind: "defender-boat", label: "Thuyền nhẹ của Ngô Quyền" },
  { kind: "defender-land", label: "Quân mai phục hai bờ" },
] as const;

/**
 * Mô phỏng trận đánh trên bản đồ: nút Phát/Tạm dừng, chuyển bước, thanh chọn bước và danh sách bước.
 * Toàn bộ nội dung chữ nằm trong danh sách bước nên vẫn đọc được khi bản đồ chưa tải hoặc bị tắt hoạt hình.
 */
export function BattleReenactment({ scenario }: { scenario: BattleScenario }) {
  const { steps } = scenario;
  const last = steps.length - 1;
  const reducedMotion = usePrefersReducedMotion();

  const [motion, setMotion] = useState<Motion>({ from: 0, to: 0, t: 1, run: 0 });
  const [playing, setPlaying] = useState(false);
  const { from, to, run } = motion;
  const settled = motion.t >= 1;

  const goTo = useCallback(
    (index: number) => {
      const target = Math.min(last, Math.max(0, index));
      setMotion((current) => ({
        from: current.t >= 0.5 ? current.to : current.from,
        to: target,
        t: reducedMotion ? 1 : 0,
        run: current.run + 1,
      }));
    },
    [last, reducedMotion],
  );

  const restart = useCallback(() => {
    setMotion((current) => ({ from: 0, to: 0, t: 1, run: current.run + 1 }));
  }, []);

  // Chạy chuyển động giữa hai bước bằng requestAnimationFrame.
  useEffect(() => {
    if (settled) return;
    let frameId = 0;
    let startedAt: number | null = null;
    const tick = (now: number) => {
      startedAt ??= now;
      const t = Math.min(1, (now - startedAt) / MOVE_MS);
      setMotion((current) => (current.run === run ? { ...current, t } : current));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [run, settled]);

  // Chế độ Phát: dừng một lúc ở mỗi bước rồi tự sang bước kế; hết bước cuối thì tự dừng.
  useEffect(() => {
    if (!playing || !settled) return;
    const timer = setTimeout(
      () => {
        if (to >= last) setPlaying(false);
        else goTo(to + 1);
      },
      to >= last ? 0 : HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [playing, settled, to, last, goTo]);

  const frame = useMemo(() => interpolateFrame(steps[from], steps[to], motion.t), [steps, from, to, motion.t]);
  const step = steps[to];
  const atEnd = to === last && settled;

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd) restart();
    setPlaying(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div
          role="region"
          aria-label={`Bản đồ mô phỏng ${scenario.title}`}
          className="h-[22rem] overflow-hidden rounded-card border border-border sm:h-[30rem]"
        >
          <BattleMap scenario={scenario} frame={frame} />
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Điều khiển mô phỏng">
          <Button type="button" onClick={togglePlay} aria-pressed={playing}>
            {playing ? (
              <>
                <Pause className="h-4 w-4" aria-hidden="true" />
                Tạm dừng
              </>
            ) : atEnd ? (
              <>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Phát lại
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                Phát
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPlaying(false);
              goTo(to - 1);
            }}
            disabled={to === 0}
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
            Bước trước
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPlaying(false);
              goTo(to + 1);
            }}
            disabled={to === last}
          >
            Bước sau
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="ml-auto text-sm text-muted-foreground" aria-hidden="true">
            Bước {to + 1}/{steps.length}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={to}
          onChange={(event) => {
            setPlaying(false);
            goTo(Number(event.target.value));
          }}
          aria-label="Chọn bước diễn biến"
          aria-valuetext={`Bước ${to + 1} trên ${steps.length}: ${step.title}`}
          className="w-full accent-[var(--accent)]"
        />

        <div className="flex items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-foreground">Thủy triều</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round(frame.tideLevel * 100)}%`, backgroundColor: "var(--battle-water)" }}
            />
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">{step.tideLabel}</p>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Chú giải">
          {legendItems.map((item) => (
            <li key={item.kind} className="flex items-center gap-1.5">
              <span className={cn("battle-unit", `battle-unit--${item.kind}`, "!m-0 !h-4 !w-4 !border-2")} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-gold-deep">
            Bước {to + 1}/{steps.length}
          </p>
          {/* Vùng live: đọc lại lời dẫn khi đổi bước (chỉ đọc khi bước đã đổi, không đọc từng khung hình). */}
          <div aria-live="polite" aria-atomic="true">
            <h3 className="mt-1 font-serif text-xl font-bold text-surface-foreground">{step.title}</h3>
            <p className="mt-3 leading-relaxed text-surface-foreground">{step.caption}</p>
          </div>
        </Card>

        <nav aria-label="Các bước diễn biến">
          <ol className="flex flex-col gap-2">
            {steps.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    goTo(index);
                  }}
                  aria-current={index === to ? "step" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-card border p-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                    index === to
                      ? "border-accent bg-muted font-semibold text-foreground"
                      : "border-border bg-surface text-surface-foreground hover:border-gold",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      index === to ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
