import { clamp, smoothstep } from "@/lib/cinema/math";
import { createRng } from "@/lib/cinema/rng";
import { firstShotIndexAtOrAfter } from "@/lib/cinema/effects";
import type { FilmScript } from "@/lib/cinema/types";

/**
 * Âm thanh tổng hợp bằng Web Audio (không tải file nào): gió, dế, chim, nhịp tim, trống, kèn, tiếng nổ, tiếng súng.
 * Tiếng nổ/súng phát theo vị trí trong cảnh: âm lượng giảm theo khoảng cách, lệch trái/phải theo hướng máy quay,
 * và ĐẾN TRỄ theo tốc độ âm thanh (340 m/s, tối đa 1 giây) — thấy chớp sáng trước rồi mới nghe tiếng nổ.
 */

export type ListenerFrame = { x: number; y: number; z: number; rx: number; rz: number };

type EventKind = "boom" | "flare" | "heart" | "kick" | "tom" | "bugle" | "chime" | "bird" | "clap";
type AudioEvent = { t: number; kind: EventKind; x?: number; y?: number; z?: number; size?: number; freq?: number; distant?: boolean; pan?: number };

const SPEED_OF_SOUND = 340;

function makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createRng(90210);
  for (let i = 0; i < data.length; i++) data[i] = rng.next() * 2 - 1;
  return buffer;
}

function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  const rng = createRng(1234);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (rng.next() * 2 - 1) * (1 - i / length) ** decay;
  }
  return buffer;
}

