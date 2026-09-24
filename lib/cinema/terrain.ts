import { clamp, smoothstep, type Vec2 } from "@/lib/cinema/math";
import { hash2 } from "@/lib/cinema/rng";

/** Ảnh độ cao Terrarium (AWS Open Data) quanh đồi A1: 512×512 điểm ảnh, ≈ 4,45 m mỗi điểm, tâm là đồi A1 (21,3832°B; 103,016°Đ). */
export const DEM_SIZE = 512;
export const DEM_MPP = 4.448457154541695;
/** Độ cao chuẩn (m) trừ đi để đáy lòng chảo ≈ 0 trong hệ tọa độ cảnh (y hướng lên). */
export const BASE_ELEVATION = 480;
/** Nửa cạnh vùng có dữ liệu độ cao (m). */
export const DEM_HALF_EXTENT = (DEM_SIZE / 2) * DEM_MPP;

/** Giải mã ảnh Terrarium: độ cao (m) = R·256 + G + B/256 − 32768. `channels` là số kênh mỗi điểm ảnh của `pixels` (3 hoặc 4). */
export function decodeTerrarium(pixels: ArrayLike<number>, width: number, height: number, channels = 4): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    out[i] = pixels[o] * 256 + pixels[o + 1] + pixels[o + 2] / 256 - 32768;
  }
  return out;
}

/** Làm mờ hộp tách được (trục x rồi y), `passes` lần — khử răng cưa của dữ liệu độ cao độ phân giải 30 m. */
export function blurGrid(grid: Float32Array, width: number, height: number, radius: number, passes = 2): Float32Array {
  let source: Float32Array = grid;
  const size = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    const horizontal = new Float32Array(source.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += source[y * width + clamp(x + k, 0, width - 1)];
        horizontal[y * width + x] = sum / size;
      }
    }
    const vertical = new Float32Array(source.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += horizontal[clamp(y + k, 0, height - 1) * width + x];
        vertical[y * width + x] = sum / size;
      }
    }
    source = vertical;
  }
  return source;
}

export type Trench = {
  id: string;
  /** Đường tim chiến hào (x, z) theo mét. */
  points: Vec2[];
  width: number;
  depth: number;
};

export type Crater = { x: number; z: number; radius: number; depth: number };

export type HillSpec = {
  cx: number;
  cz: number;
  /** Góc trục dài, tính từ hướng bắc (−z) quay về phía đông (+x), đơn vị độ. */
  angleDeg: number;
  halfLong: number;
  halfShort: number;
  height: number;
  /** Bán kính (chuẩn hóa 0–1) của đỉnh phẳng. */
  plateau: number;
};

export type TerrainSpec = {
  hill: HillSpec;
  trenches: Trench[];
  craters: Crater[];
};

export type Terrain = {
  heightAt: (x: number, z: number) => number;
  /** Độ cao nền (địa hình thật + đồi), chưa tính chiến hào/hố bom/nhiễu. */
  baseAt: (x: number, z: number) => number;
  /** Độ sâu chiến hào tại điểm (0 nếu không nằm trong chiến hào), dương = sâu. */
  trenchDepthAt: (x: number, z: number) => number;
  slopeAt: (x: number, z: number) => number;
};

/** Khoảng cách từ điểm tới đoạn thẳng a–b. */
export function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq === 0 ? 0 : clamp(((px - ax) * dx + (pz - az) * dz) / lengthSq);
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Nhiễu giá trị 2 chiều mượt. */
function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uz;
}

export function fbm(x: number, z: number, seed = 1): number {
  return valueNoise(x, z, seed) * 0.6 + valueNoise(x * 2.1, z * 2.1, seed + 7) * 0.28 + valueNoise(x * 4.3, z * 4.3, seed + 13) * 0.12;
}

/**
 * Hàm độ cao của cảnh (mét, y hướng lên): địa hình thật từ ảnh độ cao (đã làm mờ) + đồi A1 dựng thủ công
 * + hố bom + chiến hào + nhiễu nhỏ. Không có ảnh độ cao (`dem` = null) thì dùng nền phẳng nhẹ.
 * Dữ liệu SRTM 30 m không phân giải nổi một quả đồi cao ~30 m, nên đồi A1 và chiến hào là công trình dựng theo mô tả.
 */
