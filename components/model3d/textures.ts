import * as THREE from "three";
import { clamp, lerp, smoothstep } from "@/lib/cinema/math";
import { hash2 } from "@/lib/cinema/rng";

/**
 * Họa tiết tạo bằng mã (đất, cỏ, thép gỉ, bao cát, gỗ, vải bố, đá…): không tải ảnh nào, không vướng bản quyền.
 * Mọi hàm đều tất định (nhiễu có hạt giống) và ghép ô liền mạch khi lặp lại.
 */

type Rgb = [number, number, number];

/** Nhiễu giá trị 2 chiều, tuần hoàn theo `period` ô để ghép ngói không lộ đường nối. */
function tileNoise(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const wrap = (n: number) => ((n % period) + period) % period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (ix: number, iy: number) => hash2(wrap(ix), wrap(iy), seed);
  const top = lerp(h(x0, y0), h(x0 + 1, y0), sx);
  const bottom = lerp(h(x0, y0 + 1), h(x0 + 1, y0 + 1), sx);
  return lerp(top, bottom, sy);
}

/** Nhiễu nhiều tầng (0–1). */
export function fbm2(u: number, v: number, base: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  let freq = base;
  for (let i = 0; i < octaves; i++) {
    sum += tileNoise(u, v, Math.round(freq), seed + i * 17) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / total;
}

type TextureOptions = { repeat?: [number, number]; srgb?: boolean; anisotropy?: number };

/** Dựng một họa tiết `size`×`size` từ hàm màu (u, v ∈ [0,1)). */
export function proceduralTexture(size: number, shader: (u: number, v: number) => Rgb, options: TextureOptions = {}): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = shader(x / size, y / size);
      const i = (y * size + x) * 4;
      image.data[i] = clamp(r) * 255;
      image.data[i + 1] = clamp(g) * 255;
      image.data[i + 2] = clamp(b) * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...(options.repeat ?? [1, 1]));
  texture.anisotropy = options.anisotropy ?? 8;
  texture.colorSpace = options.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scale = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];

/** Đất đỏ Tây Bắc, lẫn sỏi và vệt ẩm. */
export function soilTexture(repeat: [number, number] = [4, 4], seed = 1): THREE.CanvasTexture {
  const dry: Rgb = [0.4, 0.26, 0.16];
  const wet: Rgb = [0.24, 0.15, 0.09];
  const pale: Rgb = [0.52, 0.37, 0.24];
  return proceduralTexture(
    256,
    (u, v) => {
      const big = fbm2(u, v, 4, seed);
      const mid = fbm2(u, v, 16, seed + 5);
      const grit = hash2(Math.floor(u * 256), Math.floor(v * 256), seed + 9);
      let c = mix(wet, dry, smoothstep(0.3, 0.7, big));
      c = mix(c, pale, smoothstep(0.55, 0.85, mid) * 0.5);
      return scale(c, 0.85 + grit * 0.3);
    },
    { repeat },
  );
}

/** Cỏ và đất lộ ra từng mảng. */
export function grassTexture(repeat: [number, number] = [6, 6], seed = 2): THREE.CanvasTexture {
  const grassA: Rgb = [0.15, 0.27, 0.09];
  const grassB: Rgb = [0.26, 0.36, 0.12];
  const dirt: Rgb = [0.34, 0.24, 0.14];
  return proceduralTexture(
    256,
    (u, v) => {
      const patch = fbm2(u, v, 4, seed);
      const blade = fbm2(u, v, 64, seed + 3, 2);
      let c = mix(grassA, grassB, blade);
      c = mix(c, dirt, smoothstep(0.62, 0.8, patch));
      return scale(c, 0.9 + hash2(Math.floor(u * 256), Math.floor(v * 256), seed) * 0.2);
    },
    { repeat },
  );
}

