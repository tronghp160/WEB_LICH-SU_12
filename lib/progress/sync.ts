// Đồng bộ tiến độ giữa máy và tài khoản (docs/ke-hoach-tai-khoan.md, mục 7.1, giai đoạn B5). Hàm thuần — dùng chung ở
// /api/tien-do (server) và ProgressSync (client), unit test được.

import { mergeProgress, type Progress } from "@/lib/progress/progress";

/** Tiến độ lưu trên tài khoản tối đa 64 KB (khớp CHECK pg_column_size của learner_progress.data). */
export const MAX_SYNC_BYTES = 65536;

/**
 * Phép gộp dùng khi ĐỒNG BỘ — khác `mergeProgress` (nhập mã từ máy khác) ở đúng một điểm: số lượt làm bài lấy giá trị
 * lớn nhất thay vì cộng. Đồng bộ gộp đi gộp lại cùng một lịch sử (máy → tài khoản → máy) sau mỗi lượt làm bài; nếu
 * cộng thì số lượt bị nhân lên mỗi lần. Với max, phép gộp giao hoán, kết hợp và lũy đẳng: gộp bao nhiêu lần, theo thứ
 * tự nào cũng ra cùng kết quả. Đổi lại: hai máy cùng làm một bộ đề khi chưa đồng bộ thì số lượt bị tính thiếu (điểm cao
 * nhất, con dấu, mục đã đọc không mất).
 */
export function joinProgress(a: Progress, b: Progress): Progress {
  const merged = mergeProgress(a, b);
  for (const [id, record] of Object.entries(merged.quizzes)) {
    const left = a.quizzes[id];
    const right = b.quizzes[id];
    if (left && right) merged.quizzes[id] = { ...record, attempts: Math.max(left.attempts, right.attempts) };
  }
  return merged;
}

/** JSON với khóa đã sắp xếp — so sánh hai bản tiến độ không phụ thuộc thứ tự khóa. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameProgress(a: Progress, b: Progress): boolean {
  return canonical(a) === canonical(b);
}

export function isEmptyProgress(progress: Progress): boolean {
  return !Object.keys(progress.lessons).length && !Object.keys(progress.quizzes).length && !Object.keys(progress.sgk).length;
}

/** Số bài đã học (chuyên đề + bài SGK đã mở) và số con dấu (bộ trắc nghiệm đã đạt) — cho thông báo "đã gộp". */
export function progressSummary(progress: Progress): { lessons: number; stamps: number } {
  const lessons = new Set([...Object.keys(progress.lessons), ...Object.keys(progress.sgk)]).size;
  const stamps = Object.values(progress.quizzes).filter((record) => record.passedAt).length;
  return { lessons, stamps };
}

/**
 * Máy này có đóng góp gì mới cho tài khoản không: có thì báo "Đã gộp tiến độ trên máy này vào tài khoản (…)". Đếm phần
 * chênh giữa trước và sau khi gộp vào bản của tài khoản.
 */
export function contributedSummary(local: Progress, server: Progress): { lessons: number; stamps: number } | null {
  if (isEmptyProgress(local)) return null;
  const joined = joinProgress(server, local);
  if (sameProgress(joined, server)) return null;
  const before = progressSummary(server);
  const after = progressSummary(joined);
  return { lessons: after.lessons - before.lessons, stamps: after.stamps - before.stamps };
}

/**
 * Tiến độ trên máy đang thuộc tài khoản nào (khóa localStorage riêng). Người khác đăng nhập trên cùng máy (máy trường)
 * thì KHÔNG gộp tiến độ của người trước vào tài khoản mới — thay bằng tiến độ của tài khoản mới.
 */
export const SYNC_OWNER_KEY = "ls12:tien-do-cua";

export type SyncPlan =
  /** Máy chưa gắn với tài khoản nào (hoặc đúng tài khoản này): gộp hai bên. */
  | { kind: "merge"; next: Progress }
  /** Máy đang chứa tiến độ của tài khoản KHÁC: bỏ bản trên máy, dùng bản của tài khoản. */
  | { kind: "replace"; next: Progress };

export function planInitialSync(local: Progress, server: Progress, owner: string | null, userId: string): SyncPlan {
  if (owner && owner !== userId) return { kind: "replace", next: server };
  return { kind: "merge", next: joinProgress(local, server) };
}
