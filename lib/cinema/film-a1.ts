import { distance2, type Vec2, type Vec3 } from "@/lib/cinema/math";
import { createRng, type Rng } from "@/lib/cinema/rng";
import { chapters, FILM_BLAST_TIME, FILM_DURATION, labels, subtitles } from "@/lib/cinema/film-a1-text";
import { Actor, isDown, soldierPose, truncateWithFall } from "@/lib/cinema/soldiers";
import type { Crater, Trench } from "@/lib/cinema/terrain";
import type { Emitter, Flare, FilmScript, Prop, Shot, Shot3D, SoldierPlan } from "@/lib/cinema/types";

// Phim 3D: "Đồi A1, đêm 6/5/1954" — kịch bản viết cứng (không lưu database).
//
// Hệ tọa độ (mét): gốc là đỉnh đồi A1; x hướng đông, z hướng nam (bắc = −z), y hướng lên.
// Địa hình lòng chảo lấy từ ảnh độ cao thật; đồi A1, chiến hào, công sự là công trình DỰNG THEO MÔ TẢ (hình dạng minh họa).
// Vị trí tương đối theo OpenStreetMap: hầm chỉ huy De Castries ở phía tây–tây bắc đồi A1 (~550 m).
// TODO: đối chiếu chiều dài đường hầm (~45 m), khối bộc phá (~1 tấn) và mốc 20 giờ 30 phút với SGK.

export const DURATION = FILM_DURATION;
export const BLAST_TIME = FILM_BLAST_TIME;
export const MINE: Vec2 = [-20, 4];
const SUMMIT: Vec2 = [0, 0];

const TAU = Math.PI * 2;

/** Các điểm cách đều nhau (xấp xỉ) dọc đường gấp khúc, mỗi bước dài `step` ± jitter. */
function walkPolyline(points: Vec2[], step: number, rng: Rng, jitter = 0.25): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const length = Math.hypot(bx - ax, bz - az);
    let travelled = 0;
    while (travelled < length) {
      const t = travelled / length;
      out.push([ax + (bx - ax) * t, az + (bz - az) * t]);
      travelled += step * (1 + (rng.next() - 0.5) * 2 * jitter);
    }
  }
  return out;
}

function ellipse(cx: number, cz: number, rx: number, rz: number, count: number, rotation = 0): Vec2[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const a = (i / count) * TAU;
    const x = Math.cos(a) * rx;
    const z = Math.sin(a) * rz;
    return [cx + x * Math.cos(rotation) - z * Math.sin(rotation), cz + x * Math.sin(rotation) + z * Math.cos(rotation)] as Vec2;
  });
}

// ---------- Công sự ----------
const FR_RING = ellipse(-4, 0, 36, 22, 18, 0.35);
const trenches: Trench[] = [
  { id: "fr-ring", points: FR_RING, width: 1.2, depth: 1.4 },
  { id: "fr-link-west", points: [[-38, -8], [-52, -14], [-70, -12]], width: 1.1, depth: 1.3 },
  { id: "vn-fwd", points: [[118, 14], [96, 9], [74, 6], [52, 8], [36, 5], [25, 4]], width: 1.0, depth: 1.5 },
  { id: "vn-north", points: [[122, -16], [98, -14], [78, -18], [58, -14], [44, -10]], width: 1.0, depth: 1.5 },
  { id: "vn-south", points: [[124, 40], [100, 32], [80, 30], [60, 26], [42, 18]], width: 1.0, depth: 1.5 },
  { id: "vn-link-a", points: [[74, 6], [72, -8], [78, -18]], width: 0.9, depth: 1.4 },
  { id: "vn-link-b", points: [[80, 30], [76, 18], [74, 6]], width: 0.9, depth: 1.4 },
  { id: "vn-far", points: [[232, 22], [196, 10], [156, 16], [118, 14]], width: 1.0, depth: 1.4 },
];

