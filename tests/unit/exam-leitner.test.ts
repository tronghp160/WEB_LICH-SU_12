import { describe, expect, it } from "vitest";
import { addDays, applyLeitner, describeDue, isDue, vietnamDay, type LeitnerState } from "@/lib/exams/leitner";

const today = "2026-10-15";

describe("hộp Leitner (giống hàm SQL exam_leitner_apply — supabase/tests/exam_practice.sql, L1–L3)", () => {
  it("L1: lần đầu sai → vào sổ, hộp 1, ôn ngày mai; lần đầu đúng → chỉ đếm", () => {
    expect(applyLeitner(null, false, today)).toEqual({ box: 1, dueDay: "2026-10-16", wrongCount: 1, rightCount: 0, inNotebook: true });
    expect(applyLeitner(null, true, today)).toEqual({ box: 1, dueDay: null, wrongCount: 0, rightCount: 1, inNotebook: false });
  });

  it("L2: đúng khi đang trong sổ → lên hộp, hạn 3 / 7 / 14 / 30 ngày", () => {
    let state: LeitnerState = applyLeitner(null, false, today);
    const dues: string[] = [];
    for (let step = 0; step < 4; step++) {
      state = applyLeitner(state, true, today);
      dues.push(`${state.box}:${state.dueDay}`);
    }
    expect(dues).toEqual(["2:2026-10-18", "3:2026-10-22", "4:2026-10-29", "5:2026-11-14"]);
  });

  it("L3: đúng ở hộp 5 → ra khỏi sổ (giữ số lần); sai bất kỳ lúc nào → về hộp 1", () => {
    const top: LeitnerState = { box: 5, dueDay: today, wrongCount: 2, rightCount: 4, inNotebook: true };
    expect(applyLeitner(top, true, today)).toEqual({ box: 5, dueDay: null, wrongCount: 2, rightCount: 5, inNotebook: false });
    expect(applyLeitner(top, false, today)).toEqual({ box: 1, dueDay: "2026-10-16", wrongCount: 3, rightCount: 4, inNotebook: true });
    const out = applyLeitner(top, true, today);
    expect(applyLeitner(out, true, today)).toMatchObject({ inNotebook: false, rightCount: 6 });
  });

  it("ngày theo giờ Việt Nam, qua tháng / năm", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2027-02-27", 2)).toBe("2027-03-01");
    expect(vietnamDay(new Date("2026-10-15T17:30:00Z"))).toBe("2026-10-16");
    expect(vietnamDay(new Date("2026-10-15T16:59:00Z"))).toBe("2026-10-15");
  });

  it("đến hạn và mô tả hạn ôn", () => {
    expect(isDue({ dueDay: "2026-10-15", inNotebook: true }, today)).toBe(true);
    expect(isDue({ dueDay: "2026-10-16", inNotebook: true }, today)).toBe(false);
    expect(isDue({ dueDay: "2026-10-01", inNotebook: false }, today)).toBe(false);
    expect(describeDue("2026-10-14", today)).toBe("Đến hạn hôm nay");
    expect(describeDue("2026-10-16", today)).toBe("Ôn ngày mai");
    expect(describeDue("2026-10-22", today)).toBe("Ôn sau 7 ngày");
  });
});
