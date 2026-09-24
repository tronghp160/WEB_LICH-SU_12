import { clamp, lerp, smoothstep, type Vec3 } from "@/lib/cinema/math";
import { hash2 } from "@/lib/cinema/rng";
import type { Emitter, Flare, Shot3D } from "@/lib/cinema/types";

/**
 * Hiệu ứng hạt (khói, lửa, bụi, mảnh văng) là HÀM THUẦN của thời gian: cùng (emitter, t) → cùng hạt.
 * Nhờ vậy tua phim tới bất kỳ giây nào cũng ra đúng hình, không cần mô phỏng liên tục.
 */

export type ParticleLayer = "glow" | "smoke";
export type ParticleSink = (layer: ParticleLayer, x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number) => void;

/** Số ngẫu nhiên tất định trong [0, 1) cho hạt k, tham số j của emitter `seed`. */
const rand = (seed: number, k: number, j: number) => hash2(k * 16 + j, seed, 77);

/** Thời gian sống tối đa (s) của mọi hạt của emitter; sau đó có thể bỏ qua. */
export function emitterLifetime(e: Emitter): number {
  if (e.kind === "blast") return 60;
  if (e.kind === "fire") return Infinity;
  return e.kind === "shell" ? 14 : 9;
}

/** Cường độ chớp sáng (0–1) của một vụ nổ tại thời điểm t: dùng cho đèn và tiếng nổ. */
export function flashOf(e: Emitter, t: number): number {
  const a = t - e.t0;
  if (a < 0 || e.kind === "fire") return 0;
  const strength = e.kind === "blast" ? 1 : e.kind === "shell" ? 0.55 : 0.25;
  return strength * Math.exp(-a / (e.kind === "blast" ? 0.5 : 0.14)) * (e.distant ? 0.6 : 1);
}

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const FIRE_HOT: Vec3 = [1, 0.85, 0.5];
const FIRE_MID: Vec3 = [1, 0.45, 0.12];
const FIRE_COOL: Vec3 = [0.45, 0.09, 0.04];
const fireColor = (f: number): Vec3 => (f < 0.35 ? lerp3(FIRE_HOT, FIRE_MID, f / 0.35) : lerp3(FIRE_MID, FIRE_COOL, (f - 0.35) / 0.65));

