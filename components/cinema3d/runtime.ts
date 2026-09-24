import { CinemaAudio } from "@/components/cinema3d/audio";
import { createCinemaEngine, type CinemaEngine } from "@/components/cinema3d/engine";
import { Narrator } from "@/components/cinema3d/narration";
import { filmA1 } from "@/lib/cinema/film-a1";
import { clamp } from "@/lib/cinema/math";
import { DEM_SIZE, decodeTerrarium } from "@/lib/cinema/terrain";
import { subtitleAt } from "@/lib/cinema/timeline";

export type RuntimeCallbacks = {
  onTime: (t: number) => void;
  onPlaying: (playing: boolean, ended: boolean) => void;
  onNarrationAvailability: (available: boolean) => void;
  onProgress?: (fraction: number, label: string) => void;
};

export type Runtime = {
  duration: number;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (t: number) => void;
  time: () => number;
  isPlaying: () => boolean;
  setMuted: (muted: boolean) => void;
  setNarration: (enabled: boolean) => void;
  narrationAvailable: () => boolean;
  setFreeCamera: (enabled: boolean) => void;
  resize: (width: number, height: number) => void;
  quality: () => 0 | 1 | 2;
  dispose: () => void;
};

export type RuntimeOptions = RuntimeCallbacks & {
  canvas: HTMLCanvasElement;
  demUrl: string;
  reducedMotion: boolean;
  debug?: boolean;
};

async function loadDem(url: string): Promise<Float32Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    if (bitmap.width !== DEM_SIZE || bitmap.height !== DEM_SIZE) return null;
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    return decodeTerrarium(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, 4);
  } catch {
    return null;
  }
}

/** Khởi tạo động cơ 3D, âm thanh và thuyết minh; trả về bộ điều khiển phát/tạm dừng/tua. */
export async function createRuntime(options: RuntimeOptions): Promise<Runtime> {
  const { canvas, onTime, onPlaying, onProgress } = options;
  const script = filmA1;
  onProgress?.(0.1, "Đang tải dữ liệu địa hình thật…");
  const dem = await loadDem(options.demUrl);
  onProgress?.(0.5, "Đang dựng địa hình, công sự và nhân vật 3D…");
  await new Promise((resolve) => setTimeout(resolve, 30)); // nhường luồng để giao diện kịp cập nhật
  const engine: CinemaEngine = createCinemaEngine({ canvas, script, dem, reducedMotion: options.reducedMotion });
  onProgress?.(0.9, "Đang chuẩn bị âm thanh…");

  const audio = new CinemaAudio(script);
  const narrator = new Narrator();
  narrator.init(() => options.onNarrationAvailability(narrator.available));
  options.onNarrationAvailability(narrator.available);

  let t = 0;
  let playing = false;
  let ended = false;
  let last = performance.now();
  let frame = 0;
  let dirty = true;
  let free = false;
  let reported = -1;
  let lastSubtitle: string | null = null;

  const emit = () => onPlaying(playing, ended);

  const speakFor = (time: number, allowLate: boolean) => {
    const sub = subtitleAt(script, time);
    const key = sub ? String(sub.t0) : null;
    if (key === lastSubtitle) return;
    lastSubtitle = key;
    if (!sub) return;
    // chỉ đọc khi vừa tới đầu câu (không đọc giữa chừng sau khi tua, trừ khi tua sát đầu câu)
    if (playing && (allowLate || time - sub.t0 < 1.2)) narrator.speak(sub.text);
    else narrator.cancel();
  };

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      t += dt;
      dirty = true;
      if (t >= script.duration) {
        t = script.duration;
        playing = false;
        ended = true;
        narrator.cancel();
        void audio.suspend();
        emit();
      }
      speakFor(t, false);
    }
    if (dirty || free) {
      const fadeIn = clamp(t / 1.4);
      const fadeOut = clamp((script.duration - t) / 2.2);
      engine.setFade(Math.min(fadeIn, fadeOut));
      engine.setTime(t);
      const frameInfo = engine.cameraFrame();
      audio.update(t, { x: frameInfo.position.x, y: frameInfo.position.y, z: frameInfo.position.z, rx: frameInfo.right.x, rz: frameInfo.right.z });
      dirty = false;
      const tenth = Math.floor(t * 10);
      if (tenth !== reported) {
        reported = tenth;
        onTime(t);
      }
    }
  };
  frame = requestAnimationFrame(loop);

  const onVisibility = () => {
    if (document.hidden && playing) runtime.pause();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const runtime: Runtime = {
    duration: script.duration,
    async play() {
      if (ended) {
        t = 0;
        ended = false;
        audio.seek(0);
        lastSubtitle = null;
      }
      playing = true;
      last = performance.now();
      dirty = true;
      emit();
      await audio.start();
      await audio.resume();
      narrator.resume();
    },
    pause() {
      if (!playing) return;
      playing = false;
      narrator.pause();
      void audio.suspend();
      emit();
    },
    async toggle() {
      if (playing) runtime.pause();
      else await runtime.play();
    },
    seek(time) {
      t = clamp(time, 0, script.duration);
      ended = false;
      dirty = true;
      audio.seek(t);
      narrator.cancel();
      lastSubtitle = null;
      speakFor(t, false);
      onTime(t);
      emit();
    },
    time: () => t,
    isPlaying: () => playing,
    setMuted: (muted) => audio.setMuted(muted),
    setNarration: (enabled) => {
      narrator.setEnabled(enabled);
      if (enabled) lastSubtitle = null;
    },
    narrationAvailable: () => narrator.available,
    setFreeCamera(enabled) {
      free = enabled;
      engine.setFreeCamera(enabled);
      dirty = true;
    },
    resize(width, height) {
      engine.resize(width, height);
      dirty = true;
    },
    quality: () => engine.stats().quality,
    dispose() {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      narrator.dispose();
      audio.dispose();
      engine.dispose();
      if (options.debug) delete (window as unknown as { __cinema?: unknown }).__cinema;
    },
  };

  if (options.debug) {
    (window as unknown as { __cinema: unknown }).__cinema = {
      seek: (time: number) => runtime.seek(time),
      play: () => runtime.play(),
      pause: () => runtime.pause(),
      stats: () => engine.stats(),
      time: () => t,
      audioState: () => audio.state(),
      narrationAvailable: () => narrator.available,
    };
  }
  onProgress?.(1, "Sẵn sàng");
  return runtime;
}
