/** Bộ sinh số ngẫu nhiên có hạt giống (mulberry32): cùng seed → cùng dãy số, để phim tua đi tua lại vẫn y hệt. */
export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (probability: number) => boolean;
  /** Xấp xỉ phân phối chuẩn (tổng 3 số đều). */
  gauss: () => number;
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (probability) => next() < probability,
    gauss: () => (next() + next() + next() - 1.5) / 1.5,
  };
}

/** Băm 2 số nguyên thành [0, 1) — dùng cho nhiễu địa hình. */
export function hash2(ix: number, iz: number, seed = 0): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
