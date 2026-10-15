import { describe, expect, it } from "vitest";
import { BLUEPRINTS, blueprintSize, getBlueprint, lessonWeights } from "@/lib/exams/blueprint";
import { displayedCorrect } from "@/lib/exams/compose";
import { apportion, canGenerate, generateExam, seededRandom, type PoolItem } from "@/lib/exams/generate";
import { EXAM_ITEM_LEVELS } from "@/lib/exams/items";
import { SGK_12 } from "@/lib/sgk/curriculum";

const lessons = SGK_12.flatMap((topic) => topic.lessons.map((lesson) => lesson.slug));

/** Ngân hàng giả: mỗi bài `perLesson` câu trắc nghiệm + `tfPerLesson` câu Đúng/Sai, mức độ xoay vòng. */
function makePool(perLesson: number, tfPerLesson: number, extra: Partial<PoolItem> = {}): PoolItem[] {
  const pool: PoolItem[] = [];
  lessons.forEach((slug, lessonIndex) => {
    for (let index = 0; index < perLesson; index++) {
      pool.push({ id: `m-${lessonIndex}-${index}`, kind: "mcq", lessonSlug: slug, level: EXAM_ITEM_LEVELS[index % 3], passageId: null, eventId: null, correctIndex: index % 2, ...extra });
    }
    for (let index = 0; index < tfPerLesson; index++) {
      pool.push({ id: `t-${lessonIndex}-${index}`, kind: "true_false", lessonSlug: slug, level: EXAM_ITEM_LEVELS[index % 3], passageId: index % 2 ? `p-${lessonIndex}-${index}` : null, eventId: null, correctIndex: null, ...extra });
    }
  });
  return pool;
}

const thpt = getBlueprint("thpt_2025")!;