export function createTerrain(dem: Float32Array | null, spec: TerrainSpec): Terrain {
  const smoothed = dem ? blurGrid(dem, DEM_SIZE, DEM_SIZE, 3, 2) : null;
  const angle = (spec.hill.angleDeg * Math.PI) / 180;
  const dirX = Math.sin(angle);
  const dirZ = -Math.cos(angle);

  const macro = (x: number, z: number): number => {
    if (!smoothed) return (1.5 + fbm(x / 90, z / 90, 3) * 4) * (1 - smoothstep(DEM_HALF_EXTENT - 260, DEM_HALF_EXTENT - 30, Math.max(Math.abs(x), Math.abs(z))));
    const gx = clamp(DEM_SIZE / 2 + x / DEM_MPP, 0, DEM_SIZE - 1.001);
    const gz = clamp(DEM_SIZE / 2 + z / DEM_MPP, 0, DEM_SIZE - 1.001);
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const i = iz * DEM_SIZE + ix;
    const top = smoothed[i] * (1 - fx) + smoothed[i + 1] * fx;
    const bottom = smoothed[i + DEM_SIZE] * (1 - fx) + smoothed[i + DEM_SIZE + 1] * fx;
    // Địa hình thật được giảm biên độ (×0,55): dữ liệu 30 m còn nhiễu vệt, và để đồi A1 nổi bật hơn vùng đất phía đông
    const scaled = (top * (1 - fz) + bottom * fz - BASE_ELEVATION) * 0.55;
    // chỗ trũng bị nén lại (×0,15) để đáy lòng chảo không chìm xuống dưới nền xa
    const value = scaled < 0 ? scaled * 0.15 : scaled;
    // Rìa vùng dữ liệu thoải dần về mặt phẳng y = 0 để khớp với nền xa (không lộ "vách" ở mép)
    const edge = Math.max(Math.abs(x), Math.abs(z));
    return value * (1 - smoothstep(DEM_HALF_EXTENT - 260, DEM_HALF_EXTENT - 30, edge));
  };

  const hillHeight = (x: number, z: number): number => {
    const dx = x - spec.hill.cx;
    const dz = z - spec.hill.cz;
    const u = dx * dirX + dz * dirZ;
    const v = -dx * dirZ + dz * dirX;
    const r = Math.hypot(u / spec.hill.halfLong, v / spec.hill.halfShort);
    const falloff = 1 - smoothstep(spec.hill.plateau, 1, r);
    return spec.hill.height * falloff;
  };

  const baseAt = (x: number, z: number) => macro(x, z) + hillHeight(x, z);

  // Hộp bao của từng chiến hào (để bỏ qua nhanh khi ở xa)
  const trenchBoxes = spec.trenches.map((trench) => {
    const xs = trench.points.map((p) => p[0]);
    const zs = trench.points.map((p) => p[1]);
    const margin = trench.width + 3;
    return { minX: Math.min(...xs) - margin, maxX: Math.max(...xs) + margin, minZ: Math.min(...zs) - margin, maxZ: Math.max(...zs) + margin };
  });

  const trenchEffect = (x: number, z: number): { depth: number; berm: number } => {
    let depth = 0;
    let berm = 0;
    for (let i = 0; i < spec.trenches.length; i++) {
      const box = trenchBoxes[i];
      if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
      const trench = spec.trenches[i];
      let d = Infinity;
      for (let s = 0; s < trench.points.length - 1; s++) {
        const a = trench.points[s];
        const b = trench.points[s + 1];
        d = Math.min(d, distanceToSegment(x, z, a[0], a[1], b[0], b[1]));
      }
      const half = trench.width / 2;
      const inside = 1 - smoothstep(half, half + 0.55, d);
      depth = Math.max(depth, inside * trench.depth);
      berm = Math.max(berm, Math.exp(-(((d - (half + 0.95)) / 0.55) ** 2)) * 0.28);
    }
    return { depth, berm };
  };

  const craterEffect = (x: number, z: number): number => {
    let total = 0;
    for (const crater of spec.craters) {
      const d = Math.hypot(x - crater.x, z - crater.z);
      if (d > crater.radius * 1.5) continue;
      const bowl = 1 - smoothstep(0, crater.radius, d);
      const rim = Math.exp(-(((d - crater.radius * 1.1) / (crater.radius * 0.3)) ** 2)) * 0.25;
      total += -crater.depth * bowl + crater.depth * rim;
    }
    return total;
  };

  const heightAt = (x: number, z: number) => {
    const trench = trenchEffect(x, z);
    const noise = (fbm(x / 6, z / 6, 11) - 0.5) * 0.5 + (fbm(x / 28, z / 28, 5) - 0.5) * 1.6;
    return baseAt(x, z) + noise + craterEffect(x, z) - trench.depth + trench.berm;
  };

  return {
    heightAt,
    baseAt,
    trenchDepthAt: (x, z) => trenchEffect(x, z).depth,
    slopeAt: (x, z) => {
      const e = 1.5;
      const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
      const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
      return Math.hypot(dx, dz);
    },
  };
}
