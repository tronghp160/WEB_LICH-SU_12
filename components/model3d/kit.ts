import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { hash2 } from "@/lib/cinema/rng";
import { burlapTexture, soilTexture, grassTexture } from "@/components/model3d/textures";

/** Mọi mô hình 3D đều là một hàm dựng trả về `BuiltModel`. Tọa độ: mét, y hướng lên, mặt đất y = 0. */
export type BuiltModel = {
  root: THREE.Object3D;
  /** Gọi mỗi khung hình: `time` = giây từ lúc mở, `dt` = giây từ khung trước. */
  update?: (time: number, dt: number, camera: THREE.Camera) => void;
  /** Các nút thao tác riêng (khóa khớp với `ModelSpec.actions`). */
  actions?: Record<string, () => void>;
  dispose?: () => void;
};

export type BuildContext = { reducedMotion: boolean; renderer: THREE.WebGLRenderer };
export type ModelBuilder = (context: BuildContext) => Promise<BuiltModel> | BuiltModel;

type Vec3 = [number, number, number];

export type MeshOptions = { rot?: Vec3; scale?: number | Vec3; cast?: boolean; receive?: boolean; name?: string };

export function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], position: Vec3 = [0, 0, 0], options: MeshOptions = {}): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  if (options.rot) m.rotation.set(...options.rot);
  if (options.scale !== undefined) {
    if (typeof options.scale === "number") m.scale.setScalar(options.scale);
    else m.scale.set(...options.scale);
  }
  m.castShadow = options.cast ?? true;
  m.receiveShadow = options.receive ?? true;
  if (options.name) m.name = options.name;
  return m;
}

export function group(children: THREE.Object3D[], position: Vec3 = [0, 0, 0], rot?: Vec3): THREE.Group {
  const g = new THREE.Group();
  for (const child of children) g.add(child);
  g.position.set(...position);
  if (rot) g.rotation.set(...rot);
  return g;
}

export type StdOptions = {
  rough?: number;
  metal?: number;
  map?: THREE.Texture | null;
  bump?: THREE.Texture | null;
  bumpScale?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  vertexColors?: boolean;
  envMapIntensity?: number;
};

export function std(color: THREE.ColorRepresentation, options: StdOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.rough ?? 0.7,
    metalness: options.metal ?? 0,
    map: options.map ?? null,
    bumpMap: options.bump ?? options.map ?? null,
    bumpScale: options.bumpScale ?? 0.6,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    side: options.side ?? THREE.FrontSide,
    vertexColors: options.vertexColors ?? false,
    envMapIntensity: options.envMapIntensity ?? 1,
  });
}

/** Khối tròn xoay quanh trục y từ danh sách (bán kính, độ cao). */
export function lathe(profile: [number, number][], segments = 24): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

/** Ống uốn theo đường cong Catmull–Rom qua các điểm (khung xe, ống dẫn, dây). */
export function tube(points: Vec3[], radius: number, radialSegments = 8, tension = 0.3, closed = false): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    closed,
    "catmullrom",
    tension,
  );
  return new THREE.TubeGeometry(curve, Math.max(8, points.length * 8), radius, radialSegments, closed);
}

/** Ống thẳng nối hai điểm (đường kính đều). */
export function rod(a: Vec3, b: Vec3, radius: number, radialSegments = 8): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const length = from.distanceTo(to);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments);
  geometry.translate(0, length / 2, 0);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()));
  geometry.translate(from.x, from.y, from.z);
  return geometry;
}

/** Đoạn thon nối hai điểm (chi tay chân): bán kính r0 ở a, r1 ở b, hai đầu bo tròn khi ghép nhiều đoạn. */
export function taper(a: Vec3, b: Vec3, r0: number, r1: number, radialSegments = 12): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const length = from.distanceTo(to);
  const geometry = new THREE.CylinderGeometry(r1, r0, length, radialSegments, 1);
  geometry.translate(0, length / 2, 0);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()));
  geometry.translate(from.x, from.y, from.z);
  return geometry;
}

/** Tấm phẳng đùn từ đường viền 2 chiều (x, y), dày `depth` theo z. */
export function extrude(outline: [number, number][], depth: number, holes: [number, number][][] = [], bevel = 0.01): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const hole of holes) shape.holes.push(new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** Nền đất tròn có cỏ và đất lộ ra (cho cảnh ngoài trời). */
export function groundDisc(radius: number, options: { grass?: boolean; y?: number } = {}): THREE.Mesh {
  const texture = options.grass ? grassTexture([radius / 2.5, radius / 2.5]) : soilTexture([radius / 2.5, radius / 2.5]);
  const geometry = new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2);
  const ground = mesh(geometry, std(0xffffff, { map: texture, rough: 0.98, bumpScale: 0.8 }), [0, options.y ?? 0, 0], { cast: false });
  return ground;
}

/**
 * Tường bao cát: từng bao là một khối bo tròn (InstancedMesh, một lần vẽ), xếp so le, mỗi bao lệch nhẹ về hướng, cỡ và màu.
 * `from` → `to` là đường tim (x, z); `rows` là số lớp; `y` là độ cao đáy.
 */
