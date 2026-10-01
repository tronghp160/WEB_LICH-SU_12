import { sgkLessons, type SgkLessonEntry } from "@/lib/sgk/curriculum";
import { foldText, toTokens } from "@/lib/utils/search";

/**
 * Tìm Bài SGK theo số hoặc tên, gõ có dấu hay không dấu: "bài 7", "bai7", "7", "chong phap", "asean".
 * Dữ liệu tĩnh nên tìm ngay trong trình duyệt (lớp phủ tìm kiếm), không cần database.
 */
export function searchSgkLessons(query: string, limit = 5): SgkLessonEntry[] {
  const folded = foldText(query).trim();
  if (!folded) return [];

  const number = /^(?:bai\s*)?(\d{1,2})$/.exec(folded)?.[1];
  if (number) {
    const lesson = sgkLessons.find((item) => item.number === Number(number));
    return lesson ? [lesson] : [];
  }

  const tokens = toTokens(query).filter((token) => token !== "bai");
  if (tokens.length === 0) return [];
  return sgkLessons
    .filter((lesson) => {
      const haystack = foldText(`${lesson.title} ${lesson.shortTitle} ${lesson.topic.title} ${lesson.sections.map((section) => section.title).join(" ")}`);
      return tokens.every((token) => haystack.includes(token));
    })
    .slice(0, limit);
}
