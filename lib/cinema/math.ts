export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
};
export const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 2;
export const easeInOutCubic = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Catmull–Rom qua các điểm `points` với tham số u ∈ [0, 1] chạy đều dọc theo đường (đầu/cuối được nhân đôi). */
export function catmullRom3(points: Vec3[], u: number): Vec3 {
  if (points.length === 1) return points[0];
  const segments = points.length - 1;
  const scaled = clamp(u) * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const t = scaled - index;
  const p0 = points[Math.max(0, index - 1)];
  const p1 = points[index];
  const p2 = points[index + 1];
  const p3 = points[Math.min(points.length - 1, index + 2)];
  const t2 = t * t;
  const t3 = t2 * t;
  const out: Vec3 = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    out[axis] =
      0.5 *
      (2 * p1[axis] +
        (-p0[axis] + p2[axis]) * t +
        (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2 +
        (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3);
  }
  return out;
}

/** Nhiễu giá trị 1 chiều mượt theo thời gian, dùng cho rung máy quay (tất định, không random). */
export function smoothNoise1(x: number, seed = 0): number {
  const hash = (n: number) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}

export const distance2 = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
