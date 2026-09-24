import type { Vec2 } from "@/lib/cinema/math";
import type { Faction, Segment, SegmentKind, SoldierPlan, SoldierPose } from "@/lib/cinema/types";

/** Thời gian (s) từ lúc trúng đạn/bị hất ngã đến khi nằm hẳn xuống. */
export const FALL_DURATION = 0.9;

const odometerCache = new WeakMap<SoldierPlan, number[]>();

function odometerTable(plan: SoldierPlan): number[] {
  const cached = odometerCache.get(plan);
  if (cached) return cached;
  const table: number[] = [];
  let total = 0;
  for (const segment of plan.segments) {
    table.push(total);
    if (segment.kind === "run" || segment.kind === "walk") total += Math.hypot(segment.to[0] - segment.from[0], segment.to[1] - segment.from[1]);
  }
  odometerCache.set(plan, table);
  return table;
}

/** Chỉ số đoạn đang diễn ra ở thời điểm t (tìm nhị phân); trước đoạn đầu → 0, sau đoạn cuối → đoạn cuối. */
export function segmentIndexAt(segments: Segment[], t: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segments[mid].t0 <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Trạng thái của một người lính ở thời điểm t — hàm thuần, tất định. */
export function soldierPose(plan: SoldierPlan, t: number): SoldierPose {
  const segments = plan.segments;
  const index = segmentIndexAt(segments, t);
  const segment = segments[index];
  const table = odometerTable(plan);
  const duration = Math.max(1e-6, segment.t1 - segment.t0);
  const raw = (t - segment.t0) / duration;
  const moving = segment.kind === "run" || segment.kind === "walk";
  const u = moving ? Math.min(1, Math.max(0, raw)) : 0;
  const length = Math.hypot(segment.to[0] - segment.from[0], segment.to[1] - segment.from[1]);
  return {
    visible: segment.kind !== "hidden",
    x: segment.from[0] + (segment.to[0] - segment.from[0]) * u,
    z: segment.from[1] + (segment.to[1] - segment.from[1]) * u,
    heading: segment.heading ?? 0,
    kind: segment.kind,
    since: Math.max(0, t - segment.t0),
    speed: moving ? length / duration : 0,
    odometer: table[index] + (moving ? length * u : 0),
  };
}

/** Người lính đã ngã xuống (hoặc bị loại) tại thời điểm t? Dùng để không nhắm bắn vào người đã ngã. */
export const isDown = (pose: SoldierPose) => pose.kind === "fall" && pose.since > 0.2;

/**
 * Trình dựng kịch bản cho một người lính: nối các đoạn hành động liên tiếp (đứng chờ, chạy, bắn, ngã…).
 * Con trỏ thời gian `t` và vị trí `pos` luôn ở cuối đoạn vừa thêm.
 */
export class Actor {
  readonly plan: SoldierPlan;
  t = 0;
  pos: Vec2;
  heading: number;

  constructor(id: number, faction: Faction, start: Vec2, heading: number, scale = 1) {
    this.plan = { id, faction, scale, segments: [] };
    this.pos = [start[0], start[1]];
    this.heading = heading;
  }

  private push(kind: SegmentKind, duration: number, to: Vec2 = this.pos, heading = this.heading) {
    if (duration <= 0) return this;
    this.plan.segments.push({ t0: this.t, t1: this.t + duration, kind, from: [this.pos[0], this.pos[1]], to: [to[0], to[1]], heading });
    this.t += duration;
    this.pos = [to[0], to[1]];
    this.heading = heading;
    return this;
  }

  /** Hướng (rad) nhìn từ vị trí hiện tại tới `target`. */
  headingTo(target: Vec2): number {
    return Math.atan2(target[0] - this.pos[0], target[1] - this.pos[1]);
  }

  /** Giữ nguyên tại chỗ tới thời điểm `until` (không làm gì nếu đã qua). */
  waitUntil(until: number, kind: SegmentKind = "idle", facing?: Vec2) {
    return this.push(kind, until - this.t, this.pos, facing ? this.headingTo(facing) : this.heading);
  }

  stay(duration: number, kind: SegmentKind = "idle", facing?: Vec2) {
    return this.push(kind, duration, this.pos, facing ? this.headingTo(facing) : this.heading);
  }

  moveTo(target: Vec2, speed: number, kind: "run" | "walk" = "run") {
    const distance = Math.hypot(target[0] - this.pos[0], target[1] - this.pos[1]);
    if (distance < 0.05) return this;
    return this.push(kind, distance / speed, target, this.headingTo(target));
  }

  turnTo(target: Vec2) {
    this.heading = this.headingTo(target);
    return this;
  }

  fall() {
    return this.push("fall", 1e5);
  }

  hide() {
    return this.push("hidden", 1e5);
  }

  finish(duration: number): SoldierPlan {
    if (this.plan.segments.length === 0) this.push("idle", duration);
    const last = this.plan.segments[this.plan.segments.length - 1];
    if (last.t1 < duration) {
      // kéo dài trạng thái cuối tới hết phim
      if (last.kind === "run" || last.kind === "walk") this.push("idle", duration - last.t1 + 1);
      else last.t1 = duration + 1;
    }
    return this.plan;
  }
}

/** Cắt kế hoạch tại tf: vị trí lúc đó trở thành chỗ ngã, mọi đoạn sau bị bỏ. */
export function truncateWithFall(plan: SoldierPlan, tf: number): SoldierPlan {
  const pose = soldierPose(plan, tf);
  const index = segmentIndexAt(plan.segments, tf);
  const kept = plan.segments.slice(0, index);
  const current = plan.segments[index];
  if (current && current.t0 < tf) {
    kept.push({ ...current, t1: tf, to: current.kind === "run" || current.kind === "walk" ? [pose.x, pose.z] : current.to });
  }
  kept.push({ t0: tf, t1: 1e5, kind: "fall", from: [pose.x, pose.z], to: [pose.x, pose.z], heading: pose.heading });
  odometerCache.delete(plan);
  return { ...plan, segments: kept };
}
