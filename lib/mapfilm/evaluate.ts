import type { BattleStep, LatLng, StrongpointStatus, UnitKind } from "@/lib/battles/types";
import { easeInOut, lerp, smoothstep } from "@/lib/cinema/math";
import { createRng } from "@/lib/cinema/rng";
import { blastShake, emitterLifetime } from "@/lib/cinema/effects";
import { CHAPTER_CARD_SECONDS, subtitleAt } from "@/lib/cinema/timeline";
import type { Emitter } from "@/lib/cinema/types";
import { evaluateMapCamera } from "@/lib/mapfilm/camera";
import { bearingDegrees, distanceMeters, fromLocal, pointAlong, toLocal } from "@/lib/mapfilm/geo";
import type {
  ArrowState,
  BarrageAction,
  ChuteState,
  LabelState,
  MapFilmScript,
  MapFrame,
  MapScene,
  MarchAction,
  MuzzleState,
  PieceKind,
  PieceState,
  PlaneState,
  ShellState,
  StrongpointState,
} from "@/lib/mapfilm/types";

/** Thời gian bay của một viên đạn pháo (giây, đã nén cho dễ nhìn). */
export const SHELL_FLIGHT = 2.4;
/** Khoảng cách giữa hai quân cờ liên tiếp trong hàng quân, tính theo tỉ lệ quãng đường. */
const MARCH_GAP = 0.055;
/** Thời gian hạ cờ Pháp và kéo cờ ta khi chiếm cứ điểm. */
const FLAG_DOWN = 1.2;
const FLAG_UP = 1.6;

const UNIT_PIECE: Partial<Record<UnitKind, PieceKind>> = { "vn-infantry": "infantry", "vn-artillery": "artillery", "vn-hq": "hq" };

type Change = { t: number; status: StrongpointStatus };

type Compiled = {
  scene: MapScene;
  step: BattleStep;
  prev: BattleStep | null;
  /** Mốc đổi trạng thái của mỗi cứ điểm (đã sắp theo t). */
  changes: Record<string, Change[]>;
  /** Thời điểm bắt đầu hiện của các cứ điểm mới xuất hiện trong cảnh. */
  reveal: Record<string, number>;
  arrows: Record<string, [number, number]>;
  zones: Record<string, [number, number]>;
  shells: { from: LatLng; to: LatLng; t: number }[];
  emitters: Emitter[];
  unitMove: [number, number];
};

const cache = new WeakMap<MapFilmScript, Compiled[]>();

function resolvePath(script: MapFilmScript, path: MarchAction["path"]): LatLng[] {
  if (Array.isArray(path)) return path;
  const arrow = script.scenario.arrowDefinitions?.find((a) => a.id === path.arrow);
  if (!arrow) throw new Error(`Không có mũi tên "${path.arrow}"`);
  return arrow.path;
}

function stepOf(script: MapFilmScript, index: number): BattleStep {
  const step = script.scenario.steps.find((s) => s.id === script.scenes[index].stepId);
  if (!step) throw new Error(`Cảnh ${index} tham chiếu bước "${script.scenes[index].stepId}" không tồn tại`);
  return step;
}