function evaluateExplosion(e: Emitter, t: number, groundY: number, sink: ParticleSink): void {
  const a = t - e.t0;
  if (a < 0 || e.distant) return;
  const s = e.scale;
  const big = e.kind === "blast";
  const n = big ? 1 : e.kind === "shell" ? 0.22 : 0.13;
  const seed = e.seed * 101;

  // Lõi chớp sáng
  if (a < 0.4) sink("glow", e.x, groundY + 4 * s, e.z, (big ? 70 : 24) * s * (0.6 + a * 2), 1, 0.95, 0.8, (1 - a / 0.4) ** 1.5);

  // Cầu lửa
  const fireCount = Math.round(150 * n);
  for (let k = 0; k < fireCount; k++) {
    const life = (1.4 + rand(seed, k, 0) * 1.8) * (big ? 1 : 0.6);
    if (a > life) continue;
    const f = a / life;
    const theta = rand(seed, k, 1) * Math.PI * 2;
    const up = rand(seed, k, 2) * 0.85 + 0.05;
    const speed = (16 + rand(seed, k, 3) * 44) * s * (big ? 1 : 1.3);
    const reach = (speed * (1 - Math.exp(-2.6 * a))) / 2.6;
    const c = fireColor(f);
    sink(
      "glow",
      e.x + Math.cos(theta) * (1 - up) * reach,
      groundY + 2 * s + up * reach * 1.15 + 5 * s * a,
      e.z + Math.sin(theta) * (1 - up) * reach,
      (5 + 20 * f ** 0.6) * s * (0.6 + rand(seed, k, 4) * 0.6) * (big ? 1 : 1.1),
      c[0],
      c[1],
      c[2],
      (1 - f) ** 1.5 * 0.85,
    );
  }

  // Cột khói bốc lên
  const smokeCount = Math.round(130 * n);
  for (let k = 0; k < smokeCount; k++) {
    const life = (big ? 38 : 7) * (0.7 + rand(seed, k + 500, 0) * 0.5);
    if (a > life) continue;
    const f = a / life;
    const theta = rand(seed, k + 500, 1) * Math.PI * 2;
    const v = (10 + rand(seed, k + 500, 2) * 16) * s;
    const rise = (v * (1 - Math.exp(-0.18 * a))) / 0.18;
    const spread = (0.6 + rand(seed, k + 500, 3)) * a * 0.9 * s * (big ? 1 : 0.5);
    const grow = 1 - Math.exp(-a / 8);
    const shade = 0.05 + 0.16 * f;
    // ánh lửa hắt từ dưới lên: hạt còn trẻ và ở thấp ngả màu cam
    const warm = Math.exp(-a / 5) * Math.exp(-rise / 30);
    sink(
      "smoke",
      e.x + Math.cos(theta) * (spread + 3 * s * rand(seed, k + 500, 4)) + a * 0.9,
      groundY + 2 + rise,
      e.z + Math.sin(theta) * (spread + 3 * s * rand(seed, k + 500, 4)),
      (7 + 42 * grow) * s * (0.7 + rand(seed, k + 500, 5) * 0.6),
      shade * 1.1 + warm * 0.5,
      shade + warm * 0.2,
      shade * 0.9 + warm * 0.03,
      0.46 * (1 - f) ** 1.2 * smoothstep(0, 0.6, a),
    );
  }

  // Vành bụi lan sát mặt đất
  const dustCount = Math.round(110 * n);
  for (let k = 0; k < dustCount; k++) {
    const life = (big ? 13 : 4) * (0.7 + rand(seed, k + 900, 0) * 0.6);
    if (a > life) continue;
    const f = a / life;
    const theta = rand(seed, k + 900, 1) * Math.PI * 2;
    const v = (40 + rand(seed, k + 900, 2) * 35) * s;
    const r = (v * (1 - Math.exp(-0.55 * a))) / 0.55;
    sink("smoke", e.x + Math.cos(theta) * r, groundY + 1.5 + a * 0.9, e.z + Math.sin(theta) * r, (8 + 16 * f) * s, 0.2, 0.16, 0.12, 0.3 * (1 - f) ** 1.4);
  }

  // Mảnh văng (đen) và tia lửa (sáng)
  const debrisCount = Math.round(200 * n);
  for (let k = 0; k < debrisCount; k++) {
    const theta = rand(seed, k + 1300, 1) * Math.PI * 2;
    const vh = (6 + rand(seed, k + 1300, 2) * 50) * s;
    const vy = (18 + rand(seed, k + 1300, 3) * 55) * s;
    const flight = (2 * vy) / 9.8;
    if (a > flight + 2) continue;
    const clampedA = Math.min(a, flight);
    const y = groundY + Math.max(0.15, vy * clampedA - 4.9 * clampedA * clampedA);
    const fade = a > flight ? 1 - (a - flight) / 2 : 1;
    sink("smoke", e.x + Math.cos(theta) * vh * clampedA, y, e.z + Math.sin(theta) * vh * clampedA, (0.6 + rand(seed, k + 1300, 4) * 1.8) * Math.sqrt(s), 0.09, 0.07, 0.06, fade);
  }
  const emberCount = Math.round(120 * n);
  for (let k = 0; k < emberCount; k++) {
    const theta = rand(seed, k + 1700, 1) * Math.PI * 2;
    const vh = (5 + rand(seed, k + 1700, 2) * 40) * s;
    const vy = (15 + rand(seed, k + 1700, 3) * 50) * s;
    const flight = (2 * vy) / 9.8;
    if (a > Math.min(flight, 3.5 + rand(seed, k + 1700, 5) * 2)) continue;
    const y = groundY + Math.max(0.15, vy * a - 4.9 * a * a);
    const f = a / flight;
    sink("glow", e.x + Math.cos(theta) * vh * a, y, e.z + Math.sin(theta) * vh * a, (0.7 + rand(seed, k + 1700, 4) * 1.4) * Math.sqrt(s), 1, 0.55 - 0.3 * f, 0.15, (1 - f) * 0.95);
  }
}

function evaluateFire(e: Emitter, t: number, groundY: number, sink: ParticleSink): void {
  const a = t - e.t0;
  if (a < 0) return;
  const s = e.scale;
  const ramp = smoothstep(0, 3, a) * (e.t1 === undefined ? 1 : 1 - smoothstep(e.t1 - 2, e.t1, t));
  if (ramp <= 0.01) return;

  const flameLife = 1.3;
  const flames = 24;
  for (let k = 0; k < flames; k++) {
    const age = a - (k * flameLife) / flames;
    if (age < 0) continue;
    const cycle = Math.floor(age / flameLife);
    const local = age - cycle * flameLife;
    const f = local / flameLife;
    const c = fireColor(f * 0.85);
    const jitter = (j: number) => rand(e.seed * 31 + cycle, k, j) - 0.5;
    sink(
      "glow",
      e.x + jitter(0) * 3.4 * s * (1 - f * 0.5),
      groundY + 0.6 + f * 3.4 * s + jitter(2) * 0.5,
      e.z + jitter(1) * 3.4 * s * (1 - f * 0.5),
      (2.4 - 1.3 * f) * s * (0.8 + jitter(3) * 0.5),
      c[0],
      c[1],
      c[2],
      (1 - f) ** 1.2 * 0.75 * ramp * (0.8 + 0.2 * Math.sin(t * 17 + k)),
    );
  }

  const smokeLife = 9;
  const puffs = 18;
  for (let k = 0; k < puffs; k++) {
    const age = a - (k * smokeLife) / puffs;
    if (age < 0) continue;
    const cycle = Math.floor(age / smokeLife);
    const local = age - cycle * smokeLife;
    const f = local / smokeLife;
    const jitter = (j: number) => rand(e.seed * 57 + cycle, k + 40, j) - 0.5;
    const shade = 0.06 + 0.16 * f;
    sink(
      "smoke",
      e.x + jitter(0) * 2 * s + local * 1.1,
      groundY + 2 + local * 2.6 * s * 1.5,
      e.z + jitter(1) * 2 * s,
      (3 + 11 * f) * s,
      shade * 1.1,
      shade,
      shade * 0.92,
      0.45 * (1 - f) * ramp,
    );
  }
}

