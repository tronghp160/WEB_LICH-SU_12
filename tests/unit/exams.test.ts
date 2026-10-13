import { describe, expect, it } from "vitest";
import { examAccessMessage, examSetId, formatClock, formatScore10, parseExamPayload, scoreExam, type ExamQuestion } from "@/lib/exams/exam";
import { buildStampCatalog } from "@/lib/progress/progress";

const question = (position: number, correctIndex: number): ExamQuestion => ({
  position,
  question: `Câu ${position}?`,
  choices: ["A", "B", "C", "D"],
  correctIndex,
  explanation: "Giải thích",
  lessonSlug: null,
  eventSlug: null,
  eventTitle: null,
});

describe("chấm đề luyện thi", () => {
  it("thang 10, đề 40 câu mỗi câu 0,25 điểm", () => {
    const questions = Array.from({ length: 40 }, (_, index) => question(index + 1, 0));
    const answers = questions.map((_, index) => (index < 29 ? 0 : 1));
    expect(scoreExam(questions, answers)).toEqual({ correct: 29, total: 40, unanswered: 0, score10: 7.25 });
  });

  it("câu bỏ trống tính sai và được đếm riêng", () => {
    const questions = [question(1, 0), question(2, 1), question(3, 2)];
    expect(scoreExam(questions, [0, null, undefined as unknown as null])).toEqual({ correct: 1, total: 3, unanswered: 2, score10: 3.33 });
    expect(scoreExam([], []).score10).toBe(0);
  });

  it("định dạng điểm và đồng hồ kiểu Việt Nam", () => {
    expect(formatScore10(7.25)).toBe("7,25");
    expect(formatScore10(8)).toBe("8");
    expect(formatScore10(3.333)).toBe("3,33");
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(125)).toBe("02:05");
    expect(formatClock(50 * 60)).toBe("50:00");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-5)).toBe("00:00");
  });
});

describe("dữ liệu đề từ get_exam_set", () => {
  const payload = {
    ok: true,
    set: { slug: "de-1", title: "Đề 1", description: null, duration_min: 15, free: true },
    questions: [
      { position: 2, question: "Hai?", choices: ["a", "b", "c", "d"], correct_index: 3, explanation: "x", lesson_slug: "6-cach-mang-thang-tam-nam-1945", event_slug: null, event_title: null },
      { position: 1, question: "Một?", choices: ["a", "b", "c", "d"], correct_index: 0, explanation: "y", lesson_slug: null, event_slug: "tuyen-ngon-doc-lap", event_title: "Tuyên ngôn Độc lập" },
    ],
  };

  it("đọc đúng và sắp theo vị trí câu", () => {
    const exam = parseExamPayload(payload)!;
    expect(exam.set).toEqual({ slug: "de-1", title: "Đề 1", description: null, durationMin: 15, free: true });
    expect(exam.questions.map((item) => item.position)).toEqual([1, 2]);
    expect(exam.questions[0]).toMatchObject({ correctIndex: 0, eventSlug: "tuyen-ngon-doc-lap", lessonSlug: null });
  });

  it("dữ liệu sai dạng → null", () => {
    expect(parseExamPayload(null)).toBeNull();
    expect(parseExamPayload({ ...payload, set: null })).toBeNull();
    expect(parseExamPayload({ ...payload, questions: [{ ...payload.questions[0], choices: ["a", "b"] }] })).toBeNull();
    expect(parseExamPayload({ ...payload, questions: [{ ...payload.questions[0], correct_index: 4 }] })).toBeNull();
  });

  it("lý do từ chối → thông báo, có gợi ý kích hoạt khi cần", () => {
    expect(examAccessMessage("not_activated").needsActivation).toBe(true);
    expect(examAccessMessage("invalid_code").needsActivation).toBe(true);
    expect(examAccessMessage("not_found")).toEqual({ message: expect.stringContaining("Không tìm thấy"), needsActivation: false });
    expect(examAccessMessage(undefined).needsActivation).toBe(false);
  });
});

describe("con dấu luyện thi trong Hộ chiếu", () => {
  it("mỗi đề đã công bố có một con dấu, khóa lưu khớp với trình làm đề", () => {
    const defs = buildStampCatalog({
      lessons: [],
      topics: [],
      hasAllQuiz: false,
      hasYearGame: false,
      exams: [{ slug: "de-1", title: "Đề luyện thi số 1" }],
    });
    expect(defs).toEqual([
      expect.objectContaining({ setId: examSetId("de-1"), kind: "special", motto: "Luyện thi", href: "/luyen-thi/de-1", requirement: "Đạt từ 7 điểm đề luyện thi" }),
    ]);
  });
});
