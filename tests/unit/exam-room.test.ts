import { describe, expect, it } from "vitest";
import { kindRows, lessonRows, levelRows, matchesFilter, weakestLesson } from "@/lib/exams/analytics";
import type { AttemptQuestion } from "@/lib/exams/attempt";
import {
  addHistory,
  addTime,
  answerState,
  formatDuration,
  mergeAnswers,
  parseHistory,
  parseLocalAttempt,
  previousAttempt,
  shortcutFor,
  MAX_ITEM_MS,
  type HistoryEntry,
} from "@/lib/exams/room";

const mcq = { kind: "mcq" as const };
const tf = { kind: "true_false" as const };

describe("lưu bài trên máy và làm tiếp", () => {
  it("đọc bản lưu: sai dạng → null; vị trí câu âm → 0", () => {
    expect(parseLocalAttempt(null)).toBeNull();
    expect(parseLocalAttempt("{hỏng")).toBeNull();
    expect(parseLocalAttempt(JSON.stringify({ answers: [], dirty: [] }))).toBeNull();
    expect(parseLocalAttempt(JSON.stringify({ answers: { a: { choice: 1 } }, dirty: ["a", 3], index: -2, savedAt: 5 }))).toEqual({ answers: { a: { choice: 1 } }, dirty: ["a"], index: 0, savedAt: 5 });
  });

  it("gộp: câu máy này đổi mà chưa gửi được thì lấy bản máy; còn lại theo server; bỏ câu không thuộc lượt", () => {
    const local = { answers: { a: { choice: 2 }, b: { choice: 3 }, x: { choice: 1 } }, dirty: ["a", "x"], index: 4, savedAt: null };
    expect(mergeAnswers({ a: { choice: 0 }, b: { choice: 1 } }, local, ["a", "b"])).toEqual({ answers: { a: { choice: 2 }, b: { choice: 1 } }, dirty: ["a"] });
    expect(mergeAnswers({ a: { choice: 0 } }, null, ["a"])).toEqual({ answers: { a: { choice: 0 } }, dirty: [] });
  });

  it("trạng thái câu cho phiếu trả lời: Đúng/Sai mới chọn vài ý là làm dở", () => {
    expect(answerState(mcq, undefined)).toBe("empty");
    expect(answerState(mcq, { choice: null })).toBe("empty");
    expect(answerState(mcq, { choice: 0 })).toBe("done");
    expect(answerState(tf, { tf: [true, null, null, null] })).toBe("partial");
    expect(answerState(tf, { tf: [true, false, true, false] })).toBe("done");
    expect(answerState(tf, { flagged: true })).toBe("empty");
  });

  it("cộng thời gian xem câu, giữ phần khác, chặn trên 1 ngày", () => {
    expect(addTime({ choice: 1, ms: 1000 }, 2500)).toEqual({ choice: 1, ms: 3500 });
    expect(addTime(undefined, 999.6)).toEqual({ ms: 1000 });
    expect(addTime({ ms: MAX_ITEM_MS - 10 }, 1000).ms).toBe(MAX_ITEM_MS);
    expect(formatDuration(754_000)).toBe("12 phút 34 giây");
    expect(formatDuration(45_000)).toBe("45 giây");
  });
});

describe("phím tắt", () => {
  it("trắc nghiệm: 1–4 và A–D; Đúng/Sai: Q/W E/R T/Y U/I; ←/→, F, ?", () => {
    expect(shortcutFor("3", "mcq")).toEqual({ type: "choose", choice: 2 });
    expect(shortcutFor("D", "mcq")).toEqual({ type: "choose", choice: 3 });
    expect(shortcutFor("q", "mcq")).toBeNull();
    expect(shortcutFor("q", "true_false")).toEqual({ type: "statement", statement: 0, value: true });
    expect(shortcutFor("R", "true_false")).toEqual({ type: "statement", statement: 1, value: false });
    expect(shortcutFor("i", "true_false")).toEqual({ type: "statement", statement: 3, value: false });
    expect(shortcutFor("a", "true_false")).toBeNull();
    expect(shortcutFor("ArrowLeft", "mcq")).toEqual({ type: "prev" });
    expect(shortcutFor("ArrowRight", "true_false")).toEqual({ type: "next" });
    expect(shortcutFor("f", "true_false")).toEqual({ type: "flag" });
    expect(shortcutFor("?", "mcq")).toEqual({ type: "help" });
    expect(shortcutFor("Enter", "mcq")).toBeNull();
  });
});

