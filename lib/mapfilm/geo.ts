import type { LatLng } from "@/lib/battles/types";
import { clamp, type Vec2 } from "@/lib/cinema/math";

/**
 * Tọa độ cho bản đồ 3D. Dùng đúng công thức Web Mercator của MapLibre (bán kính 6.371.008,8 m),
 * nên vật thể 3D đặt theo các hàm này trùng khít với nền bản đồ.
 */
export const EARTH_RADIUS = 6371008.8;
export const EARTH_CIRCUMFERENCE = 2 * Math.PI * EARTH_RADIUS;
const DEG = Math.PI / 180;

/** Tọa độ Mercator chuẩn hóa [0, 1] (x hướng đông, y hướng nam). */
export function toMercator([lat, lng]: LatLng): Vec2 {
  const x = (180 + lng) / 360;
  const y = (180 - (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2))) / 360;
  return [x, y];
}

export function fromMercator([x, y]: Vec2): LatLng {
  const lng = x * 360 - 180;
  const y2 = 180 - y * 360;
  const lat = (360 / Math.PI) * Math.atan(Math.exp(y2 * DEG)) - 90;
  return [lat, lng];
}

/** Độ dài 1 mét tính bằng đơn vị Mercator tại vĩ độ `lat`. */
export function meterInMercatorUnits(lat: number): number {
  return 1 / EARTH_CIRCUMFERENCE / Math.cos(lat * DEG);
}

/** Tọa độ cục bộ (mét) quanh gốc `origin`: x hướng đông, z hướng nam (cùng quy ước với phim 3D Đồi A1). */
export function toLocal(origin: LatLng, point: LatLng): Vec2 {
  const [ox, oy] = toMercator(origin);
  const [px, py] = toMercator(point);
  const s = meterInMercatorUnits(origin[0]);
  return [(px - ox) / s, (py - oy) / s];
}

export function fromLocal(origin: LatLng, [x, z]: Vec2): LatLng {
  const [ox, oy] = toMercator(origin);
  const s = meterInMercatorUnits(origin[0]);
  return fromMercator([ox + x * s, oy + z * s]);
}

/** Khoảng cách mặt cầu (mét) giữa hai điểm. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = (b[0] - a[0]) * DEG;
  const dLng = (b[1] - a[1]) * DEG;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * DEG) * Math.cos(b[0] * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthMeters(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distanceMeters(path[i - 1], path[i]);
  return total;
}

/** Hướng (độ, 0 = bắc, theo chiều kim đồng hồ) từ a tới b. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const dx = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * DEG);
  const dy = b[0] - a[0];
  return ((Math.atan2(dx, dy) / DEG) % 360 + 360) % 360;
}

/** Điểm ở vị trí `u` (0–1, theo chiều dài) dọc đường gấp khúc, kèm hướng của đoạn chứa nó. */
export function pointAlong(path: LatLng[], u: number): { position: LatLng; heading: number } {
  if (path.length === 0) return { position: [0, 0], heading: 0 };
  if (path.length === 1) return { position: path[0], heading: 0 };
  const lengths = path.slice(1).map((p, i) => distanceMeters(path[i], p));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let remaining = clamp(u) * total;
  for (let i = 0; i < lengths.length; i++) {
    const last = i === lengths.length - 1;
    if (remaining <= lengths[i] || last) {
      const f = lengths[i] === 0 ? 0 : clamp(remaining / lengths[i]);
      const a = path[i];
      const b = path[i + 1];
      return { position: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], heading: bearingDegrees(a, b) };
    }
    remaining -= lengths[i];
  }
  return { position: path[path.length - 1], heading: 0 };
}

/** Chênh lệch góc ngắn nhất (độ) để đi từ a tới b, trong (−180, 180]. */
export function angleDelta(a: number, b: number): number {
  const d = (((b - a) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}