function compile(script: MapFilmScript, index: number): Compiled {
  let all = cache.get(script);
  if (!all) {
    all = [];
    cache.set(script, all);
  }
  if (all[index]) return all[index];

  const scene = script.scenes[index];
  const step = stepOf(script, index);
  const prev = index > 0 ? stepOf(script, index - 1) : null;
  const d = scene.duration;
  const emitters: Emitter[] = [];
  const shells: Compiled["shells"] = [];
  let seed = (index + 1) * 1000;
  const local = (p: LatLng) => toLocal(script.origin, p);
  const spPosition = (id: string) => script.scenario.strongpointDefinitions?.find((s) => s.id === id)?.position;

  // Trạng thái cứ điểm: đầu cảnh = bước trước, cuối cảnh = bước này
  const before = prev?.strongpoints ?? {};
  const after = step.strongpoints ?? {};
  const changes: Compiled["changes"] = {};
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const list: Change[] = before[id] ? [{ t: -Infinity, status: before[id] }] : [];
    for (const action of scene.actions) if (action.type === "strongpoint" && action.id === id) list.push({ t: action.t, status: action.status });
    list.sort((a, b) => a.t - b.t);
    const end = after[id];
    if (end && list[list.length - 1]?.status !== end) list.push({ t: d * 0.5, status: end });
    if (!end && list.length === 0) continue;
    changes[id] = list.length ? list : [{ t: -Infinity, status: end }];
  }

  // Cứ điểm mới xuất hiện trong cảnh
  const reveal: Compiled["reveal"] = {};
  for (const id of Object.keys(after)) {
    if (id in before) continue;
    reveal[id] = d * 0.1;
  }
  for (const action of scene.actions) {
    if (action.type !== "reveal") continue;
    action.ids.forEach((id, i) => {
      reveal[id] = action.ids.length === 1 ? action.t0 : lerp(action.t0, action.t1, i / (action.ids.length - 1));
    });
  }

  // Hiệu ứng tự động khi cứ điểm bị tiến công / bị chiếm
  for (const [id, list] of Object.entries(changes)) {
    const at = spPosition(id);
    if (!at) continue;
    const [x, z] = local(at);
    const rng = createRng(seed++);
    for (const change of list) {
      if (!Number.isFinite(change.t)) continue;
      if (change.status === "captured") {
        for (let k = 0; k < 3; k++) {
          emitters.push({ id: `auto-${id}-${k}`, kind: "shell", t0: change.t - 2.4 + k * 0.8, x: x + rng.range(-60, 60), z: z + rng.range(-60, 60), scale: 1, seed: seed++ });
        }
        emitters.push({ id: `auto-${id}-fire`, kind: "fire", t0: change.t, t1: change.t + 30, x, z, scale: 1, seed: seed++ });
      } else if (change.status === "attacked") {
        emitters.push({ id: `auto-${id}-hit`, kind: "shell", t0: change.t, x: x + rng.range(-40, 40), z: z + rng.range(-40, 40), scale: 1, seed: seed++ });
        emitters.push({ id: `auto-${id}-smoke`, kind: "fire", t0: change.t, x: x + 30, z: z - 20, scale: 0.8, seed: seed++ });
      }
    }
    // Cứ điểm đang giằng co từ trước: khói âm ỉ suốt cảnh
    if (before[id] === "attacked" && after[id] === "attacked") emitters.push({ id: `auto-${id}-smoke`, kind: "fire", t0: -5, x: x + 30, z: z - 20, scale: 0.8, seed: seed++ });
  }

  // Mũi tên của kịch bản: mới thì vẽ dần, bị bỏ thì mờ đi
  const arrows: Compiled["arrows"] = {};
  const beforeArrows = new Set(prev?.arrows ?? []);
  for (const id of step.arrows ?? []) arrows[id] = beforeArrows.has(id) ? [-2, -1] : [d * 0.15, d * 0.45];
  for (const action of scene.actions) if (action.type === "arrow") arrows[action.arrow] = [action.t0, action.t1];

  const zones: Compiled["zones"] = {};
  const beforeZones = new Set(prev?.zones ?? []);
  for (const id of step.zones ?? []) zones[id] = beforeZones.has(id) ? [-2, -1] : [d * 0.1, d * 0.1 + 2];
  for (const action of scene.actions) if (action.type === "zone") zones[action.id] = [action.t0, action.t1];

  for (const action of scene.actions) {
    if (action.type === "barrage") compileBarrage(action, local, emitters, shells);
    else if (action.type === "blast") {
      const [x, z] = local(action.at);
      emitters.push({ id: `blast-${seed}`, kind: action.kind, t0: action.t, t1: action.t1, x, z, scale: action.scale ?? 1, seed: action.seed ?? seed });
      seed++;
    }
  }
  emitters.sort((a, b) => a.t0 - b.t0);
  shells.sort((a, b) => a.t - b.t);

  const compiled: Compiled = { scene, step, prev, changes, reveal, arrows, zones, shells, emitters, unitMove: scene.unitMove ?? [d * 0.15, d * 0.6] };
  all[index] = compiled;
  return compiled;
}