describe("lịch sử lượt trên máy", () => {
  const entry = (id: string, slug: string, submittedAt: string, score10 = 5): HistoryEntry => ({ id, slug, title: slug, score10, submittedAt });

  it("thêm lượt mới lên đầu, cập nhật lượt trùng id, tối đa 50", () => {
    let history: HistoryEntry[] = [];
    for (let index = 0; index < 55; index++) history = addHistory(history, entry(`a${index}`, "de-1", `2026-10-${String(10 + (index % 20)).padStart(2, "0")}T00:00:${String(index).padStart(2, "0")}Z`));
    expect(history).toHaveLength(50);
    history = addHistory([entry("x", "de-1", "2026-10-01T00:00:00Z", 4)], entry("x", "de-1", "2026-10-01T00:00:00Z", 9));
    expect(history).toEqual([entry("x", "de-1", "2026-10-01T00:00:00Z", 9)]);
    expect(parseHistory("[{\"id\":1}]")).toEqual([]);
  });

  it("lượt trước cùng đề, nộp trước lượt đang xem", () => {
    const history = [entry("c", "de-1", "2026-10-15T10:00:00Z", 8), entry("b", "de-2", "2026-10-14T10:00:00Z"), entry("a", "de-1", "2026-10-13T10:00:00Z", 6)];
    expect(previousAttempt(history, "de-1", "c", "2026-10-15T10:00:00Z")?.id).toBe("a");
    expect(previousAttempt(history, "de-1", "a", "2026-10-13T10:00:00Z")).toBeNull();
  });
});

describe("phân tích trang kết quả", () => {
  const groups = {
    "7-khang-chien-chong-phap": { earned: 250, max: 1000, n: 4 },
    "1-lien-hop-quoc": { earned: 500, max: 500, n: 2 },
    _: { earned: 0, max: 250, n: 1 },
  };

  it("theo bài: nhãn Bài N + đường dẫn; câu không gắn bài gom thành Khác; bài yếu nhất chưa đạt tối đa", () => {
    const rows = lessonRows(groups);
    expect(rows.find((row) => row.key === "7-khang-chien-chong-phap")).toMatchObject({ label: expect.stringMatching(/^Bài 7\. /), href: "/bai/7-khang-chien-chong-phap" });
    expect(rows.find((row) => row.key === "_")?.label).toContain("Khác");
    expect(weakestLesson(groups)?.key).toBe("7-khang-chien-chong-phap");
    expect(weakestLesson({ "1-lien-hop-quoc": { earned: 500, max: 500, n: 2 } })).toBeNull();
  });

  it("theo mức độ giữ thứ tự Nhận biết → Vận dụng; theo dạng có nhóm Có tư liệu", () => {
    expect(levelRows({ van_dung: { earned: 0, max: 1000, n: 1 }, nhan_biet: { earned: 250, max: 250, n: 1 } }).map((row) => row.label)).toEqual(["Nhận biết", "Vận dụng"]);
    expect(kindRows({ true_false: { earned: 1, max: 2, n: 1 }, passage: { earned: 1, max: 2, n: 1 }, mcq: { earned: 1, max: 2, n: 1 } }).map((row) => row.label)).toEqual(["Trắc nghiệm", "Đúng/Sai", "Có tư liệu"]);
  });

  it("lọc lời giải: Sai = có làm mà chưa tối đa (Đúng/Sai sai một ý cũng tính); Bỏ trống; Đã đánh dấu", () => {
    const question = (kind: "mcq" | "true_false", earnedMilli: number) => ({ kind, earnedMilli }) as AttemptQuestion;
    expect(matchesFilter("sai", question("mcq", 0), { choice: 1 })).toBe(true);
    expect(matchesFilter("sai", question("mcq", 250), { choice: 1 })).toBe(false);
    expect(matchesFilter("sai", question("true_false", 500), { tf: [true, true, true, null] })).toBe(true);
    expect(matchesFilter("sai", question("mcq", 0), undefined)).toBe(false);
    expect(matchesFilter("bo-trong", question("mcq", 0), undefined)).toBe(true);
    expect(matchesFilter("danh-dau", question("mcq", 250), { choice: 0, flagged: true })).toBe(true);
    expect(matchesFilter("tat-ca", question("mcq", 0), undefined)).toBe(true);
  });
});
