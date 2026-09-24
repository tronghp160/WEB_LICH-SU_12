import { catmullRom3, clamp, easeInOut, easeInOutCubic, easeOut, lerp, smoothNoise1, type Vec3 } from "@/lib/cinema/math";
import type { Shot } from "@/lib/cinema/types";

export type CameraState = {
  position: Vec3;
  look: Vec3;
  fov: number;
  shot: string;
  /** Tiến độ trong cú máy, 0–1 (đã áp dụng easing). */
  progress: number;
};

const easings: Record<NonNullable<Shot["ease"]>, (t: number) => number> = {
  linear: clamp,
  inOut: easeInOut,
  out: easeOut,
  inOutCubic: easeInOutCubic,
};

/** Cú máy đang chạy ở thời điểm t (trước cú đầu → cú đầu, sau cú cuối → cú cuối). */
export function activeShot(shots: Shot[], t: number): Shot {
  for (const shot of shots) if (t >= shot.t0 && t < shot.t1) return shot;
  return t < shots[0].t0 ? shots[0] : shots[shots.length - 1];
}

/**
 * Vị trí, hướng nhìn và tiêu cự máy quay ở thời điểm t. `groundAt` (nếu có) dùng để đổi độ cao "so với mặt đất" (agl) ra độ cao tuyệt đối.
 * Rung cầm tay là hàm tất định của t nên tua đi tua lại vẫn cùng một hình.
 */
export function evaluateCamera(shots: Shot[], t: number, groundAt?: (x: number, z: number) => number): CameraState {
  const shot = activeShot(shots, t);
  const raw = clamp((t - shot.t0) / (shot.t1 - shot.t0));
  const progress = easings[shot.ease ?? "inOut"](raw);

  const toWorld = (point: Vec3): Vec3 => (shot.agl && groundAt ? [point[0], point[1] + groundAt(point[0], point[2]), point[2]] : point);
  const position = toWorld(catmullRom3(shot.path, progress));
  const look = toWorld(catmullRom3(shot.look, progress));
  // Nếu chỉ có 1 điểm trong path/look, nội suy AGL theo vị trí hiện tại của chính điểm đó
  const fov = typeof shot.fov === "number" ? shot.fov : lerp(shot.fov[0], shot.fov[1], progress);

  const amount = shot.shake ?? 0;
  if (amount > 0) {
    const rate = 2.2;
    position[0] += smoothNoise1(t * rate, 1) * amount;
    position[1] += smoothNoise1(t * rate, 2) * amount * 0.7;
    position[2] += smoothNoise1(t * rate, 3) * amount;
    look[0] += smoothNoise1(t * rate * 1.3, 4) * amount * 0.6;
    look[1] += smoothNoise1(t * rate * 1.3, 5) * amount * 0.6;
    look[2] += smoothNoise1(t * rate * 1.3, 6) * amount * 0.6;
  }
  return { position, look, fov, shot: shot.id, progress };
}
