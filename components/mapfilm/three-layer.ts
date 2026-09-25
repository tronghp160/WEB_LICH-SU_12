import * as THREE from "three";
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from "maplibre-gl";
import type { LatLng } from "@/lib/battles/types";
import { clamp, lerp } from "@/lib/cinema/math";
import { evaluateEmitter, type ParticleLayer } from "@/lib/cinema/effects";
import { fromLocal, meterInMercatorUnits, toLocal, toMercator } from "@/lib/mapfilm/geo";
import type { MapFrame, PieceState } from "@/lib/mapfilm/types";
import {
  bunkerGeometry,
  chuteGeometry,
  createWavingCloth,
  flagTexture,
  gunGeometry,
  hqGeometry,
  planeGeometry,
  poleGeometry,
  porterGeometry,
  ringGeometry,
  soldierGeometry,
} from "@/components/mapfilm/models";

/** Độ cao mặt đất (m, đã nhân hệ số phóng đại địa hình) tại một điểm. */
export type GroundFn = (point: LatLng) => number;

/** Mỗi mét mô hình hiện thành bao nhiêu điểm ảnh ở tâm khung nhìn (lính cao 1,8 m → khoảng 14 điểm ảnh). */
const PIECE_PX_PER_METER = 8;
/** Hướng gió (độ) chung cho mọi lá cờ. */
const WIND = 110;