function compileBarrage(action: BarrageAction, local: (p: LatLng) => [number, number], emitters: Emitter[], shells: Compiled["shells"]) {
  const rng = createRng(action.seed);
  const [tx, tz] = local(action.target);
  const origin = action.target;
  for (let i = 0; i < action.rounds; i++) {
    const launch = lerp(action.t0, action.t1, action.rounds === 1 ? 0 : i / (action.rounds - 1)) + rng.range(-0.15, 0.15);
    const from = action.from[i % action.from.length];
    const angle = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * action.spread;
    const x = tx + Math.cos(angle) * r;
    const z = tz + Math.sin(angle) * r;
    // điểm chạm đất đổi ngược về kinh vĩ độ (quanh mục tiêu) để vẽ đường đạn
    const to = offsetLatLng(origin, x - tx, z - tz);
    shells.push({ from, to, t: launch });
    emitters.push({ id: `shell-${action.seed}-${i}`, kind: "shell", t0: launch + SHELL_FLIGHT, x, z, scale: 1, seed: action.seed * 97 + i });
  }
}

/** Dời một điểm `east` mét về phía đông và `south` mét về phía nam (đủ chính xác trong vài km). */
function offsetLatLng([lat, lng]: LatLng, east: number, south: number): LatLng {
  const dLat = -south / 111_320;
  const dLng = east / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lat + dLat, lng + dLng];
}

function statusAt(list: Change[], t: number): { status: StrongpointStatus; since: number } {
  let current = list[0];
  for (const change of list) if (change.t <= t) current = change;
  return { status: current.status, since: current.t };
}

function marchPieces(script: MapFilmScript, action: MarchAction, t: number): PieceState[] {
  if (t < action.t0) return [];
  const path = resolvePath(script, action.path);
  const span = action.t1 - action.t0;
  const lead = easeInOut((t - action.t0) / span) * (1 + (action.count - 1) * MARCH_GAP);
  const fade = action.fadeAtEnd ? 1 - smoothstep(action.t1, action.t1 + 2, t) : 1;
  if (fade <= 0) return [];
  const pieces: PieceState[] = [];
  for (let i = 0; i < action.count; i++) {
    const raw = lead - i * MARCH_GAP;
    const opacity = smoothstep(-MARCH_GAP * 0.6, 0, raw) * fade;
    if (opacity <= 0) continue;
    const u = Math.min(1, Math.max(0, raw));
    const { position, heading } = pointAlong(path, u);
    // tới nơi thì dàn thành hàng ngang, hai bên đường
    const arrived = smoothstep(0.96, 1, raw);
    const side = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * Math.ceil(i / 2);
    pieces.push({
      key: `${action.id}-${i}`,
      kind: action.kind,
      side: action.side,
      position,
      heading,
      opacity,
      moving: raw > 0 && raw < 1,
      offset: side * 1.3 * arrived,
    });
  }
  return pieces;
}

