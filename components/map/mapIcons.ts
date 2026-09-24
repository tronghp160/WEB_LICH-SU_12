import L from "leaflet";
import type { AccuracyLevel } from "@/lib/utils/labels";

/**
 * Icon marker tự định nghĩa bằng `L.divIcon` (không dùng icon ảnh mặc định của
 * Leaflet — đường dẫn ảnh bị vỡ khi bundle bằng Next.js). Kiểu dáng nằm trong
 * globals.css (`.map-pin*`) để đổi màu theo dark mode.
 *
 * Phân biệt theo độ chính xác tọa độ (Mục 6, KE_HOACH_DU_AN.md):
 *  - exact       → ghim đặc
 *  - approximate → ghim viền rỗng
 *  - region / unknown → vòng tròn mờ nét đứt (tọa độ chỉ đại diện cho khu vực)
 */
const cache = new Map<string, L.DivIcon>();

export function getMarkerIcon(level: AccuracyLevel): L.DivIcon {
  const kind = level === "exact" || level === "approximate" ? level : "region";
  const cached = cache.get(kind);
  if (cached) return cached;

  const icon =
    kind === "region"
      ? L.divIcon({
          className: "map-marker",
          html: '<span class="map-pin map-pin--region"></span>',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -17],
        })
      : L.divIcon({
          className: "map-marker",
          html: `<span class="map-pin map-pin--${kind}"></span>`,
          iconSize: [26, 26],
          // Mũi ghim (góc dưới của hình vuông xoay 45°) nằm cách tâm ~18px.
          iconAnchor: [13, 31],
          popupAnchor: [0, -30],
        });

  cache.set(kind, icon);
  return icon;
}
