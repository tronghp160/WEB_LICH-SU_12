import { describe, expect, it } from "vitest";
import { emptyProgress, mergeProgress, recordQuiz, recordSectionRead, markLessonStudied, type Progress } from "@/lib/progress/progress";
import { contributedSummary, isEmptyProgress, joinProgress, planInitialSync, progressSummary, sameProgress } from "@/lib/progress/sync";

// Đồng bộ tiến độ với tài khoản — giai đoạn B5 (docs/ke-hoach-tai-khoan.md, mục 7.1, 12).

const at = (minute: number) => new Date(Date.UTC(2026, 9, 14, 8, minute));

/** Máy trường: đọc Bài 7, đạt bộ "bai-7" lượt đầu. */
const school: Progress = recordQuiz(recordSectionRead(emptyProgress, "7-khang-chien-chong-phap", "muc-1", at(0)), "bai-7", 8, 10, at(1));
/** Điện thoại: học chuyên đề ĐBP, làm "bai-7" chưa đạt. */
const phone: Progress = recordQuiz(markLessonStudied(emptyProgress, "chien-dich-dien-bien-phu", at(2)), "bai-7", 5, 10, at(3));

describe("joinProgress — phép gộp khi đồng bộ", () => {
  it("lũy đẳng, giao hoán, kết hợp", () => {
    const third = recordQuiz(emptyProgress, "bai-8", 9, 10, at(5));
    expect(joinProgress(school, school)).toEqual(school);
    expect(sameProgress(joinProgress(school, phone), joinProgress(phone, school))).toBe(true);
    expect(sameProgress(joinProgress(joinProgress(school, phone), third), joinProgress(school, joinProgress(phone, third)))).toBe(true);
  });

  it("đồng bộ đi về nhiều lần KHÔNG nhân số lượt (khác mergeProgress — dành cho nhập mã)", () => {
    let server = joinProgress(emptyProgress, school);
    let local = school;
    for (let round = 0; round < 5; round++) {
      // Máy làm thêm một lượt rồi đồng bộ: server gộp, máy nhận lại bản đã gộp.
      local = recordQuiz(local, "bai-7", 6, 10, at(10 + round));
      server = joinProgress(server, local);
      local = joinProgress(local, server);
    }
    expect(local.quizzes["bai-7"].attempts).toBe(6);
    expect(server.quizzes["bai-7"].attempts).toBe(6);
    // Cùng tình huống với mergeProgress thì số lượt phình ra — lý do phải có joinProgress.
    const inflated = mergeProgress(mergeProgress(school, recordQuiz(school, "bai-7", 6, 10, at(10))), school);
    expect(inflated.quizzes["bai-7"].attempts).toBeGreaterThan(2);
  });

  it("giữ điểm cao nhất, lần đạt dấu sớm nhất, hợp các mục đã đọc", () => {
    const joined = joinProgress(school, phone);
    expect(joined.quizzes["bai-7"]).toMatchObject({ best: 8, total: 10, passedAt: at(1).toISOString(), lastAt: at(3).toISOString() });
    expect(joined.lessons["chien-dich-dien-bien-phu"]).toBeDefined();
    expect(Object.keys(joined.sgk["7-khang-chien-chong-phap"].sections)).toEqual(["muc-1"]);
  });
});

describe("sameProgress / isEmptyProgress / progressSummary", () => {
  it("so sánh không phụ thuộc thứ tự khóa", () => {
    const reordered = JSON.parse(JSON.stringify({ sgk: school.sgk, quizzes: school.quizzes, lessons: school.lessons, v: 1 })) as Progress;
    expect(sameProgress(school, reordered)).toBe(true);
    expect(sameProgress(school, phone)).toBe(false);
  });

  it("đếm bài (chuyên đề + bài SGK) và con dấu", () => {
    expect(isEmptyProgress(emptyProgress)).toBe(true);
    expect(isEmptyProgress(school)).toBe(false);
    expect(progressSummary(joinProgress(school, phone))).toEqual({ lessons: 2, stamps: 1 });
  });
});

describe("contributedSummary — thông báo 'đã gộp tiến độ trên máy này'", () => {
  it("máy trống hoặc không có gì mới → không báo", () => {
    expect(contributedSummary(emptyProgress, school)).toBeNull();
    expect(contributedSummary(school, joinProgress(school, phone))).toBeNull();
  });

  it("máy có bài / con dấu mới → đếm phần chênh", () => {
    expect(contributedSummary(school, phone)).toEqual({ lessons: 1, stamps: 1 });
    expect(contributedSummary(school, emptyProgress)).toEqual({ lessons: 1, stamps: 1 });
  });
});

describe("planInitialSync — lần đầu đồng bộ trên một máy", () => {
  it("máy chưa thuộc ai / đúng tài khoản này → gộp", () => {
    expect(planInitialSync(school, phone, null, "u1")).toEqual({ kind: "merge", next: joinProgress(school, phone) });
    expect(planInitialSync(school, phone, "u1", "u1").kind).toBe("merge");
  });

  it("máy đang giữ tiến độ của tài khoản KHÁC (máy trường) → thay bằng bản của tài khoản, không trộn", () => {
    expect(planInitialSync(school, phone, "u-truoc", "u1")).toEqual({ kind: "replace", next: phone });
  });
});
