// Hàm thuần cho trang Bản đồ (UC03) — tách riêng để unit test được.

/** Khung nhìn ban đầu bao quát Việt Nam (Phase 6, mục 4). Thứ tự Leaflet: [lat, lng]. */
export const VIETNAM_CENTER: [number, number] = [16.0, 106.0];
export const VIETNAM_ZOOM = 5;

/** Bán kính gợi ý (km) cho tìm kiếm quanh một điểm (Phase 6, mục 8). */
export const RADIUS_PRESETS_KM = [10, 25, 50, 100, 200] as const;

/** Trần bán kính khớp với hàm SQL `find_published_locations_within_radius` (2.000.000 m). */
export const MAX_RADIUS_KM = 2000;

export type RadiusValidation = { ok: true; km: number } | { ok: false; message: string };

/**
 * Kiểm tra bán kính người dùng nhập (km). Chấp nhận dấu phẩy thập phân kiểu
 * Việt Nam ("12,5"). Trả về thông báo tiếng Việt khi không hợp lệ.
 */
export function validateRadiusKm(raw: string): RadiusValidation {
  const text = raw.trim().replace(",", ".");
  if (text === "") return { ok: false, message: "Vui lòng nhập bán kính (km)." };

  // Number("") = 0 và Number("1e3") = 1000: chỉ nhận số thập phân thuần.
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) {
    return { ok: false, message: "Bán kính phải là một số, ví dụ 50." };
  }

  const km = Number(text);
  if (km <= 0) return { ok: false, message: "Bán kính phải lớn hơn 0 km." };
  if (km > MAX_RADIUS_KM) {
    return { ok: false, message: `Bán kính không được vượt quá ${MAX_RADIUS_KM.toLocaleString("vi-VN")} km.` };
  }
  return { ok: true, km };
}

/** Đưa kinh độ về [-180, 180): Leaflet có thể trả kinh độ ngoài khoảng này khi người dùng kéo bản đồ vòng quanh địa cầu. */
export function normalizeLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/** Khoảng cách hiển thị bằng km, 1 chữ số thập phân, dấu phẩy kiểu Việt Nam (ví dụ "3,4 km"). */
export function formatDistanceKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

type LocationWithEvents = {
  slug: string;
  events: { slug: string; isPrimary: boolean }[];
};

/**
 * Địa điểm cần bay tới cho `?su-kien=slug`: ưu tiên địa điểm CHÍNH của sự kiện,
 * không có thì lấy địa điểm phụ đầu tiên; không có địa điểm nào (có tọa độ) → undefined.
 */
export function findLocationForEvent<T extends LocationWithEvents>(
  locations: readonly T[],
  eventSlug: string,
): T | undefined {
  const linked = locations.filter((location) =>
    location.events.some((event) => event.slug === eventSlug),
  );
  return (
    linked.find((location) =>
      location.events.some((event) => event.slug === eventSlug && event.isPrimary),
    ) ?? linked[0]
  );
}
