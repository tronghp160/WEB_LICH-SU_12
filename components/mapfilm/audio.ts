import { clamp } from "@/lib/cinema/math";
import { createRng } from "@/lib/cinema/rng";
import type { LatLng } from "@/lib/battles/types";
import type { SceneSoundEvent } from "@/lib/mapfilm/evaluate";
import { bearingDegrees, distanceMeters } from "@/lib/mapfilm/geo";

/**
 * Âm thanh tổng hợp bằng Web Audio cho bản đồ 3D (không tải file nào): gió nền, pháo rời nòng, tiếng nổ, bộc phá,
 * động cơ máy bay, kèn xung phong, hợp âm chào cờ. Tiếng nổ nhỏ dần và lệch trái/phải theo vị trí so với tâm khung nhìn,
 * đến trễ một chút theo khoảng cách (thấy chớp trước, nghe sau).
 */

export type AudioListener = { center: LatLng; bearing: number; /** mét trên mỗi điểm ảnh ở tâm khung nhìn */ mpp: number };

function makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createRng(7331);
  for (let i = 0; i < data.length; i++) data[i] = rng.next() * 2 - 1;
  return buffer;
}

export class MapFilmAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private noise!: AudioBuffer;
  private wind!: GainNode;
  private engine!: GainNode;
  private events: SceneSoundEvent[] = [];
  private pointer = 0;
  private lastT = 0;
  private muted = false;
  private listener: AudioListener = { center: [0, 0], bearing: 0, mpp: 10 };

  /** Phải gọi trong thao tác của người dùng (bấm nút) để trình duyệt cho phép phát tiếng. */
  async start(): Promise<void> {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    this.ctx = ctx;
    this.noise = makeNoise(ctx, 3);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    this.master.connect(compressor).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);

    const loop = (freq: number, q: number, type: BiquadFilterType): GainNode => {
      const source = ctx.createBufferSource();
      source.buffer = this.noise;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      source.connect(filter).connect(g).connect(this.master);
      source.start();
      return g;
    };
    this.wind = loop(480, 0.5, "bandpass");
    // tiếng động cơ cánh quạt: hai sóng răng cưa trầm, đập nhịp nhẹ
    this.engine = ctx.createGain();
    this.engine.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 320;
    for (const freq of [58, 61.5]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.connect(engineFilter);
      osc.start();
    }
    engineFilter.connect(this.engine).connect(this.master);
  }

  state(): string {
    return this.ctx?.state ?? "none";
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  async suspend() {
    await this.ctx?.suspend();
  }

  async resume() {
    await this.ctx?.resume();
  }

  /** Nạp danh sách sự kiện của cảnh mới và đặt con trỏ ở thời điểm t. */
  setScene(events: SceneSoundEvent[], t: number) {
    this.events = events;
    this.seek(t);
  }

  /** Tua: đặt lại con trỏ (không phát lại tiếng đã qua). */
  seek(t: number) {
    this.lastT = t;
    this.pointer = this.events.findIndex((e) => e.t > t);
    if (this.pointer < 0) this.pointer = this.events.length;
  }

  /** Gọi mỗi khung hình khi đang phát. */
  update(t: number, listener: AudioListener, env: { night: number; planes: number }) {
    this.listener = listener;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") {
      this.lastT = t;
      return;
    }
    const now = ctx.currentTime;
    this.wind.gain.setTargetAtTime(0.035 + 0.025 * env.night, now, 0.5);
    this.engine.gain.setTargetAtTime(env.planes > 0 ? 0.05 : 0, now, 0.6);
    if (t < this.lastT || t - this.lastT > 0.6) {
      this.seek(t);
      return;
    }
    let voices = 0;
    while (this.pointer < this.events.length && this.events[this.pointer].t <= t) {
      const event = this.events[this.pointer++];
      if (voices++ < 10) this.play(event, now + (event.t - t));
    }
    this.lastT = t;
  }

  private spatial(at: LatLng | undefined): { gain: number; pan: number; delay: number } {
    if (!at) return { gain: 1, pan: 0, delay: 0 };
    const { center, bearing, mpp } = this.listener;
    // khoảng cách tính theo "bề rộng khung nhìn" để quy mô nào (Đông Dương hay một quả đồi) cũng nghe hợp lý
    const screens = distanceMeters(center, at) / (mpp * 900);
    const angle = ((bearingDegrees(center, at) - bearing) * Math.PI) / 180;
    return { gain: 1 / (1 + screens * screens * 2.5), pan: clamp(Math.sin(angle) * Math.min(1, screens * 3), -1, 1) * 0.8, delay: Math.min(0.6, screens * 0.35) };
  }

  private burst(when: number, duration: number, type: BiquadFilterType, freq: number, endFreq: number, gain: number, pan: number) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), when + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    source.connect(filter).connect(g).connect(panner).connect(this.sfx);
    source.start(when, Math.random() * 2);
    source.stop(when + duration + 0.05);
  }

  private tone(when: number, type: OscillatorType, freq: number, endFreq: number, duration: number, gain: number, pan = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), when + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + Math.min(0.03, duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    o.connect(g).connect(panner).connect(this.sfx);
    o.start(when);
    o.stop(when + duration + 0.05);
  }

  private play(event: SceneSoundEvent, when: number) {
    const { gain, pan, delay } = this.spatial(event.at);
    const w = when + delay;
    switch (event.kind) {
      case "launch":
        this.burst(w, 0.5, "lowpass", 600, 120, 0.3 * gain, pan);
        this.tone(w, "sine", 70, 38, 0.45, 0.4 * gain, pan);
        break;
      case "boom":
        this.burst(w, 1.4, "lowpass", 900, 90, 0.55 * gain, pan);
        this.tone(w, "sine", 90, 28, 1.1, 0.5 * gain, pan);
        this.burst(w, 0.14, "highpass", 1400, 1400, 0.25 * gain, pan);
        break;
      case "blast":
        this.burst(w, 3.2, "lowpass", 700, 60, 1.1 * gain, pan * 0.5);
        this.tone(w, "sine", 80, 22, 2.6, 1.0 * gain, 0);
        this.tone(w + 0.2, "sine", 3150, 3050, 2.8, 0.035, 0);
        break;
      case "bugle": {
        const ctx = this.ctx!;
        [[392, 0, 0.22], [392, 0.26, 0.22], [523.25, 0.52, 0.7]].forEach(([freq, offset, dur]) => {
          const o = ctx.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = freq;
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = freq * 2;
          bp.Q.value = 1.2;
          const g = ctx.createGain();
          const start = when + offset;
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
          g.gain.setValueAtTime(0.12, start + dur - 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
          o.connect(bp).connect(g).connect(this.sfx);
          o.start(start);
          o.stop(start + dur + 0.05);
        });
        break;
      }
      case "chime":
        [392, 523.25, 659.25].forEach((freq, i) => this.tone(when + i * 0.28, "sine", freq, freq * 0.998, 1.8, 0.09, 0));
        break;
    }
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
