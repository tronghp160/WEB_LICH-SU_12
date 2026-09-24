import * as THREE from "three";
import { lerp } from "@/lib/cinema/math";
import { fbm } from "@/lib/cinema/terrain";

/** Màu sương/chân trời theo mức trời sáng (0 = đêm, 1 = rạng sáng) — dùng chung cho sương mù, bầu trời và dãy núi. */
export function horizonColor(dawn: number, out = new THREE.Color()): THREE.Color {
  return out.setRGB(lerp(0.02, 0.5, dawn), lerp(0.03, 0.36, dawn), lerp(0.065, 0.34, dawn));
}

export type SkySystem = {
  group: THREE.Group;
  update: (dawn: number, cameraPosition: THREE.Vector3, flash: number) => void;
};

const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w * 0.99999;
}
`;

const skyFragment = /* glsl */ `
uniform float uDawn;
uniform float uFlash;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);

  vec3 nightTop = vec3(0.004, 0.008, 0.032);
  vec3 nightHorizon = vec3(0.02, 0.03, 0.065);
  vec3 dawnTop = vec3(0.13, 0.24, 0.46);
  vec3 dawnHorizon = vec3(0.86, 0.5, 0.34);

  vec3 top = mix(nightTop, dawnTop, uDawn);
  vec3 horizon = mix(nightHorizon, dawnHorizon, uDawn);
  vec3 col = mix(horizon, top, pow(h, 0.55));

  // Ánh bình minh dồn về hướng đông (+x)
  vec3 east = normalize(vec3(1.0, 0.0, 0.25));
  float toEast = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), east), 0.0);
  col += vec3(1.0, 0.55, 0.25) * pow(toEast, 5.0) * exp(-h * 6.0) * uDawn * 0.85;

  // Sao (mờ dần khi trời sáng)
  vec3 cell = dir * 260.0;
  vec3 fc = fract(cell) - 0.5;
  float star = step(0.9972, hash(floor(cell))) * smoothstep(0.42, 0.0, length(fc));
  float twinkle = 0.6 + 0.4 * hash(floor(dir * 90.0) + 3.0);
  col += vec3(0.85, 0.9, 1.0) * star * twinkle * smoothstep(0.03, 0.35, h) * pow(1.0 - uDawn, 3.0) * 1.2;

  // Vầng trăng khuyết thấp phía tây bắc
  vec3 moon = normalize(vec3(-0.55, 0.45, -0.7));
  float md = dot(dir, moon);
  col += vec3(0.65, 0.75, 1.0) * (smoothstep(0.9993, 0.9997, md) * 1.6 + pow(max(md, 0.0), 220.0) * 0.5) * pow(1.0 - uDawn, 3.0);

  // Mặt trời mọc ở phía đông
  vec3 sunDir = normalize(vec3(0.95, 0.02 + 0.22 * uDawn, 0.3));
  float sd = dot(dir, sunDir);
  col += vec3(1.0, 0.78, 0.5) * (smoothstep(0.9995, 0.9998, sd) * 2.2 + pow(max(sd, 0.0), 90.0) * 0.6) * uDawn * uDawn;

  // Ánh chớp nổ làm sáng chân trời
  col += vec3(1.0, 0.6, 0.3) * uFlash * exp(-h * 3.0) * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Bầu trời, dãy núi bao quanh lòng chảo Mường Thanh và nền đất xa ngoài vùng dữ liệu độ cao. */
export function buildSky(): SkySystem {
  const group = new THREE.Group();

  const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    uniforms: { uDawn: { value: 0 }, uFlash: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), skyMaterial);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  group.add(sky);

  // Dãy núi: hai vòng đỉnh nhọn ở cự ly 3,6 km và 5,4 km
  const ridgeMaterials: THREE.MeshBasicMaterial[] = [];
  const ridgeColors: THREE.BufferAttribute[] = [];
  const makeRidge = (radius: number, base: number, amplitude: number, seed: number, shade: number) => {
    const segments = 220;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const n = fbm(Math.cos(angle) * 2.4 + seed, Math.sin(angle) * 2.4 + seed, seed) * 0.75 + fbm(angle * 9 + seed, seed, seed + 3) * 0.25;
      const top = base + amplitude * Math.pow(n, 1.4) * 1.6;
      positions.push(cx, -120, cz, cx, top, cz);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const colorAttribute = new THREE.BufferAttribute(new Float32Array((positions.length / 3) * 3), 3);
    geometry.setAttribute("color", colorAttribute);
    ridgeColors.push(colorAttribute);
    geometry.setIndex(indices);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false });
    ridgeMaterials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.userData.shade = shade;
    group.add(mesh);
  };
  makeRidge(3600, 380, 560, 11, 1);
  makeRidge(5400, 620, 800, 23, 1.25);

  // Nền đất xa: khớp với mép vùng dữ liệu độ cao (y = 0)
  const farGround = new THREE.Mesh(new THREE.CircleGeometry(9000, 48), new THREE.MeshBasicMaterial({ color: 0x050805, fog: true }));
  farGround.rotation.x = -Math.PI / 2;
  farGround.position.y = -2.5;
  farGround.frustumCulled = false;
  group.add(farGround);

  const tmp = new THREE.Color();
  return {
    group,
    update(dawn, cameraPosition, flash) {
      skyMaterial.uniforms.uDawn.value = dawn;
      skyMaterial.uniforms.uFlash.value = flash;
      group.position.set(cameraPosition.x, 0, cameraPosition.z);
      sky.position.y = cameraPosition.y;
      const ridge = tmp.setRGB(lerp(0.011, 0.2, dawn), lerp(0.017, 0.17, dawn), lerp(0.04, 0.24, dawn));
      const haze = horizonColor(dawn, new THREE.Color());
      // đỉnh núi là màu núi, chân núi tan vào sương ở chân trời
      const top = tmp.clone();
      const bottom = ridge.clone().lerp(haze, 0.75);
      ridgeColors.forEach((attribute, i) => {
        const peak = top.clone().lerp(haze, i === 0 ? 0.12 : 0.36);
        const base = bottom.clone().lerp(haze, i === 0 ? 0 : 0.2);
        for (let v = 0; v < attribute.count; v++) {
          const c = v % 2 === 0 ? base : peak;
          attribute.setXYZ(v, c.r, c.g, c.b);
        }
        attribute.needsUpdate = true;
      });
      void ridgeMaterials;
      (farGround.material as THREE.MeshBasicMaterial).color.setRGB(lerp(0.012, 0.1, dawn), lerp(0.018, 0.11, dawn), lerp(0.012, 0.05, dawn));
    },
  };
}