/** Phát các hạt của một emitter ở thời điểm t vào `sink`. `groundY` là độ cao mặt đất tại (x, z) của emitter. */
export function evaluateEmitter(e: Emitter, t: number, groundY: number, sink: ParticleSink): void {
  if (e.kind === "fire") evaluateFire(e, t, groundY, sink);
  else evaluateExplosion(e, t, groundY, sink);
}

// ---------- Pháo sáng ----------
export type FlareState = { x: number; y: number; z: number; intensity: number; rising: boolean };

const FLARE_RISE = 2.0;
const FLARE_BURN = 28;

export function flareState(flare: Flare, t: number): FlareState | null {
  const a = t - flare.t;
  if (a < 0 || a > FLARE_BURN) return null;
  const peak = 125;
  const rise = 1 - (1 - clamp(a / FLARE_RISE)) ** 2;
  const y = a < FLARE_RISE ? 6 + (peak - 6) * rise : peak - (a - FLARE_RISE) * 2.9;
  const sway = Math.sin(a * 0.9 + flare.seed) * 3;
  const intensity = a < FLARE_RISE * 0.8 ? 0.3 : (0.85 + 0.15 * Math.sin(a * 23 + flare.seed * 5)) * (1 - smoothstep(FLARE_BURN - 6, FLARE_BURN, a)) * smoothstep(FLARE_RISE * 0.8, FLARE_RISE * 1.3, a);
  return { x: flare.x + flare.drift[0] * a + sway, y, z: flare.z + flare.drift[1] * a, intensity, rising: a < FLARE_RISE };
}

// ---------- Đạn ----------
export const TRACER_SPEED = 320;

export function tracerAt(shot: Shot3D, t: number): { head: Vec3; tail: Vec3 } | null {
  const age = t - shot.t;
  if (age < 0 || age * TRACER_SPEED > shot.range) return null;
  const travelled = age * TRACER_SPEED;
  const tailLength = Math.min(travelled, 10);
  const head: Vec3 = [shot.origin[0] + shot.dir[0] * travelled, shot.origin[1] + shot.dir[1] * travelled, shot.origin[2] + shot.dir[2] * travelled];
  const tail: Vec3 = [head[0] - shot.dir[0] * tailLength, head[1] - shot.dir[1] * tailLength, head[2] - shot.dir[2] * tailLength];
  return { head, tail };
}

/** Chớp đầu nòng súng (0–1) trong ~60 ms sau phát bắn. */
export function muzzleFlash(shot: Shot3D, t: number): number {
  const age = t - shot.t;
  return age < 0 || age > 0.06 ? 0 : 1 - age / 0.06;
}

/** Chỉ số phát bắn đầu tiên có t ≥ `time` (tìm nhị phân trên mảng đã sắp theo t). */
export function firstShotIndexAtOrAfter(shots: Shot3D[], time: number): number {
  let lo = 0;
  let hi = shots.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (shots[mid].t < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ---------- Điện ảnh: rung và chớp sáng toàn cục ----------
/** Độ rung máy (mét) tại thời điểm t do vụ nổ lớn gây ra. */
export function blastShake(t: number, blastTime: number): number {
  const a = t - blastTime;
  if (a < 0 || a > 7) return 0;
  return 1.6 * Math.exp(-a / 1.5) * smoothstep(0, 0.05, a);
}

/** Mức phơi sáng cộng thêm và cường độ bloom cộng thêm khi nổ (chớp trắng ~0,6 s). */
export function blastGlare(t: number, blastTime: number): number {
  const a = t - blastTime;
  if (a < 0 || a > 3) return 0;
  return Math.exp(-a / 0.35) * smoothstep(0, 0.03, a);
}
