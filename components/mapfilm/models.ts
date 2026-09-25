import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Mô hình low-poly dựng bằng mã cho bản đồ 3D (không dùng file mô hình ngoài). Đơn vị: mét ở tỉ lệ 1;
 * khi vẽ, cả quân cờ được phóng to theo mức phóng của bản đồ (kiểu quân cờ trên sa bàn).
 * Quy ước: mô hình quay mặt về phía −z (hướng bắc), trục y hướng lên.
 */

type Part = { geometry: THREE.BufferGeometry; color: THREE.ColorRepresentation };

function colored(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new THREE.Color(color);
  const count = g.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute("uv");
  return g;
}

function merge(parts: Part[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts.map((p) => colored(p.geometry, p.color)));
  if (!merged) throw new Error("Không ghép được mô hình");
  merged.computeBoundingSphere();
  return merged;
}

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt: number, rb: number, h: number, seg: number, x = 0, y = 0, z = 0) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);

const OLIVE = "#56613a";
const OLIVE_DARK = "#3f4829";
const SKIN = "#c79a73";
const HAT = "#a8a06a";
const STEEL = "#3a3d36";
const EARTH = "#7a5a3a";
const SAND = "#b89e72";

/** Chiến sĩ ta (mũ nan, quân phục xanh lá, súng trường). Cao ~1,8 m. */
export function soldierGeometry(): THREE.BufferGeometry {
  return merge([
    { geometry: box(0.18, 0.8, 0.22, -0.12, 0.4, 0), color: OLIVE_DARK },
    { geometry: box(0.18, 0.8, 0.22, 0.12, 0.4, 0), color: OLIVE_DARK },
    { geometry: box(0.52, 0.62, 0.3, 0, 1.12, 0), color: OLIVE },
    { geometry: box(0.14, 0.55, 0.16, -0.34, 1.15, -0.05), color: OLIVE },
    { geometry: box(0.14, 0.55, 0.16, 0.34, 1.15, -0.05), color: OLIVE },
    { geometry: new THREE.SphereGeometry(0.15, 8, 6).translate(0, 1.58, 0), color: SKIN },
    { geometry: new THREE.CylinderGeometry(0.1, 0.27, 0.13, 10).translate(0, 1.71, 0), color: HAT },
    { geometry: box(0.06, 0.06, 1.05, 0.28, 1.3, -0.3).rotateX(-0.5), color: "#4a3522" },
  ]);
}

/** Dân công: nón lá, đẩy xe đạp thồ chở hàng. */
export function porterGeometry(): THREE.BufferGeometry {
  const wheel = (z: number) => new THREE.TorusGeometry(0.34, 0.04, 5, 12).rotateY(Math.PI / 2).translate(0.55, 0.36, z);
  return merge([
    { geometry: box(0.18, 0.78, 0.22, -0.1, 0.39, 0.3), color: "#2f2a24" },
    { geometry: box(0.18, 0.78, 0.22, 0.12, 0.39, 0.3), color: "#2f2a24" },
    { geometry: box(0.5, 0.6, 0.3, 0, 1.08, 0.25).rotateX(0.2), color: "#3d3a33" },
    { geometry: new THREE.SphereGeometry(0.14, 8, 6).translate(0, 1.52, 0.1), color: SKIN },
    { geometry: new THREE.ConeGeometry(0.32, 0.22, 12).translate(0, 1.68, 0.1), color: "#d8c79a" },
    { geometry: wheel(-0.6), color: "#222222" },
    { geometry: wheel(0.55), color: "#222222" },
    { geometry: box(0.05, 0.05, 1.2, 0.55, 0.75, 0), color: "#555555" },
    { geometry: box(0.55, 0.55, 0.9, 0.55, 1.05, -0.05), color: SAND },
  ]);
}

/** Khẩu lựu pháo có lá chắn, hai bánh xe. Nòng hướng về −z. */
export function gunGeometry(): THREE.BufferGeometry {
  const wheel = (x: number) => new THREE.CylinderGeometry(0.55, 0.55, 0.18, 14).rotateZ(Math.PI / 2).translate(x, 0.55, 0);
  return merge([
    { geometry: wheel(-0.85), color: "#262622" },
    { geometry: wheel(0.85), color: "#262622" },
    { geometry: box(1.6, 0.25, 0.5, 0, 0.62, 0), color: OLIVE_DARK },
    { geometry: box(1.8, 1.0, 0.08, 0, 1.0, -0.35), color: OLIVE },
    { geometry: cyl(0.09, 0.12, 3.2, 8, 0, 0, 0).rotateX(Math.PI / 2).rotateX(-0.25).translate(0, 1.15, -1.6), color: STEEL },
    { geometry: box(0.18, 0.18, 2.6, -0.35, 0.35, 1.4).rotateY(0.15), color: OLIVE_DARK },
    { geometry: box(0.18, 0.18, 2.6, 0.35, 0.35, 1.4).rotateY(-0.15), color: OLIVE_DARK },
  ]);
}

