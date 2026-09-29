// Ảnh ở trang công khai: kiểu dữ liệu, cột cần lấy và cách chuyển từ dòng media_assets (migration 20260929000001).
// Dùng chung cho trang sự kiện, nhân vật, địa điểm để ghi công và nhãn trung thực luôn giống nhau.

import { mediaHonestyLabels } from "@/lib/utils/labels";

/** Cột media_assets cần cho trang công khai (nhúng trong select của bảng chủ). */
export const PUBLIC_MEDIA_FIELDS =
  "id, file_url, media_type, caption, alt_text, sort_order, era, year_taken, photographer, license, license_url, source_page_url, is_reenactment, is_colorized, is_cover, focal_point, pair_id, width, height, sources(title)" as const;

export type MediaRow = {
  id: string;
  file_url: string;
  media_type: string;
  caption: string | null;
  alt_text: string | null;
  sort_order: number | null;
  era: string;
  year_taken: number | null;
  photographer: string | null;
  license: string | null;
  license_url: string | null;
  source_page_url: string | null;
  is_reenactment: boolean;
  is_colorized: boolean;
  is_cover: boolean;
  focal_point: string | null;
  pair_id: string | null;
  width: number | null;
  height: number | null;
  // Nguồn có thể bị RLS ẩn với khách (chỉ đọc được nguồn gắn qua event_sources) → null.
  sources: { title: string } | null;
};

export type MediaItem = {
  id: string;
  url: string;
  type: "image" | "document";
  caption: string | null;
  altText: string | null;
  sourceTitle: string | null;
  /** Ví dụ ["Ảnh tư liệu 1954", "Cảnh dựng lại"]. */
  labels: string[];
  era: string;
  photographer: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourcePageUrl: string | null;
  isCover: boolean;
  /** Giá trị CSS object-position, ví dụ "50% 30%". */
  focalPoint: string | null;
  pairId: string | null;
  width: number | null;
  height: number | null;
};

/** Tên giấy phép tiếng Anh thường gặp (lấy nguyên từ Commons) → tiếng Việt cho học sinh đọc. */
const LICENSE_LABELS: Record<string, string> = {
  "public domain": "Phạm vi công cộng",
  attribution: "Được dùng lại, chỉ cần ghi công",
  cc0: "CC0 (phạm vi công cộng)",
};

export function licenseLabel(license: string | null): string | null {
  if (!license) return null;
  return LICENSE_LABELS[license.trim().toLowerCase()] ?? license;
}

export function toMediaItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    url: row.file_url,
    type: row.media_type === "document" ? "document" : "image",
    caption: row.caption,
    altText: row.alt_text,
    sourceTitle: row.sources?.title ?? null,
    labels: mediaHonestyLabels(row),
    era: row.era,
    photographer: row.photographer,
    license: licenseLabel(row.license),
    licenseUrl: row.license_url,
    sourcePageUrl: row.source_page_url,
    isCover: row.is_cover,
    focalPoint: row.focal_point,
    pairId: row.pair_id,
    width: row.width,
    height: row.height,
  };
}

/** Sắp theo thứ tự đã lưu, ảnh bìa lên đầu. */
export function toMediaItems(rows: readonly MediaRow[]): MediaItem[] {
  return [...rows]
    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(toMediaItem);
}

/** Ảnh bìa (hoặc ảnh đầu tiên nếu chưa chọn bìa); null nếu không có ảnh. */
export function pickCover(items: readonly MediaItem[]): MediaItem | null {
  const images = items.filter((item) => item.type === "image");
  return images.find((item) => item.isCover) ?? images[0] ?? null;
}
