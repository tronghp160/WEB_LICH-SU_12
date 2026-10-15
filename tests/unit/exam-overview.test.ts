import { describe, expect, it } from "vitest";
import { lessonMastery, masteryLevel, nextSteps, predictedScore, studyStreak, type AttemptSummary } from "@/lib/exams/next-step";
import { buildStudyPlan, completedTasks, currentPlanWeek, fullExamsInWeek, lessonPriority, parseStudyPlan, planWeeks } from "@/lib/exams/study-plan";
import { sgkLessons } from "@/lib/sgk/curriculum";

let counter = 0;
function attempt(partial: Partial<AttemptSummary>): AttemptSummary {
  counter += 1;
  return {
    id: `a${counter}`,
    kind: "full",
    title: "Đề",
    status: "submitted",
    score10: 7,
    startedAt: "2026-10-10T01:00:00Z",
    submittedAt: "2026-10-10T02:00:00Z",
    lessons: {},
    resumeHref: null,
    ...partial,
  };
}
const L1 = sgkLessons[0].slug;
const L2 = sgkLessons[1].slug;

describe("predictedScore", () => {
  it("cần ít nhất 2 đề đầy đủ đã nộp", () => {
    expect(predictedScore([attempt({ score10: 8 })])).toBeNull();
    expect(predictedScore([attempt({ score10: 8 }), attempt({ kind: "exam", score10: 9 })])).toBeNull();
  });

  it("trọng số 0,5 / 0,3 / 0,2 theo lượt mới nhất; chỉ 3 lượt gần nhất", () => {
    const result = predictedScore([
      attempt({ score10: 4, submittedAt: "2026-10-01T00:00:00Z" }),
      attempt({ score10: 8, submittedAt: "2026-10-04T00:00:00Z" }),
      attempt({ score10: 6, submittedAt: "2026-10-03T00:00:00Z" }),
      attempt({ score10: 5, submittedAt: "2026-10-02T00:00:00Z" }),
    ]);
    // 8×0,5 + 6×0,3 + 5×0,2 = 6,8
    expect(result).toEqual({ score: 6.8, basedOn: 3 });
  });

  it("2 lượt: chia lại trọng số 0,5 / 0,3; làm tròn 0,05", () => {
    const result = predictedScore([attempt({ score10: 7, submittedAt: "2026-10-02T00:00:00Z" }), attempt({ score10: 6, submittedAt: "2026-10-01T00:00:00Z" })]);
    // (7×0,5 + 6×0,3) / 0,8 = 6,625 → 6,65
    expect(result).toEqual({ score: 6.65, basedOn: 2 });
  });

  it("bỏ lượt chưa nộp", () => {
    expect(predictedScore([attempt({ status: "in_progress", score10: null }), attempt({ score10: 7 })])).toBeNull();
  });
});

describe("lessonMastery", () => {
  it("cộng điểm theo bài qua các lượt đã nộp, 17 bài theo thứ tự SGK", () => {
    const map = lessonMastery([
      attempt({ lessons: { [L1]: { earned: 3000, max: 4000, n: 12 } } }),
      attempt({ kind: "practice", lessons: { [L1]: { earned: 2000, max: 2000, n: 8 }, [L2]: { earned: 0, max: 1000, n: 4 } } }),
      attempt({ status: "in_progress", lessons: { [L2]: { earned: 9000, max: 9000, n: 30 } } }),
    ]);
    expect(map).toHaveLength(17);
    expect(map[0]).toMatchObject({ slug: L1, n: 20, ratio: 5000 / 6000, level: "vung" });
    expect(map[1]).toMatchObject({ slug: L2, n: 4, ratio: 0, level: "chua-du" });
    expect(map[2]).toMatchObject({ n: 0, ratio: null, level: "chua-du" });
  });

  it("ngưỡng mức thành thạo", () => {
    expect(masteryLevel(0.9, 19)).toBe("chua-du");
    expect(masteryLevel(0.8, 20)).toBe("vung");
    expect(masteryLevel(0.5, 20)).toBe("kha");
    expect(masteryLevel(0.49, 20)).toBe("yeu");
  });
});

describe("studyStreak", () => {
  const now = new Date("2026-10-15T05:00:00Z"); // 12 giờ trưa 15/10 giờ Việt Nam
  it("đếm ngày liên tiếp theo giờ Việt Nam tới hôm nay", () => {
    expect(studyStreak(["2026-10-15T01:00:00Z", "2026-10-14T16:30:00Z", "2026-10-13T03:00:00Z"], now)).toBe(3);
  });
  it("hôm nay chưa học thì tính tới hôm qua; đứt quãng thì dừng", () => {
    expect(studyStreak(["2026-10-14T03:00:00Z", "2026-10-13T03:00:00Z", "2026-10-11T03:00:00Z"], now)).toBe(2);
    expect(studyStreak(["2026-10-12T03:00:00Z"], now)).toBe(0);
    expect(studyStreak([], now)).toBe(0);
  });
});