/** Lều sở chỉ huy nửa chìm dưới đất, mái phủ lá ngụy trang. */
export function hqGeometry(): THREE.BufferGeometry {
  const roof = new THREE.CylinderGeometry(0.01, 2.4, 1.6, 4, 1).rotateY(Math.PI / 4).scale(1.2, 1, 0.8).translate(0, 1.8, 0);
  return merge([
    { geometry: box(3.6, 1.0, 2.6, 0, 0.5, 0), color: EARTH },
    { geometry: roof, color: "#4d5a2e" },
    { geometry: box(0.8, 0.8, 0.1, 0, 0.6, -1.32), color: "#1d1a15" },
  ]);
}

/** Lô cốt / cứ điểm: ụ đất bát giác, vòng bao cát, lỗ châu mai. */
export function bunkerGeometry(): THREE.BufferGeometry {
  const parts: Part[] = [
    { geometry: cyl(3.0, 4.6, 1.5, 8, 0, 0.75, 0), color: EARTH },
    { geometry: cyl(2.2, 2.9, 0.8, 8, 0, 1.9, 0), color: "#6b5a44" },
    { geometry: new THREE.TorusGeometry(3.6, 0.45, 5, 16).rotateX(Math.PI / 2).translate(0, 1.4, 0), color: SAND },
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push({ geometry: box(0.9, 0.3, 0.2, 0, 2.0, 0).rotateY(-a).translate(Math.sin(a) * 2.55, 0, Math.cos(a) * 2.55), color: "#141210" });
  }
  return merge(parts);
}

/** Vòng trạng thái nằm sát đất quanh cứ điểm (màu theo từng cá thể). */
export function ringGeometry(): THREE.BufferGeometry {
  return new THREE.RingGeometry(5.2, 6.4, 32).rotateX(-Math.PI / 2).translate(0, 0.3, 0);
}

export function poleGeometry(height: number): THREE.BufferGeometry {
  return merge([
    { geometry: cyl(0.06, 0.08, height, 6, 0, height / 2, 0), color: "#cfc6b0" },
    { geometry: new THREE.SphereGeometry(0.12, 6, 4).translate(0, height, 0), color: "#d8b25a" },
  ]);
}

/** Máy bay vận tải hai động cơ (dáng C-47). Mũi hướng −z. */
export function planeGeometry(): THREE.BufferGeometry {
  const engine = (x: number) => cyl(0.5, 0.45, 2.2, 8, 0, 0, 0).rotateX(Math.PI / 2).translate(x, -0.1, -1.6);
  return merge([
    { geometry: cyl(1.2, 0.5, 19, 10, 0, 0, 0).rotateX(Math.PI / 2), color: "#6f7466" },
    { geometry: new THREE.SphereGeometry(1.2, 10, 6).scale(1, 1, 1.4).translate(0, 0, -9.3), color: "#6f7466" },
    { geometry: box(29, 0.3, 3.2, 0, -0.2, -1.2), color: "#5d6256" },
    { geometry: box(10, 0.2, 2.2, 0, 0.3, 8.6), color: "#5d6256" },
    { geometry: box(0.25, 3.2, 2.4, 0, 1.8, 8.6), color: "#5d6256" },
    { geometry: engine(-5), color: "#44483f" },
    { geometry: engine(5), color: "#44483f" },
  ]);
}

/** Dù tiếp tế: tán dù và kiện hàng. */
export function chuteGeometry(): THREE.BufferGeometry {
  const canopy = new THREE.SphereGeometry(3, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2.2).translate(0, 7, 0);
  const lines: Part[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    lines.push({ geometry: box(0.04, 6.2, 0.04, 0, 0, 0).rotateZ(Math.cos(a) * 0.36).rotateX(Math.sin(a) * 0.36).translate(Math.cos(a) * 1.3, 3.9, Math.sin(a) * 1.3), color: "#dddddd" });
  }
  return merge([{ geometry: canopy, color: "#e8e2d0" }, ...lines, { geometry: box(1.1, 0.9, 1.1, 0, 0.45, 0), color: "#6b5a3a" }]);
}

// ---------- Cờ ----------
export function flagTexture(kind: "vn" | "fr"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  if (kind === "fr") {
    ["#1d3f8f", "#f4f4f4", "#d42a2a"].forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(i * 64, 0, 64, 128);
    });
  } else {
    ctx.fillStyle = "#da251d";
    ctx.fillRect(0, 0, 192, 128);
    ctx.fillStyle = "#ffcd00";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? 42 : 16.5;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(96 + Math.cos(angle) * radius, 66 + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Tấm cờ phấp phới: lưới có thể cập nhật mỗi khung hình. Mép cán cờ ở x = 0. */
export function createWavingCloth(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height, 10, 4).translate(width / 2, -height / 2, 0);
  const base = Float32Array.from(geometry.getAttribute("position").array);
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  return {
    geometry,
    update(t: number) {
      for (let i = 0; i < position.count; i++) {
        const x = base[i * 3];
        const along = x / width;
        position.setZ(i, Math.sin(x * 2.4 - t * 6.5) * 0.22 * along + Math.sin(x * 5.1 - t * 9) * 0.05 * along);
        position.setY(i, base[i * 3 + 1] - along * along * 0.12);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    },
  };
}
