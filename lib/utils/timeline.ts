// Hàm thuần cho trang Dòng thời gian (UC02) — tách riêng để unit test được.

/** Tên tham số URL của bộ lọc chủ đề: `/dong-thoi-gian?chu-de=slug1,slug2`. */
export const TOPIC_FILTER_PARAM = "chu-de";

/** Các mốc "nhảy nhanh" trên thanh điều hướng giai đoạn (Phase 5, mục 4). */
export const TIMELINE_MILESTONES = [1945, 1954, 1975, 1986] as const;

/**
 * Đọc bộ lọc chủ đề từ chuỗi trên URL. Bỏ slug lạ (không thuộc `knownSlugs`),
 * slug trùng và khoảng trắng thừa; giữ nguyên thứ tự xuất hiện đầu tiên.
 */
export function parseTopicFilter(raw: string | null | undefined, knownSlugs: readonly string[]): string[] {
  if (!raw) return [];

  const known = new Set(knownSlugs);
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const slug = part.trim();
    if (slug && known.has(slug) && !result.includes(slug)) result.push(slug);
  }
  return result;
}

/** Ghép bộ lọc thành đường dẫn: không có bộ lọc thì trả về `pathname` trơn. */
export function buildFilterUrl(pathname: string, selectedSlugs: readonly string[]): string {
  if (selectedSlugs.length === 0) return pathname;
  // Slug chỉ gồm a-z, 0-9 và "-" nên không cần mã hóa; giữ dấu "," cho URL dễ đọc.
  return `${pathname}?${TOPIC_FILTER_PARAM}=${selectedSlugs.join(",")}`;
}

/** Bật/tắt một chủ đề trong danh sách đang chọn (không sửa mảng gốc). */
export function toggleTopic(selectedSlugs: readonly string[], slug: string): string[] {
  return selectedSlugs.includes(slug)
    ? selectedSlugs.filter((item) => item !== slug)
    : [...selectedSlugs, slug];
}

export type YearGroup<T> = {
  year: number;
  events: T[];
};

/**
 * Gom sự kiện theo `startYear`. Giữ nguyên thứ tự đầu vào (query đã sắp theo
 * năm → ngày → tiêu đề), chỉ gộp các sự kiện liền nhau cùng năm.
 */
export function groupEventsByYear<T extends { startYear: number }>(events: readonly T[]): YearGroup<T>[] {
  const groups: YearGroup<T>[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.year === event.startYear) {
      last.events.push(event);
    } else {
      groups.push({ year: event.startYear, events: [event] });
    }
  }
  return groups;
}

export type JumpTarget = {
  /** Mốc hiển thị trên nút, ví dụ 1954. */
  milestone: number;
  /** Năm của nhóm đầu tiên có năm >= mốc — nơi cuộn tới. */
  year: number;
};

/**
 * Với mỗi mốc, chọn nhóm năm đầu tiên có năm >= mốc. Mốc không còn nhóm nào
 * (sau khi lọc) thì bỏ; các mốc rơi vào cùng một nhóm chỉ giữ mốc đầu.
 */
export function pickJumpTargets(
  groups: readonly { year: number }[],
  milestones: readonly number[] = TIMELINE_MILESTONES,
): JumpTarget[] {
  const targets: JumpTarget[] = [];
  for (const milestone of milestones) {
    const group = groups.find((item) => item.year >= milestone);
    if (group && !targets.some((target) => target.year === group.year)) {
      targets.push({ milestone, year: group.year });
    }
  }
  return targets;
}

/** Id neo (anchor) cho nhóm năm, dùng cho thanh nhảy nhanh. */
export function yearAnchorId(year: number): string {
  return `nam-${year}`;
}
