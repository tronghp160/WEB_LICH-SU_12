import * as THREE from "three";
import { evaluateEmitter, type ParticleLayer } from "@/lib/cinema/effects";
import type { Emitter } from "@/lib/cinema/types";

/**
 * Hạt lửa/khói/bụi cho các mô hình 3D. Dùng lại các hàm tính hạt của phim A1 (lib/cinema/effects.ts): cùng (emitter, t) → cùng hạt,
 * nên tua hay chạy lại đều đúng. Kích thước hạt tính bằng mét trong không gian mô hình.
 */
const vertex = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
attribute float aSeed;
uniform float uPxScale;
varying vec4 vColor;
varying float vSeed;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uPxScale / max(-mv.z, 0.2), 0.0, 900.0);
  vColor = aColor;
  vSeed = aSeed;
}
`;

const fragment = /* glsl */ `
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

type Layer = {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  stage: { position: Float32Array; size: Float32Array; color: Float32Array; seed: Float32Array };
  order: Uint32Array;
  keys: Float32Array;
  count: number;
  capacity: number;
};

function createLayer(capacity: number, mode: 0 | 1, blending: THREE.Blending): Layer {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uPxScale: { value: 800 }, uMode: { value: mode }, uGain: { value: 1.4 } },
    transparent: true,
    depthWrite: false,
    blending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = mode === 1 ? 20 : 30;
  return {
    points,
    material,
    stage: { position: new Float32Array(capacity * 3), size: new Float32Array(capacity), color: new Float32Array(capacity * 4), seed: new Float32Array(capacity) },
    order: new Uint32Array(capacity),
    keys: new Float32Array(capacity),
    count: 0,
    capacity,
  };
}

export type ParticleSystem = {
  group: THREE.Group;
  /** Vẽ lại hạt của các emitter ở thời điểm `t` (giây kể từ lúc tính giờ của từng emitter). */
  update: (emitters: Emitter[], t: number, groundY: (x: number, z: number) => number, camera: THREE.PerspectiveCamera, viewportHeight: number, scale?: number) => void;
  clear: () => void;
  dispose: () => void;
};

export function createParticleSystem(): ParticleSystem {
  const glow = createLayer(5000, 0, THREE.AdditiveBlending);
  const smoke = createLayer(4000, 1, THREE.NormalBlending);
  const group = new THREE.Group();
  group.add(smoke.points, glow.points);

  const push = (layer: Layer, x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number, seed: number) => {
    if (layer.count >= layer.capacity || a <= 0.003) return;
    const i = layer.count++;
    layer.stage.position.set([x, y, z], i * 3);
    layer.stage.size[i] = size;
    layer.stage.color.set([r, g, b, a], i * 4);
    layer.stage.seed[i] = seed;
  };

  const flush = (layer: Layer, camera: THREE.Camera | null) => {
    const { count } = layer;
    const geometry = layer.points.geometry;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const size = geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const color = geometry.getAttribute("aColor") as THREE.BufferAttribute;
    const seed = geometry.getAttribute("aSeed") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) layer.order[i] = i;
    if (camera) {
      const { x: cx, y: cy, z: cz } = camera.position;
      for (let i = 0; i < count; i++) {
        const dx = layer.stage.position[i * 3] - cx;
        const dy = layer.stage.position[i * 3 + 1] - cy;
        const dz = layer.stage.position[i * 3 + 2] - cz;
        layer.keys[i] = dx * dx + dy * dy + dz * dz;
      }
      layer.order.subarray(0, count).sort((a, b) => layer.keys[b] - layer.keys[a]);
    }
    for (let i = 0; i < count; i++) {
      const s = layer.order[i];
      (position.array as Float32Array).set(layer.stage.position.subarray(s * 3, s * 3 + 3), i * 3);
      (size.array as Float32Array)[i] = layer.stage.size[s];
      (color.array as Float32Array).set(layer.stage.color.subarray(s * 4, s * 4 + 4), i * 4);
      (seed.array as Float32Array)[i] = layer.stage.seed[s];
    }
    geometry.setDrawRange(0, count);
    position.needsUpdate = size.needsUpdate = color.needsUpdate = seed.needsUpdate = true;
  };

  return {
    group,
    update(emitters, t, groundY, camera, viewportHeight, scale = 1) {
      glow.count = 0;
      smoke.count = 0;
      let counter = 0;
      const sink = (layerName: ParticleLayer, x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number) => {
        counter++;
        push(layerName === "glow" ? glow : smoke, x, y, z, size, r, g, b, a, (counter * 0.618) % 1);
      };
      for (const emitter of emitters) {
        if (t < emitter.t0) continue;
        evaluateEmitter({ ...emitter, scale: emitter.scale * scale }, t, groundY(emitter.x, emitter.z), sink);
      }
      const pxScale = (viewportHeight * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
      glow.material.uniforms.uPxScale.value = pxScale;
      smoke.material.uniforms.uPxScale.value = pxScale;
      flush(glow, null);
      flush(smoke, camera);
    },
    clear() {
      glow.points.geometry.setDrawRange(0, 0);
      smoke.points.geometry.setDrawRange(0, 0);
    },
    dispose() {
      for (const layer of [glow, smoke]) {
        layer.points.geometry.dispose();
        layer.material.dispose();
      }
    },
  };
}