describe("nextSteps", () => {
  const now = new Date("2026-10-15T05:00:00Z");
  it("ưu tiên làm tiếp bài dở, rồi ôn đến hạn, tối đa 3 việc", () => {
    const open = attempt({ status: "in_progress", score10: null, submittedAt: null, resumeHref: "/luyen-thi/de-1", title: "Đề 1" });
    const steps = nextSteps({ attempts: [open], mastery: lessonMastery([]), notebookDue: 4, now });
    expect(steps.map((step) => step.key)).toEqual(["resume", "review", "new"]);
    expect(steps[0].href).toBe("/luyen-thi/de-1");
    expect(steps[1].label).toContain("4 câu");
  });

  it("bài yếu (đủ dữ liệu, < 65%) dẫn tới luyện tập bài đó", () => {
    const attempts = [attempt({ lessons: { [L2]: { earned: 500, max: 2000, n: 20 } }, submittedAt: "2026-10-14T00:00:00Z" })];
    const steps = nextSteps({ attempts, mastery: lessonMastery(attempts), notebookDue: 0, now });
    expect(steps[0]).toMatchObject({ key: "weak", href: `/luyen-thi/luyen-tap?bai=${L2}` });
  });

  it("7 ngày chưa làm đề đầy đủ thì gợi ý làm đề", () => {
    const allTouched = sgkLessons.map((lesson) => ({ ...lesson }));
    const mastery = lessonMastery([attempt({ lessons: Object.fromEntries(allTouched.map((lesson) => [lesson.slug, { earned: 900, max: 1000, n: 30 }])), submittedAt: "2026-10-01T00:00:00Z" })]);
    expect(nextSteps({ attempts: [], mastery, notebookDue: 0, now }).map((step) => step.key)).toEqual(["full"]);
    const recent = attempt({ submittedAt: "2026-10-14T00:00:00Z" });
    expect(nextSteps({ attempts: [recent], mastery, notebookDue: 0, now })).toEqual([]);
  });
});

describe("lộ trình ôn", () => {
  const now = new Date("2026-10-15T05:00:00Z");

  it("số tuần: tới ngày thi (tối đa 26), không có ngày thi → 8", () => {
    expect(planWeeks(null)).toBe(8);
    expect(planWeeks(-3)).toBe(8);
    expect(planWeeks(20)).toBe(3);
    expect(planWeeks(400)).toBe(26);
  });

  it("đề đầy đủ dày hơn khi mục tiêu cao", () => {
    expect([0, 1, 2, 3].map((week) => fullExamsInWeek(6, 4, week))).toEqual([0, 1, 0, 1]);
    expect(fullExamsInWeek(7, 3, 0)).toBe(1);
    expect(fullExamsInWeek(9, 4, 0)).toBe(2);
    expect(fullExamsInWeek(9, 3, 0)).toBe(1);
  });

  it("bài yếu trước, rồi bài chưa đủ dữ liệu, bài vững cuối", () => {
    const mastery = lessonMastery([attempt({ lessons: { [L1]: { earned: 950, max: 1000, n: 25 }, [L2]: { earned: 100, max: 1000, n: 25 } } })]);
    const order = lessonPriority(mastery);
    expect(order[0]).toBe(L2);
    expect(order.at(-1)).toBe(L1);
  });

  it("mỗi tuần đúng số buổi; buổi ôn khi ≥ 3 buổi; lưu được (≤ 32 KB, đọc lại hợp lệ)", () => {
    const plan = buildStudyPlan({ goal: 9, perWeek: 7, mastery: lessonMastery([]), daysToExam: 400, now });
    expect(plan.weeks).toHaveLength(26);
    for (const week of plan.weeks) expect(week).toHaveLength(7);
    expect(plan.weeks[0].filter((task) => task.kind === "full")).toHaveLength(2);
    expect(plan.weeks[0].filter((task) => task.kind === "review")).toHaveLength(1);
    expect(JSON.stringify(plan).length).toBeLessThan(32 * 1024);
    expect(parseStudyPlan(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
    expect(plan.startDay).toBe("2026-10-15");

    const small = buildStudyPlan({ goal: 6, perWeek: 2, mastery: lessonMastery([]), daysToExam: null, now });
    expect(small.weeks[0].map((task) => task.kind)).toEqual(["lesson", "lesson"]);
    expect(small.weeks[1].map((task) => task.kind)).toEqual(["lesson", "full"]);
  });

  it("đọc lộ trình hỏng / lạ → null", () => {
    expect(parseStudyPlan(null)).toBeNull();
    expect(parseStudyPlan({ version: 2 })).toBeNull();
    const plan = buildStudyPlan({ goal: 7, perWeek: 3, mastery: lessonMastery([]), daysToExam: null, now });
    expect(parseStudyPlan({ ...plan, weeks: [[{ id: "x", kind: "lesson", lesson: "khong-co-bai" }]] })).toBeNull();
  });

  it("tick tự động từ lượt nộp SAU khi lập; mỗi lượt một buổi", () => {
    const plan = buildStudyPlan({ goal: 7, perWeek: 3, mastery: lessonMastery([]), daysToExam: null, now });
    const firstLesson = plan.weeks[0].find((task) => task.kind === "lesson")!;
    if (firstLesson.kind !== "lesson") throw new Error();
    const after = "2026-10-16T00:00:00Z";
    const done = completedTasks(plan, [
      attempt({ kind: "practice", submittedAt: after, lessons: { [firstLesson.lesson]: { earned: 5000, max: 5000, n: 5 } } }),
      attempt({ kind: "full", submittedAt: after }),
      attempt({ kind: "full", submittedAt: "2026-10-01T00:00:00Z" }),
      attempt({ kind: "practice", submittedAt: after, lessons: { [firstLesson.lesson]: { earned: 4000, max: 4000, n: 4 } } }),
    ]);
    expect(done.has(firstLesson.id)).toBe(true);
    expect(done.size).toBe(2);
  });

  it("tuần hiện tại tính từ ngày lập", () => {
    const plan = buildStudyPlan({ goal: 7, perWeek: 3, mastery: lessonMastery([]), daysToExam: null, now });
    expect(currentPlanWeek(plan, now)).toBe(1);
    expect(currentPlanWeek(plan, new Date("2026-10-22T05:00:00Z"))).toBe(2);
    expect(currentPlanWeek(plan, new Date("2027-06-01T05:00:00Z"))).toBe(8);
  });
});
