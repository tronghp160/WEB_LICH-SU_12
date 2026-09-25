import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { clamp, lerp } from "@/lib/cinema/math";
import type { ModelEnvironment, ModelSpec, Vec3 } from "@/lib/models3d/types";
import { disposeTree, type BuiltModel } from "@/components/model3d/kit";

export type ViewerRuntime = {
  /** Gắn/gỡ phần tử HTML của một điểm chú thích để runtime tự dời theo mô hình (không qua React mỗi khung hình). */
  setHotspotElement: (id: string, element: HTMLElement | null) => void;
  /** Bay camera tới một điểm chú thích. */
  focusHotspot: (id: string | null) => void;
  runAction: (id: string) => void;
  /** Gỡ lỗi: tua nhanh đồng hồ của mô hình (máy chạy phần mềm rất chậm nên hoạt cảnh không kịp chạy theo giờ thật). */
  advance: (seconds: number) => void;
  /** Đặt camera tức thì (dùng khi gỡ lỗi và chụp ảnh kiểm tra). */
  setView: (position: Vec3, target: Vec3) => void;
  setVisible: (visible: boolean) => void;
  resize: () => void;
  resetView: () => void;
  stats: () => { fps: number; triangles: number; drawCalls: number; autoRotate: boolean };
  dispose: () => void;
};

export type ViewerOptions = {
  canvas: HTMLCanvasElement;
  spec: ModelSpec;
  reducedMotion: boolean;
  /** Mất ngữ cảnh WebGL (trình duyệt thu hồi khi mở quá nhiều khung 3D). */
  onLost: () => void;
  onProgress?: (label: string) => void;
};

const ENV_SETTINGS: Record<ModelEnvironment, { top: string; bottom: string; exposure: number; envIntensity: number; key: number; keyColor: number; hemi: number; fog?: [number, number, number] }> = {
  studio: { top: "#2b2f3a", bottom: "#0f1116", exposure: 1.05, envIntensity: 0.9, key: 2.4, keyColor: 0xfff4e2, hemi: 0.5 },
  outdoor: { top: "#79aee3", bottom: "#d5e4ec", exposure: 0.95, envIntensity: 0.7, key: 3.2, keyColor: 0xfff0d6, hemi: 0.9, fog: [0xd5e4ec, 28, 115] },
  night: { top: "#050914", bottom: "#141c33", exposure: 0.85, envIntensity: 0.18, key: 0.9, keyColor: 0x9fb4ff, hemi: 0.25, fog: [0x0a1020, 30, 140] },
};

function gradientBackground(top: string, bottom: string, horizon = 1): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, top);
  gradient.addColorStop(horizon, bottom);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Tải mô hình theo `spec.source`: dựng bằng mã (nạp muộn từng bộ dựng) hoặc đọc file glb có sẵn. */
