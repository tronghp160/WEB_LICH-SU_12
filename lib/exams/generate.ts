// Sinh đề theo ma trận (docs/ke-hoach-luyen-thi.md, mục 4.4) — hàm thuần, có seed (cùng seed + cùng ngân hàng → cùng đề)
// để unit test. Server gọi với danh sách câu ĐÃ CÔNG BỐ (chỉ thông tin phân loại, không có nội dung câu hỏi).
//
// Luật chọn (ưu tiên giảm dần — không đủ câu thì nới dần, ghi chú lại):
//   1. Tránh câu người học đã làm trong 14 ngày (khi đủ câu).
//   2. Phân bố theo bài tỉ lệ số tiết; tỉ lệ mức độ theo ma trận.
//   3. Không quá 2 câu cùng một sự kiện; Phần I không có 2 câu cùng một đoạn tư liệu.
//   4. Phần Đúng/Sai: ít nhất `minWithPassage` câu có tư liệu (khi ngân hàng có).
//   Đáp án đúng các câu trắc nghiệm rải đều A/B/C/D bằng độ xoay (chọn ngẫu nhiên trong số chữ đang ít nhất).

import { balancedShift, displayedCorrect } from "@/lib/exams/compose";
import { lessonOrder, lessonWeights, type Blueprint, type BlueprintSection } from "@/lib/exams/blueprint";
import { EXAM_ITEM_LEVELS, type ExamItemKind, type ExamItemLevel } from "@/lib/exams/items";

export type PoolItem = {
  id: string;
  kind: ExamItemKind;
  lessonSlug: string | null;
  level: ExamItemLevel;
  passageId: string | null;
  eventId: string | null;
  /** Đáp án gốc (trắc nghiệm) — để rải đáp án. */
  correctIndex: number | null;
};

export type GeneratedItem = { itemId: string; section: 1 | 2; shift: number };
export type GeneratedExam = { items: GeneratedItem[]; notes: string[] };

/** Bộ sinh số giả ngẫu nhiên mulberry32: cùng seed → cùng dãy (0 ≤ x < 1). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/** Chia `count` theo trọng số (phần dư lớn nhất), chỉ cho các khóa có trong `weights`. */
export function apportion(count: number, weights: ReadonlyMap<string, number>): Map<string, number> {
  const entries = [...weights].filter(([, weight]) => weight > 0);
  const sum = entries.reduce((total, [, weight]) => total + weight, 0);
  const result = new Map<string, number>();
  if (sum === 0) return result;
  const raw = entries.map(([key, weight]) => ({ key, exact: (count * weight) / sum }));
  let given = 0;
  for (const { key, exact } of raw) {
    result.set(key, Math.floor(exact));
    given += Math.floor(exact);
  }
  for (const { key } of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.key.localeCompare(b.key)).slice(0, count - given)) {
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}

type Limits = { lesson: boolean; level: boolean; recent: boolean };

