import * as THREE from "three";
import { clamp, smoothstep } from "@/lib/cinema/math";
import {
  blastGlare,
  emitterLifetime,
  evaluateEmitter,
  firstShotIndexAtOrAfter,
  flareState,
  flashOf,
  muzzleFlash,
  tracerAt,
  type ParticleLayer,
} from "@/lib/cinema/effects";
import type { FilmScript } from "@/lib/cinema/types";
import type { StaticGlow } from "@/components/cinema3d/props";

const pointVertex = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
attribute float aSeed;
uniform float uScale;
uniform float uFogDensity;
varying vec4 vColor;
varying float vSeed;
varying float vFog;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.5);
  gl_PointSize = clamp(aSize * uScale / dist, 0.0, 700.0);
  vColor = aColor;
  vSeed = aSeed;
  vFog = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
}
`;

const pointFragment = /* glsl */ `
uniform float uMode;
uniform vec3 uTint;
uniform vec3 uFogColor;
uniform float uGain;
varying vec4 vColor;
varying float vSeed;
varying float vFog;

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
  float alpha;
  vec3 rgb;
  if (uMode > 0.5) {
    // Khói: viền loang lổ theo nhiễu, hạt nào cũng có hình riêng (seed)
    float n = vnoise(p * 4.0 + vSeed * 17.0) * 0.6 + vnoise(p * 9.0 - vSeed * 7.0) * 0.4;
    alpha = vColor.a * smoothstep(1.0, 0.15, d + (n - 0.5) * 0.7);
    rgb = mix(vColor.rgb * uTint, uFogColor, vFog * 0.7);
  } else {
    alpha = vColor.a * pow(1.0 - d, 2.1) * (1.0 - vFog * 0.5);
    rgb = vColor.rgb * uGain;
  }
  gl_FragColor = vec4(rgb, alpha);
}
`;

type PointSystem = {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  begin: () => void;
  push: (x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number, seed: number) => void;
  end: (camera: THREE.Vector3 | null) => void;
  count: () => number;
};

function createPointSystem(capacity: number, mode: 0 | 1, blending: THREE.Blending): PointSystem {
  const geometry = new THREE.BufferGeometry();
  const position = new Float32Array(capacity * 3);
  const size = new Float32Array(capacity);
  const color = new Float32Array(capacity * 4);
  const seed = new Float32Array(capacity);
  const stagePosition = new Float32Array(capacity * 3);
  const stageSize = new Float32Array(capacity);
  const stageColor = new Float32Array(capacity * 4);
  const stageSeed = new Float32Array(capacity);
  const keys = new Float32Array(capacity);
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(color, 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    uniforms: {
      uScale: { value: 800 },
      uFogDensity: { value: 0.0003 },
      uMode: { value: mode },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uFogColor: { value: new THREE.Color(0.02, 0.03, 0.065) },
      uGain: { value: 1.5 },
    },
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
      stagePosition[n * 3] = x;
      stagePosition[n * 3 + 1] = y;
      stagePosition[n * 3 + 2] = z;
      stageSize[n] = s;
      stageColor[n * 4] = r;
      stageColor[n * 4 + 1] = g;
      stageColor[n * 4 + 2] = b;
      stageColor[n * 4 + 3] = a;
      stageSeed[n] = sd;
      n++;
    },
    end(camera) {
      // Khói dùng pha trộn alpha thường nên phải vẽ hạt xa trước, hạt gần sau
      const order = new Uint32Array(n);
      for (let i = 0; i < n; i++) order[i] = i;
      if (camera) {
        for (let i = 0; i < n; i++) {
          const dx = stagePosition[i * 3] - camera.x;
          const dy = stagePosition[i * 3 + 1] - camera.y;
          const dz = stagePosition[i * 3 + 2] - camera.z;
          keys[i] = dx * dx + dy * dy + dz * dz;
        }
        order.sort((a, b) => keys[b] - keys[a]);
      }
      for (let i = 0; i < n; i++) {
        const s = order[i];
        position[i * 3] = stagePosition[s * 3];
        position[i * 3 + 1] = stagePosition[s * 3 + 1];
        position[i * 3 + 2] = stagePosition[s * 3 + 2];
        size[i] = stageSize[s];
        color[i * 4] = stageColor[s * 4];
        color[i * 4 + 1] = stageColor[s * 4 + 1];
        color[i * 4 + 2] = stageColor[s * 4 + 2];
        color[i * 4 + 3] = stageColor[s * 4 + 3];
        seed[i] = stageSeed[s];
      }
      geometry.setDrawRange(0, n);
      for (const name of ["position", "aSize", "aColor", "aSeed"]) (geometry.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    },
  };
}

export type EffectsSystem = {
  group: THREE.Group;
  lights: THREE.PointLight[];
  update: (args: {
    t: number;
    camera: THREE.PerspectiveCamera;
    ground: (x: number, z: number) => number;
    dawn: number;
    viewportHeight: number;
    fogDensity: number;
    fogColor: THREE.Color;
    glows: StaticGlow[];
    reducedMotion: boolean;
  }) => { glare: number; flash: number };
};

const MAX_TRACERS = 700;

export function buildEffects(script: FilmScript): EffectsSystem {
  const group = new THREE.Group();
  const glow = createPointSystem(6000, 0, THREE.AdditiveBlending);
  const smoke = createPointSystem(4200, 1, THREE.NormalBlending);
  group.add(smoke.points, glow.points);

  // Vệt đạn
  const tracerGeometry = new THREE.BufferGeometry();
  const tracerPositions = new Float32Array(MAX_TRACERS * 6);
  const tracerColors = new Float32Array(MAX_TRACERS * 6);
  tracerGeometry.setAttribute("position", new THREE.BufferAttribute(tracerPositions, 3).setUsage(THREE.DynamicDrawUsage));
  tracerGeometry.setAttribute("color", new THREE.BufferAttribute(tracerColors, 3).setUsage(THREE.DynamicDrawUsage));
  tracerGeometry.setDrawRange(0, 0);
  const tracers = new THREE.LineSegments(tracerGeometry, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  tracers.frustumCulled = false;
  tracers.renderOrder = 25;
  group.add(tracers);

  // Sóng xung kích
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.965, 1, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.9, 0.75), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 22;
  ring.visible = false;
  group.add(ring);

  // Đèn động: 2 pháo sáng, 1 chớp nổ lớn, 1 đám cháy, 1 chớp pháo/lựu đạn
  const flareLights = [0, 1].map(() => {
    const light = new THREE.PointLight(0xfff0d0, 0, 900, 2);
    group.add(light);
    return light;
  });
  const blastLight = new THREE.PointLight(0xffa860, 0, 1500, 2);
  const fireLight = new THREE.PointLight(0xff7a2a, 0, 220, 2);
  const shellLight = new THREE.PointLight(0xffb070, 0, 500, 2);
  group.add(blastLight, fireLight, shellLight);

  const fires = script.emitters.filter((e) => e.kind === "fire");
  const blast = script.emitters.find((e) => e.kind === "blast")!;
  const flashers = script.emitters.filter((e) => e.kind !== "fire");
  const lights = [...flareLights, blastLight, fireLight, shellLight];

  const cameraPos = new THREE.Vector3();
  const tint = new THREE.Color();

  return {
    group,
    lights,
    update({ t, camera, ground, dawn, viewportHeight, fogDensity, fogColor, glows, reducedMotion }) {
      camera.getWorldPosition(cameraPos);
      const scale = viewportHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
      for (const system of [glow, smoke]) {
        system.material.uniforms.uScale.value = scale;
        system.material.uniforms.uFogDensity.value = fogDensity;
        (system.material.uniforms.uFogColor.value as THREE.Color).copy(fogColor);
      }
      // Khói sáng dần khi trời sáng; ban đêm hơi ánh xanh
      tint.setRGB(0.85 + 1.9 * dawn, 0.9 + 1.7 * dawn, 1.05 + 1.3 * dawn);
      (smoke.material.uniforms.uTint.value as THREE.Color).copy(tint);
      glow.material.uniforms.uGain.value = 1.35 + 0.4 * (1 - dawn);

      glow.begin();
      smoke.begin();
      const sink = (layer: ParticleLayer, x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number) => {
        const seed = ((x * 12.9898 + z * 78.233 + size * 3.1) % 1 + 1) % 1;
        (layer === "glow" ? glow : smoke).push(x, y, z, size, r, g, b, a, seed);
      };

      // Hạt của các emitter đang hoạt động
      for (const e of script.emitters) {
        if (t < e.t0 || t > e.t0 + emitterLifetime(e)) continue;
        if (e.distant) continue;
        evaluateEmitter(e, t, ground(e.x, e.z), sink);
      }

      // Đèn/đốm sáng tĩnh (cửa hầm, khu sở chỉ huy) và ánh đèn xa
      for (const g of glows) {
        const flicker = 1 - g.flicker * (0.5 + 0.5 * Math.sin(t * 9 + g.x * 0.37));
        glow.push(g.x, g.y, g.z, g.size, g.color[0], g.color[1], g.color[2], g.alpha * flicker * (1 - dawn * 0.8), 0.3);
      }
      script.farLights.forEach(([x, z], i) => {
        const flicker = 0.75 + 0.25 * Math.sin(t * 3 + i * 1.7);
        glow.push(x, ground(x, z) + 3, z, 5.5, 1, 0.68, 0.32, 0.55 * flicker * (1 - dawn * 0.85), 0.5);
      });

      // Pháo sáng: hạt sáng + đèn
      const activeFlares = script.flares
        .map((f) => ({ f, s: flareState(f, t) }))
        .filter((x): x is { f: (typeof script.flares)[number]; s: NonNullable<ReturnType<typeof flareState>> } => x.s !== null)
        .sort((a, b) => b.s.intensity - a.s.intensity);
      for (const { s } of activeFlares) {
        glow.push(s.x, s.y, s.z, s.rising ? 3 : 12, 1, 0.94, 0.78, clamp(s.intensity) * 0.6, 0.7);
        glow.push(s.x, s.y, s.z, s.rising ? 1.2 : 3.5, 1, 1, 1, clamp(s.intensity), 0.2);
        if (s.rising) for (let k = 1; k <= 7; k++) smoke.push(s.x, s.y - k * 4, s.z, 1.6 + k * 0.2, 0.4, 0.4, 0.4, 0.25 * (1 - k / 8), k * 0.13);
      }
      flareLights.forEach((light, i) => {
        const a = activeFlares[i];
        if (!a) {
          light.intensity = 0;
          return;
        }
        light.position.set(a.s.x, a.s.y, a.s.z);
        light.intensity = 9000 * a.s.intensity * (1 - dawn * 0.7);
      });

      // Chớp sáng của vụ nổ lớn và của pháo/lựu đạn
      const blastFlash = flashOf(blast, t);
      blastLight.position.set(blast.x, ground(blast.x, blast.z) + 14, blast.z);
      blastLight.intensity = 3.5e5 * blastFlash + (t > blast.t0 ? 6e3 * Math.exp(-(t - blast.t0) / 7) : 0);
      let shellPick: { e: (typeof flashers)[number]; f: number } | null = null;
      for (const e of flashers) {
        if (e.kind === "blast") continue;
        const f = flashOf(e, t);
        if (f > 0.02 && (!shellPick || f > shellPick.f)) shellPick = { e, f };
      }
      if (shellPick) {
        shellLight.position.set(shellPick.e.x, ground(shellPick.e.x, shellPick.e.z) + 8, shellPick.e.z);
        shellLight.intensity = (shellPick.e.distant ? 4e4 : 1.4e5) * shellPick.f;
      } else {
        shellLight.intensity = 0;
      }
      const firstFire = fires[0];
      const fireRamp = smoothstep(firstFire.t0, firstFire.t0 + 3, t);
      fireLight.position.set(firstFire.x, ground(firstFire.x, firstFire.z) + 4, firstFire.z);
      fireLight.intensity = fireRamp * (2600 + 900 * Math.sin(t * 13) + 500 * Math.sin(t * 31)) * (1 - dawn * 0.5);

      // Sóng xung kích lan trên mặt đất
      const a = t - blast.t0;
      ring.visible = a > 0 && a < 0.9;
      if (ring.visible) {
        const radius = Math.max(1, 340 * a);
        ring.position.set(blast.x, ground(blast.x, blast.z) + 0.8, blast.z);
        ring.scale.set(radius, radius, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - a / 0.9) ** 2;
      }

      // Đạn: chỉ xét các phát bắn trong cửa sổ 0,75 s gần nhất
      let tracerCount = 0;
      const startIndex = firstShotIndexAtOrAfter(script.shots3d, t - 0.75);
      for (let i = startIndex; i < script.shots3d.length && script.shots3d[i].t <= t && tracerCount < MAX_TRACERS; i++) {
        const shot = script.shots3d[i];
        const flash = muzzleFlash(shot, t);
        if (flash > 0) glow.push(shot.origin[0], shot.origin[1], shot.origin[2], 1.1 + flash, 1, 0.8, 0.45, flash, 0.9);
        const tr = tracerAt(shot, t);
        if (!tr) continue;
        const vn = shot.faction === "vn";
        const head = vn ? [0.55, 1, 0.55] : [1, 0.5, 0.2];
        tracerPositions.set(tr.tail, tracerCount * 6);
        tracerPositions.set(tr.head, tracerCount * 6 + 3);
        tracerColors.set([head[0] * 0.12, head[1] * 0.12, head[2] * 0.12, head[0] * 1.6, head[1] * 1.6, head[2] * 1.6], tracerCount * 6);
        glow.push(tr.head[0], tr.head[1], tr.head[2], 0.9, head[0], head[1], head[2], 0.95, 0.4);
        tracerCount++;
      }
      tracerGeometry.setDrawRange(0, tracerCount * 2);
      (tracerGeometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (tracerGeometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

      glow.end(null);
      smoke.end(cameraPos);

      const glare = reducedMotion ? 0 : blastGlare(t, script.blastTime);
      return { glare, flash: Math.max(blastFlash, shellPick ? shellPick.f * 0.5 : 0) };
    },
  };
}
