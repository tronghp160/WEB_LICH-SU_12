// Logic thuần cho trang Vận hành (UC15): phân loại độ trễ DB và tóm tắt tình trạng chung.
// Nguyên tắc: KHÔNG lấy được số liệu thì báo "chưa xác định", tuyệt đối không kết luận "bình thường".

export type CheckResult<T> = { status: "ok"; data: T } | { status: "error"; message: string };

export type DatabaseHealth =
  | { status: "ok"; ms: number }
  | { status: "slow"; ms: number }
  | { status: "error"; message: string };

/** Truy vấn đơn giản mất quá ngưỡng này thì coi là chậm (ms). */
export const SLOW_QUERY_MS = 1500;

export function classifyDatabaseLatency(ms: number): DatabaseHealth {
  return ms > SLOW_QUERY_MS ? { status: "slow", ms } : { status: "ok", ms };
}

export type OverallStatus =
  /** Mọi kiểm tra đều chạy được và không phát hiện vấn đề. */
  | "ok"
  /** Có kiểm tra phát hiện vấn đề dữ liệu, hoặc DB chậm. */
  | "issues"
  /** Có kiểm tra KHÔNG chạy được → không thể kết luận. */
  | "unknown";

/**
 * Tóm tắt: lỗi kiểm tra > vấn đề dữ liệu > bình thường. Một kiểm tra lỗi làm kết quả là "unknown" dù các kiểm tra
 * khác sạch (không được suy diễn "bình thường" từ dữ liệu thiếu).
 */
export function summarizeReport(input: {
  database: DatabaseHealth;
  checks: readonly CheckResult<readonly unknown[]>[];
}): OverallStatus {
  if (input.database.status === "error" || input.checks.some((check) => check.status === "error")) return "unknown";

  const dataIssues = input.checks.some((check) => check.status === "ok" && check.data.length > 0);
  if (dataIssues || input.database.status === "slow") return "issues";
  return "ok";
}

export const overallStatusLabels: Record<OverallStatus, string> = {
  ok: "Bình thường",
  issues: "Có vấn đề cần xử lý",
  unknown: "Chưa xác định — không lấy được đủ số liệu",
};
