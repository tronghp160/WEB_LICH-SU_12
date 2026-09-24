import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildEffects } from "@/components/cinema3d/effects-3d";
import { createPostChain, type PostChain } from "@/components/cinema3d/post";
import { buildProps } from "@/components/cinema3d/props";
import { buildSky, horizonColor } from "@/components/cinema3d/sky";
import { buildSoldiers } from "@/components/cinema3d/soldiers-3d";
import { buildTerrainMeshes } from "@/components/cinema3d/terrain-mesh";
import { evaluateCamera } from "@/lib/cinema/camera";
import { blastShake } from "@/lib/cinema/effects";
import { clamp, lerp, smoothNoise1, smoothstep } from "@/lib/cinema/math";
import { createTerrain } from "@/lib/cinema/terrain";
import { dawnAt } from "@/lib/cinema/timeline";
import type { FilmScript } from "@/lib/cinema/types";

export type EngineOptions = {
  canvas: HTMLCanvasElement;
  script: FilmScript;
  /** Độ cao thật (đã giải mã Terrarium); null → địa hình phẳng nhẹ. */
  dem: Float32Array | null;
  reducedMotion: boolean;
};

export type CameraFrame = { position: THREE.Vector3; forward: THREE.Vector3; right: THREE.Vector3 };

