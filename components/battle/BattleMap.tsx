"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  AttributionControl,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { headingDegrees, partialPath, pointsAlong } from "@/lib/battles/animation";
import type { AnimatedFrame, BattleScenario, CameraView, LatLng, StrongpointStatus, UnitKind, UnitStatus } from "@/lib/battles/types";

type BattleMapProps = {
  scenario: BattleScenario;
  frame: AnimatedFrame;
  /** Khung nhìn của bước đang tới; đổi giá trị → bản đồ bay tới. */
  camera: CameraView;
  /** Thời gian bay (giây); 0 = nhảy thẳng (giảm chuyển động). */
  flyDuration: number;
};

const STAKE_COUNT = 9;
const iconCache = new Map<string, L.DivIcon>();

function cachedIcon(key: string, create: () => L.DivIcon): L.DivIcon {
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = create();
  iconCache.set(key, icon);
  return icon;
}

/** Biểu tượng đơn vị (kiểu dáng ở globals.css `.battle-unit*`). Cache để không tạo lại icon mỗi khung hình. */
function getUnitIcon(kind: UnitKind, status: UnitStatus): L.DivIcon {
  return cachedIcon(`unit:${kind}:${status}`, () =>
    L.divIcon({
      className: "map-marker",
      html: `<span class="battle-unit battle-unit--${kind} battle-unit--${status}"></span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    }),
  );
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Cứ điểm: ô vuông theo trạng thái + nhãn ngắn (A1, C1...). */
function getStrongpointIcon(label: string, status: StrongpointStatus, minorLabel = false): L.DivIcon {
  return cachedIcon(`sp:${label}:${status}:${minorLabel}`, () =>
    L.divIcon({
      className: "map-marker",
      html: `<span class="battle-sp battle-sp--${status}"><span class="battle-sp__label${minorLabel ? " battle-sp__label--minor" : ""}">${escapeHtml(label)}</span></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
  );
}

/** Đầu mũi tên xoay theo hướng đoạn cuối (làm tròn 5° để tận dụng cache). */
function getArrowheadIcon(kind: string, degrees: number): L.DivIcon {
  const rounded = Math.round(degrees / 5) * 5;
  return cachedIcon(`head:${kind}:${rounded}`, () =>
    L.divIcon({
      className: "map-marker",
      html: `<span class="battle-arrowhead battle-arrowhead--${kind}" style="transform: rotate(${rounded}deg)"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    }),
  );
}

/** Nhãn chữ của một vùng (phân khu...), neo ở giữa cạnh dưới để nằm ngay trên mép vùng. */
function getZoneLabelIcon(label: string): L.DivIcon {
  return cachedIcon(`zone:${label}`, () =>
    L.divIcon({
      className: "map-marker",
      html: `<span class="battle-zone-label">${escapeHtml(label)}</span>`,
      iconSize: [120, 18],
      iconAnchor: [60, 20],
    }),
  );
}

/** Điểm cao nhất (vĩ độ lớn nhất) của một vùng. */
function topOf(path: LatLng[]): LatLng {
  return path.reduce((top, point) => (point[0] > top[0] ? point : top), path[0]);
}

/**
 * Gắn `data-zoom-band` lên khung bản đồ: ở mức zoom trung gian (9–12) các nhãn cứ điểm/phân khu dồn cục nên được ẩn
 * (xem globals.css); zoom rất xa (toàn cảnh) hoặc gần thì hiện nhãn.
 */
function ZoomBand() {
  const map = useMapEvents({
    zoomend: () => apply(),
  });
  function apply() {
    const zoom = map.getZoom();
    const container = map.getContainer();
    container.dataset.zoomBand = zoom < 9 ? "far" : zoom < 12.5 ? "mid" : "near";
    // Xem toàn quốc: ẩn nhãn phụ (StrongpointDefinition.minorLabel).
    container.dataset.countryView = String(zoom < 6);
  }
  useEffect(apply);
  return null;
}

/** Bay tới khung nhìn của bước khi bước đổi. */
function CameraController({ camera, flyDuration }: { camera: CameraView; flyDuration: number }) {
  const map = useMap();
  const [lat, lng] = camera.center;
  const { zoom } = camera;
  useEffect(() => {
    if (flyDuration > 0) map.flyTo([lat, lng], zoom, { duration: flyDuration });
    else map.setView([lat, lng], zoom, { animate: false });
  }, [map, lat, lng, zoom, flyDuration]);
  return null;
}

/**
 * Bản đồ của mô phỏng trận đánh. Chỉ chạy ở trình duyệt (nạp qua `next/dynamic` với `ssr: false` ở BattleReenactment).
 * Các biểu tượng không tương tác (không thành điểm dừng khi bấm Tab); thông tin nằm ở lời dẫn và chú giải.
 */
export default function BattleMap({ scenario, frame, camera, flyDuration }: BattleMapProps) {
  const stakePoints = useMemo(
    () => (scenario.stakeLine ? pointsAlong(scenario.stakeLine[0], scenario.stakeLine[1], STAKE_COUNT) : []),
    [scenario.stakeLine],
  );
  // Nhãn đặt ở đầu phía đông của hàng cọc, hướng ra ngoài, để không che quân mai phục bờ tây.
  const labelIndex = STAKE_COUNT - 1;

  return (
    <MapContainer
      zoomSnap={0.5}
      center={scenario.center}
      zoom={scenario.zoom}
      minZoom={scenario.minZoom ?? 9}
      maxZoom={scenario.maxZoom ?? 14}
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
      <CameraController camera={camera} flyDuration={flyDuration} />
      <ZoomBand />

      {scenario.riverPath && (
        <Polyline
          positions={scenario.riverPath}
          className="battle-river"
          pathOptions={{ weight: 12, lineCap: "round", lineJoin: "round" }}
          interactive={false}
        />
      )}

      {scenario.zoneDefinitions?.map((zone) => {
        const opacity = frame.zones[zone.id] ?? 0;
        if (opacity <= 0.01) return null;
        return (
          <Polygon
            key={zone.id}
            positions={zone.path}
            className={`battle-zone battle-zone--${zone.kind}`}
            pathOptions={{
              opacity,
              fillOpacity: opacity * (zone.kind === "siege" ? 0.08 : 0.14),
              weight: zone.kind === "siege" ? 3 : 2,
              dashArray: zone.kind === "siege" ? "2 7" : "6 6",
            }}
            interactive={false}
          />
        );
      })}
      {/* Nhãn vùng đặt ở mép trên của vùng (không phải tâm) để không đè lên nhãn cứ điểm ở giữa. */}
      {scenario.zoneDefinitions?.map((zone) => {
        const opacity = frame.zones[zone.id] ?? 0;
        if (!zone.label || opacity <= 0.6) return null;
        return (
          <Marker
            key={`${zone.id}-label`}
            position={topOf(zone.path)}
            icon={getZoneLabelIcon(zone.label)}
            opacity={opacity}
            interactive={false}
            keyboard={false}
          />
        );
      })}

      {frame.stakes !== "none" &&
        stakePoints.map((point, index) => (
          // `className` phải là prop riêng (react-leaflet chỉ gắn class lúc tạo layer, không nhận trong pathOptions);
          // key theo trạng thái để dựng lại vòng tròn khi đổi lớp CSS.
          <CircleMarker
            key={`${frame.stakes}-${index}`}
            center={point}
            radius={frame.stakes === "exposed" ? 4.5 : 3.5}
            className={`battle-stake battle-stake--${frame.stakes}`}
            interactive={false}
          >
            {index === labelIndex && (
              <Tooltip permanent direction="right" offset={[8, 0]} className="battle-tooltip">
                {frame.stakes === "exposed" ? "Bãi cọc lộ ra" : "Bãi cọc chìm dưới nước"}
              </Tooltip>
            )}
          </CircleMarker>
        ))}

      {scenario.arrowDefinitions?.map((arrow) => {
        const state = frame.arrows[arrow.id];
        if (!state || state.opacity <= 0.01 || state.progress <= 0.01) return null;
        return (
          <Polyline
            key={arrow.id}
            positions={partialPath(arrow.path, state.progress)}
            className={`battle-arrow battle-arrow--${arrow.kind}`}
            pathOptions={{ weight: 5, opacity: state.opacity, lineCap: "round" }}
            interactive={false}
          />
        );
      })}
      {scenario.arrowDefinitions?.map((arrow) => {
        const state = frame.arrows[arrow.id];
        if (!state || state.opacity <= 0.01 || state.progress <= 0.01) return null;
        const drawn = partialPath(arrow.path, state.progress);
        return (
          <Marker
            key={`${arrow.id}-head`}
            position={drawn[drawn.length - 1]}
            icon={getArrowheadIcon(arrow.kind, headingDegrees(drawn))}
            opacity={state.opacity}
            interactive={false}
            keyboard={false}
          />
        );
      })}

      {scenario.strongpointDefinitions?.map((point) => {
        const state = frame.strongpoints[point.id];
        if (!state || state.opacity <= 0.01) return null;
        return (
          <Marker
            key={point.id}
            position={point.position}
            icon={getStrongpointIcon(point.label, state.status, point.minorLabel)}
            opacity={state.opacity}
            title={point.name}
            interactive={false}
            keyboard={false}
          />
        );
      })}

      {scenario.unitDefinitions.map((definition) => {
        const unit = frame.units[definition.id];
        if (!unit) return null;
        return (
          <Marker
            key={definition.id}
            position={unit.position}
            icon={getUnitIcon(definition.kind, unit.status)}
            opacity={unit.status === "sunk" ? Math.min(unit.opacity, 0.75) : unit.opacity}
            interactive={false}
            keyboard={false}
          />
        );
      })}
    </MapContainer>
  );
}