/** Khung hình của cảnh `index` tại thời điểm `t` (giây từ đầu cảnh). */
export function evaluateScene(script: MapFilmScript, index: number, time: number): MapFrame {
  const c = compile(script, index);
  const { scene, step, prev } = c;
  const t = Math.min(Math.max(time, 0), scene.duration);
  const scenario = script.scenario;

  // Đơn vị của kịch bản 2D
  const pieces: PieceState[] = [];
  const [m0, m1] = c.unitMove;
  const move = easeInOut((t - m0) / (m1 - m0));
  for (const def of scenario.unitDefinitions) {
    const kind = UNIT_PIECE[def.kind];
    const end = step.units[def.id];
    if (!kind || !end) continue;
    const start = prev?.units[def.id] ?? end;
    const position: LatLng = [lerp(start.position[0], end.position[0], move), lerp(start.position[1], end.position[1], move)];
    const opacity = lerp(start.visible ? 1 : 0, end.visible ? 1 : 0, move);
    if (opacity <= 0.001) continue;
    const travelling = distanceMeters(start.position, end.position) > 30;
    pieces.push({
      key: def.id,
      kind,
      side: "vn",
      position,
      heading: travelling ? bearingDegrees(start.position, end.position) : bearingDegrees(end.position, script.origin),
      opacity,
      moving: travelling && move > 0 && move < 1,
      offset: 0,
      label: def.label,
    });
  }
  for (const action of scene.actions) if (action.type === "march") pieces.push(...marchPieces(script, action, t));

  // Cứ điểm
  const strongpoints: StrongpointState[] = [];
  for (const def of scenario.strongpointDefinitions ?? []) {
    const list = c.changes[def.id];
    if (!list) continue;
    const { status, since } = statusAt(list, t);
    const inBefore = !!prev?.strongpoints?.[def.id];
    const inAfter = !!step.strongpoints?.[def.id];
    let opacity = 1;
    if (!inBefore && inAfter) opacity = smoothstep(c.reveal[def.id] ?? 0, (c.reveal[def.id] ?? 0) + 1.2, t);
    else if (inBefore && !inAfter) opacity = 1 - smoothstep(0, 1.5, t);
    if (opacity <= 0.001) continue;
    let flagFr = status === "captured" ? 0 : 1;
    let flagVn = status === "captured" ? 1 : 0;
    if (status === "captured" && Number.isFinite(since)) {
      flagFr = 1 - smoothstep(since, since + FLAG_DOWN, t);
      flagVn = smoothstep(since + FLAG_DOWN, since + FLAG_DOWN + FLAG_UP, t);
    }
    strongpoints.push({ id: def.id, label: def.label, name: def.name, position: def.position, status, opacity, flagFr, flagVn });
  }

  // Mũi tên
  const arrows: ArrowState[] = [];
  for (const def of scenario.arrowDefinitions ?? []) {
    const window = c.arrows[def.id];
    const wasShown = prev?.arrows?.includes(def.id) ?? false;
    if (window) {
      const progress = easeInOut((t - window[0]) / (window[1] - window[0]));
      if (progress > 0) arrows.push({ id: def.id, path: def.path, kind: def.kind, progress, opacity: 1 });
    } else if (wasShown) {
      const opacity = 1 - smoothstep(0, 1.2, t);
      if (opacity > 0.001) arrows.push({ id: def.id, path: def.path, kind: def.kind, progress: 1, opacity });
    }
  }
  for (const extra of scene.extraArrows ?? []) {
    const progress = easeInOut((t - extra.t0) / (extra.t1 - extra.t0));
    if (progress > 0) arrows.push({ id: extra.id, path: extra.path, kind: extra.kind, progress, opacity: 1 });
  }

  // Vùng
  const zones: Record<string, number> = {};
  for (const def of scenario.zoneDefinitions ?? []) {
    const window = c.zones[def.id];
    if (window) zones[def.id] = smoothstep(window[0], window[1], t);
    else if (prev?.zones?.includes(def.id)) zones[def.id] = 1 - smoothstep(0, 2, t);
    else zones[def.id] = 0;
  }

  // Đạn pháo và chớp đầu nòng
  const shells: ShellState[] = [];
  const muzzles: MuzzleState[] = [];
  for (const shell of c.shells) {
    const age = t - shell.t;
    if (age < 0) break;
    if (age < SHELL_FLIGHT) shells.push({ from: shell.from, to: shell.to, u: age / SHELL_FLIGHT });
    if (age < 0.35) muzzles.push({ at: shell.from, strength: 1 - age / 0.35 });
  }

  // Hiệu ứng hạt còn sống ở thời điểm t
  const emitters = c.emitters.filter((e) => e.t0 <= t && t - e.t0 < Math.min(emitterLifetime(e), 40) && (e.t1 === undefined || t < e.t1 + 2));
  let shake = 0;
  for (const e of c.emitters) if (e.kind === "blast") shake = Math.max(shake, blastShake(t, e.t0));

  // Máy bay và dù
  const planes: PlaneState[] = [];
  const chutes: ChuteState[] = [];
  for (const action of scene.actions) {
    if (action.type !== "plane") continue;
    if (t >= action.t0 && t <= action.t1) {
      const u = (t - action.t0) / (action.t1 - action.t0);
      const { position, heading } = pointAlong(action.path, u);
      planes.push({ id: action.id, position, altitude: action.altitude, heading, opacity: smoothstep(0, 0.06, u) * (1 - smoothstep(0.94, 1, u)) });
    }
    for (const [k, dropT] of (action.drops ?? []).entries()) {
      const age = t - dropT;
      if (age < 0 || age > 14) continue;
      const u = (dropT - action.t0) / (action.t1 - action.t0);
      const { position, heading } = pointAlong(action.path, u);
      // dù trôi theo gió về phía đông nam, rơi chậm dần
      const [x, z] = toLocal(script.origin, position);
      const drift = age * 18;
      const rad = ((heading + 100 + k * 25) * Math.PI) / 180;
      const at = fromLocal(script.origin, [x + Math.sin(rad) * drift, z - Math.cos(rad) * drift]);
      chutes.push({ position: at, altitude: Math.max(0, action.altitude * (1 - age / 12)), opacity: 1 - smoothstep(11, 14, age) });
    }
  }

  // Nhãn
  const labels: LabelState[] = [];
  for (const action of scene.actions) {
    if (action.type !== "label" || t < action.t0 || t > action.t1) continue;
    const opacity = smoothstep(action.t0, action.t0 + 0.8, t) * (1 - smoothstep(action.t1 - 0.8, action.t1, t));
    labels.push({ id: action.id, at: action.at, text: action.text, opacity, tone: action.tone ?? "note" });
  }

  // Đêm / ngày
  const night = nightAt(scene, t);

  const card =
    t <= CHAPTER_CARD_SECONDS
      ? { ...scene.chapter, alpha: smoothstep(0, 0.5, t) * (1 - smoothstep(CHAPTER_CARD_SECONDS - 0.9, CHAPTER_CARD_SECONDS, t)) }
      : null;

  return {
    scene: index,
    t,
    camera: evaluateMapCamera(scene.camera, t),
    shake,
    pieces,
    strongpoints,
    arrows,
    zones,
    shells,
    muzzles,
    emitters,
    planes,
    chutes,
    labels,
    night,
    subtitle: subtitleAt(scene, t),
    card: card && card.alpha > 0 ? card : null,
    factVisible: !!step.fact && t >= (scene.factAt ?? scene.duration * 0.55),
  };
}

