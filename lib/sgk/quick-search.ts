// Tìm nhanh trong lớp phủ tìm kiếm (mục 6.10): kết quả NHÓM THEO LOẠI — Bài · Sự kiện · Nhân vật · Địa điểm. Chỉ mục gọn
// (vài chục bản ghi đã công bố) tải một lần từ /api/tim-kiem rồi lọc trong trình duyệt, gõ không dấu vẫn được.
// Hàm thuần — unit test được.

import { searchSgkLessons } from "@/lib/sgk/search";
import type { SgkLessonEntry } from "@/lib/sgk/curriculum";
import { foldText, toTokens } from "@/lib/utils/search";

export type QuickSearchIndex = {
  events: { slug: string; title: string; dateText: string }[];
  figures: { slug: string; name: string; otherNames: string | null; lifespan: string | null }[];
  locations: { slug: string; name: string; historicalName: string | null }[];
};

export type QuickSearchResults = {
  lessons: SgkLessonEntry[];
  events: QuickSearchIndex["events"];
  figures: QuickSearchIndex["figures"];
  locations: QuickSearchIndex["locations"];
};

const matches = (text: string, tokens: readonly string[]) => {
  const folded = foldText(text);
  return tokens.every((token) => folded.includes(token));
};

/** Lọc chỉ mục theo từ khóa (mọi từ phải xuất hiện), mỗi nhóm tối đa `limit` kết quả. */
export function quickSearch(index: QuickSearchIndex | null, query: string, limit = 5): QuickSearchResults {
  const tokens = toTokens(query);
  const empty = { lessons: [], events: [], figures: [], locations: [] };
  if (tokens.length === 0) return empty;
  const lessons = searchSgkLessons(query, limit);
  if (!index) return { ...empty, lessons };
  return {
    lessons,
    events: index.events.filter((item) => matches(`${item.title} ${item.dateText}`, tokens)).slice(0, limit),
    figures: index.figures.filter((item) => matches(`${item.name} ${item.otherNames ?? ""} ${item.lifespan ?? ""}`, tokens)).slice(0, limit),
    locations: index.locations.filter((item) => matches(`${item.name} ${item.historicalName ?? ""}`, tokens)).slice(0, limit),
  };
}
