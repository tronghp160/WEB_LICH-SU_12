import type { AnimatedFrame, BattleStep, LatLng } from "@/lib/battles/types";

/** Làm mượt: chậm ở đầu và cuối, nhanh ở giữa. `t` được kẹp trong [0, 1]. */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function lerpLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)];
}

/**
 * Khung hình ở thời điểm `t` (0–1) khi chuyển từ bước `from` sang bước `to`.
 * Vị trí, độ mờ và mực triều được nội suy; trạng thái rời rạc (chìm, bãi cọc) đổi ở nửa chặng.
 */
export function interpolateFrame(from: BattleStep, to: BattleStep, t: number): AnimatedFrame {
  const eased = easeInOut(t);
  const late = eased >= 0.5;
  const units: AnimatedFrame["units"] = {};

  for (const [id, target] of Object.entries(to.units)) {
    const start = from.units[id] ?? target;
    units[id] = {
      position: lerpLatLng(start.position, target.position, eased),
      opacity: lerp(start.visible ? 1 : 0, target.visible ? 1 : 0, eased),
      status: late ? target.status : start.status,
    };
  }

  return {
    units,
    tideLevel: lerp(from.tideLevel, to.tideLevel, eased),
    stakes: late ? to.stakes : from.stakes,
  };
}

/** `count` điểm cách đều nhau trên đoạn thẳng a–b (gồm cả hai đầu); dùng để vẽ từng cọc. */
export function pointsAlong(a: LatLng, b: LatLng, count: number): LatLng[] {
  if (count <= 1) return [lerpLatLng(a, b, 0.5)];
  return Array.from({ length: count }, (_, index) => lerpLatLng(a, b, index / (count - 1)));
}