export type CinemaEngine = {
  /** Cập nhật toàn bộ cảnh tới thời điểm t (giây) và vẽ một khung hình. Tất định theo t. */
  setTime: (t: number) => void;
  resize: (width: number, height: number) => void;
  setFreeCamera: (enabled: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  /** Đưa hiệu ứng mờ dần vào/ra (0 = đen, 1 = rõ). */
  setFade: (value: number) => void;
  cameraFrame: () => CameraFrame;
  stats: () => { fps: number; quality: 0 | 1 | 2; visibleSoldiers: number; drawCalls: number };
  ground: (x: number, z: number) => number;
  dispose: () => void;
};

export function createCinemaEngine(options: EngineOptions): CinemaEngine {
  const { canvas, script } = options;
  let reducedMotion = options.reducedMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", stencil: false });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.00042);

  const terrain = createTerrain(options.dem, script.terrain);
  const meshes = buildTerrainMeshes(terrain, script.terrain);
  const sky = buildSky();
  const props = buildProps(script, terrain);
  const soldiers = buildSoldiers(script);
  const effects = buildEffects(script);
  scene.add(sky.group, meshes.group, props.group, soldiers.group, effects.group);

  const hemi = new THREE.HemisphereLight(new THREE.Color(0.14, 0.2, 0.42), new THREE.Color(0.1, 0.07, 0.04), 1.55);
  const sun = new THREE.DirectionalLight(0x9db4ff, 0.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shadowCam = sun.shadow.camera;
  shadowCam.left = -175;
  shadowCam.right = 175;
  shadowCam.top = 120;
  shadowCam.bottom = -120;
  shadowCam.near = 10;
  shadowCam.far = 700;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.06;
  sun.target.position.set(40, 20, 0);
  scene.add(hemi, sun, sun.target);

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.3, 12000);
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.maxDistance = 900;
  controls.minDistance = 2;
  let freeCamera = false;

  let width = canvas.clientWidth || 1280;
  let height = canvas.clientHeight || 720;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  let quality: 0 | 1 | 2 = 0;
  let post: PostChain | null = createPostChain(renderer, scene, camera, width, height);

  const applySize = () => {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    post?.setSize(width, height, pixelRatio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  applySize();

  // ---- Đo FPS và tự hạ chất lượng nếu máy yếu ----
  let lastFrame = performance.now();
  let fpsAverage = 60;
  let slowFrames = 0;
  const trackFrame = () => {
    const now = performance.now();
    const dt = now - lastFrame;
    lastFrame = now;
    if (dt <= 0 || dt > 1000) return;
    fpsAverage = lerp(fpsAverage, 1000 / dt, 0.05);
    slowFrames = fpsAverage < 22 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames > 90 && quality < 2) {
      quality = (quality + 1) as 1 | 2;
      slowFrames = 0;
      if (quality === 1) pixelRatio = Math.min(pixelRatio, 1);
      if (quality === 2) {
        pixelRatio = Math.min(pixelRatio, 0.8);
        renderer.shadowMap.enabled = false;
        sun.castShadow = false;
        post?.dispose();
        post = null;
      }
      applySize();
    }
  };

  const tmpColor = new THREE.Color();
  const lookAt = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  let fade = 1;

  const engine: CinemaEngine = {
    setTime(t) {
      const dawn = dawnAt(script, t);

      // ---- Máy quay ----
      if (!freeCamera) {
        const state = evaluateCamera(script.shots, t, terrain.heightAt);
        const shake = reducedMotion ? 0 : blastShake(t, script.blastTime);
        camera.position.set(
          state.position[0] + smoothNoise1(t * 19, 11) * shake,
          state.position[1] + smoothNoise1(t * 23, 12) * shake,
          state.position[2] + smoothNoise1(t * 17, 13) * shake,
        );
        const floor = terrain.heightAt(camera.position.x, camera.position.z) + 0.35;
        if (camera.position.y < floor) camera.position.y = floor;
        lookAt.set(state.look[0], state.look[1], state.look[2]);
        const wantedFov = state.fov;
        if (Math.abs(camera.fov - wantedFov) > 0.01) {
          camera.fov = wantedFov;
          camera.updateProjectionMatrix();
        }
        camera.near = camera.position.y - terrain.heightAt(camera.position.x, camera.position.z) < 6 ? 0.2 : 0.8;
        camera.updateProjectionMatrix();
        camera.lookAt(lookAt);
      } else {
        controls.update();
      }
      camera.updateMatrixWorld();

      // ---- Trời, sương, ánh sáng ----
      horizonColor(dawn, tmpColor);
      (scene.fog as THREE.FogExp2).color.copy(tmpColor);
      (scene.fog as THREE.FogExp2).density = lerp(0.00042, 0.00034, dawn);

      hemi.color.setRGB(lerp(0.14, 0.5, dawn), lerp(0.2, 0.46, dawn), lerp(0.42, 0.6, dawn));
      hemi.groundColor.setRGB(lerp(0.1, 0.34, dawn), lerp(0.07, 0.24, dawn), lerp(0.04, 0.16, dawn));
      hemi.intensity = lerp(1.55, 1.15, dawn);
      // Trăng ở phía tây bắc lúc đêm, mặt trời mọc phía đông lúc rạng sáng
      const moon = new THREE.Vector3(-0.55, 0.55, -0.7);
      const dawnSun = new THREE.Vector3(1, 0.32, 0.28);
      sun.position.copy(moon.lerp(dawnSun, dawn).normalize().multiplyScalar(420)).add(sun.target.position);
      sun.color.setRGB(lerp(0.6, 1.0, dawn), lerp(0.72, 0.7, dawn), lerp(1.0, 0.5, dawn));
      sun.intensity = lerp(1.15, 2.4, dawn);

      // ---- Hố bom và cháy sém ----
      const a = t - script.blastTime;
      meshes.blast.value.set(script.blast.x, script.blast.z, a > 0.05 ? 5.2 : 0, 12);
      meshes.scorch.value = smoothstep(0, 4, a);

      // ---- Nhân vật, công sự, hiệu ứng ----
      soldiers.update(t, terrain.heightAt);
      props.update(t, dawn, camera);
      const fx = effects.update({
        t,
        camera,
        ground: terrain.heightAt,
        dawn,
        viewportHeight: height * pixelRatio,
        fogDensity: (scene.fog as THREE.FogExp2).density,
        fogColor: tmpColor,
        glows: props.glows,
        reducedMotion,
      });
      sky.update(dawn, camera.position, fx.flash);

      renderer.toneMappingExposure = lerp(1.5, 1.0, dawn) + fx.glare * 0.9;

      if (post) {
        post.bloom.strength = 0.55 + fx.glare * 0.45 + fx.flash * 0.2;
        post.grade.uniforms.uTime.value = t;
        post.grade.uniforms.uFade.value = fade;
        post.grade.uniforms.uShadowTint.value.set(lerp(0.86, 1.0, dawn), lerp(1.0, 1.0, dawn), lerp(1.16, 0.94, dawn));
        post.grade.uniforms.uHighlightTint.value.set(lerp(1.12, 1.06, dawn), 1.0, lerp(0.88, 0.94, dawn));
        post.composer.render();
      } else {
        renderer.render(scene, camera);
      }
      trackFrame();
    },
    resize(w, h) {
      width = Math.max(2, Math.floor(w));
      height = Math.max(2, Math.floor(h));
      applySize();
    },
    setFreeCamera(enabled) {
      if (enabled === freeCamera) return;
      freeCamera = enabled;
      controls.enabled = enabled;
      if (enabled) {
        camera.getWorldDirection(forward);
        const distance = clamp(camera.position.y * 0.7, 25, 200);
        controls.target.copy(camera.position).addScaledVector(forward, distance);
        controls.update();
      }
    },
    setReducedMotion(value) {
      reducedMotion = value;
    },
    setFade(value) {
      fade = clamp(value);
    },
    cameraFrame() {
      camera.getWorldDirection(forward);
      right.crossVectors(forward, camera.up).normalize();
      return { position: camera.position, forward, right };
    },
    stats: () => ({ fps: fpsAverage, quality, visibleSoldiers: soldiers.visibleCount(), drawCalls: renderer.info.render.calls }),
    ground: terrain.heightAt,
    dispose() {
      controls.dispose();
      post?.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return engine;
}