const props: Prop[] = [
  { id: "B1", kind: "bunker", x: MINE[0], z: MINE[1], size: [7.2, 2.4, 3.6], rotation: 0.25, destroyedAt: BLAST_TIME },
  { id: "B2", kind: "bunker", x: 13, z: -11, size: [4.8, 2.1, 3.2], rotation: -0.5 },
  { id: "B3", kind: "bunker", x: 7, z: 15, size: [4.8, 2.1, 3.2], rotation: 0.6 },
  { id: "B4", kind: "bunker", x: -40, z: -9, size: [5.4, 2.2, 3.4], rotation: 0.1 },
];

const wires = [
  { id: "wire-outer", points: [[80, -58], [84, -32], [82, 0], [84, 32], [78, 58]] as Vec2[] },
  { id: "wire-inner", points: [[58, -42], [62, -20], [60, 0], [62, 22], [56, 42]] as Vec2[] },
  { id: "wire-west", points: [[-58, -30], [-62, -8], [-60, 14], [-56, 34]] as Vec2[] },
];

function buildCraters(): Crater[] {
  const rng = createRng(4242);
  const out: Crater[] = [];
  for (let i = 0; i < 34; i++) {
    const angle = rng.range(0, TAU);
    const radius = rng.range(20, 170);
    out.push({ x: Math.cos(angle) * radius * 1.1, z: Math.sin(angle) * radius * 0.8, radius: rng.range(1.8, 4.6), depth: rng.range(0.5, 1.5) });
  }
  return out;
}

// ---------- Lính ----------