/** Thép sơn ô-liu, xước và gỉ ở mép. `base` là màu nền sơn. */
export function paintedSteelTexture(base: Rgb = [0.27, 0.31, 0.18], repeat: [number, number] = [2, 2], seed = 3): THREE.CanvasTexture {
  const rust: Rgb = [0.35, 0.17, 0.08];
  return proceduralTexture(
    256,
    (u, v) => {
      const blotch = fbm2(u, v, 6, seed);
      const scratch = smoothstep(0.985, 1, tileNoise(u * 1, v * 16, 16, seed + 4)) * 0.5;
      const rusty = smoothstep(0.62, 0.9, fbm2(u, v, 10, seed + 8));
      let c = scale(base, 0.85 + blotch * 0.3);
      c = mix(c, rust, rusty * 0.7);
      return scale(c, 1 + scratch);
    },
    { repeat },
  );
}

/** Tôn/thép lượn sóng (mái hầm): sọc sáng tối theo chiều u, gỉ loang. */
export function corrugatedTexture(ridges = 12, repeat: [number, number] = [1, 1], seed = 4): THREE.CanvasTexture {
  const metal: Rgb = [0.5, 0.5, 0.48];
  const rust: Rgb = [0.45, 0.22, 0.1];
  return proceduralTexture(
    256,
    (u, v) => {
      const wave = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * ridges);
      const stain = smoothstep(0.45, 0.85, fbm2(u, v, 5, seed));
      let c = scale(metal, 0.55 + wave * 0.45);
      c = mix(c, rust, stain * 0.75);
      return scale(c, 0.9 + hash2(Math.floor(u * 256), Math.floor(v * 256), seed) * 0.15);
    },
    { repeat },
  );
}

/** Bao cát: từng viên xếp so le, màu bố bạc ngả nâu. */
export function sandbagTexture(repeat: [number, number] = [2, 2], seed = 5): THREE.CanvasTexture {
  const rows = 6;
  const cols = 3;
  const cloth: Rgb = [0.6, 0.53, 0.38];
  return proceduralTexture(
    256,
    (u, v) => {
      const row = Math.floor(v * rows);
      const offset = row % 2 === 0 ? 0 : 0.5 / cols;
      const cu = ((u + offset) * cols) % 1;
      const cv = (v * rows) % 1;
      const edge = Math.min(cu, 1 - cu, cv, 1 - cv);
      const bag = smoothstep(0.02, 0.16, edge);
      const id = hash2(Math.floor((u + offset) * cols), row, seed);
      const weave = 0.9 + 0.1 * Math.sin(u * 900) * Math.sin(v * 900);
      const c = scale(mix(cloth, [0.5, 0.43, 0.3], id), (0.45 + bag * 0.55) * weave * (0.85 + fbm2(u, v, 24, seed) * 0.3));
      return c;
    },
    { repeat },
  );
}

/** Vân gỗ (ván, thùng đạn). */
export function woodTexture(repeat: [number, number] = [1, 1], seed = 6, tone: Rgb = [0.5, 0.34, 0.18]): THREE.CanvasTexture {
  return proceduralTexture(
    256,
    (u, v) => {
      const warp = fbm2(u, v, 3, seed) * 4;
      const ring = 0.5 + 0.5 * Math.sin((u * 14 + warp) * Math.PI * 2);
      const fine = hash2(Math.floor(u * 256), Math.floor(v * 24), seed) * 0.15;
      return scale(tone, 0.6 + ring * 0.35 + fine);
    },
    { repeat },
  );
}

/** Vải bố / bao tải: sợi dệt đan chéo. */
export function burlapTexture(color: Rgb = [0.63, 0.53, 0.33], repeat: [number, number] = [2, 2], seed = 7): THREE.CanvasTexture {
  return proceduralTexture(
    256,
    (u, v) => {
      const weave = 0.75 + 0.25 * Math.abs(Math.sin(u * 160)) * Math.abs(Math.sin(v * 160));
      const mottle = 0.85 + fbm2(u, v, 8, seed) * 0.3;
      return scale(color, weave * mottle);
    },
    { repeat },
  );
}

