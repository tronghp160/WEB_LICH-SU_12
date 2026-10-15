// Sổ câu sai + ôn ngắt quãng theo hộp Leitner (docs/ke-hoach-luyen-thi.md, mục 4.5) — GIỐNG HỆT hàm SQL
// public.exam_leitner_apply (migration 20261027000000_exam_practice.sql); server cập nhật bằng SQL, bản này để unit test
// và hiển thị lịch ôn. Ngày tính theo giờ Việt Nam; hạn ôn là 0 giờ của ngày đến hạn.

/** Khoảng cách (ngày) khi vào hộp 1–5. */
export const LEITNER_INTERVALS = [1, 3, 7, 14, 30] as const;

export type LeitnerState = { box: number; dueDay: string | null; wrongCount: number; rightCount: number; inNotebook: boolean };

/** "2026-10-15" + 3 → "2026-10-18" (lịch, không lệch múi giờ). */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function vietnamDay(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

/**
 * Cập nhật sau một lần trả lời: sai → hộp 1, hạn ngày mai, vào sổ; đúng khi đang trong sổ → lên hộp kế (hạn sau 3 / 7 /
 * 14 / 30 ngày); đúng ở hộp 5 → ra khỏi sổ; đúng khi không trong sổ → chỉ đếm.
 */
export function applyLeitner(state: LeitnerState | null, right: boolean, today: string): LeitnerState {
  if (!state) {
    return right
      ? { box: 1, dueDay: null, wrongCount: 0, rightCount: 1, inNotebook: false }
      : { box: 1, dueDay: addDays(today, LEITNER_INTERVALS[0]), wrongCount: 1, rightCount: 0, inNotebook: true };
  }
  if (!right) return { ...state, box: 1, dueDay: addDays(today, LEITNER_INTERVALS[0]), wrongCount: state.wrongCount + 1, inNotebook: true };
  if (state.inNotebook && state.box >= 5) return { ...state, dueDay: null, rightCount: state.rightCount + 1, inNotebook: false };
  if (state.inNotebook) {
    const box = state.box + 1;
    return { ...state, box, dueDay: addDays(today, LEITNER_INTERVALS[box - 1]), rightCount: state.rightCount + 1 };
  }
  return { ...state, rightCount: state.rightCount + 1 };
}

/** Đến hạn ôn chưa (so theo ngày Việt Nam). */
export function isDue(state: Pick<LeitnerState, "dueDay" | "inNotebook">, today: string): boolean {
  return state.inNotebook && state.dueDay !== null && state.dueDay <= today;
}

/** "hôm nay", "ngày mai", "sau 3 ngày" — cho danh sách sổ câu sai. */
export function describeDue(dueDay: string | null, today: string): string {
  if (!dueDay) return "—";
  if (dueDay <= today) return "Đến hạn hôm nay";
  const days = Math.round((Date.parse(`${dueDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return days === 1 ? "Ôn ngày mai" : `Ôn sau ${days} ngày`;
}
