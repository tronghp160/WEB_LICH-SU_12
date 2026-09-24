"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";
import { AttributionControl, CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import { pointsAlong } from "@/lib/battles/animation";
import type { AnimatedFrame, BattleScenario, UnitKind, UnitStatus } from "@/lib/battles/types";

type BattleMapProps = {
  scenario: BattleScenario;
  frame: AnimatedFrame;
};

const STAKE_COUNT = 9;
const iconCache = new Map<string, L.DivIcon>();

/** Biểu tượng đơn vị (L.divIcon, kiểu dáng ở globals.css `.battle-unit*`). Cache để không tạo lại icon mỗi khung hình. */
function getUnitIcon(kind: UnitKind, status: UnitStatus): L.DivIcon {
  const key = `${kind}:${status}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "map-marker",
    html: `<span class="battle-unit battle-unit--${kind} battle-unit--${status}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
  iconCache.set(key, icon);
  return icon;
}

/**
 * Bản đồ của mô phỏng trận đánh. Chỉ chạy ở trình duyệt (nạp qua `next/dynamic` với `ssr: false` ở BattleReenactment).
 * Các đơn vị là marker không tương tác (không thành điểm dừng khi bấm Tab); thông tin nằm ở lời dẫn và chú giải.
 */
export default function BattleMap({ scenario, frame }: BattleMapProps) {
  const stakePoints = useMemo(
    () => pointsAlong(scenario.stakeLine[0], scenario.stakeLine[1], STAKE_COUNT),
    [scenario.stakeLine],
  );
  // Nhãn đặt ở đầu phía đông của hàng cọc, hướng ra ngoài, để không che quân mai phục bờ tây.
  const labelIndex = STAKE_COUNT - 1;

  return (
    <MapContainer
      zoomSnap={0.5}
      center={scenario.center}
      zoom={scenario.zoom}
      minZoom={9}
      maxZoom={14}
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

      <Polyline positions={scenario.riverPath} pathOptions={{ className: "battle-river", weight: 12, lineCap: "round", lineJoin: "round" }} interactive={false} />

      {frame.stakes !== "none" &&
        stakePoints.map((point, index) => (
          // key theo trạng thái để dựng lại vòng tròn khi đổi lớp CSS (Leaflet không cập nhật className khi setStyle).
          <CircleMarker
            key={`${frame.stakes}-${index}`}
            center={point}
            radius={frame.stakes === "exposed" ? 4.5 : 3.5}
            pathOptions={{ className: `battle-stake battle-stake--${frame.stakes}` }}
            interactive={false}
          >
            {index === labelIndex && (
              <Tooltip permanent direction="right" offset={[8, 0]} className="battle-tooltip">
                {frame.stakes === "exposed" ? "Bãi cọc lộ ra" : "Bãi cọc chìm dưới nước"}
              </Tooltip>
            )}
          </CircleMarker>
        ))}

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
