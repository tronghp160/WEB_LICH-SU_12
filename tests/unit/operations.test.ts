import { describe, expect, it } from "vitest";
import { SLOW_QUERY_MS, classifyDatabaseLatency, summarizeReport, type CheckResult } from "@/lib/admin/operations";

const clean: CheckResult<string[]> = { status: "ok", data: [] };
const dirty: CheckResult<string[]> = { status: "ok", data: ["sự kiện thiếu nguồn"] };
const failed: CheckResult<string[]> = { status: "error", message: "timeout" };

describe("classifyDatabaseLatency", () => {
  it("nhanh → ok, quá ngưỡng → slow, giữ nguyên số ms", () => {
    expect(classifyDatabaseLatency(120)).toEqual({ status: "ok", ms: 120 });
    expect(classifyDatabaseLatency(SLOW_QUERY_MS)).toEqual({ status: "ok", ms: SLOW_QUERY_MS });
    expect(classifyDatabaseLatency(SLOW_QUERY_MS + 1)).toEqual({ status: "slow", ms: SLOW_QUERY_MS + 1 });
  });
});

describe("summarizeReport", () => {
  it("mọi kiểm tra chạy được và sạch → bình thường", () => {
    expect(summarizeReport({ database: { status: "ok", ms: 50 }, checks: [clean, clean] })).toBe("ok");
  });

  it("phát hiện vấn đề dữ liệu → có vấn đề", () => {
    expect(summarizeReport({ database: { status: "ok", ms: 50 }, checks: [clean, dirty] })).toBe("issues");
  });

  it("DB chậm → có vấn đề (dù dữ liệu sạch)", () => {
    expect(summarizeReport({ database: { status: "slow", ms: 3000 }, checks: [clean] })).toBe("issues");
  });

  it("một kiểm tra lỗi → chưa xác định, KHÔNG được coi là bình thường dù các kiểm tra khác sạch", () => {
    expect(summarizeReport({ database: { status: "ok", ms: 50 }, checks: [clean, failed] })).toBe("unknown");
  });

  it("không kết nối được DB → chưa xác định", () => {
    expect(summarizeReport({ database: { status: "error", message: "x" }, checks: [clean] })).toBe("unknown");
  });

  it("lỗi kiểm tra thắng cả khi đã có vấn đề dữ liệu (số liệu không đầy đủ)", () => {
    expect(summarizeReport({ database: { status: "ok", ms: 50 }, checks: [dirty, failed] })).toBe("unknown");
  });

  it("không có kiểm tra nào nhưng DB ok → bình thường (không có gì để sai)", () => {
    expect(summarizeReport({ database: { status: "ok", ms: 50 }, checks: [] })).toBe("ok");
  });
});
