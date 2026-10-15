import { describe, expect, it } from "vitest";
import { parseAttemptView } from "@/lib/exams/attempt";
import { parseAdminOverview, parseItemStats, regradedNumbers, reportBodySchema, statsFlags, STATS_MIN_ATTEMPTS } from "@/lib/exams/quality";

const ID = "11111111-1111-4111-8111-111111111111";

describe("thống kê câu", () => {
  it("đọc kết quả exam_item_stats; bỏ phần sai dạng", () => {
    const stats = parseItemStats({
      [ID]: { n: 40, p: "0.975", disc: 0.12, choices: [39, 1, 0, 0], blank: 0, statements: null },
      hong: { n: "x" },
    });
    expect(stats.size).toBe(1);
    expect(stats.get(ID)).toEqual({ n: 40, p: 0.975, disc: 0.12, choices: [39, 1, 0, 0], blank: 0, statements: null });
    expect(parseItemStats(null).size).toBe(0);
    expect(parseItemStats([]).size).toBe(0);
  });

  it("cờ cảnh báo chỉ khi đủ 30 lượt: quá dễ, quá khó, phân hóa âm, nhiễu không ai chọn (bỏ qua đáp án)", () => {
    const base = { n: STATS_MIN_ATTEMPTS, p: 0.5, disc: 0.3, choices: [10, 10, 5, 5], blank: 0, statements: null };
    expect(statsFlags({ ...base, n: STATS_MIN_ATTEMPTS - 1, p: 1 }, 0)).toEqual([]);
    expect(statsFlags(undefined, 0)).toEqual([]);
    expect(statsFlags({ ...base, p: 0.96 }, 0)).toEqual(["qua-de"]);
    expect(statsFlags({ ...base, p: 0.1 }, 0)).toEqual(["qua-kho"]);
    expect(statsFlags({ ...base, disc: -0.1 }, 0)).toEqual(["phan-hoa-am"]);
    expect(statsFlags({ ...base, choices: [30, 0, 0, 0] }, 0)).toEqual(["nhieu-vo-dung"]);
    expect(statsFlags({ ...base, choices: [0, 10, 10, 10] }, 0)).toEqual([]);
  });
});

describe("tổng quan quản trị", () => {
  it("đọc đủ trường, sai dạng → null", () => {
    const raw = { days: [{ day: "2026-10-15", exam: 3, practice: 2, submitted: 4 }], active_7: 5, active_period: 6, accounts_period: 2, scores: Array(10).fill(0), submitted_exams: 3, reports_open: 1 };
    expect(parseAdminOverview(raw)).toMatchObject({ active7: 5, activePeriod: 6, accountsPeriod: 2, submittedExams: 3, reportsOpen: 1 });
    expect(parseAdminOverview({ ...raw, scores: [1, 2] })).toBeNull();
    expect(parseAdminOverview(null)).toBeNull();
  });
});

describe("báo lỗi + chấm lại", () => {
  it("thân báo lỗi: lý do trong danh sách, ghi chú ≤ 500, ghi chú mặc định rỗng", () => {
    expect(reportBodySchema.safeParse({ attempt_id: ID, item_id: ID, reason: "sai_dap_an" }).data?.note).toBe("");
    expect(reportBodySchema.safeParse({ attempt_id: ID, item_id: ID, reason: "linh-tinh" }).success).toBe(false);
    expect(reportBodySchema.safeParse({ attempt_id: ID, item_id: ID, reason: "khac", note: "x".repeat(501) }).success).toBe(false);
    expect(reportBodySchema.safeParse({ attempt_id: "abc", item_id: ID, reason: "khac" }).success).toBe(false);
  });

  it("số thứ tự câu đã chấm lại theo thứ tự trong lượt", () => {
    expect(regradedNumbers([{ itemId: "a" }, { itemId: "b" }, { itemId: "c" }], ["c", "a"])).toEqual([1, 3]);
    expect(regradedNumbers([{ itemId: "a" }], [])).toEqual([]);
  });

  it("kết quả lượt đọc regraded_items (không có → mảng rỗng)", () => {
    const attempt = { id: ID, status: "submitted", mode: "exam", started_at: "2026-10-15T00:00:00Z", server_now: "2026-10-15T00:10:00Z" };
    expect(parseAttemptView({ attempt: { ...attempt, regraded_items: [ID] }, questions: [] })?.regradedItems).toEqual([ID]);
    expect(parseAttemptView({ attempt, questions: [] })?.regradedItems).toEqual([]);
  });
});
