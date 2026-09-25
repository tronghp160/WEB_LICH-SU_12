import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { LatLng } from "@/lib/battles/types";
import { clamp, easeInOut, smoothNoise1 } from "@/lib/cinema/math";
import { subtitleAt } from "@/lib/cinema/timeline";
import { interpolateCam } from "@/lib/mapfilm/camera";
import { evaluateScene, sceneSoundEvents } from "@/lib/mapfilm/evaluate";
import { meterInMercatorUnits, toLocal } from "@/lib/mapfilm/geo";
import type { MapCam, MapFilmScript, MapFrame } from "@/lib/mapfilm/types";
import { Narrator } from "@/components/cinema3d/narration";
import { MapFilmAudio } from "@/components/mapfilm/audio";
import { buildStyle, createMapBase, TERRAIN_EXAGGERATION, type Basemap } from "@/components/mapfilm/map-base";
import { createThreeLayer } from "@/components/mapfilm/three-layer";

export type MapFilmState = {
  scene: number;
  t: number;
  playing: boolean;
  /** Cảnh hiện tại đã chạy hết. */
  sceneEnded: boolean;
  freeCamera: boolean;
  factVisible: boolean;
};

export type MapFilmRuntime = {
  goToScene: (index: number, autoplay?: boolean) => void;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (t: number) => void;
  setMuted: (muted: boolean) => void;
  setNarration: (enabled: boolean) => void;
  setBasemap: (basemap: Basemap) => void;
  setContinuous: (continuous: boolean) => void;
  /** Bỏ camera tự do, bay về góc máy phim. */
  recenter: () => void;
  resize: () => void;
  frame: () => MapFrame | null;
  quality: () => 0 | 1 | 2;
  dispose: () => void;
};

export type MapFilmRuntimeOptions = {
  container: HTMLElement;
  script: MapFilmScript;
  basemap: Basemap;
  reducedMotion: boolean;
  debug?: boolean;
  onState: (state: MapFilmState) => void;
  onNarrationAvailability: (available: boolean) => void;
  onProgress?: (fraction: number, label: string) => void;
};

const BLEND_SECONDS = 2.4;
const lngLat = ([lat, lng]: LatLng): [number, number] => [lng, lat];

