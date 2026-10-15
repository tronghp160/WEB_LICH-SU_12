// Phòng thi luyện đề (docs/ke-hoach-luyen-thi.md, mục 4.1 — GĐ3): lưu bài trên máy, gộp với bản server, phím tắt,
// lịch sử lượt làm trên máy. Hàm thuần, unit test được (không đụng window / localStorage ở đây).

import type { AttemptQuestion } from "@/lib/exams/attempt";
import type { ItemAnswer } from "@/lib/exams/scoring";

export const roomKeys = {
  /** Bài đang làm của một lượt: câu trả lời + câu chưa gửi lên server + câu đang xem. */
  attempt: (id: string) => `ls12:luot-thi:${id}`,
  /** Lượt đang làm dở theo đề (slug → id, hạn nộp) — để danh sách đề hiện "Đang làm dở". */
  active: "ls12:luot-dang-lam",
  /** Các lượt đã nộp trên máy này (mới nhất trước) — so với lần trước, trang tổng quan khi chưa đăng nhập. */
  history: "ls12:lich-su-thi",
  fontSize: "ls12:co-chu-thi",
};

/** Thời gian ghi cho một câu tối đa 1 ngày (giống ràng buộc của server). */
export const MAX_ITEM_MS = 86_400_000;

export type LocalAttempt = {
  answers: Record<string, ItemAnswer>;
  /** Câu đã đổi trên máy nhưng chưa chắc đã lưu lên server. */
  dirty: string[];
  index: number;
  /** Lần cuối server xác nhận đã lưu (ms). */
  savedAt: number | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Đọc bản lưu trên máy (chuỗi JSON từ localStorage); sai dạng → null. */
export function parseLocalAttempt(raw: string | null): LocalAttempt | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !isRecord(value.answers) || !Array.isArray(value.dirty)) return null;
    return {
      answers: value.answers as Record<string, ItemAnswer>,
      dirty: value.dirty.filter((item): item is string => typeof item === "string"),
      index: typeof value.index === "number" && Number.isInteger(value.index) && value.index >= 0 ? value.index : 0,
      savedAt: typeof value.savedAt === "number" ? value.savedAt : null,
    };
  } catch {
    return null;
  }
}

/**
 * Gộp câu trả lời của server với bản trên máy khi làm tiếp: câu nào máy này đổi mà chưa gửi được (dirty) thì lấy bản máy
 * và giữ trong danh sách cần gửi; còn lại theo server (server là chuẩn — ví dụ vừa làm trên máy khác cùng tài khoản).
 */
export function mergeAnswers(server: Record<string, ItemAnswer>, local: LocalAttempt | null, itemIds: readonly string[]): { answers: Record<string, ItemAnswer>; dirty: string[] } {
  const answers = { ...server };
  const valid = new Set(itemIds);
  const dirty = (local?.dirty ?? []).filter((id) => valid.has(id) && local?.answers[id] !== undefined);
  for (const id of dirty) answers[id] = local!.answers[id];
  return { answers, dirty };
}

/** Đã trả lời câu này chưa: trắc nghiệm có lựa chọn; Đúng/Sai: "partial" khi mới chọn vài ý. */
export function answerState(question: Pick<AttemptQuestion, "kind">, answer: ItemAnswer | undefined): "empty" | "partial" | "done" {
  if (question.kind === "mcq") return typeof answer?.choice === "number" ? "done" : "empty";
  const chosen = (answer?.tf ?? []).filter((value) => typeof value === "boolean").length;
  return chosen === 0 ? "empty" : chosen === 4 ? "done" : "partial";
}

/** Cộng thời gian xem câu vào câu trả lời (giữ nguyên các phần khác). */
export function addTime(answer: ItemAnswer | undefined, ms: number): ItemAnswer {
  const total = Math.min(MAX_ITEM_MS, Math.max(0, Math.round((answer?.ms ?? 0) + ms)));
  return { ...answer, ms: total };
}

// ---------------------------------------------------------------------------------------------------------------
// Phím tắt (mục 4.1). Không bắt phím khi đang gõ trong ô nhập hoặc có Ctrl / Alt / Cmd.
// ---------------------------------------------------------------------------------------------------------------

export type ShortcutAction =
  | { type: "choose"; choice: number }
  | { type: "statement"; statement: number; value: boolean }
  | { type: "prev" }
  | { type: "next" }
  | { type: "flag" }
  | { type: "help" };

/** Đúng/Sai: Q/W cho ý a, E/R ý b, T/Y ý c, U/I ý d (phím trái = Đúng, phím phải = Sai). */
const TRUE_FALSE_KEYS = ["q", "w", "e", "r", "t", "y", "u", "i"];

export function shortcutFor(key: string, kind: "mcq" | "true_false"): ShortcutAction | null {
  if (key === "ArrowLeft") return { type: "prev" };
  if (key === "ArrowRight") return { type: "next" };
  if (key === "?") return { type: "help" };
  const lower = key.length === 1 ? key.toLowerCase() : "";
  if (lower === "f") return { type: "flag" };
  if (kind === "mcq") {
    const digit = "1234".indexOf(lower);
    if (lower && digit >= 0) return { type: "choose", choice: digit };
    const letter = "abcd".indexOf(lower);
    if (lower && letter >= 0) return { type: "choose", choice: letter };
    return null;
  }
  const slot = lower ? TRUE_FALSE_KEYS.indexOf(lower) : -1;
  if (slot >= 0) return { type: "statement", statement: Math.floor(slot / 2), value: slot % 2 === 0 };
  return null;
}

export const SHORTCUT_HELP: [string, string][] = [
  ["1–4 hoặc A–D", "Chọn đáp án (trắc nghiệm)"],
  ["Q / W", "Ý a) Đúng / Sai"],
  ["E / R", "Ý b) Đúng / Sai"],
  ["T / Y", "Ý c) Đúng / Sai"],
  ["U / I", "Ý d) Đúng / Sai"],
  ["← / →", "Câu trước / câu sau"],
  ["F", "Đánh dấu / bỏ đánh dấu câu để xem lại"],
  ["?", "Mở / đóng bảng phím tắt"],
];

// ---------------------------------------------------------------------------------------------------------------
// Lịch sử lượt đã nộp trên máy
// ---------------------------------------------------------------------------------------------------------------

export type HistoryEntry = { id: string; slug: string; title: string; score10: number; submittedAt: string };

export const HISTORY_LIMIT = 50;

export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is HistoryEntry =>
        isRecord(entry) && typeof entry.id === "string" && typeof entry.slug === "string" && typeof entry.title === "string" && typeof entry.score10 === "number" && typeof entry.submittedAt === "string",
    );
  } catch {
    return [];
  }
}

/** Thêm (hoặc cập nhật) một lượt, mới nhất trước, giữ tối đa 50. */
export function addHistory(history: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history.filter((item) => item.id !== entry.id)].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, HISTORY_LIMIT);
}

/** Lượt nộp ngay trước lượt `id` của cùng đề (để so điểm). */
export function previousAttempt(history: readonly HistoryEntry[], slug: string, id: string, submittedAt: string): HistoryEntry | null {
  return history.filter((item) => item.slug === slug && item.id !== id && item.submittedAt < submittedAt).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null;
}

/** "Đã lưu lúc 14:32" theo giờ Việt Nam. */
export function formatSavedAt(ms: number): string {
  return new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
}

/** 754_000 ms → "12 phút 34 giây"; dưới 1 phút → "45 giây". */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes} phút ${seconds % 60} giây` : `${seconds} giây`;
}