function pickSection(
  spec: BlueprintSection,
  pool: readonly PoolItem[],
  blueprint: Blueprint,
  recent: ReadonlySet<string>,
  taken: Set<string>,
  eventCount: Map<string, number>,
  random: () => number,
  notes: string[],
): PoolItem[] | null {
  const candidates = shuffle(
    pool.filter((item) => item.kind === spec.kind && !taken.has(item.id) && (!blueprint.lessons || (item.lessonSlug !== null && blueprint.lessons.includes(item.lessonSlug)))),
    random,
  );
  if (candidates.length < spec.count) return null;

  // Bài có câu trong ngân hàng mới được chia phần — bài trống thì phần của nó dồn cho bài khác.
  const available = new Map([...lessonWeights(blueprint)].filter(([slug]) => candidates.some((item) => item.lessonSlug === slug)));
  const lessonQuota = apportion(spec.count, available);
  const levelQuota = apportion(spec.count, new Map(EXAM_ITEM_LEVELS.map((level) => [level, blueprint.levelMix[level]])));
  const chosen: PoolItem[] = [];
  const passagesUsed = new Set<string>();
  const lessonUsed = new Map<string, number>();
  const levelUsed = new Map<string, number>();
  const needPassage = Math.min(spec.minWithPassage ?? 0, candidates.filter((item) => item.passageId).length);

  const fits = (item: PoolItem, limits: Limits) => {
    if (taken.has(item.id)) return false;
    if (limits.recent && recent.has(item.id)) return false;
    if (item.eventId && (eventCount.get(item.eventId) ?? 0) >= 2) return false;
    if (spec.section === 1 && item.passageId && passagesUsed.has(item.passageId)) return false;
    if (limits.lesson && item.lessonSlug && (lessonUsed.get(item.lessonSlug) ?? 0) >= (lessonQuota.get(item.lessonSlug) ?? 0)) return false;
    if (limits.lesson && !item.lessonSlug && lessonQuota.size > 0) return false;
    if (limits.level && (levelUsed.get(item.level) ?? 0) >= (levelQuota.get(item.level) ?? 0)) return false;
    return true;
  };
  const take = (item: PoolItem) => {
    chosen.push(item);
    taken.add(item.id);
    if (item.eventId) eventCount.set(item.eventId, (eventCount.get(item.eventId) ?? 0) + 1);
    if (item.passageId) passagesUsed.add(item.passageId);
    if (item.lessonSlug) lessonUsed.set(item.lessonSlug, (lessonUsed.get(item.lessonSlug) ?? 0) + 1);
    levelUsed.set(item.level, (levelUsed.get(item.level) ?? 0) + 1);
  };

  // Từ chặt tới lỏng: lần nới nào phải dùng thì ghi chú.
  const passes: { limits: Limits; note: string | null }[] = [
    { limits: { lesson: true, level: true, recent: true }, note: null },
    { limits: { lesson: true, level: false, recent: true }, note: "Một số bài thiếu câu đúng mức độ — lấy câu cùng bài khác mức độ." },
    { limits: { lesson: false, level: false, recent: true }, note: "Một số bài thiếu câu — lấy câu ở bài khác." },
    { limits: { lesson: false, level: false, recent: false }, note: "Ngân hàng chưa đủ câu mới — có câu em đã làm trong 14 ngày qua." },
  ];
  // Câu Đúng/Sai có tư liệu được chọn trước cho đủ số tối thiểu.
  if (needPassage > 0) {
    for (const pass of passes) {
      for (const item of candidates) if (item.passageId && chosen.filter((picked) => picked.passageId).length < needPassage && fits(item, pass.limits)) take(item);
      if (chosen.filter((picked) => picked.passageId).length >= needPassage) break;
    }
  }
  for (const pass of passes) {
    const before = chosen.length;
    for (const item of candidates) if (chosen.length < spec.count && fits(item, pass.limits)) take(item);
    if (pass.note && chosen.length > before && !notes.includes(pass.note)) notes.push(pass.note);
    if (chosen.length === spec.count) break;
  }
  return chosen.length === spec.count ? chosen : null;
}

/**
 * Sinh một đề theo ma trận; ngân hàng không đủ câu cho ma trận → null. Câu xếp theo tiến trình bài học trong từng phần.
 */
export function generateExam(pool: readonly PoolItem[], blueprint: Blueprint, options: { seed: number; recent?: ReadonlySet<string> }): GeneratedExam | null {
  const random = seededRandom(options.seed);
  const taken = new Set<string>();
  const eventCount = new Map<string, number>();
  const notes: string[] = [];
  const items: GeneratedItem[] = [];
  const letters = [0, 0, 0, 0];
  for (const spec of blueprint.sections) {
    const picked = pickSection(spec, pool, blueprint, options.recent ?? new Set(), taken, eventCount, random, notes);
    if (!picked) return null;
    picked.sort((a, b) => (lessonOrder.get(a.lessonSlug ?? "") ?? 99) - (lessonOrder.get(b.lessonSlug ?? "") ?? 99) || EXAM_ITEM_LEVELS.indexOf(a.level) - EXAM_ITEM_LEVELS.indexOf(b.level));
    for (const item of picked) {
      let shift = 0;
      if (item.kind === "mcq" && item.correctIndex !== null) {
        shift = balancedShift(letters, item.correctIndex, random);
        letters[displayedCorrect(item.correctIndex, shift)] += 1;
      }
      items.push({ itemId: item.id, section: spec.section, shift });
    }
  }
  return { items, notes };
}

/**
 * Ngân hàng có đủ câu cho ít nhất `times` đề KHÔNG TRÙNG câu của ma trận này không (mục 4.4 — chỉ hiện mục đề tự sinh
 * khi đủ, tránh hứa suông).
 */
export function canGenerate(pool: readonly PoolItem[], blueprint: Blueprint, times = 3): boolean {
  const inScope = pool.filter((item) => !blueprint.lessons || (item.lessonSlug !== null && blueprint.lessons.includes(item.lessonSlug)));
  return blueprint.sections.every((spec) => inScope.filter((item) => item.kind === spec.kind).length >= spec.count * times);
}
