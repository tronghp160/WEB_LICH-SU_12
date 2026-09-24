"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import {
  AttributionControl,
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocationPopup } from "@/components/map/LocationPopup";
import { getMarkerIcon } from "@/components/map/mapIcons";
import type { MapLocation } from "@/lib/queries/locations";
import { VIETNAM_CENTER, VIETNAM_ZOOM, normalizeLng } from "@/lib/utils/map";

export type MapFocus = {
  slug: string;
  /** Tăng mỗi lần yêu cầu để bay tới cùng một địa điểm hai lần liên tiếp vẫn có tác dụng. */
  nonce: number;
};

export type MapRadius = { lat: number; lng: number; km: number };

type HistoryMapProps = {
  locations: MapLocation[];
  focus: MapFocus | null;
  radius: MapRadius | null;
  /** Tâm tìm kiếm đã chọn (có thể chưa có bán kính hợp lệ để vẽ vòng tròn). */
  center: { lat: number; lng: number } | null;
  pickingCenter: boolean;
  onPickCenter: (lat: number, lng: number) => void;
  onSearchAround: (location: MapLocation) => void;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Bay tới địa điểm được yêu cầu rồi mở popup của nó; vừa vặn vòng tròn khi có tìm kiếm bán kính. */
function MapController({
  locations,
  focus,
  radius,
  markers,
}: {
  locations: MapLocation[];
  focus: MapFocus | null;
  radius: MapRadius | null;
  markers: React.RefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focus) return;
    const location = locations.find((item) => item.slug === focus.slug);
    if (!location) return;

    const animate = !prefersReducedMotion();
    const target: L.LatLngTuple = [location.latitude, location.longitude];
    const open = () => markers.current.get(location.slug)?.openPopup();

    // Mở popup SAU khi bản đồ dừng để popup không bị "tự cuộn" giữa chuyến bay.
    map.once("moveend", open);
    const fallback = window.setTimeout(open, 1500);
    map.flyTo(target, Math.max(map.getZoom(), 9), { animate, duration: 0.8 });

    return () => {
      map.off("moveend", open);
      window.clearTimeout(fallback);
    };
    // Chỉ chạy lại khi có yêu cầu bay mới (nonce), không phải khi danh sách địa điểm đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, map]);

  useEffect(() => {
    if (!radius) return;
    // toBounds(kích thước cạnh, mét): hình vuông ngoại tiếp vòng tròn. (L.circle().getBounds()
    // không dùng được ở đây vì cần circle đã gắn vào bản đồ.)
    const bounds = L.latLng(radius.lat, radius.lng).toBounds(radius.km * 2000);
    map.fitBounds(bounds, { padding: [24, 24], animate: !prefersReducedMotion() });
  }, [radius, map]);

  return null;
}

/** Bấm lên bản đồ để chọn tâm tìm kiếm (chỉ khi đang ở chế độ chọn tâm). */
function CenterPicker({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useMapEvents({
    click(event) {
      if (active) onPick(event.latlng.lat, normalizeLng(event.latlng.lng));
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle("map-picking", active);
    return () => container.classList.remove("map-picking");
  }, [active, map]);

  return null;
}

/**
 * Bản đồ lịch sử (UC03). Chỉ chạy phía trình duyệt — được nạp bằng
 * `next/dynamic` với `ssr: false` trong MapExplorer để không lỗi
 * `window is not defined` khi build.
 *
 * Lưu ý thứ tự tọa độ: Leaflet dùng [latitude, longitude] (ngược với PostGIS).
 */
export default function HistoryMap({
  locations,
  focus,
  radius,
  center,
  pickingCenter,
  onPickCenter,
  onSearchAround,
}: HistoryMapProps) {
  const markers = useRef(new Map<string, L.Marker>());

  return (
    <MapContainer
      center={VIETNAM_CENTER}
      zoom={VIETNAM_ZOOM}
      minZoom={3}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {/* Ghi nguồn ở góc trên phải: góc dưới bị bottom sheet che trên điện thoại. */}
      <AttributionControl position="topright" prefix={false} />

      {locations.map((location) => (
        <Marker
          key={location.slug}
          position={[location.latitude, location.longitude]}
          icon={getMarkerIcon(location.accuracyLevel)}
          title={location.name}
          alt={location.name}
          ref={(marker) => {
            if (marker) markers.current.set(location.slug, marker);
            else markers.current.delete(location.slug);
          }}
        >
          <Popup>
            <LocationPopup location={location} onSearchAround={onSearchAround} />
          </Popup>
        </Marker>
      ))}

      {center && (
        <CircleMarker
          center={[center.lat, center.lng]}
          radius={6}
          className="map-center"
          interactive={false}
        />
      )}
      {radius && (
        <Circle
          center={[radius.lat, radius.lng]}
          radius={radius.km * 1000}
          className="map-radius"
          interactive={false}
        />
      )}

      <MapController locations={locations} focus={focus} radius={radius} markers={markers} />
      <CenterPicker active={pickingCenter} onPick={onPickCenter} />
    </MapContainer>
  );
}
