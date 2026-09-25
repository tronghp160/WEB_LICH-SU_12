import { clamp, easeInOut, easeOut, lerp } from "@/lib/cinema/math";
import { angleDelta, fromMercator, toMercator } from "@/lib/mapfilm/geo";
import type { CamEase, MapCam, MapCamKey } from "@/lib/mapfilm/types";

/** Độ cong của đường bay (giống `curve` mặc định của flyTo trong MapLibre). */
const RHO = 1.42;
/** Cỡ khung nhìn giả định (px) để tính đường bay; chỉ ảnh hưởng độ "lùi ra" giữa chặng. */
const VIEWPORT = 900;
const TILE = 512;

export function applyEase(ease: CamEase | undefined, u: number): number {
  const x = clamp(u);
  switch (ease) {
    case "linear":
      return x;
    case "in":
      return x * x;
    case "out":
      return easeOut(x);
    default:
      return easeInOut(x);
  }
}

/**
 * Góc máy tại tỉ lệ `k` (0–1) trên chặng bay a → b. Tâm và mức phóng theo đường bay tối ưu van Wijk–Nuij
 * (như flyTo: bay xa thì lùi ra rồi mới sà xuống), còn độ nghiêng và hướng nội suy thẳng (hướng đi đường ngắn nhất).
 */
export function interpolateCam(a: MapCam, b: MapCam, k: number): MapCam {
  const u = clamp(k);
  const pitch = lerp(a.pitch, b.pitch, u);
  const bearing = a.bearing + angleDelta(a.bearing, b.bearing) * u;
  const ma = toMercator(a.center);
  const mb = toMercator(b.center);
  const u1 = Math.hypot(mb[0] - ma[0], mb[1] - ma[1]);
  const w0 = VIEWPORT / (TILE * 2 ** a.zoom);
  const w1 = VIEWPORT / (TILE * 2 ** b.zoom);

  // Quãng bay rất ngắn so với khung nhìn: chỉ đổi mức phóng
  if (u1 < w0 * 1e-4 || u1 < w1 * 1e-4) {
    return { center: fromMercator([lerp(ma[0], mb[0], u), lerp(ma[1], mb[1], u)]), zoom: lerp(a.zoom, b.zoom, u), pitch, bearing };
  }

  const rho2 = RHO * RHO;
  const r = (i: 0 | 1) => {
    const w = i === 0 ? w0 : w1;
    const bb = (w1 * w1 - w0 * w0 + (i === 0 ? 1 : -1) * rho2 * rho2 * u1 * u1) / (2 * w * rho2 * u1);
    return Math.log(Math.sqrt(bb * bb + 1) - bb);
  };
  const r0 = r(0);
  const S = (r(1) - r0) / RHO;
  const s = u * S;
  const w = (w0 * Math.cosh(r0)) / Math.cosh(RHO * s + r0);
  const along = (w0 * (Math.cosh(r0) * Math.tanh(RHO * s + r0) - Math.sinh(r0))) / rho2 / u1;
  const f = u === 1 ? 1 : clamp(along);
  const zoom = u === 1 ? b.zoom : Math.log2(VIEWPORT / (TILE * w));
  return { center: fromMercator([lerp(ma[0], mb[0], f), lerp(ma[1], mb[1], f)]), zoom, pitch, bearing };
}

/** Góc máy phim tại thời điểm `t` theo các mốc `keys` (đã sắp theo t). */
export function evaluateMapCamera(keys: MapCamKey[], t: number): MapCam {
  if (keys.length === 0) throw new Error("Cảnh chưa có mốc camera");
  if (t <= keys[0].t) return strip(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t) return interpolateCam(a, b, applyEase(b.ease, (t - a.t) / (b.t - a.t)));
  }
  return strip(keys[keys.length - 1]);
}

function strip(key: MapCamKey): MapCam {
  return { center: key.center, zoom: key.zoom, pitch: key.pitch, bearing: key.bearing };
}