function currentCam(map: MapLibreMap): MapCam {
  const c = map.getCenter();
  return { center: [c.lat, c.lng], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
}

/** Khởi tạo bản đồ 3D (MapLibre + Three.js), âm thanh và thuyết minh; trả về bộ điều khiển. */
export async function createMapFilmRuntime(options: MapFilmRuntimeOptions): Promise<MapFilmRuntime> {
  const { container, script, onProgress, reducedMotion } = options;
  onProgress?.(0.15, "Đang tải bộ máy bản đồ 3D…");
  const maplibre = await import("maplibre-gl");
  maplibre.setWorkerUrl(`/vendor/maplibre-gl/${maplibre.getVersion()}/maplibre-gl-worker.mjs`);

  onProgress?.(0.45, "Đang dựng địa hình và nền bản đồ…");
  const first = script.scenes[0].camera[0];
  const map = new maplibre.Map({
    container,
    style: buildStyle(script.scenario, options.basemap),
    center: lngLat(first.center),
    zoom: first.zoom,
    pitch: first.pitch,
    bearing: first.bearing,
    maxPitch: 78,
    minZoom: 3,
    maxZoom: 17,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    canvasContextAttributes: { antialias: true },
    attributionControl: { compact: true },
    fadeDuration: 0,
  });
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Bản đồ tải quá lâu")), 30000);
    map.once("load", () => {
      window.clearTimeout(timer);
      resolve();
    });
  });
  map.setTerrain({ source: "dem", exaggeration: TERRAIN_EXAGGERATION });
  // Ô ghi nguồn thu gọn thành nút "i" (nguồn đầy đủ có ở dòng chú thích dưới bản đồ)
  container.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  const three = createThreeLayer(script.origin);
  map.addLayer(three.layer);
  const base = createMapBase(maplibre, map, script.scenario, options.basemap);

  onProgress?.(0.85, "Đang chuẩn bị âm thanh và thuyết minh…");
  const audio = new MapFilmAudio();
  const narrator = new Narrator();
  narrator.init(() => options.onNarrationAvailability(narrator.available));
  options.onNarrationAvailability(narrator.available);

  // Độ cao mặt đất: hỏi địa hình của MapLibre, nhớ tạm theo ô ~10 m trong 0,4 giây. Khóa gồm cả mức phóng: bay từ xa vào
  // gần thì ô địa hình chi tiết hơn được tải, độ cao cũ (thô, lẫn với đồi núi xung quanh) không còn đúng.
  const elevation = new Map<string, { value: number; at: number }>();
  let now = performance.now();
  const ground = (point: LatLng): number => {
    const key = `${Math.floor(map.getZoom())}|${point[0].toFixed(4)},${point[1].toFixed(4)}`;
    const cached = elevation.get(key);
    if (cached && now - cached.at < 400) return cached.value;
    const value = map.queryTerrainElevation(lngLat(point));
    if (value === null || !Number.isFinite(value)) return cached?.value ?? 480 * TERRAIN_EXAGGERATION;
    elevation.set(key, { value, at: now });
    if (elevation.size > 6000) elevation.clear();
    return value;
  };

  let scene = 0;
  let t = 0;
  let playing = false;
  let sceneEnded = false;
  let continuous = false;
  let free = false;
  let blendFrom: MapCam | null = null;
  let blendStart = 0;
  let lastFrame: MapFrame | null = null;
  let lastSubtitle: string | null = null;
  let last = performance.now();
  let raf = 0;
  let reported = "";
  let quality: 0 | 1 | 2 = 0;
  /** Kiểm thử có thể khóa chất lượng cao (SwiftShader chậm sẽ tự hạ chất lượng). */
  let qualityLocked = false;
  const fps = { frames: 0, since: performance.now() };

  const report = (frame: MapFrame) => {
    const key = `${scene}|${Math.floor(t * 10)}|${playing}|${sceneEnded}|${free}|${frame.factVisible}`;
    if (key === reported) return;
    reported = key;
    options.onState({ scene, t, playing, sceneEnded, freeCamera: free, factVisible: frame.factVisible });
  };

  const speakFor = (time: number) => {
    const sub = subtitleAt(script.scenes[scene], time);
    const key = sub ? `${scene}:${sub.t0}` : null;
    if (key === lastSubtitle) return;
    lastSubtitle = key;
    if (sub && playing && time - sub.t0 < 1.2) narrator.speak(sub.text);
  };

  const applyCamera = (frame: MapFrame, now: number) => {
    if (free) return;
    const sceneDef = script.scenes[scene];
    let cam = reducedMotion ? sceneDef.camera[sceneDef.camera.length - 1] : frame.camera;
    if (blendFrom && !reducedMotion) {
      const u = (now - blendStart) / 1000 / BLEND_SECONDS;
      if (u >= 1) blendFrom = null;
      else cam = interpolateCam(blendFrom, cam, easeInOut(u));
    }
    let { pitch, bearing } = cam;
    if (frame.shake > 0 && !reducedMotion) {
      bearing += smoothNoise1(t * 14, 3) * frame.shake * 0.9;
      pitch += smoothNoise1(t * 14, 9) * frame.shake * 0.6;
    }
    map.jumpTo({ center: lngLat(cam.center), zoom: cam.zoom, pitch: clamp(pitch, 0, 78), bearing });
  };

  const loop = (time: number) => {
    raf = requestAnimationFrame(loop);
    now = time;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const duration = script.scenes[scene].duration;
    if (playing) {
      t += dt;
      if (t >= duration) {
        t = duration;
        if (continuous && scene < script.scenes.length - 1) {
          runtime.goToScene(scene + 1, true);
          return;
        }
        playing = false;
        sceneEnded = true;
        narrator.cancel();
        void audio.suspend();
      }
      speakFor(t);
    }

    const frame = evaluateScene(script, scene, t);
    lastFrame = frame;
    applyCamera(frame, now);
    base.setNight(frame.night);
    base.setArrows(frame.arrows);
    base.setZones(frame.zones);
    base.setLabels(frame.labels, frame.strongpoints);
    three.setFrame(frame, ground);
    map.triggerRepaint();

    const c = map.getCenter();
    const mpp = 1 / (512 * 2 ** map.getZoom() * meterInMercatorUnits(c.lat));
    if (playing) audio.update(t, { center: [c.lat, c.lng], bearing: map.getBearing(), mpp }, { night: frame.night, planes: frame.planes.length });
    report(frame);
    watchPerformance(now);
  };

  // Tự hạ chất lượng khi máy yếu: giảm độ phân giải rồi giảm số hạt khói lửa
  const watchPerformance = (now: number) => {
    fps.frames++;
    const elapsed = now - fps.since;
    if (elapsed < 2500 || qualityLocked) return;
    const rate = (fps.frames * 1000) / elapsed;
    fps.frames = 0;
    fps.since = now;
    if (rate < 28 && quality < 2) {
      quality = (quality + 1) as 1 | 2;
      if (quality === 1) {
        map.setPixelRatio(1);
        three.setParticleBudget(0.6);
      } else three.setParticleBudget(0.3);
    }
  };

  // Người xem tự kéo / xoay / phóng bản đồ → camera tự do (phim vẫn chạy). Phải bắt ngay từ lúc nhấn/cuộn, vì jumpTo
  // của camera phim ở khung hình kế tiếp sẽ hủy thao tác kéo đang dở.
  const enterFree = () => {
    if (free) return;
    free = true;
    blendFrom = null;
    reported = "";
  };
  const canvasContainer = map.getCanvasContainer();
  const inputEvents = ["pointerdown", "wheel", "touchstart"] as const;
  for (const type of inputEvents) canvasContainer.addEventListener(type, enterFree, { passive: true });

  const onVisibility = () => {
    if (document.hidden && playing) runtime.pause();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const runtime: MapFilmRuntime = {
    goToScene(index, autoplay = false) {
      scene = clamp(Math.round(index), 0, script.scenes.length - 1);
      t = 0;
      sceneEnded = false;
      free = false;
      blendFrom = currentCam(map);
      blendStart = performance.now();
      narrator.cancel();
      lastSubtitle = null;
      audio.setScene(sceneSoundEvents(script, scene), 0);
      reported = "";
      if (autoplay) void runtime.play();
    },
    async play() {
      if (sceneEnded) {
        // Hết cảnh: bấm phát → sang cảnh sau (hoặc xem lại cảnh cuối)
        if (scene < script.scenes.length - 1) {
          runtime.goToScene(scene + 1);
        } else {
          t = 0;
          sceneEnded = false;
          audio.seek(0);
          lastSubtitle = null;
        }
      }
      playing = true;
      last = performance.now();
      reported = "";
      await audio.start();
      audio.seek(t);
      await audio.resume();
      narrator.resume();
    },
    pause() {
      if (!playing) return;
      playing = false;
      narrator.pause();
      void audio.suspend();
      reported = "";
    },
    async toggle() {
      if (playing) runtime.pause();
      else await runtime.play();
    },
    seek(time) {
      t = clamp(time, 0, script.scenes[scene].duration);
      sceneEnded = false;
      audio.seek(t);
      narrator.cancel();
      lastSubtitle = null;
      reported = "";
    },
    setMuted: (muted) => audio.setMuted(muted),
    setNarration(enabled) {
      narrator.setEnabled(enabled);
      if (enabled) lastSubtitle = null;
    },
    setBasemap: (basemap) => base.setBasemap(basemap),
    setContinuous(value) {
      continuous = value;
    },
    recenter() {
      if (!free) return;
      free = false;
      blendFrom = currentCam(map);
      blendStart = performance.now();
      reported = "";
    },
    resize: () => map.resize(),
    frame: () => lastFrame,
    quality: () => quality,
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const type of inputEvents) canvasContainer.removeEventListener(type, enterFree);
      narrator.dispose();
      audio.dispose();
      base.dispose();
      map.remove();
      three.dispose();
      if (options.debug) delete (window as unknown as { __mapfilm?: unknown }).__mapfilm;
    },
  };

  audio.setScene(sceneSoundEvents(script, 0), 0);
  raf = requestAnimationFrame(loop);

  if (options.debug) {
    (window as unknown as { __mapfilm: unknown }).__mapfilm = {
      goToScene: (index: number) => runtime.goToScene(index),
      seek: (time: number) => runtime.seek(time),
      play: () => runtime.play(),
      pause: () => runtime.pause(),
      scene: () => scene,
      time: () => t,
      isFree: () => free,
      strongpoints: () => lastFrame?.strongpoints.map((s) => ({ id: s.id, status: s.status })) ?? [],
      stats: () => ({ ...three.stats(), quality, zoom: map.getZoom(), pitch: map.getPitch() }),
      audioState: () => audio.state(),
      probeAltitude: (lat: number, lng: number) => {
        const [x, z] = toLocal(script.origin, [lat, lng]);
        const elevation = map.queryTerrainElevation([lng, lat]) ?? 0;
        const truth = map.project([lng, lat]);
        return {
          elevation,
          truth: [truth.x, truth.y],
          asIs: three.projectLocal(x, elevation, z),
          noExaggeration: three.projectLocal(x, elevation / TERRAIN_EXAGGERATION, z),
          zero: three.projectLocal(x, 0, z),
        };
      },
      lockQuality: () => {
        qualityLocked = true;
        quality = 0;
        three.setParticleBudget(1);
      },
      map,
    };
  }
  onProgress?.(1, "Sẵn sàng");
  return runtime;
}