function buildSoldiers(): SoldierPlan[] {
  const rng = createRng(1954);
  const plans: SoldierPlan[] = [];
  let nextId = 0;

  // ===== Bộ đội ta =====
  const vnSlots: { pos: Vec2; far: boolean }[] = [];
  const addTrench = (id: string, count: number, far = false) => {
    const trench = trenches.find((t) => t.id === id)!;
    const walk = walkPolyline(trench.points, 3.1, rng);
    const stride = Math.max(1, Math.floor(walk.length / count));
    for (let i = 0, added = 0; i < walk.length && added < count; i += stride, added++) {
      vnSlots.push({ pos: [walk[i][0] + rng.range(-0.25, 0.25), walk[i][1] + rng.range(-0.25, 0.25)], far });
    }
  };
  addTrench("vn-fwd", 26);
  addTrench("vn-north", 18);
  addTrench("vn-south", 18);
  addTrench("vn-far", 12, true);

  const targets: { pos: Vec2; weight: number }[] = [
    { pos: [9, -3], weight: 3 },
    { pos: [13, -9], weight: 3 },
    { pos: [7, 13], weight: 3 },
    { pos: [-2, 1], weight: 2 },
    { pos: [-17, 2], weight: 3 },
    { pos: [-28, -3], weight: 2 },
    { pos: [-37, -8], weight: 2 },
    { pos: [-8, 10], weight: 2 },
  ];
  const totalWeight = targets.reduce((s, t) => s + t.weight, 0);
  const pickTarget = (): Vec2 => {
    let r = rng.next() * totalWeight;
    for (const t of targets) {
      r -= t.weight;
      if (r <= 0) return t.pos;
    }
    return targets[0].pos;
  };

  const vnPlans: SoldierPlan[] = [];
  vnSlots.forEach((slot, index) => {
    const actor = new Actor(nextId++, "vn", slot.pos, Math.atan2(SUMMIT[0] - slot.pos[0], SUMMIT[1] - slot.pos[1]), rng.range(0.96, 1.05));
    const far = slot.far;
    const go = far ? 54 + rng.range(0, 6) : BLAST_TIME + 1.6 + (slot.pos[0] - 25) * 0.012 + rng.range(0, 1.6);
    actor.waitUntil(go, index % 5 === 0 ? "kneel" : "idle");
    const target = pickTarget();
    const speed = rng.range(3.9, 5.0);
    const mid: Vec2 = [
      slot.pos[0] + (target[0] - slot.pos[0]) * 0.58 + rng.range(-5, 5),
      slot.pos[1] + (target[1] - slot.pos[1]) * 0.58 + rng.range(-6, 6),
    ];
    actor.moveTo(mid, speed);
    if (rng.chance(0.3)) actor.stay(rng.range(1, 2.2), "fire", target);
    const arrive: Vec2 = [target[0] + rng.range(-3.5, 3.5), target[1] + rng.range(-3.5, 3.5)];
    actor.moveTo(arrive, speed * 0.85);
    if (rng.chance(0.4)) actor.stay(1.1, "throw", [arrive[0] - 8, arrive[1]]);
    actor.stay(rng.range(4, 9), "fire", [arrive[0] - 30, arrive[1] + rng.range(-10, 10)]);
    if (actor.t < 76 && rng.chance(0.45)) {
      // một số tiếp tục đánh về phía sở chỉ huy địch (phía tây)
      const push: Vec2 = [arrive[0] - rng.range(18, 45), arrive[1] + rng.range(-16, 16)];
      actor.moveTo(push, 3.6);
      actor.stay(rng.range(3, 8), "fire", [push[0] - 40, push[1]]);
    }
    vnPlans.push(actor.finish(DURATION));
  });

  // Vài chiến sĩ hy sinh trên đường xung phong
  const fallIds = new Set<number>();
  while (fallIds.size < 6) fallIds.add(vnPlans[rng.int(0, vnPlans.length - 1)].id);
  const vnFinal = vnPlans.map((plan) => (fallIds.has(plan.id) ? truncateWithFall(plan, rng.range(56, 72)) : plan));

  // Người cắm cờ + hai đồng đội
  const flagPos: Vec2 = [0.9, -0.6];
  const bearer = new Actor(nextId++, "vn", [40, 4], Math.atan2(-1, 0), 1.02);
  bearer.waitUntil(BLAST_TIME + 4);
  bearer.moveTo([12, 0], 4.2);
  bearer.stay(1.5, "fire", [-30, 0]);
  bearer.moveTo([flagPos[0] + 2.4, flagPos[1]], 3.8, "walk");
  bearer.waitUntil(83.5, "idle", flagPos);
  bearer.stay(30, "flag", [flagPos[0] - 4, flagPos[1]]);
  vnFinal.push(bearer.finish(DURATION));
  for (const offset of [[-3, 3.4], [3.6, -3]] as Vec2[]) {
    const mate = new Actor(nextId++, "vn", [30 + offset[0], 6 + offset[1]], Math.atan2(-1, 0));
    mate.waitUntil(BLAST_TIME + 5);
    mate.moveTo([flagPos[0] + offset[0], flagPos[1] + offset[1]], 4, "run");
    mate.stay(40, "idle", flagPos);
    vnFinal.push(mate.finish(DURATION));
  }
  plans.push(...vnFinal);

  // ===== Quân địch =====
  const frPlans: SoldierPlan[] = [];
  const frStations: Vec2[] = [];
  // quanh hầm chỉ huy B1 (nơi đặt bộc phá)
  for (let i = 0; i < 10; i++) {
    const a = rng.range(0, TAU);
    const r = rng.range(2.5, 8);
    frStations.push([MINE[0] + Math.cos(a) * r * 1.4, MINE[1] + Math.sin(a) * r]);
  }
  // dọc chiến hào bao quanh đỉnh (tránh khu vực B1)
  const ringWalk = walkPolyline(FR_RING, 6, rng, 0.4).filter((p) => distance2(p, MINE) > 15);
  for (let i = 0; i < 22 && i < ringWalk.length; i++) frStations.push(ringWalk[Math.floor((i * ringWalk.length) / 22)]);
  // gác quanh các hầm còn lại
  for (const id of ["B2", "B3", "B4"]) {
    const b = props.find((p) => p.id === id)!;
    for (let i = 0; i < 3; i++) frStations.push([b.x + rng.range(-4, 4), b.z + rng.range(-3.5, 3.5)]);
  }

  const retreatPoint = (): Vec2 => [rng.range(-120, -85), rng.range(-45, 45)];
  const decideFate = (actor: Actor, from: number) => {
    const fate = rng.next();
    actor.waitUntil(from, "fire", [40, rng.range(-10, 10)]);
    if (fate < 0.5) {
      actor.moveTo(retreatPoint(), rng.range(3.4, 4.4));
      actor.hide();
    } else if (fate < 0.8) {
      actor.stay(60, "handsup", [30, 0]);
    } else {
      actor.fall();
    }
  };

  frStations.forEach((station, index) => {
    const actor = new Actor(nextId++, "fr", station, Math.atan2(1, 0), rng.range(0.95, 1.05));
    const d = distance2(station, MINE);
    // bắn lẻ tẻ trước giờ nổ
    let cursor = rng.range(3, 14);
    while (cursor < BLAST_TIME - 4 && index % 2 === 0) {
      actor.waitUntil(cursor, "idle", [60, rng.range(-8, 8)]);
      actor.stay(rng.range(1.2, 2.4), "fire", [60, rng.range(-8, 8)]);
      cursor += rng.range(9, 17);
    }
    actor.waitUntil(BLAST_TIME, "idle");
    if (d < 20) {
      actor.hide();
    } else if (d < 36) {
      actor.fall();
    } else {
      actor.stay(rng.range(1.6, 3.2), "kneel");
      decideFate(actor, 60 + rng.range(0, 18));
    }
    frPlans.push(actor.finish(DURATION));
  });

  // Lực lượng phản kích từ phía tây
  for (let i = 0; i < 12; i++) {
    const start: Vec2 = [rng.range(-118, -72), rng.range(-30, 30)];
    const actor = new Actor(nextId++, "fr", start, Math.atan2(1, 0));
    actor.waitUntil(56 + rng.range(0, 5), "idle");
    const goal: Vec2 = [rng.range(-42, -14), rng.range(-16, 16)];
    actor.moveTo(goal, rng.range(3.4, 4.2));
    decideFate(actor, Math.max(actor.t + 1, 64 + rng.range(0, 12)));
    frPlans.push(actor.finish(DURATION));
  }
  plans.push(...frPlans);
  return plans;
}