/** Bê tông cũ, ám rêu. */
export function concreteTexture(repeat: [number, number] = [2, 2], seed = 8): THREE.CanvasTexture {
  const grey: Rgb = [0.55, 0.54, 0.5];
  const moss: Rgb = [0.3, 0.38, 0.22];
  return proceduralTexture(
    256,
    (u, v) => {
      const grain = hash2(Math.floor(u * 256), Math.floor(v * 256), seed);
      const stain = smoothstep(0.55, 0.9, fbm2(u, v, 5, seed + 2));
      let c = scale(grey, 0.8 + fbm2(u, v, 12, seed) * 0.3 + grain * 0.1);
      c = mix(c, moss, stain * 0.55);
      return c;
    },
    { repeat },
  );
}

/** Đá cẩm thạch trắng có vân. */
export function marbleTexture(repeat: [number, number] = [1, 1], seed = 9): THREE.CanvasTexture {
  return proceduralTexture(
    256,
    (u, v) => {
      const vein = Math.abs(Math.sin((u * 6 + fbm2(u, v, 4, seed) * 5) * Math.PI));
      const streak = smoothstep(0.86, 1, 1 - vein) * 0.35;
      const base = 0.86 + fbm2(u, v, 8, seed + 1) * 0.1 - streak;
      return [base, base * 0.98, base * 0.94];
    },
    { repeat },
  );
}

/** Mặt cắt đất nhiều lớp (cắt ngang đồi A1): lớp đất mùn, sét đỏ, đá lẫn sỏi, rễ cây. `u` chạy ngang, `v` chạy theo chiều sâu (0 = mặt đất). */
export function strataTexture(seed = 10): THREE.CanvasTexture {
  const layers: { to: number; color: Rgb }[] = [
    { to: 0.06, color: [0.2, 0.15, 0.08] },
    { to: 0.3, color: [0.5, 0.29, 0.15] },
    { to: 0.55, color: [0.6, 0.38, 0.2] },
    { to: 0.8, color: [0.47, 0.3, 0.19] },
    { to: 1.01, color: [0.4, 0.34, 0.27] },
  ];
  return proceduralTexture(
    512,
    (u, v) => {
      const wobble = (fbm2(u, v, 4, seed) - 0.5) * 0.08;
      const depth = clamp(v + wobble);
      const layer = layers.find((l) => depth <= l.to) ?? layers[layers.length - 1];
      let c = scale(layer.color, 0.86 + fbm2(u, v, 20, seed + 1) * 0.28);
      const stone = smoothstep(0.86, 0.93, fbm2(u, v, 36, seed + 2));
      c = mix(c, [0.55, 0.52, 0.47], stone * 0.8);
      const root = smoothstep(0.93, 1, tileNoise(u * 1, v * 1, 32, seed + 5)) * smoothstep(0.3, 0.05, v);
      return mix(c, [0.32, 0.22, 0.12], root * 0.7);
    },
    { srgb: true },
  );
}

