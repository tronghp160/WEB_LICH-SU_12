// Sổ tay ôn thi từng bài (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8): dựng từ dữ liệu ĐÃ CÔNG BỐ — khung SGK
// (lib/sgk/curriculum.ts: mục, yêu cầu cần đạt), sự kiện của từng mục (mốc thời gian, tóm tắt), nhân vật gắn với sự kiện, và
// "câu hay bị nhầm" (tỉ lệ đạt thấp, chỉ khi đủ lượt thống kê). Thuộc gói; một bài xem thử miễn phí.

/** Bài xem thử miễn phí — bài nhiều sự kiện, trọng tâm ôn thi. */
export const FREE_HANDBOOK_LESSON = "6-cach-mang-thang-tam-nam-1945";
/** Câu "hay bị nhầm": tỉ lệ đạt dưới mức này (khi đủ STATS_MIN_ATTEMPTS lượt). */
export const TRICKY_MAX_P = 0.6;
export const TRICKY_LIMIT = 5;

export type HandbookEvent = { slug: string; title: string; dateText: string; startYear: number; summary: string };
export type HandbookFigure = { slug: string; name: string; years: string | null };
export type HandbookTricky = { itemId: string; kind: "mcq" | "true_false"; stem: string; answer: string; explanation: string; p: number };

export type Handbook = {
  lesson: { slug: string; number: number; title: string; topicTitle: string; goals: string[] };
  sections: { id: string; numeral: string; title: string; events: HandbookEvent[] }[];
  timeline: HandbookEvent[];
  figures: HandbookFigure[];
  tricky: HandbookTricky[];
};

/** Mốc thời gian: sự kiện không trùng, theo năm rồi theo tên. */
export function buildTimeline(sections: Handbook["sections"]): HandbookEvent[] {
  const seen = new Map<string, HandbookEvent>();
  for (const section of sections) for (const event of section.events) if (!seen.has(event.slug)) seen.set(event.slug, event);
  return [...seen.values()].sort((a, b) => a.startYear - b.startYear || a.title.localeCompare(b.title, "vi"));
}

/** "1890–1969", "sinh 1911", hoặc null. */
export function figureYears(birth: number | null, death: number | null): string | null {
  if (birth && death) return `${birth}–${death}`;
  if (birth) return `sinh ${birth}`;
  return null;
}