export function sandbagWall(from: [number, number], to: [number, number], rows: number, options: { y?: number; seed?: number; width?: number } = {}): THREE.InstancedMesh {
  const y0 = options.y ?? 0;
  const seed = options.seed ?? 1;
  const bagW = 0.52;
  const bagH = 0.19;
  const bagD = options.width ?? 0.3;
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const count = Math.max(1, Math.round(length / (bagW * 0.92)));
  const geometry = new RoundedBoxGeometry(bagW, bagH, bagD, 2, 0.06);
  const material = new THREE.MeshStandardMaterial({ map: burlapTexture([0.66, 0.57, 0.38], [1, 1], seed), roughness: 1, bumpMap: null });
  const instanced = new THREE.InstancedMesh(geometry, material, count * rows);
  const heading = Math.atan2(dx, dz) + Math.PI / 2;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const color = new THREE.Color();
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < count - (r % 2 && count > 1 ? 1 : 0); i++) {
      const u = (i + 0.5 + (r % 2) * 0.5) / count;
      const jitter = hash2(i, r, seed) - 0.5;
      quat.setFromEuler(new THREE.Euler(jitter * 0.06, heading + jitter * 0.14, (hash2(i, r, seed + 1) - 0.5) * 0.07));
      const k = 0.94 + hash2(i, r, seed + 2) * 0.14;
      matrix.compose(new THREE.Vector3(from[0] + dx * u + dz * 0 + jitter * 0.03, y0 + bagH / 2 + r * bagH * 0.92, from[1] + dz * u), quat, new THREE.Vector3(k, 0.9 + hash2(i, r, seed + 3) * 0.2, 1));
      instanced.setMatrixAt(n, matrix);
      const tone = 0.82 + hash2(i, r, seed + 4) * 0.3;
      instanced.setColorAt(n, color.setRGB(tone, tone * 0.97, tone * 0.9));
      n++;
    }
  }
  instanced.count = n;
  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  return instanced;
}

/** Chỉ hiện bóng đổ trên nền trống (cho cảnh "phòng sáng" của hiện vật). */
export function shadowFloor(radius: number, y = 0): THREE.Group {
  const shadow = mesh(new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.42 }), [0, y + 0.001, 0], { cast: false });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  gradient.addColorStop(0, "rgba(58,48,38,1)");
  gradient.addColorStop(0.7, "rgba(30,26,22,0.95)");
  gradient.addColorStop(1, "rgba(20,18,16,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const disc = mesh(new THREE.CircleGeometry(radius * 1.25, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), [0, y - 0.002, 0], {
    cast: false,
    receive: false,
  });
  return group([disc, shadow]);
}

/** Cụm lá ngụy trang: nhiều mảnh lá chéo nhau, màu xanh đậm nhạt. */
export function foliage(position: Vec3, size: number, texture: THREE.Texture, seed = 1): THREE.Group {
  const material = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    plane.rotation.set(((i * 37 + seed * 13) % 90) * 0.0175 - 0.8, (i * 1.25 + seed) % 6.28, ((i * 53 + seed * 7) % 60) * 0.0175);
    plane.castShadow = true;
    g.add(plane);
  }
  g.position.set(...position);
  return g;
}

/** Giải phóng bộ nhớ đồ họa của cả cây đối tượng (hình, vật liệu, họa tiết). */
export function disposeTree(root: THREE.Object3D): void {
  const seen = new Set<unknown>();
  root.traverse((object) => {
    const m = object as THREE.Mesh;
    if (m.geometry && !seen.has(m.geometry)) {
      seen.add(m.geometry);
      m.geometry.dispose();
    }
    const materials = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const material of materials) {
      if (seen.has(material)) continue;
      seen.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture && !seen.has(value)) {
          seen.add(value);
          value.dispose();
        }
      }
      material.dispose();
    }
  });
}

/**
 * Gộp mọi khối của một đối tượng tĩnh thành ít lần vẽ nhất có thể: các khối dùng chung vật liệu được ghép thành một khối
 * (đã áp dụng phép biến đổi). Dùng cho nhân vật, đồ vật nhiều chi tiết nhỏ. Bỏ qua khối đặt theo mẫu (InstancedMesh).
 */
export function bake(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const rest: THREE.Object3D[] = [];
  root.traverse((object) => {
    const m = object as THREE.Mesh;
    if (!m.isMesh) return;
    if ((m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material)) {
      rest.push(m);
      return;
    }
    const geometry = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld));
    for (const name of Object.keys(geometry.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") geometry.deleteAttribute(name);
    if (!geometry.getAttribute("uv")) geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geometry.getAttribute("position").count * 2), 2));
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const list = buckets.get(m.material as THREE.Material) ?? [];
    list.push(geometry);
    buckets.set(m.material as THREE.Material, list);
  });
  const out = new THREE.Group();
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) continue;
    const baked = new THREE.Mesh(merged, material);
    baked.castShadow = true;
    baked.receiveShadow = true;
    out.add(baked);
  }
  for (const object of rest) out.add(object.clone());
  return out;
}