// ---------- Đạn ----------
function buildShots(plans: SoldierPlan[]): Shot3D[] {
  const rng = createRng(777);
  const shots: Shot3D[] = [];
  const byFaction = { vn: plans.filter((p) => p.faction === "vn"), fr: plans.filter((p) => p.faction === "fr") };

  for (const plan of plans) {
    for (const segment of plan.segments) {
      if (segment.kind !== "fire" || segment.t0 >= DURATION) continue;
      const enemies = plan.faction === "vn" ? byFaction.fr : byFaction.vn;
      let t = segment.t0 + rng.range(0.1, 0.5);
      const end = Math.min(segment.t1, DURATION);
      while (t < end) {
        const burst = rng.int(2, 5);
        for (let k = 0; k < burst && t < end; k++, t += 0.11) {
          const me = soldierPose(plan, t);
          if (!me.visible || isDown(me)) continue;
          // nhắm vào lính đối phương còn đứng ở gần nhất (chọn ngẫu nhiên trong 4 người gần nhất)
          const candidates: { d: number; x: number; z: number }[] = [];
          for (const enemy of enemies) {
            const pose = soldierPose(enemy, t);
            if (!pose.visible || isDown(pose)) continue;
            const d = Math.hypot(pose.x - me.x, pose.z - me.z);
            if (d > 6 && d < 190) candidates.push({ d, x: pose.x, z: pose.z });
          }
          candidates.sort((a, b) => a.d - b.d);
          const pick = candidates.length ? candidates[Math.min(candidates.length - 1, rng.int(0, 3))] : null;
          const height = me.kind === "kneel" ? 1.0 : 1.35;
          let dir: Vec3;
          let range: number;
          if (pick) {
            const dx = pick.x - me.x;
            const dz = pick.z - me.z;
            const length = Math.hypot(dx, dz);
            dir = [dx / length + rng.range(-0.035, 0.035), rng.range(-0.02, 0.03), dz / length + rng.range(-0.035, 0.035)];
            range = length + rng.range(-4, 45);
          } else {
            dir = [Math.sin(me.heading) + rng.range(-0.05, 0.05), rng.range(0, 0.06), Math.cos(me.heading) + rng.range(-0.05, 0.05)];
            range = rng.range(60, 160);
          }
          const norm = Math.hypot(dir[0], dir[1], dir[2]);
          shots.push({
            t,
            faction: plan.faction,
            origin: [me.x + Math.sin(me.heading) * 0.6, height, me.z + Math.cos(me.heading) * 0.6],
            dir: [dir[0] / norm, dir[1] / norm, dir[2] / norm],
            range: Math.min(230, Math.max(20, range)),
          });
        }
        t += rng.range(0.35, 1.1);
      }
    }
  }
  return shots.sort((a, b) => a.t - b.t);
}