export class CinemaAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private tone!: BiquadFilterNode;
  private sfx!: GainNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private layers!: { wind: GainNode; crickets: GainNode; drone: GainNode; pad: GainNode };
  private events: AudioEvent[];
  private pointer = 0;
  private shotPointer = 0;
  private lastT = 0;
  private muted = false;
  private volume = 0.85;
  private listener: ListenerFrame = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
  private started = false;

  constructor(private readonly script: FilmScript) {
    this.events = this.buildEvents();
  }

  private buildEvents(): AudioEvent[] {
    const { script } = this;
    const rng = createRng(4711);
    const events: AudioEvent[] = [];
    for (const e of script.emitters) {
      if (e.kind === "fire") continue;
      const size = e.kind === "blast" ? 1 : e.kind === "shell" ? 0.42 * (e.scale / 0.5) : 0.16;
      events.push({ t: e.t0, kind: "boom", x: e.x, y: 4, z: e.z, size, distant: e.distant });
    }
    for (const f of script.flares) events.push({ t: f.t, kind: "flare", x: f.x, y: 80, z: f.z });
    // nhịp tim dồn dập dần trước giờ G
    for (let t = 38.2, gap = 1.05; t < script.blastTime - 0.4; t += gap, gap = Math.max(0.62, gap - 0.045)) events.push({ t, kind: "heart" });
    // tiếng trống hành quân trong lúc xung phong (96 nhịp/phút)
    const beat = 60 / 96;
    for (let i = 0, t = 52.6; t < 84; i++, t += beat) events.push({ t, kind: i % 4 === 2 ? "tom" : "kick", size: i % 8 === 0 ? 1.25 : 1 });
    events.push({ t: 50.3, kind: "bugle" });
    // chim hót lúc rạng sáng
    for (let t = 90.5; t < 109; t += rng.range(1.1, 2.6)) events.push({ t, kind: "bird", freq: rng.range(2600, 4200), pan: rng.range(-0.8, 0.8) });
    // hợp âm chào cờ
    [392, 523.25, 659.25, 783.99].forEach((freq, i) => events.push({ t: script.flag.raiseFrom + i * 0.42, kind: "chime", freq }));
    return events.sort((a, b) => a.t - b.t);
  }

  /** Phải gọi trong một thao tác của người dùng (bấm nút) để trình duyệt cho phép phát tiếng. */
  async start(): Promise<void> {
    if (this.started) {
      await this.ctx?.resume();
      return;
    }
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    this.ctx = ctx;
    this.started = true;
    this.noise = makeNoise(ctx, 3);

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 22000;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 5;
    this.master.connect(this.tone).connect(compressor).connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 2.8, 2.6);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.38;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.22;
    this.reverbSend.connect(convolver).connect(reverbGain).connect(this.master);

    const loop = (freq: number, q: number, type: BiquadFilterType, gain: number): GainNode => {
      const source = ctx.createBufferSource();
      source.buffer = this.noise;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      source.connect(filter).connect(g).connect(this.master);
      source.start();
      return g;
    };
    const wind = loop(520, 0.6, "bandpass", 0.0);
    // gió thổi nhấp nhô chậm
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.11;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 0.02;
    windLfo.connect(windLfoGain).connect(wind.gain);
    windLfo.start();

    // dế: sóng 4,4 kHz đóng ngắt nhanh
    const cricketOsc = ctx.createOscillator();
    cricketOsc.frequency.value = 4380;
    const cricketAm = ctx.createGain();
    cricketAm.gain.value = 0;
    const cricketLfo = ctx.createOscillator();
    cricketLfo.type = "square";
    cricketLfo.frequency.value = 31;
    const cricketLfoDepth = ctx.createGain();
    cricketLfoDepth.gain.value = 0.5;
    cricketLfo.connect(cricketLfoDepth).connect(cricketAm.gain);
    const cricketOut = ctx.createGain();
    cricketOut.gain.value = 0;
    cricketOsc.connect(cricketAm).connect(cricketOut).connect(this.master);
    cricketOsc.start();
    cricketLfo.start();
    // offset để LFO dao động quanh 0,5 (đóng/ngắt) thay vì âm
    const cricketBias = ctx.createConstantSource();
    cricketBias.offset.value = 0.5;
    cricketBias.connect(cricketAm.gain);
    cricketBias.start();

    // nền căng thẳng (hai sóng răng cưa lệch nhẹ + lọc thấp)
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 220;
    const drone = ctx.createGain();
    drone.gain.value = 0;
    for (const freq of [55, 55.45, 82.6]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.connect(droneFilter);
      osc.start();
    }
    droneFilter.connect(drone).connect(this.master);

    // hợp âm nhẹ lúc rạng sáng (Đô trưởng)
    const pad = ctx.createGain();
    pad.gain.value = 0;
    for (const freq of [130.81, 196, 261.63, 329.63]) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const detune = ctx.createOscillator();
      detune.frequency.value = 0.2 + freq / 1000;
      const detuneGain = ctx.createGain();
      detuneGain.gain.value = 2.5;
      detune.connect(detuneGain).connect(osc.detune);
      detune.start();
      osc.connect(pad);
      osc.start();
    }
    pad.connect(this.master);

    this.layers = { wind, crickets: cricketOut, drone, pad };
    this.seek(this.lastT);
  }

  /** Trạng thái AudioContext (dùng cho kiểm thử): "running", "suspended"… hoặc "none" nếu chưa khởi tạo. */
  state(): string {
    return this.ctx?.state ?? "none";
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  setVolume(volume: number) {
    this.volume = clamp(volume);
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  async suspend() {
    await this.ctx?.suspend();
  }

  async resume() {
    await this.ctx?.resume();
  }

  /** Tua: đặt lại con trỏ sự kiện (không phát lại tiếng nổ đã qua). */
  seek(t: number) {
    this.lastT = t;
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].t <= t) lo = mid + 1;
      else hi = mid;
    }
    this.pointer = lo;
    this.shotPointer = firstShotIndexAtOrAfter(this.script.shots3d, t + 1e-6);
  }

  /** Gọi mỗi khung hình: cập nhật các lớp nền theo thời gian và phát các sự kiện vừa tới. */
  update(t: number, listener: ListenerFrame) {
    this.listener = listener;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") {
      this.lastT = t;
      return;
    }
    const now = ctx.currentTime;
    const { blastTime } = this.script;
    const dawn = smoothstep(84, 92, t);

    // Lớp nền: mọi mức là hàm của t nên tua đi đâu cũng đúng
    const wind = t < blastTime ? 0.06 : t < 84 ? 0.028 : 0.05;
    const crickets = 0.012 * (1 - smoothstep(43, 46.5, t)) * (t < blastTime ? 1 : 0);
    const drone = 0.17 * smoothstep(30, 47.4, t) * (1 - smoothstep(47.4, 47.8, t)) + (t > blastTime + 5 && t < 84 ? 0.045 : 0) * (1 - dawn);
    const pad = 0.075 * dawn * (1 - smoothstep(103, 109, t));
    this.layers.wind.gain.setTargetAtTime(wind, now, 0.4);
    this.layers.crickets.gain.setTargetAtTime(crickets, now, 0.3);
    this.layers.drone.gain.setTargetAtTime(drone, now, 0.25);
    this.layers.pad.gain.setTargetAtTime(pad, now, 0.6);

    const jumped = t < this.lastT || t - this.lastT > 0.6;
    if (jumped) {
      this.seek(t);
      return;
    }

    while (this.pointer < this.events.length && this.events[this.pointer].t <= t) {
      const event = this.events[this.pointer++];
      this.play(event, now + (event.t - t));
    }
    // Tiếng súng: mật độ cao nên xử lý riêng, giới hạn số giọng đồng thời
    const shots = this.script.shots3d;
    let voices = 0;
    while (this.shotPointer < shots.length && shots[this.shotPointer].t <= t) {
      const shot = shots[this.shotPointer++];
      if (voices >= 12) continue;
      voices += this.rifle(shot.origin[0], shot.origin[1], shot.origin[2], shot.faction === "vn", now + (shot.t - t)) ? 1 : 0;
    }
    this.lastT = t;
  }

  private spatial(x: number, y: number, z: number): { distance: number; pan: number } {
    const { listener } = this;
    const dx = x - listener.x;
    const dy = y - listener.y;
    const dz = z - listener.z;
    const distance = Math.hypot(dx, dy, dz);
    const pan = clamp((dx * listener.rx + dz * listener.rz) / Math.max(distance, 8), -1, 1) * 0.85;
    return { distance, pan };
  }

  private burst(when: number, duration: number, type: BiquadFilterType, freq: number, endFreq: number, gain: number, pan: number, reverb = 0.25, q = 0.7) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, when);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), when + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    source.connect(filter).connect(g).connect(panner).connect(this.sfx);
    if (reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      panner.connect(send).connect(this.reverbSend);
    }
    source.start(when, Math.random() * 2);
    source.stop(when + duration + 0.05);
  }

  private osc(when: number, type: OscillatorType, freq: number, endFreq: number, duration: number, gain: number, pan = 0, reverb = 0.1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), when + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + Math.min(0.02, duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    o.connect(g).connect(panner).connect(this.sfx);
    if (reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      panner.connect(send).connect(this.reverbSend);
    }
    o.start(when);
    o.stop(when + duration + 0.05);
  }

  private rifle(x: number, y: number, z: number, vietnamese: boolean, when: number): boolean {
    const { distance, pan } = this.spatial(x, y, z);
    if (distance > 280) return false;
    const gain = 0.34 / (1 + distance / 22) ** 1.15;
    if (gain < 0.004) return false;
    const delay = Math.min(1, distance / SPEED_OF_SOUND);
    const w = when + delay;
    const bright = 3400 / (1 + distance / 90);
    this.burst(w, 0.07, "bandpass", vietnamese ? 1900 : 1500, 700, gain, pan, 0.35, 0.9);
    this.burst(w, 0.02, "highpass", Math.max(900, bright), Math.max(900, bright), gain * 0.7, pan, 0.1);
    return true;
  }

  private play(event: AudioEvent, when: number) {
    const ctx = this.ctx!;
    switch (event.kind) {
      case "boom": {
        const { distance, pan } = this.spatial(event.x ?? 0, event.y ?? 0, event.z ?? 0);
        const size = event.size ?? 1;
        const delay = Math.min(1, distance / SPEED_OF_SOUND);
        const w = when + delay;
        const near = 1 / (1 + distance / (120 * Math.sqrt(size) + 30)) ** 1.1;
        const g = Math.min(1.2, (event.distant ? 0.5 : 1) * size ** 0.6 * near * 1.3);
        const lowpass = event.distant ? 260 : 900;
        // thân tiếng nổ + siêu trầm + tiếng vỡ giòn
        this.burst(w, 1.5 + 1.4 * size, "lowpass", lowpass, 90, g * 0.85, pan * 0.6, 0.55);
        this.osc(w, "sine", 92, 26, 1.3 + 1.1 * size, g * 0.95, 0, 0.3);
        if (!event.distant && distance < 500) this.burst(w, 0.16 + 0.1 * size, "highpass", 1500, 1500, g * 0.6, pan, 0.2);
        if (size >= 0.99) {
          // vụ nổ lớn: ù tai và tiếng bị bóp nghẹt rồi hồi lại từ từ
          this.tone.frequency.cancelScheduledValues(w);
          this.tone.frequency.setValueAtTime(700, w);
          this.tone.frequency.exponentialRampToValueAtTime(22000, w + 4.2);
          this.osc(w + 0.25, "sine", 3150, 3050, 3.4, 0.045, 0, 0);
        }
        break;
      }
      case "flare": {
        const { distance, pan } = this.spatial(event.x ?? 0, event.y ?? 0, event.z ?? 0);
        this.burst(when + Math.min(1, distance / SPEED_OF_SOUND), 0.5, "bandpass", 1400, 3200, 0.08 / (1 + distance / 250), pan, 0.5, 1.2);
        break;
      }
      case "heart":
        this.osc(when, "sine", 62, 38, 0.2, 0.7, 0, 0.05);
        this.osc(when + 0.19, "sine", 55, 36, 0.18, 0.45, 0, 0.05);
        break;
      case "kick":
        this.osc(when, "sine", 130, 42, 0.22 * (event.size ?? 1), 0.5 * (event.size ?? 1), 0, 0.18);
        this.burst(when, 0.05, "lowpass", 400, 200, 0.12, 0, 0);
        break;
      case "tom":
        this.osc(when, "triangle", 190, 105, 0.26, 0.32, 0, 0.3);
        this.burst(when, 0.08, "bandpass", 600, 300, 0.1, 0, 0.1);
        break;
      case "bugle": {
        // tiếng kèn xung phong: ba nốt (Son – Son – Đô cao) từ sóng răng cưa qua bộ lọc dải
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
          g.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
          g.gain.setValueAtTime(0.16, start + dur - 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
          o.connect(bp).connect(g).connect(this.sfx);
          const send = ctx.createGain();
          send.gain.value = 0.6;
          g.connect(send).connect(this.reverbSend);
          o.start(start);
          o.stop(start + dur + 0.05);
        });
        break;
      }
      case "chime":
        this.osc(when, "sine", event.freq ?? 440, (event.freq ?? 440) * 0.998, 2.6, 0.13, 0, 0.6);
        this.osc(when, "sine", (event.freq ?? 440) * 2, (event.freq ?? 440) * 2, 1.8, 0.04, 0, 0.6);
        break;
      case "bird": {
        const f = event.freq ?? 3200;
        for (let i = 0; i < 3; i++) this.osc(when + i * 0.11, "sine", f, f * 1.35, 0.09, 0.05, event.pan ?? 0, 0.4);
        break;
      }
      default:
        break;
    }
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.started = false;
  }
}