/** Tấm bảng tên bằng chữ (nhãn, bệ tượng). */
export function textPlateTexture(lines: string[], options: { width?: number; height?: number; bg?: string; fg?: string; accent?: string } = {}): THREE.CanvasTexture {
  const width = options.width ?? 512;
  const height = options.height ?? 160;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = options.bg ?? "#2b2216";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = options.accent ?? "#d8b25a";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.fillStyle = options.fg ?? "#f3e3b8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineHeight = (height - 40) / lines.length;
  lines.forEach((line, i) => {
    const size = i === 0 ? lineHeight * 0.66 : lineHeight * 0.5;
    ctx.font = `${i === 0 ? "700 " : ""}${size}px "Be Vietnam Pro", system-ui, sans-serif`;
    ctx.fillText(line, width / 2, 20 + lineHeight * (i + 0.5), width - 50);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Phù hiệu tròn (ba vòng màu) của không quân Pháp: xanh – trắng – đỏ từ ngoài vào trong. */
export function roundelTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  [
    ["#1d3f8f", 120],
    ["#f4f4f4", 82],
    ["#d42a2a", 44],
  ].forEach(([color, radius]) => {
    ctx.fillStyle = color as string;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius as number, 0, Math.PI * 2);
    ctx.fill();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Lá cây ngụy trang: chấm xanh đậm/nhạt trên nền trong suốt (dùng cho các cụm lá cắm vào mũ, pháo). */
export function leafTexture(seed = 11): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  for (let i = 0; i < 26; i++) {
    const a = hash2(i, 1, seed) * Math.PI * 2;
    const r = 8 + hash2(i, 2, seed) * 40;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = `hsl(${85 + hash2(i, 3, seed) * 35}, ${45 + hash2(i, 4, seed) * 20}%, ${18 + hash2(i, 5, seed) * 22}%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Tấm vỏ kim loại có đường ghép và đinh tán (thân, cánh máy bay). Một ô lặp lại = một tấm vỏ. */
export function rivetedPanelTexture(repeat: [number, number] = [1, 1], seed = 12): THREE.CanvasTexture {
  return proceduralTexture(
    512,
    (u, v) => {
      const seamU = Math.min(u % 1, 1 - (u % 1));
      const seamV = Math.min(v % 1, 1 - (v % 1));
      const seam = 1 - smoothstep(0.0, 0.006, Math.min(seamU, seamV));
      const rivetRow = (Math.abs(((v * 512) % 16) - 8) < 1.6 ? 1 : 0) * (seamU < 0.02 || seamV < 0.02 ? 1 : 0);
      const stain = fbm2(u, v, 3, seed);
      const base = 0.72 + stain * 0.22 + hash2(Math.floor(u * 512), Math.floor(v * 512), seed) * 0.05;
      const c = base * (1 - seam * 0.55) * (1 - rivetRow * 0.12);
      return [c, c, c * 1.02];
    },
    { repeat },
  );
}

/** Cờ đỏ sao vàng (cờ Tổ quốc); `banner` = thêm dòng chữ vàng phía dưới (cờ "Quyết chiến, Quyết thắng"). */
export function flagTexture(banner?: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#da251d";
  ctx.fillRect(0, 0, 512, 340);
  ctx.fillStyle = "#ffcd00";
  ctx.beginPath();
  const cx = 256;
  const cy = banner ? 140 : 172;
  const outer = banner ? 92 : 110;
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : outer * 0.382;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  if (banner) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '700 38px "Be Vietnam Pro", system-ui, sans-serif';
    ctx.fillText(banner, 256, 287, 470);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Tấm bản đồ tác chiến vẽ tay trên giấy (đường đồng mức, sông, ký hiệu đỏ/xanh) để đặt trên bàn. */
export function mapSheetTexture(seed = 30): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e7dcb9";
  ctx.fillRect(0, 0, 512, 384);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(120,90,50,0.45)";
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const y = 40 * k + 20 + Math.sin(x * 0.02 + k) * 18 + Math.sin(x * 0.05 + k * 2) * 7;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "#3b6ea8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.bezierCurveTo(120, 120, 240, 160, 300, 384);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const x = 160 + hash2(i, 1, seed) * 260;
    const y = 60 + hash2(i, 2, seed) * 250;
    ctx.fillStyle = "#1d5fa8";
    ctx.fillRect(x, y, 16, 16);
  }
  ctx.strokeStyle = "#c62828";
  ctx.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 40;
    ctx.beginPath();
    ctx.moveTo(x, 360 - i * 12);
    ctx.lineTo(x + 130 + i * 30, 230 - i * 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 130 + i * 30, 230 - i * 30);
    ctx.lineTo(x + 112 + i * 30, 232 - i * 30);
    ctx.lineTo(x + 126 + i * 30, 246 - i * 30);
    ctx.fillStyle = "#c62828";
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
