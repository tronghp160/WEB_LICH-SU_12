import { describe, expect, it } from "vitest";
import { answersBodySchema, checkBodySchema, localDeadline, parseAttemptView, parseExamIntro, practiceOptionsSchema } from "@/lib/exams/attempt";
import { MCQ_MILLI, TRUE_FALSE_MILLI, itemEarnedMilli, scoreAttempt, score10FromMilli, type GradeItem } from "@/lib/exams/scoring";

const tf = (truths: boolean[]): GradeItem => ({ kind: "true_false", truths });

describe("chấm điểm (giống hàm SQL exam_grade_attempt)", () => {
  it("bảng điểm: trắc nghiệm 0,25; Đúng/Sai 0 / 0,1 / 0,25 / 0,5 / 1 theo số ý đúng", () => {
    expect(MCQ_MILLI).toBe(250);
    expect(TRUE_FALSE_MILLI).toEqual([0, 100, 250, 500, 1000]);
    const item = tf([true, false, false, true]);
    expect(itemEarnedMilli(item, { tf: [false, true, true, false] })).toBe(0);
    expect(itemEarnedMilli(item, { tf: [true, true, true, false] })).toBe(100);
    expect(itemEarnedMilli(item, { tf: [true, false, true, false] })).toBe(250);
    expect(itemEarnedMilli(item, { tf: [true, false, false, null] })).toBe(500);
    expect(itemEarnedMilli(item, { tf: [true, false, false, true] })).toBe(1000);
    // Bỏ trống tính sai.
    expect(itemEarnedMilli(item, undefined)).toBe(0);
    expect(itemEarnedMilli({ kind: "mcq", correct: 2 }, { choice: 2 })).toBe(250);
    expect(itemEarnedMilli({ kind: "mcq", correct: 2 }, { choice: null })).toBe(0);
  });

  it("ca chung với supabase/tests/exam_attempts.sql (C1): 1,5 / 2,5 → 6 điểm", () => {
    const items: GradeItem[] = [{ kind: "mcq", correct: 1 }, { kind: "mcq", correct: 2 }, tf([true, false, false, true]), tf([true, true, false, false])];
    const score = scoreAttempt(items, [{ choice: 1 }, { choice: 0 }, { tf: [true, false, true, null] }, { tf: [true, true, false, false] }]);
    expect(score).toEqual({ items: [250, 0, 250, 1000], rawMilli: 1500, maxMilli: 2500, score10: 6, correct: 2, unanswered: 0, total: 4 });
  });

  it("đề đầy đủ 24 + 4: tối đa đúng 10 điểm", () => {
    const items: GradeItem[] = [...Array.from({ length: 24 }, () => ({ kind: "mcq" as const, correct: 0 })), ...Array.from({ length: 4 }, () => tf([true, true, false, false]))];
    const perfect = scoreAttempt(items, [...Array.from({ length: 24 }, () => ({ choice: 0 })), ...Array.from({ length: 4 }, () => ({ tf: [true, true, false, false] }))]);
    expect(perfect).toMatchObject({ rawMilli: 10_000, maxMilli: 10_000, score10: 10, correct: 28 });
    expect(scoreAttempt(items, []).score10).toBe(0);
    expect(scoreAttempt(items, []).unanswered).toBe(28);
  });

  it("đề ngắn quy về thang 10, làm tròn 0,01 nửa lên bằng số nguyên (không lệch do số thực)", () => {
    expect(score10FromMilli(250, 750)).toBe(3.33);
    expect(score10FromMilli(500, 750)).toBe(6.67);
    expect(score10FromMilli(1750, 2000)).toBe(8.75);
    // 1050 / 4000 × 10 = 2,625 — đúng nửa → lên 2,63 (số thực 2.625 * 100 dễ ra 262.49999…).
    expect(score10FromMilli(1050, 4000)).toBe(2.63);
    expect(score10FromMilli(0, 0)).toBe(0);
  });
});

