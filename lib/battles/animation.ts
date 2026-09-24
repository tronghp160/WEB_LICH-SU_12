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

/** Ẩn/hiện mượt một phần tử có mặt ở bước đầu và/hoặc bước cuối. */
function fade(inFrom: boolean, inTo: boolean, eased: number): number {
  return lerp(inFrom ? 1 : 0, inTo ? 1 : 0, eased);
}

/**
 * Khung hình ở thời điểm `t` (0–1) khi chuyển từ bước `from` sang bước `to`.
 * Vị trí, độ mờ, mực triều và tiến độ vẽ mũi tên được nội suy; trạng thái rời rạc (chìm, bãi cọc, cứ điểm) đổi ở nửa chặng.
 * Đi lùi (to trước from) vẫn đúng vì chỉ dựa trên hai bước được truyền vào.
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

  const strongpoints: AnimatedFrame["strongpoints"] = {};
  const fromPoints = from.strongpoints ?? {};
  const toPoints = to.strongpoints ?? {};
  for (const id of new Set([...Object.keys(fromPoints), ...Object.keys(toPoints)])) {
    const status = (late ? toPoints[id] : fromPoints[id]) ?? toPoints[id] ?? fromPoints[id];
    strongpoints[id] = { status, opacity: fade(id in fromPoints, id in toPoints, eased) };
  }

  const arrows: AnimatedFrame["arrows"] = {};
  const fromArrows = new Set(from.arrows ?? []);
  const toArrows = new Set(to.arrows ?? []);
  for (const id of new Set([...fromArrows, ...toArrows])) {
    const before = fromArrows.has(id);
    const after = toArrows.has(id);
    // Mũi tên mới được vẽ dần; mũi tên sắp bỏ đi thì giữ nguyên hình và mờ dần.
    arrows[id] = after && !before ? { progress: eased, opacity: 1 } : { progress: 1, opacity: fade(before, after, eased) };
  }

  const zones: AnimatedFrame["zones"] = {};
  const fromZones = new Set(from.zones ?? []);
  const toZones = new Set(to.zones ?? []);
  for (const id of new Set([...fromZones, ...toZones])) {
    zones[id] = fade(fromZones.has(id), toZones.has(id), eased);
  }

  const tideLevel =
    from.tideLevel === undefined && to.tideLevel === undefined
      ? null
      : lerp(from.tideLevel ?? to.tideLevel ?? 0, to.tideLevel ?? from.tideLevel ?? 0, eased);

  return {
    units,
    tideLevel,
    stakes: (late ? to.stakes : from.stakes) ?? "none",
    strongpoints,
    arrows,
    zones,
  };
}

/** `count` điểm cách đều nhau trên đoạn thẳng a–b (gồm cả hai đầu); dùng để vẽ từng cọc. */
export function pointsAlong(a: LatLng, b: LatLng, count: number): LatLng[] {
  if (count <= 1) return [lerpLatLng(a, b, 0.5)];
  return Array.from({ length: count }, (_, index) => lerpLatLng(a, b, index / (count - 1)));
}

/**
 * Phần đầu của đường gấp khúc ứng với `progress` (0–1) theo chiều dài (tính gần đúng trên mặt phẳng, đủ cho vài km).
 * Dùng để "vẽ dần" mũi tên tiến công.
 */
export function partialPath(path: LatLng[], progress: number): LatLng[] {
  if (path.length < 2) return path.slice();
  const p = Math.min(1, Math.max(0, progress));
  const lengths = path.slice(1).map((point, index) => Math.hypot(point[0] - path[index][0], point[1] - path[index][1]));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  if (total === 0 || p === 0) return [path[0], path[0]];
  let remaining = total * p;
  const result: LatLng[] = [path[0]];
  for (let index = 0; index < lengths.length; index++) {
    if (remaining >= lengths[index]) {
      result.push(path[index + 1]);
      remaining -= lengths[index];
      continue;
    }
    result.push(lerpLatLng(path[index], path[index + 1], remaining / lengths[index]));
    break;
  }
  return result;
}

/** Góc (độ, 0 = hướng bắc, theo chiều kim đồng hồ) của đoạn cuối đường đi — để xoay đầu mũi tên. Đã hiệu chỉnh độ co kinh độ theo vĩ độ. */
export function headingDegrees(path: LatLng[]): number {
  if (path.length < 2) return 0;
  const [lat1, lng1] = path[path.length - 2];
  const [lat2, lng2] = path[path.length - 1];
  const dx = (lng2 - lng1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const dy = lat2 - lat1;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}