const pointVertex = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
attribute float aSeed;
uniform float uPxScale;
varying vec4 vColor;
varying float vSeed;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uPxScale / max(gl_Position.w, 1e-6), 0.0, 480.0);
  vColor = aColor;
  vSeed = aSeed;
}
`;

const pointFragment = /* glsl */ `
uniform float uMode;
uniform float uGain;
varying vec4 vColor;
varying float vSeed;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  if (d > 1.0) discard;
  if (uMode > 0.5) {
    float n = vnoise(p * 4.0 + vSeed * 17.0) * 0.6 + vnoise(p * 9.0 - vSeed * 7.0) * 0.4;
    gl_FragColor = vec4(vColor.rgb, vColor.a * smoothstep(1.0, 0.15, d + (n - 0.5) * 0.7));
  } else {
    gl_FragColor = vec4(vColor.rgb * uGain, vColor.a * pow(1.0 - d, 2.1));
  }
}
`;

type PointSystem = {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  begin: () => void;
  push: (x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number, seed: number) => void;
  finish: (depthOf: ((x: number, y: number, z: number) => number) | null) => void;
  count: () => number;
};

function createPointSystem(capacity: number, mode: 0 | 1, blending: THREE.Blending): PointSystem {
  const geometry = new THREE.BufferGeometry();
  const position = new Float32Array(capacity * 3);
  const size = new Float32Array(capacity);
  const color = new Float32Array(capacity * 4);
  const seed = new Float32Array(capacity);
  const stage = { position: new Float32Array(capacity * 3), size: new Float32Array(capacity), color: new Float32Array(capacity * 4), seed: new Float32Array(capacity) };
  const keys = new Float32Array(capacity);
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(color, 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    uniforms: { uPxScale: { value: 1 }, uMode: { value: mode }, uGain: { value: 1.4 } },
    transparent: true,
    depthWrite: false,
    blending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = mode === 1 ? 20 : 30;
  let n = 0;
  return {
    points,
    material,
    count: () => n,
    begin: () => {
      n = 0;
    },
    push(x, y, z, s, r, g, b, a, sd) {
      if (n >= capacity || a <= 0.003) return;
      stage.position.set([x, y, z], n * 3);
      stage.size[n] = s;
      stage.color.set([r, g, b, a], n * 4);
      stage.seed[n] = sd;
      n++;
    },
    finish(depthOf) {
      const order = new Uint32Array(n);
      for (let i = 0; i < n; i++) order[i] = i;
      if (depthOf) {
        for (let i = 0; i < n; i++) keys[i] = depthOf(stage.position[i * 3], stage.position[i * 3 + 1], stage.position[i * 3 + 2]);
        order.sort((a, b) => keys[b] - keys[a]);
      }
      for (let i = 0; i < n; i++) {
        const s = order[i];
        position.set(stage.position.subarray(s * 3, s * 3 + 3), i * 3);
        size[i] = stage.size[s];
        color.set(stage.color.subarray(s * 4, s * 4 + 4), i * 4);
        seed[i] = stage.seed[s];
      }
      geometry.setDrawRange(0, n);
      for (const name of ["position", "aSize", "aColor", "aSeed"]) (geometry.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    },
  };
}

class Batch {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, private readonly capacity: number, colored = false) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    if (colored) this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  }
  begin() {
    this.n = 0;
  }
  push(matrix: THREE.Matrix4, color?: THREE.Color) {
    if (this.n >= this.capacity) return;
    this.mesh.setMatrixAt(this.n, matrix);
    if (color) this.mesh.setColorAt(this.n, color);
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  count() {
    return this.n;
  }
}

export type ThreeLayer = {
  layer: CustomLayerInterface;
  /** Dựng lại toàn bộ vật thể 3D theo khung hình (gọi trước mỗi lần bản đồ vẽ lại). */
  setFrame: (frame: MapFrame, ground: GroundFn) => void;
  setParticleBudget: (fraction: number) => void;
  stats: () => { particles: number; pieces: number };
  /** Gỡ lỗi: tọa độ màn hình (CSS px) của điểm cục bộ theo ma trận chiếu của lần vẽ gần nhất. */
  projectLocal: (x: number, y: number, z: number) => [number, number] | null;
  dispose: () => void;
};

const COLOR_HELD = new THREE.Color("#2f6fc0");
const COLOR_ATTACKED = new THREE.Color("#ff8a3d");
const COLOR_CAPTURED = new THREE.Color("#d0342c");

export function createThreeLayer(origin: LatLng): ThreeLayer {
  let map: MapLibreMap | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const originMerc = toMercator(origin);
  const s = meterInMercatorUnits(origin[0]);
  // cục bộ (x đông, y lên, z nam, mét) → Mercator (x đông, y nam, z lên)
  const model = new THREE.Matrix4().set(s, 0, 0, originMerc[0], 0, 0, s, originMerc[1], 0, s, 0, 0, 0, 0, 0, 1);

  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x4a3c2a, 1.6);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(-0.5, 1, -0.35);
  scene.add(hemi, sun, sun.target);

  const lambert = new THREE.MeshLambertMaterial({ vertexColors: true });
  const soldiers = new Batch(soldierGeometry(), lambert, 900);
  const porters = new Batch(porterGeometry(), lambert, 80);
  const guns = new Batch(gunGeometry(), lambert, 40);
  const hqs = new Batch(hqGeometry(), lambert, 6);
  const bunkers = new Batch(bunkerGeometry(), lambert, 24);
  const poles = new Batch(poleGeometry(6), lambert, 24);
  const smallPoles = new Batch(poleGeometry(3.4), lambert, 220);
  const planes = new Batch(planeGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true }), 8);
  const chutes = new Batch(chuteGeometry(), lambert, 40);
  const rings = new Batch(ringGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), 24, true);
  const cloth = createWavingCloth(2.4, 1.6);
  const flagMaterial = (kind: "vn" | "fr") => new THREE.MeshLambertMaterial({ map: flagTexture(kind), side: THREE.DoubleSide, emissive: new THREE.Color(0.18, 0.05, 0.03) });
  const flagsVn = new Batch(cloth.geometry, flagMaterial("vn"), 260);
  const flagsFr = new Batch(cloth.geometry, flagMaterial("fr"), 24);
  const batches = [soldiers, porters, guns, hqs, bunkers, poles, smallPoles, planes, chutes, rings, flagsVn, flagsFr];
  rings.mesh.renderOrder = 5;
  for (const b of batches) scene.add(b.mesh);

  const glow = createPointSystem(9000, 0, THREE.AdditiveBlending);
  const smoke = createPointSystem(7000, 1, THREE.NormalBlending);
  scene.add(smoke.points, glow.points);
  let budget = 1;

  // Biến tạm dùng lại mỗi khung hình
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const tint = new THREE.Color();

  let lastPieces = 0;
  const lastProjection = new THREE.Matrix4();
  let pendingSort = true;

  /** Đặt một mô hình: gốc (x, y, z), quay theo `heading` (độ), lệch `offset` (m ở tỉ lệ 1) trong hệ tọa độ của quân cờ. */
  function place(batch: Batch, x: number, y: number, z: number, heading: number, scale: number, offset: [number, number, number] = [0, 0, 0], sy = 1, color?: THREE.Color, extraYaw = 0) {
    const h = (-heading * Math.PI) / 180;
    const cos = Math.cos(h);
    const sin = Math.sin(h);
    const ox = offset[0] * scale;
    const oz = offset[2] * scale;
    pos.set(x + ox * cos + oz * sin, y + offset[1] * scale, z - ox * sin + oz * cos);
    euler.set(0, h + extraYaw, 0);
    quat.setFromEuler(euler);
    scl.set(scale, scale * sy, scale);
    matrix.compose(pos, quat, scl);
    batch.push(matrix, color);
  }

  function placeFlag(batch: Batch, x: number, y: number, z: number, scale: number, width = 1) {
    euler.set(0, (-WIND * Math.PI) / 180 + Math.PI / 2, 0);
    quat.setFromEuler(euler);
    pos.set(x, y, z);
    scl.set(scale * width, scale * width, scale * width);
    matrix.compose(pos, quat, scl);
    batch.push(matrix);
  }

  function drawPiece(piece: PieceState, ground: GroundFn, tokenScale: number, t: number) {
    const [x0, z0] = toLocal(origin, piece.position);
    const scale = tokenScale * Math.sqrt(piece.opacity);
    if (scale <= 0) return;
    // lệch ngang (hàng quân dàn ra khi tới nơi)
    const right = ((piece.heading + 90) * Math.PI) / 180;
    const x = x0 + Math.sin(right) * piece.offset * 3.4 * tokenScale;
    const z = z0 - Math.cos(right) * piece.offset * 3.4 * tokenScale;
    const y = ground(fromLocal(origin, [x, z]));
    const bob = (i: number) => (piece.moving ? Math.abs(Math.sin(t * 7 + i * 1.7)) * 0.18 : 0);
    switch (piece.kind) {
      case "infantry": {
        const layout: [number, number][] = [
          [0, -0.9],
          [-1.1, 0.4],
          [1.1, 0.4],
          [-0.55, 1.6],
          [0.55, 1.6],
        ];
        layout.forEach(([ox, oz], i) => place(soldiers, x, y, z, piece.heading, scale, [ox, bob(i), oz]));
        place(smallPoles, x, y, z, piece.heading, scale, [0.35, bob(0), -0.9]);
        const h = (-piece.heading * Math.PI) / 180;
        const fx = x + (0.35 * Math.cos(h) + -0.9 * Math.sin(h)) * scale;
        const fz = z + (-0.35 * Math.sin(h) + -0.9 * Math.cos(h)) * scale;
        placeFlag(flagsVn, fx, y + (3.4 + bob(0)) * scale, fz, scale, 0.55);
        break;
      }
      case "artillery": {
        place(guns, x, y, z, piece.heading, scale);
        const crew: [number, number][] = piece.moving
          ? [
              [-0.7, -3.4],
              [0.7, -3.4],
              [-0.7, -4.6],
              [0.7, -4.6],
            ]
          : [
              [-1.3, 1.2],
              [1.3, 1.2],
              [0, 2.4],
            ];
        crew.forEach(([ox, oz], i) => place(soldiers, x, y, z, piece.heading, scale, [ox, bob(i), oz]));
        break;
      }
      case "hq": {
        place(hqs, x, y, z, piece.heading, scale);
        place(smallPoles, x, y, z, piece.heading, scale * 1.4, [1.6, 0, 0]);
        const h = (-piece.heading * Math.PI) / 180;
        placeFlag(flagsVn, x + 1.6 * Math.cos(h) * scale * 1.4, y + 3.4 * scale * 1.4, z - 1.6 * Math.sin(h) * scale * 1.4, scale * 1.4, 0.55);
        place(soldiers, x, y, z, piece.heading, scale, [-2.4, 0, -1.8]);
        place(soldiers, x, y, z, piece.heading, scale, [2.6, 0, -2.0]);
        break;
      }
      case "porter":
        place(porters, x, y, z, piece.heading, scale, [0, bob(0) * 0.5, 0]);
        break;
    }
  }

  function setFrame(frame: MapFrame, ground: GroundFn) {
    if (!map) return;
    for (const b of batches) b.begin();
    const zoom = map.getZoom();
    const centerLat = map.getCenter().lat;
    // mét trên mỗi điểm ảnh (CSS) ở tâm khung nhìn
    const mpp = 1 / (512 * 2 ** zoom * meterInMercatorUnits(centerLat));
    const tokenScale = Math.max(1, PIECE_PX_PER_METER * mpp);
    const effectScale = tokenScale * 0.2;
    const lift = Math.max(1, tokenScale / 14);
    const t = frame.t;
    cloth.update(t);

    // Ánh sáng theo ngày/đêm
    hemi.intensity = lerp(1.7, 0.55, frame.night);
    sun.intensity = lerp(2.3, 0.3, frame.night);
    sun.color.setRGB(lerp(1, 0.55, frame.night), lerp(0.95, 0.65, frame.night), lerp(0.86, 1, frame.night));

    // Cứ điểm
    for (const sp of frame.strongpoints) {
      const [x, z] = toLocal(origin, sp.position);
      const y = ground(sp.position);
      const scale = tokenScale * 0.55 * Math.sqrt(sp.opacity);
      if (scale <= 0) continue;
      place(bunkers, x, y, z, 0, scale);
      if (sp.status === "attacked") {
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        tint.copy(COLOR_ATTACKED).lerp(COLOR_CAPTURED, pulse);
        place(rings, x, y, z, 0, scale * (1 + 0.08 * pulse), [0, 0, 0], 1, tint);
      } else place(rings, x, y, z, 0, scale, [0, 0, 0], 1, sp.status === "captured" ? COLOR_CAPTURED : COLOR_HELD);
      place(poles, x, y, z, 0, scale, [0, 2.3, 0]);
      const top = y + (2.3 + 6) * scale;
      const travel = 4.6 * scale;
      if (sp.flagFr > 0.02) placeFlag(flagsFr, x, top - travel * (1 - sp.flagFr), z, scale);
      if (sp.flagVn > 0.02) placeFlag(flagsVn, x, top - travel * (1 - sp.flagVn), z, scale);
    }

    for (const piece of frame.pieces) drawPiece(piece, ground, tokenScale, t);
    lastPieces = frame.pieces.length;

    // Máy bay và dù
    for (const plane of frame.planes) {
      const [x, z] = toLocal(origin, plane.position);
      const y = ground(plane.position) + plane.altitude * lift + 20 * tokenScale;
      place(planes, x, y, z, plane.heading, tokenScale * 0.6 * Math.sqrt(plane.opacity));
    }
    for (const chute of frame.chutes) {
      const [x, z] = toLocal(origin, chute.position);
      const y = ground(chute.position) + chute.altitude * lift;
      place(chutes, x, y, z, 0, tokenScale * 0.5 * Math.sqrt(chute.opacity));
    }

    // Hạt: nổ, khói, cháy, đạn pháo, chớp đầu nòng
    glow.begin();
    smoke.begin();
    let seedCounter = 0;
    const sink = (layer: ParticleLayer, px: number, py: number, pz: number, size: number, r: number, g: number, b: number, a: number) => {
      seedCounter++;
      if (budget < 1 && (seedCounter % 10) / 10 >= budget) return;
      (layer === "glow" ? glow : smoke).push(px, py, pz, size, r, g, b, a, (seedCounter * 0.618) % 1);
    };
    for (const e of frame.emitters) {
      const groundY = ground(fromLocal(origin, [e.x, e.z]));
      // vụ nổ lớn (bộc phá A1) được phóng to hơn hẳn để thành điểm nhấn của cảnh
      evaluateEmitter({ ...e, scale: e.scale * effectScale * (e.kind === "blast" ? 2.6 : 1) }, t, groundY, sink);
    }
    for (const shell of frame.shells) {
      const [ax, az] = toLocal(origin, shell.from);
      const [bx, bz] = toLocal(origin, shell.to);
      const ay = ground(shell.from) + 3 * tokenScale;
      const by = ground(shell.to);
      const apex = Math.hypot(bx - ax, bz - az) * 0.22 + 12 * tokenScale;
      for (let k = 0; k < 7; k++) {
        const u = shell.u - k * 0.018;
        if (u < 0) break;
        const px = lerp(ax, bx, u);
        const pz = lerp(az, bz, u);
        const py = lerp(ay, by, u) + 4 * apex * u * (1 - u);
        const fade = 1 - k / 7;
        glow.push(px, py, pz, (k === 0 ? 11 : 7) * mpp, 1, 0.78 - k * 0.06, 0.35, fade * 0.95, 0.3);
      }
    }
    for (const muzzle of frame.muzzles) {
      const [x, z] = toLocal(origin, muzzle.at);
      const y = ground(muzzle.at) + 3 * tokenScale;
      glow.push(x, y, z, 42 * mpp * muzzle.strength + 10 * mpp, 1, 0.8, 0.45, muzzle.strength, 0.5);
      smoke.push(x, y + 6 * tokenScale * (1 - muzzle.strength), z, 30 * mpp, 0.55, 0.52, 0.48, 0.35 * muzzle.strength, 0.7);
    }

    // Cháy âm ỉ nhẹ ở cứ điểm đang bị tiến công ban đêm: đốm sáng đỏ
    for (const sp of frame.strongpoints) {
      if (sp.status !== "attacked") continue;
      const [x, z] = toLocal(origin, sp.position);
      const flicker = 0.6 + 0.4 * Math.sin(t * 13 + x);
      glow.push(x, ground(sp.position) + 4 * tokenScale, z, 38 * mpp, 1, 0.45, 0.15, 0.35 * flicker * (0.4 + frame.night), 0.1);
    }

    for (const b of batches) b.end();
    pendingSort = true;
  }

  const layer: CustomLayerInterface = {
    id: "mapfilm-3d",
    type: "custom",
    renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    },
    render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput) {
      if (!renderer || !map) return;
      const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix as unknown as number[]).multiply(model);
      camera.projectionMatrix.copy(projection);
      lastProjection.copy(projection);
      camera.projectionMatrixInverse.copy(projection).invert();
      const e = projection.elements;
      const depthOf = (x: number, y: number, z: number) => e[3] * x + e[7] * y + e[11] * z + e[15];

      // Cỡ hạt: điểm ảnh (thiết bị) = cỡ (m) × uPxScale / w
      const center = map.getCenter();
      const [cx, cz] = toLocal(origin, [center.lat, center.lng]);
      const cy = map.queryTerrainElevation(center) ?? 0;
      const wCenter = Math.max(1e-6, depthOf(cx, cy, cz));
      const ppm = 512 * 2 ** map.getZoom() * meterInMercatorUnits(center.lat) * map.getPixelRatio();
      glow.material.uniforms.uPxScale.value = ppm * wCenter;
      smoke.material.uniforms.uPxScale.value = ppm * wCenter;
      if (pendingSort) {
        glow.finish(null);
        smoke.finish(depthOf);
        pendingSort = false;
      }
      renderer.resetState();
      renderer.render(scene, camera);
    },
    onRemove() {
      renderer?.dispose();
      renderer = null;
      map = null;
    },
  };

  return {
    layer,
    setFrame,
    setParticleBudget(fraction) {
      budget = clamp(fraction, 0.2, 1);
    },
    stats: () => ({ particles: glow.count() + smoke.count(), pieces: lastPieces }),
    projectLocal(x, y, z) {
      if (!map) return null;
      const v = new THREE.Vector4(x, y, z, 1).applyMatrix4(lastProjection);
      const canvas = map.getCanvas();
      return [((v.x / v.w + 1) / 2) * canvas.clientWidth, ((1 - v.y / v.w) / 2) * canvas.clientHeight];
    },
    dispose() {
      for (const b of batches) {
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
      }
      glow.points.geometry.dispose();
      glow.material.dispose();
      smoke.points.geometry.dispose();
      smoke.material.dispose();
    },
  };
}
