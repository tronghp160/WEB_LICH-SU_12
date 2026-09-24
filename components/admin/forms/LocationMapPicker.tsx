"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { AttributionControl, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { getMarkerIcon } from "@/components/map/mapIcons";
import type { AccuracyLevel } from "@/lib/utils/labels";
import { VIETNAM_CENTER, VIETNAM_ZOOM, normalizeLng } from "@/lib/utils/map";

type LocationMapPickerProps = {
  latitude: number | null;
  longitude: number | null;
  accuracyLevel: AccuracyLevel;
  onPick: (latitude: number, longitude: number) => void;
};

function ClickToPick({ onPick }: { onPick: LocationMapPickerProps["onPick"] }) {
  useMapEvents({
    click(event) {
      // Làm tròn 6 chữ số thập phân (khớp numeric(9,6) trong DB) và đưa kinh độ về [-180, 180).
      onPick(Math.round(event.latlng.lat * 1e6) / 1e6, Math.round(normalizeLng(event.latlng.lng) * 1e6) / 1e6);
    },
  });
  return null;
}

/** Khi tọa độ được gõ tay và điểm nằm ngoài khung nhìn hiện tại, đưa bản đồ tới điểm đó. */
function KeepPointVisible({ point }: { point: L.LatLngTuple | null }) {
  const map = useMap();
  const lat = point?.[0];
  const lng = point?.[1];

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    if (!map.getBounds().contains([lat, lng])) map.setView([lat, lng], Math.max(map.getZoom(), 9));
  }, [lat, lng, map]);

  return null;
}

/**
 * Bản đồ nhỏ để chọn tọa độ địa điểm bằng cách bấm lên bản đồ (UC07). Thứ tự Leaflet: [lat, lng].
 * Chỉ chạy phía trình duyệt — nạp qua LocationMapPickerLazy (`ssr: false`).
 */
export default function LocationMapPicker({ latitude, longitude, accuracyLevel, onPick }: LocationMapPickerProps) {
  const point: L.LatLngTuple | null = latitude !== null && longitude !== null ? [latitude, longitude] : null;

  return (
    <MapContainer
      center={point ?? VIETNAM_CENTER}
      zoom={point ? 12 : VIETNAM_ZOOM}
      scrollWheelZoom={false}
      attributionControl={false}
      className="h-full w-full cursor-crosshair"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <AttributionControl position="bottomright" prefix={false} />
      <ClickToPick onPick={onPick} />
      <KeepPointVisible point={point} />
      {point && <Marker position={point} icon={getMarkerIcon(accuracyLevel)} interactive={false} />}
    </MapContainer>
  );
}