async function loadModel(spec: ModelSpec, renderer: THREE.WebGLRenderer, reducedMotion: boolean): Promise<BuiltModel> {
  if (spec.source.kind === "glb") {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const gltf = await new GLTFLoader().loadAsync(spec.source.url);
    const root = new THREE.Group();
    root.add(gltf.scene);
    // đưa về kích thước ~ 4 m, đáy chạm mặt đất, tâm ở gốc
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const factor = 4 / Math.max(size.x, size.y, size.z, 1e-3);
    gltf.scene.scale.setScalar(factor);
    const fitted = new THREE.Box3().setFromObject(gltf.scene);
    const center = fitted.getCenter(new THREE.Vector3());
    gltf.scene.position.set(-center.x, -fitted.min.y, -center.z);
    gltf.scene.traverse((object) => {
      const m = object as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const { shadowFloor } = await import("@/components/model3d/kit");
    root.add(shadowFloor(4));
    return { root, dispose: () => disposeTree(root) };
  }
  const { builders } = await import("@/components/model3d/builders");
  const build = builders[spec.id];
  if (!build) throw new Error(`Chưa có bộ dựng cho mô hình "${spec.id}"`);
  return await build({ reducedMotion, renderer });
}

const MAX_ACTIVE = 3;
const active: { dispose: () => void; onEvicted: () => void }[] = [];

export async function createViewer(options: ViewerOptions): Promise<ViewerRuntime> {
  const { canvas, spec, reducedMotion } = options;
  const settings = ENV_SETTINGS[spec.environment];

  // Trình duyệt chỉ cho khoảng 16 ngữ cảnh WebGL: khung mở lâu nhất bị thu hồi khi mở quá 3 khung cùng lúc
  while (active.length >= MAX_ACTIVE) {
    const oldest = active.shift()!;
    oldest.dispose();
    oldest.onEvicted();
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = settings.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = gradientBackground(settings.top, settings.bottom, spec.environment === "outdoor" ? 0.55 : 1);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = settings.envIntensity;
  if (settings.fog) {
    // sương chỉ để làm mờ đường chân trời: cảnh rộng (camera đứng xa) thì đẩy sương ra xa tương ứng
    const near = Math.max(settings.fog[1], spec.camera.maxDistance * 1.25);
    scene.fog = new THREE.Fog(settings.fog[0], near, near + (settings.fog[2] - settings.fog[1]) * 3);
  }

  const hemi = new THREE.HemisphereLight(spec.environment === "night" ? 0x2a3866 : 0xdfeaff, 0x3a2f22, settings.hemi);
  const key = new THREE.DirectionalLight(settings.keyColor, settings.key);
  key.position.set(6, 10, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 60;
  const half = Math.max(8, spec.camera.maxDistance * 0.9);
  key.shadow.camera.left = -half;
  key.shadow.camera.right = half;
  key.shadow.camera.top = half;
  key.shadow.camera.bottom = -half;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(hemi, key, key.target);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  camera.position.set(...spec.camera.position);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...spec.camera.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = spec.camera.minDistance;
  controls.maxDistance = spec.camera.maxDistance;
  controls.maxPolarAngle = spec.camera.maxPolar ?? Math.PI * 0.495;
  controls.autoRotate = spec.autoRotate && !reducedMotion;
  controls.autoRotateSpeed = 0.9;
  controls.listenToKeyEvents(canvas);
  controls.update();
  const home = { position: camera.position.clone(), target: controls.target.clone() };

  options.onProgress?.("Đang dựng mô hình…");
  let model: BuiltModel;
  try {
    model = await loadModel(spec, renderer, reducedMotion);
  } catch (error) {
    renderer.dispose();
    pmrem.dispose();
    throw error;
  }
  scene.add(model.root);
  const overlays = new Map<string, HTMLElement>();
  const hotspotIndex = new Map(spec.hotspots.map((h) => [h.id, h]));

  let visible = true;
  let running = true;
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let frames = 0;
  let fpsStamp = last;
  let fps = 60;
  let interactedAt = -Infinity;
  let tween: { from: THREE.Vector3; fromTarget: THREE.Vector3; to: THREE.Vector3; toTarget: THREE.Vector3; t: number } | null = null;

  const stopAuto = () => {
    interactedAt = performance.now();
    controls.autoRotate = false;
    tween = null;
  };
  controls.addEventListener("start", stopAuto);

  const projected = new THREE.Vector3();
  const updateOverlays = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    for (const [id, element] of overlays) {
      const hotspot = hotspotIndex.get(id);
      if (!hotspot) continue;
      projected.set(...hotspot.position).project(camera);
      const behind = projected.z > 1;
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      element.style.opacity = behind ? "0" : "1";
      element.style.pointerEvents = behind ? "none" : "auto";
    }
  };

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    clock += dt;

    // tự xoay trở lại sau 8 giây không thao tác
    if (!controls.autoRotate && spec.autoRotate && !reducedMotion && !tween && now - interactedAt > 8000) controls.autoRotate = true;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / 0.9);
      const e = tween.t * tween.t * (3 - 2 * tween.t);
      camera.position.lerpVectors(tween.from, tween.to, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    model.update?.(clock, dt, camera);
    renderer.render(scene, camera);
    updateOverlays();

    frames++;
    if (now - fpsStamp > 1000) {
      fps = (frames * 1000) / (now - fpsStamp);
      frames = 0;
      fpsStamp = now;
    }
  };
  raf = requestAnimationFrame(loop);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    options.onLost();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  const dispose = () => {
    if (!running && !raf) return;
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    controls.removeEventListener("start", stopAuto);
    controls.dispose();
    canvas.removeEventListener("webglcontextlost", onContextLost);
    model.dispose?.();
    disposeTree(scene);
    (scene.background as THREE.Texture | null)?.dispose();
    envTexture.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    const index = active.findIndex((entry) => entry.dispose === dispose);
    if (index >= 0) active.splice(index, 1);
  };
  active.push({ dispose, onEvicted: options.onLost });

  return {
    setHotspotElement(id, element) {
      if (element) overlays.set(id, element);
      else overlays.delete(id);
    },
    focusHotspot(id) {
      stopAuto();
      const hotspot = id ? hotspotIndex.get(id) : null;
      if (!hotspot) return;
      const target = new THREE.Vector3(...hotspot.position);
      const direction = camera.position.clone().sub(controls.target).normalize();
      const distance = clamp(camera.position.distanceTo(controls.target) * 0.7, spec.camera.minDistance * 1.4, spec.camera.maxDistance);
      const focusTarget = controls.target.clone().lerp(target, 0.75);
      tween = { from: camera.position.clone(), fromTarget: controls.target.clone(), to: focusTarget.clone().add(direction.multiplyScalar(distance)), toTarget: focusTarget, t: 0 };
    },
    runAction(id) {
      model.actions?.[id]?.();
    },
    advance(seconds) {
      clock += seconds;
    },
    setView(position, target) {
      stopAuto();
      camera.position.set(...position);
      controls.target.set(...target);
      controls.update();
    },
    setVisible(value) {
      visible = value;
      running = value;
      if (value) last = performance.now();
    },
    resize() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // màn hình hẹp (điện thoại dọc): mở rộng góc nhìn để không cắt mất mô hình
      camera.fov = lerp(38, 56, clamp((1.2 - camera.aspect) / 0.7));
      camera.updateProjectionMatrix();
    },
    resetView() {
      tween = { from: camera.position.clone(), fromTarget: controls.target.clone(), to: home.position.clone(), toTarget: home.target.clone(), t: 0 };
    },
    stats: () => ({ fps, triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, autoRotate: controls.autoRotate && visible }),
    dispose,
  };
}

export type { Vec3 };
