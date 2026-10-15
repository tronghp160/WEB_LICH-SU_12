import { describe, expect, it } from "vitest";
import { canEditExam, canSubmitExam, examQuestionColumns, examQuestionSchema, examReadiness, examSetSchema } from "@/lib/exams/admin";

const validQuestion = {
  question: "Chiến dịch Điện Biên Phủ kết thúc ngày nào?",
  choice_0: "7/5/1954",
  choice_1: "13/3/1954",
  choice_2: "21/7/1954",
  choice_3: "19/12/1946",
  correct_index: "0",
  explanation: "Ngày 7/5/1954 tập đoàn cứ điểm bị tiêu diệt.",
  source_note: "SGK Lịch sử 12, Bài 7",
  lesson_slug: "7-khang-chien-chong-phap",
  event_id: "",
};

const q = (position: number, correct: number) => ({ position, correct_index: correct, explanation: "Giải thích đủ dài", source_note: "SGK" });

describe("form câu hỏi đề luyện thi", () => {
  it("hợp lệ → cột DB đúng thứ tự đáp án; ô trống thành null", () => {
    const parsed = examQuestionSchema.parse(validQuestion);
    expect(examQuestionColumns(parsed)).toEqual({
      question: validQuestion.question,
      choices: ["7/5/1954", "13/3/1954", "21/7/1954", "19/12/1946"],
      correct_index: 0,
      explanation: validQuestion.explanation,
      source_note: "SGK Lịch sử 12, Bài 7",
      lesson_slug: "7-khang-chien-chong-phap",
      event_id: null,
    });
  });

  it("đáp án trùng (không phân biệt hoa thường), thiếu nguồn, bài SGK lạ, chưa chọn đáp án → lỗi theo từng ô", () => {
    const result = examQuestionSchema.safeParse({ ...validQuestion, choice_3: "7/5/1954", source_note: "", lesson_slug: "bai-khong-co", correct_index: undefined });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["source_note", "correct_index"]));
    const refined = examQuestionSchema.safeParse({ ...validQuestion, choice_3: "7/5/1954 ", lesson_slug: "bai-khong-co" });
    expect(refined.error!.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(["choice_3", "lesson_slug"]));
  });

  it("thông tin đề: thời gian 5–180 phút, số nguyên", () => {
    expect(examSetSchema.parse({ title: "Đề số 3", description: "", duration_min: "50", sort_order: "" })).toEqual({
      title: "Đề số 3",
      description: null,
      duration_min: 50,
      sort_order: 0,
    });
    expect(examSetSchema.safeParse({ title: "Đề", duration_min: "50" }).success).toBe(false);
    expect(examSetSchema.safeParse({ title: "Đề số 3", duration_min: "2" }).success).toBe(false);
    expect(examSetSchema.safeParse({ title: "Đề số 3", duration_min: "45.5" }).success).toBe(false);
  });
});

describe("điều kiện gửi duyệt đề", () => {
  it("dưới 10 câu → chặn", () => {
    expect(examReadiness({ duration_min: 15 }, [q(1, 0), q(2, 1)]).blockers).toEqual(["Đề cần ít nhất 10 câu (hiện có 2)."]);
  });

  it("24 câu trắc nghiệm, 30 phút, đáp án rải đều → chỉ nhắc đề thật còn 4 câu Đúng/Sai (không còn chuẩn 40 câu)", () => {
    const questions = Array.from({ length: 24 }, (_, index) => q(index + 1, index % 4));
    expect(examReadiness({ duration_min: 30 }, questions)).toEqual({
      blockers: [],
      warnings: ['Đề thi thật gồm 24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút; đề này có 24 câu trắc nghiệm — nên ghi rõ "đề mẫu" trong tên hoặc mô tả.'],
    });
  });

  it("thời gian gợi ý theo điểm của đề thật: 1,25 phút / câu trắc nghiệm", () => {
    const questions = Array.from({ length: 10 }, (_, index) => q(index + 1, index % 4));
    expect(examReadiness({ duration_min: 15 }, questions).warnings).toHaveLength(1);
    expect(examReadiness({ duration_min: 30 }, questions).warnings[1]).toBe("Thời gian 30 phút chưa tương xứng với 10 câu (gợi ý khoảng 13 phút).");
  });

  it("đề mẫu 10 câu: được gửi duyệt nhưng nhắc ghi rõ đề mẫu; thời gian lệch và đáp án dồn một chữ → cảnh báo", () => {
    const questions = Array.from({ length: 10 }, (_, index) => q(index + 1, 0));
    const readiness = examReadiness({ duration_min: 50 }, questions);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.warnings).toHaveLength(3);
    expect(readiness.warnings[2]).toContain("dồn vào A (10/10");
  });

  it("thiếu giải thích hoặc nguồn → chặn", () => {
    const questions = Array.from({ length: 10 }, (_, index) => q(index + 1, index % 4));
    questions[3] = { ...questions[3], explanation: " " };
    questions[5] = { ...questions[5], source_note: "" };
    expect(examReadiness({ duration_min: 13 }, questions).blockers).toEqual(["Có câu thiếu lời giải thích.", "Có câu thiếu nguồn."]);
  });
});

describe("quyền soạn đề", () => {
  it("biên tập viên sửa/gửi duyệt khi nháp hoặc cần chỉnh sửa; kiểm duyệt viên không sửa nội dung", () => {
    expect(canEditExam("editor", "draft")).toBe(true);
    expect(canEditExam("editor", "pending_review")).toBe(false);
    expect(canEditExam("reviewer", "draft")).toBe(false);
    expect(canEditExam("system_admin", "published")).toBe(true);
    expect(canSubmitExam("editor", "needs_revision")).toBe(true);
    expect(canSubmitExam("editor", "published")).toBe(false);
    expect(canSubmitExam("reviewer", "draft")).toBe(false);
  });
});
