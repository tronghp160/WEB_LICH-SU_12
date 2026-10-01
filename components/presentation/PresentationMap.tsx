"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { interpolateFrame } from "@/lib/battles/animation";
import type { BattleScenario } from "@/lib/battles/types";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Leaflet cần `window` nên chỉ nạp ở trình duyệt.
const BattleMap = dynamic(() => import("@/components/battle/BattleMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

/** Thời gian chuyển giữa hai bước — như bản đồ trong bài học. */
const MOVE_MS = 2200;

/**
 * Bản đồ diễn biến điều khiển từ bên ngoài bằng `stepIndex` (slide đang chiếu). Giữ nguyên một bản đồ qua các slide
 * bản đồ liên tiếp để quân, mũi tên và khung nhìn chuyển động mượt từ bước trước sang bước sau.
 */
export function PresentationMap({ scenario, stepIndex }: { scenario: BattleScenario; stepIndex: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const [motion, setMotion] = useState({ from: stepIndex, to: stepIndex, t: 1, run: 0 });

  // Slide đổi → bắt đầu chuyển động từ vị trí hiện tại tới bước mới (cập nhật state khi prop đổi, không cần effect).
  if (motion.to !== stepIndex) {
    setMotion((current) => ({
      from: current.t >= 0.5 ? current.to : current.from,
      to: stepIndex,
      t: reducedMotion ? 1 : 0,
      run: current.run + 1,
    }));
  }

  const settled = motion.t >= 1;
  const { run } = motion;
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

  const { steps } = scenario;
  const frame = useMemo(() => interpolateFrame(steps[motion.from], steps[motion.to], motion.t), [steps, motion.from, motion.to, motion.t]);
  const camera = steps[motion.to].camera ?? { center: scenario.center, zoom: scenario.zoom };

  return (
    <div role="region" aria-label={`Bản đồ mô phỏng ${scenario.title}`} className="h-full w-full">
      <BattleMap scenario={scenario} frame={frame} camera={camera} flyDuration={reducedMotion ? 0 : MOVE_MS / 1000} />
    </div>
  );
}