describe("đọc kết quả API lượt làm bài", () => {
  const view = {
    ok: true,
    access: "free",
    attempt: { id: "a1", status: "in_progress", started_at: "2026-10-15T10:00:00Z", deadline_at: "2026-10-15T10:15:00Z", server_now: "2026-10-15T10:00:02Z" },
    set: { slug: "de-1", title: "Đề 1", duration_min: 15, format: "mini", free: true },
    answers: { i2: { choice: 1 }, i9: { choice: 7 } },
    questions: [
      { n: 2, item_id: "i2", section: 2, kind: "true_false", stem: "Đúng/Sai?", statements: ["a", "b", "c", "d"] },
      { n: 1, item_id: "i1", section: 1, kind: "mcq", stem: "Một?", choices: ["A", "B", "C", "D"], passage: { body: "Tư liệu", source_citation: "Nguồn" } },
    ],
  };

  it("đang làm: sắp theo thứ tự câu, chưa có đáp án; bỏ câu trả lời sai kiểu", () => {
    const parsed = parseAttemptView(view)!;
    expect(parsed.questions.map((question) => question.itemId)).toEqual(["i1", "i2"]);
    expect(parsed.questions[0]).toMatchObject({ correctIndex: null, explanation: null, passage: { body: "Tư liệu", sourceCitation: "Nguồn" } });
    expect(parsed.answers).toEqual({ i2: { choice: 1 } });
    expect(parsed).toMatchObject({ access: "free", status: "in_progress", score10: null, total: 2 });
  });

  it("đã nộp: có điểm, số câu đúng / bỏ trống; sai dạng → null", () => {
    const submitted = {
      ...view,
      attempt: { ...view.attempt, status: "submitted", score10: 6, breakdown: { items: [250, 0], correct: 1, unanswered: 0, total: 2, raw_milli: 250, max_milli: 1250 } },
    };
    expect(parseAttemptView(submitted)).toMatchObject({ score10: 6, correct: 1, unanswered: 0, total: 2 });
    // Lượt luyện tập: chỉ câu đã kiểm tra được chấm → tổng theo breakdown, không theo số câu của lượt.
    const practice = { ...submitted, attempt: { ...submitted.attempt, mode: "practice", breakdown: { ...submitted.attempt.breakdown, total: 1 } } };
    expect(parseAttemptView(practice)).toMatchObject({ mode: "practice", total: 1 });
    expect(parseAttemptView(null)).toBeNull();
    expect(parseAttemptView({ ...view, questions: [{ ...view.questions[1], choices: ["A"] }] })).toBeNull();
  });

  it("trang đề: thời gian còn lại của lượt dở tính theo giờ server", () => {
    expect(parseExamIntro({ access: "code", question_count: 10, in_progress: { id: "a1", deadline_at: "2026-10-15T10:15:00Z", server_now: "2026-10-15T10:05:00Z" } })).toEqual({
      access: "code",
      questionCount: 10,
      inProgress: { id: "a1", remainingSeconds: 600 },
    });
    expect(parseExamIntro({ access: "free", question_count: 4, in_progress: null })?.inProgress).toBeNull();
  });

  it("hạn nộp theo đồng hồ máy: dịch theo độ lệch giờ server", () => {
    // Server nói còn 15 phút; máy nhận lúc 1000 → hạn = 1000 + 15 phút, bất kể đồng hồ máy chạy sai bao nhiêu.
    expect(localDeadline("2026-10-15T10:15:00Z", "2026-10-15T10:00:00Z", 1000)).toBe(1000 + 15 * 60_000);
    expect(localDeadline(null, "2026-10-15T10:00:00Z", 1000)).toBeNull();
  });

  it("tùy chọn luyện tập: mặc định 10 câu; chỉ 10 / 20 / 30; ôn / làm lại câu sai; chế độ lạ bị từ chối", () => {
    expect(practiceOptionsSchema.parse({ mode: "practice" })).toEqual({ mode: "practice", lessons: [], kinds: [], levels: [], passage: null, count: 10, only_new: false, prefer_wrong: false });
    expect(practiceOptionsSchema.safeParse({ mode: "practice", count: 15 }).success).toBe(false);
    expect(practiceOptionsSchema.safeParse({ mode: "practice", lessons: ["Bai 7"] }).success).toBe(false);
    expect(practiceOptionsSchema.parse({ mode: "review" })).toEqual({ mode: "review" });
    expect(practiceOptionsSchema.safeParse({ mode: "retry", from_attempt: "khong-phai-uuid" }).success).toBe(false);
    expect(practiceOptionsSchema.safeParse({ mode: "exam" }).success).toBe(false);
    expect(checkBodySchema.safeParse({ item_id: "6f0c07c2-1111-4222-8333-444455556666", answer: { tf: [true, false, null, true] } }).success).toBe(true);
    expect(checkBodySchema.safeParse({ item_id: "6f0c07c2-1111-4222-8333-444455556666", answer: { checked: true } }).success).toBe(false);
  });

  it("thân lưu / nộp: chỉ nhận câu trả lời đúng dạng", () => {
    const id = "6f0c07c2-1111-4222-8333-444455556666";
    expect(answersBodySchema.safeParse({ answers: { [id]: { choice: 2, flagged: true, ms: 1200 } } }).success).toBe(true);
    expect(answersBodySchema.safeParse({ answers: { [id]: { tf: [true, null, false, true] } } }).success).toBe(true);
    expect(answersBodySchema.safeParse({ answers: { [id]: { choice: 4 } } }).success).toBe(false);
    expect(answersBodySchema.safeParse({ answers: { [id]: { tf: [true] } } }).success).toBe(false);
    expect(answersBodySchema.safeParse({ answers: { [id]: { choice: 1, hack: true } } }).success).toBe(false);
    expect(answersBodySchema.safeParse({ answers: { "khong-phai-uuid": { choice: 1 } } }).success).toBe(false);
    expect(answersBodySchema.parse({})).toEqual({ answers: {} });
  });
});