describe("ma trận đề", () => {
  it("có đề đầy đủ 24 + 4 / 50 phút, đề 15 phút, chỉ Đúng/Sai và một ma trận cho mỗi chủ đề", () => {
    expect(blueprintSize(thpt)).toBe(28);
    expect(thpt.durationMin).toBe(50);
    expect(getBlueprint("quick_15")?.durationMin).toBe(15);
    expect(getBlueprint("tf_only")?.sections).toEqual([{ section: 2, kind: "true_false", count: 8, minWithPassage: 3 }]);
    for (const topic of SGK_12) expect(getBlueprint(topic.slug)?.lessons).toEqual(topic.lessons.map((lesson) => lesson.slug));
    expect(getBlueprint("khong-co")).toBeNull();
  });

  it("mã ma trận khớp ràng buộc check của cột exam_attempts.blueprint", () => {
    for (const blueprint of BLUEPRINTS) expect(blueprint.id).toMatch(/^(thpt_2025|quick_15|tf_only|chu-de-[0-9]{1,2})$/);
  });

  it("tỉ lệ mức độ cộng lại bằng 1", () => {
    for (const blueprint of BLUEPRINTS) expect(Object.values(blueprint.levelMix).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it("trọng số bài = số tiết, chỉ các bài trong chủ đề", () => {
    const topic = SGK_12[0];
    const weights = lessonWeights(getBlueprint(topic.slug)!);
    expect([...weights.keys()]).toEqual(topic.lessons.map((lesson) => lesson.slug));
    expect(weights.get(topic.lessons[0].slug)).toBe(topic.lessons[0].periods);
    expect(lessonWeights(thpt).size).toBe(lessons.length);
  });
});

describe("apportion", () => {
  it("chia đúng tổng theo phần dư lớn nhất", () => {
    const result = apportion(10, new Map([["a", 1], ["b", 1], ["c", 1]]));
    expect([...result.values()].reduce((sum, value) => sum + value, 0)).toBe(10);
    expect(result.get("a")).toBe(4);
    expect(apportion(5, new Map([["a", 0]])).size).toBe(0);
  });
});

describe("generateExam", () => {
  const pool = makePool(8, 2);

  it("đủ số câu từng phần, không trùng câu, đúng phần", () => {
    const exam = generateExam(pool, thpt, { seed: 1 })!;
    expect(exam.items).toHaveLength(28);
    expect(new Set(exam.items.map((item) => item.itemId)).size).toBe(28);
    expect(exam.items.filter((item) => item.section === 1)).toHaveLength(24);
    const byId = new Map(pool.map((item) => [item.id, item]));
    for (const item of exam.items) expect(byId.get(item.itemId)?.kind).toBe(item.section === 1 ? "mcq" : "true_false");
    expect(exam.notes).toEqual([]);
  });

  it("cùng seed → cùng đề; khác seed → khác đề", () => {
    expect(generateExam(pool, thpt, { seed: 7 })).toEqual(generateExam(pool, thpt, { seed: 7 }));
    expect(generateExam(pool, thpt, { seed: 7 })!.items).not.toEqual(generateExam(pool, thpt, { seed: 8 })!.items);
  });

  it("rải đáp án đúng đều A/B/C/D (24 câu → 6 mỗi chữ), câu Đúng/Sai không xoay", () => {
    const exam = generateExam(pool, thpt, { seed: 3 })!;
    const byId = new Map(pool.map((item) => [item.id, item]));
    const counts = [0, 0, 0, 0];
    for (const item of exam.items) {
      const source = byId.get(item.itemId)!;
      if (source.kind === "mcq") counts[displayedCorrect(source.correctIndex!, item.shift)] += 1;
      else expect(item.shift).toBe(0);
    }
    expect(counts).toEqual([6, 6, 6, 6]);
  });

  it("phân bố mức độ theo ma trận khi ngân hàng đủ", () => {
    const exam = generateExam(pool, thpt, { seed: 5 })!;
    const byId = new Map(pool.map((item) => [item.id, item]));
    const mcqLevels = exam.items.filter((item) => item.section === 1).map((item) => byId.get(item.itemId)!.level);
    const count = (level: string) => mcqLevels.filter((value) => value === level).length;
    expect(count("nhan_biet")).toBeGreaterThanOrEqual(9);
    expect(count("nhan_biet")).toBeLessThanOrEqual(10);
    expect(count("thong_hieu") + count("van_dung")).toBeGreaterThanOrEqual(14);
  });

  it("đề chủ đề chỉ có câu trong chủ đề", () => {
    const topic = SGK_12[2];
    const exam = generateExam(pool, getBlueprint(topic.slug)!, { seed: 2 });
    const allowed = new Set(topic.lessons.map((lesson) => lesson.slug));
    const byId = new Map(pool.map((item) => [item.id, item]));
    if (exam) for (const item of exam.items) expect(allowed.has(byId.get(item.itemId)!.lessonSlug!)).toBe(true);
  });

  it("tránh câu làm gần đây khi đủ câu; thiếu thì vẫn dùng và ghi chú", () => {
    const recent = new Set(pool.filter((item) => item.kind === "mcq" && Number(item.id.split("-")[2]) < 4).map((item) => item.id));
    const exam = generateExam(pool, thpt, { seed: 4, recent })!;
    expect(exam.items.some((item) => recent.has(item.itemId))).toBe(false);

    const small = makePool(2, 1);
    const allRecent = new Set(small.map((item) => item.id));
    const fallback = generateExam(small, getBlueprint("quick_15")!, { seed: 4, recent: allRecent })!;
    expect(fallback.items).toHaveLength(11);
    expect(fallback.notes.some((note) => note.includes("14 ngày"))).toBe(true);
  });

  it("không quá 2 câu cùng một sự kiện", () => {
    const eventPool = makePool(8, 2).map((item, index) => ({ ...item, eventId: `e-${index % 30}` }));
    const exam = generateExam(eventPool, thpt, { seed: 9 })!;
    const byId = new Map(eventPool.map((item) => [item.id, item]));
    const perEvent = new Map<string, number>();
    for (const item of exam.items) {
      const event = byId.get(item.itemId)!.eventId!;
      perEvent.set(event, (perEvent.get(event) ?? 0) + 1);
    }
    expect(Math.max(...perEvent.values())).toBeLessThanOrEqual(2);
  });

  it("Phần I không có 2 câu cùng tư liệu; Phần II đủ câu có tư liệu tối thiểu", () => {
    // Mọi câu trắc nghiệm đều gắn 1 trong 30 đoạn tư liệu → mỗi đoạn chỉ 1 câu trong Phần I.
    const passagePool = makePool(8, 2).map((item, index) => (item.kind === "mcq" ? { ...item, passageId: `p-${index % 30}` } : item));
    const exam = generateExam(passagePool, thpt, { seed: 11 })!;
    const byId = new Map(passagePool.map((item) => [item.id, item]));
    const partOne = exam.items.filter((item) => item.section === 1).map((item) => byId.get(item.itemId)!.passageId);
    expect(new Set(partOne).size).toBe(24);
    // Chỉ 10 đoạn cho 24 câu → không sinh được.
    const tooFew = makePool(8, 2).map((item, index) => (item.kind === "mcq" ? { ...item, passageId: `p-${index % 10}` } : item));
    expect(generateExam(tooFew, thpt, { seed: 11 })).toBeNull();

    const tf = generateExam(pool, thpt, { seed: 12 })!;
    const poolById = new Map(pool.map((item) => [item.id, item]));
    const withPassage = tf.items.filter((item) => item.section === 2 && poolById.get(item.itemId)?.passageId).length;
    expect(withPassage).toBeGreaterThanOrEqual(2);
  });

  it("ngân hàng thiếu câu → null", () => {
    expect(generateExam(makePool(1, 0), thpt, { seed: 1 })).toBeNull();
    expect(generateExam([], getBlueprint("quick_15")!, { seed: 1 })).toBeNull();
  });
});

describe("canGenerate", () => {
  it("cần đủ câu cho 3 đề không trùng", () => {
    expect(canGenerate(makePool(8, 2), thpt)).toBe(true);
    expect(canGenerate(makePool(4, 0), thpt)).toBe(false);
    expect(canGenerate([], getBlueprint("quick_15")!)).toBe(false);
  });
});

describe("seededRandom", () => {
  it("lặp lại theo seed, trong [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let index = 0; index < 20; index++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