// ---------- Hiệu ứng nổ, cháy, pháo sáng ----------
function buildEmitters(): Emitter[] {
  const rng = createRng(9001);
  const emitters: Emitter[] = [{ id: "blast", kind: "blast", t0: BLAST_TIME, x: MINE[0], z: MINE[1], scale: 1, seed: 1 }];

  // pháo ta bắn yểm trợ sau khi bộc phá nổ
  for (let i = 0; i < 24; i++) {
    const t0 = 50.3 + (i / 24) * 29 + rng.range(-0.4, 0.4);
    emitters.push({ id: `shell-${i}`, kind: "shell", t0, x: rng.range(-75, -12), z: rng.range(-34, 34), scale: rng.range(0.35, 0.65), seed: 100 + i });
  }
  // lựu đạn, thủ pháo gần các hầm
  for (let i = 0; i < 16; i++) {
    const t0 = 57 + (i / 16) * 24 + rng.range(-0.5, 0.5);
    const nearB = ["B2", "B3", "B4"][i % 3];
    const bunker = props.find((p) => p.id === nearB)!;
    emitters.push({ id: `grenade-${i}`, kind: "grenade", t0, x: bunker.x + rng.range(-9, 9), z: bunker.z + rng.range(-8, 8), scale: rng.range(0.16, 0.28), seed: 300 + i });
  }
  // pháo nổ xa phía tây trước giờ G (chỉ có chớp sáng và tiếng ì ầm)
  for (const [i, t0] of [4, 12.5, 19, 27.5, 33, 38.5, 43].entries()) {
    emitters.push({ id: `far-${i}`, kind: "shell", t0, x: rng.range(-420, -260), z: rng.range(-160, 160), scale: 0.9, seed: 500 + i, distant: true });
  }
  // đám cháy sau vụ nổ
  emitters.push(
    { id: "fire-b1a", kind: "fire", t0: 49.5, x: MINE[0], z: MINE[1], scale: 1.3, seed: 11 },
    { id: "fire-b1b", kind: "fire", t0: 50.5, x: MINE[0] + 6, z: MINE[1] + 5, scale: 0.9, seed: 12 },
    { id: "fire-b1c", kind: "fire", t0: 51, x: MINE[0] - 7, z: MINE[1] - 4, scale: 1, seed: 13 },
    { id: "fire-b3", kind: "fire", t0: 64, x: 7, z: 15, scale: 0.7, seed: 14 },
    { id: "fire-b2", kind: "fire", t0: 71, x: 13, z: -11, scale: 0.6, seed: 15 },
  );
  return emitters.sort((a, b) => a.t0 - b.t0);
}

function buildFlares(): Flare[] {
  const rng = createRng(31337);
  return [1.5, 9, 17.5, 26, 34, 41, 45.5, 52, 60, 68, 76].map((t, i) => ({
    t,
    x: rng.range(-140, -55),
    z: rng.range(-70, 70),
    drift: [rng.range(-1.2, 0.6), rng.range(-1, 1)] as Vec2,
    seed: i + 1,
  }));
}