export type SceneSoundEvent = { t: number; kind: "launch" | "boom" | "blast" | "bugle" | "chime"; at?: LatLng };

/** Sự kiện âm thanh của cảnh (đã sắp theo t): pháo rời nòng, đạn nổ, bộc phá, kèn xung phong, chào cờ. */
export function sceneSoundEvents(script: MapFilmScript, index: number): SceneSoundEvent[] {
  const c = compile(script, index);
  const events: SceneSoundEvent[] = [];
  for (const shell of c.shells) events.push({ t: shell.t, kind: "launch", at: shell.from });
  for (const e of c.emitters) {
    if (e.kind === "fire" || e.t0 < 0) continue;
    events.push({ t: e.t0, kind: e.kind === "blast" ? "blast" : "boom", at: fromLocal(script.origin, [e.x, e.z]) });
  }
  const firstAssault = c.scene.actions.find((a): a is MarchAction => a.type === "march" && a.kind === "infantry");
  if (firstAssault) events.push({ t: firstAssault.t0, kind: "bugle" });
  for (const [id, list] of Object.entries(c.changes)) {
    const at = script.scenario.strongpointDefinitions?.find((s) => s.id === id)?.position;
    for (const change of list) if (change.status === "captured" && Number.isFinite(change.t)) events.push({ t: change.t + FLAG_DOWN, kind: "chime", at });
  }
  return events.sort((a, b) => a.t - b.t);
}

/** Mức đêm tối (0–1) của cảnh tại thời điểm t, nội suy tuyến tính giữa các mốc. */
export function nightAt(scene: MapScene, t: number): number {
  const keys = scene.night ?? [];
  if (keys.length === 0) return 0;
  if (t <= keys[0].t) return keys[0].value;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t) return lerp(a.value, b.value, (t - a.t) / (b.t - a.t));
  }
  return keys[keys.length - 1].value;
}

/** Tổng thời lượng của mọi cảnh (giây). */
export function totalDuration(script: MapFilmScript): number {
  return script.scenes.reduce((sum, scene) => sum + scene.duration, 0);
}
