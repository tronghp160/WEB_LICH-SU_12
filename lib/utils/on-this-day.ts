// "Hôm nay trong lịch sử": chọn sự kiện có ngày/tháng trùng hôm nay, hoặc ngày kỷ niệm GẦN NHẤT (vừa qua hoặc sắp tới).
// Hàm thuần (không đọc đồng hồ, không gọi DB) để kiểm thử được.

export type DatedItem = { startDate: string };

export type OnThisDayResult<T> = {
  /** "today": đúng hôm nay; "upcoming": ngày kỷ niệm sắp tới; "recent": ngày kỷ niệm vừa qua. */
  kind: "today" | "upcoming" | "recent";
  /** Ngày/tháng của các sự kiện được chọn, ví dụ { day: 2, month: 9 }. */
  day: number;
  month: number;
  /** Số ngày giữa hôm nay và ngày kỷ niệm (luôn ≥ 0; 0 nếu là hôm nay). */
  distance: number;
  /** yearsAgo: số năm tròn tại lần kỷ niệm đó, ví dụ 81 cho 2/9/1945 → 2/9/2026. */
  items: (T & { yearsAgo: number })[];
};

type Ymd = { year: number; month: number; day: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ngày hôm nay theo giờ Việt Nam (UTC+7), không phụ thuộc múi giờ của máy chủ. */
export function vietnamToday(now: Date): Ymd {
  const shifted = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function parseIsoDate(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

/** Lần kỷ niệm gần hôm nay nhất: kế tiếp (≥ hôm nay) hoặc vừa qua; cách đều thì ưu tiên sắp tới. */
function nearestAnniversary(today: Ymd, month: number, day: number): { signed: number; year: number } {
  const start = Date.UTC(today.year, today.month - 1, today.day);
  const at = (year: number) => Math.round((Date.UTC(year, month - 1, day) - start) / DAY_MS);
  const nextYear = at(today.year) >= 0 ? today.year : today.year + 1;
  const prevYear = at(today.year) < 0 ? today.year : today.year - 1;
  const next = at(nextYear);
  const prev = at(prevYear);
  return next <= -prev ? { signed: next, year: nextYear } : { signed: prev, year: prevYear };
}

export function pickOnThisDay<T extends DatedItem>(items: readonly T[], today: Ymd): OnThisDayResult<T> | null {
  const dated = items.flatMap((item) => {
    const date = parseIsoDate(item.startDate);
    return date ? [{ item, date, ...nearestAnniversary(today, date.month, date.day) }] : [];
  });
  if (dated.length === 0) return null;

  // Gần nhất theo khoảng cách; cách đều thì ưu tiên ngày sắp tới (signed dương).
  const best = dated.reduce((a, b) => (Math.abs(b.signed) < Math.abs(a.signed) || (Math.abs(b.signed) === Math.abs(a.signed) && b.signed > a.signed) ? b : a));
  const chosen = dated.filter((entry) => entry.signed === best.signed);
  return {
    kind: best.signed === 0 ? "today" : best.signed > 0 ? "upcoming" : "recent",
    day: best.date.day,
    month: best.date.month,
    distance: Math.abs(best.signed),
    items: chosen
      .sort((a, b) => a.date.year - b.date.year)
      .map((entry) => ({ ...entry.item, yearsAgo: entry.year - entry.date.year })),
  };
}