// ---------- Máy quay ----------
const shots: Shot[] = [
  { id: "toan-canh", t0: 0, t1: 12, path: [[650, 230, 380], [480, 160, 270], [360, 120, 200]], look: [[0, 12, 0], [-30, 14, 0], [-60, 14, 0]], fov: [42, 36], ease: "inOut", shake: 0.05 },
  { id: "ha-thap", t0: 12, t1: 24, path: [[360, 120, 200], [250, 70, 150], [150, 34, 90]], look: [[0, 16, 0], [0, 18, 0], [-10, 20, 0]], fov: [36, 40], ease: "inOut", shake: 0.08, agl: true },
  { id: "duong-ham", t0: 24, t1: 36, path: [[-6, 66, 92], [2, 56, 78], [12, 48, 66]], look: [[2, 27, 4], [0, 27, 4], [-4, 27, 4]], fov: [42, 46], ease: "inOut", shake: 0.05 },
  { id: "cho-doi", t0: 36, t1: 47, path: [[112, 1.75, 12], [90, 1.7, 9]], look: [[34, 6, 4], [28, 8, 4]], fov: [34, 30], ease: "linear", shake: 0.05, agl: true },
  { id: "bung-no", t0: 47, t1: 53.5, path: [[150, 34, 76], [146, 32, 72]], look: [[-18, 22, 4], [-16, 26, 4]], fov: [42, 34], ease: "out", shake: 0.03, agl: true },
  { id: "bay-thap", t0: 53.5, t1: 58.5, path: [[130, 30, 64], [92, 22, 38]], look: [[-16, 26, 4], [-12, 20, 4]], fov: [46, 46], ease: "inOut", shake: 0.14, agl: true },
  { id: "xung-phong", t0: 58.5, t1: 68, path: [[104, 2.4, 6], [70, 3.4, 6], [40, 4, 3]], look: [[26, 3.5, 2], [6, 5, 0], [-6, 6, 0]], fov: [48, 44], ease: "inOut", shake: 0.24, agl: true },
  { id: "ben-suon", t0: 68, t1: 76, path: [[12, 3.4, 42], [0, 3.2, 32], [-10, 3.6, 26]], look: [[4, 2.8, 8], [-8, 2.4, 4], [-18, 3, 4]], fov: [42, 40], ease: "inOut", shake: 0.2, agl: true },
  { id: "can-chien", t0: 76, t1: 86, path: [[30, 8, 20], [14, 9, 18], [0, 9, 14]], look: [[0, 3, 0], [-8, 3, 2], [-16, 3, 2]], fov: [50, 46], ease: "inOut", shake: 0.16, agl: true },
  { id: "ray-sang", t0: 86, t1: 98, path: [[60, 9, 40], [82, 22, 68], [120, 46, 106]], look: [[0, 30, 0], [0, 32, 0], [0, 32, 0]], fov: [40, 38], ease: "inOut", shake: 0.04, agl: true },
  { id: "khep-phim", t0: 98, t1: 110, path: [[120, 46, 106], [190, 76, 150]], look: [[0, 28, 0], [-60, 20, 0]], fov: [38, 34], ease: "inOut", shake: 0.03, agl: true },
];

function build(): FilmScript {
  const soldiers = buildSoldiers();
  return {
    id: "doi-a1-1954",
    title: "Đồi A1, đêm 6/5/1954",
    duration: DURATION,
    blastTime: BLAST_TIME,
    blast: { x: MINE[0], z: MINE[1] },
    dawn: [84, 106],
    shots,
    subtitles,
    chapters,
    labels,
    emitters: buildEmitters(),
    flares: buildFlares(),
    soldiers,
    shots3d: buildShots(soldiers),
    props,
    wires,
    terrain: { hill: { cx: 0, cz: 0, angleDeg: 25, halfLong: 125, halfShort: 70, height: 30, plateau: 0.3 }, trenches, craters: buildCraters() },
    tunnel: { from: [25, 4], to: MINE, depth: 3.2, visibleFrom: 24, visibleTo: 36 },
    flag: { x: 0.9, z: -0.6, raiseFrom: 86.5, raiseTo: 92 },
    farLights: (() => {
      const rng = createRng(55);
      return Array.from({ length: 34 }, () => [-551 + rng.range(-70, 70), -200 + rng.range(-55, 55)] as Vec2);
    })(),
  };
}

export const filmA1: FilmScript = build();
