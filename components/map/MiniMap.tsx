"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { AttributionControl, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { getMarkerIcon } from "@/components/map/mapIcons";
import type { AccuracyLevel } from "@/lib/utils/labels";

export type MiniMapLocation = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  accuracyLevel: AccuracyLevel;
  /** Vai trò trong sự kiện, ví dụ "Nơi diễn ra". */
  role?: string | null;
  isPrimary?: boolean;
  /** Trang hiện tại chính là trang của địa điểm này → không cần link "Xem địa điểm". */
  isCurrent?: boolean;
};

type MiniMapProps = {
  locations: MiniMapLocation[];
};

/**
 * Bản đồ nhỏ nhúng trong trang chi tiết (sự kiện: địa điểm chính + phụ; địa điểm:
 * chính nó). Chỉ chạy phía trình duyệt — nạp qua MiniMapLazy (`ssr: false`).
 * Không cuộn-để-thu-phóng để không "bắt" thao tác cuộn trang trên điện thoại.
 * Tọa độ Leaflet: [latitude, longitude].
 */
export default function MiniMap({ locations }: MiniMapProps) {
  const bounds = L.latLngBounds(locations.map((item) => [item.latitude, item.longitude]));
  // Tọa độ chính xác thì phóng gần hơn; chỉ có khu vực/gần đúng thì giữ khung rộng.
  const maxZoom = locations.some((item) => item.accuracyLevel === "exact") ? 13 : 9;

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [32, 32], maxZoom }}
      scrollWheelZoom={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <AttributionControl position="bottomright" prefix={false} />

      {locations.map((location) => (
        <Marker
          key={location.slug}
          position={[location.latitude, location.longitude]}
          icon={getMarkerIcon(location.accuracyLevel)}
          title={location.name}
          alt={location.name}
        >
          <Popup>
            <div className="flex min-w-40 flex-col gap-1.5 text-surface-foreground">
              <p className="font-serif text-base font-semibold leading-snug">{location.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <AccuracyBadge level={location.accuracyLevel} />
                {location.isPrimary && <span>Địa điểm chính</span>}
              </div>
              {location.role && <p className="text-xs text-muted-foreground">{location.role}</p>}
              {!location.isCurrent && (
                <Link
                  href={`/dia-diem/${location.slug}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Xem địa điểm
                </Link>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
