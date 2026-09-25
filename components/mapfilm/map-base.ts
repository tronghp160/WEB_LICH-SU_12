import type { GeoJSONSource, Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import { headingDegrees, partialPath } from "@/lib/battles/animation";
import type { BattleScenario, LatLng } from "@/lib/battles/types";
import type { ArrowState, LabelState, StrongpointState } from "@/lib/mapfilm/types";

export type Basemap = "satellite" | "classic";

const DEM_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const TERRAIN_EXAGGERATION = 1.5;

const RED = "#d32f2f";
const BLUE = "#1d5fa8";

const lngLat = ([lat, lng]: LatLng): [number, number] => [lng, lat];

/** Kiểu bản đồ: địa hình Terrarium (AWS Open Data) + nền vệ tinh Esri hoặc nền "cổ điển" tô màu theo độ cao kiểu bản đồ SGK. */
export function buildStyle(scenario: BattleScenario, basemap: Basemap): StyleSpecification {
  // Địa hình và bóng đổ dùng hai nguồn riêng (cùng ảnh) để tránh sai lệch khi MapLibre dựng lưới địa hình
  const dem = { type: "raster-dem" as const, tiles: [DEM_TILES], tileSize: 256, maxzoom: 15, encoding: "terrarium" as const };
  const zoneFeatures = (scenario.zoneDefinitions ?? []).map((zone) => ({
    type: "Feature" as const,
    properties: { zid: zone.id, kind: zone.kind },
    geometry: { type: "Polygon" as const, coordinates: [[...zone.path, zone.path[0]].map(lngLat)] },
  }));
  const satellite = basemap === "satellite" ? "visible" : "none";
  const classic = basemap === "classic" ? "visible" : "none";
  return {
    version: 8,
    sources: {
      dem: { ...dem, attribution: "Độ cao: Terrain Tiles (Mapzen, AWS Open Data; SRTM – NASA/USGS)" },
      "dem-shade": dem,
      satellite: {
        type: "raster",
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: 18,
        attribution: "Ảnh vệ tinh: Esri, Maxar, Earthstar Geographics",
      },
      borders: { type: "geojson", data: "/mapfilm/indochina-borders.geojson", attribution: "Biên giới: Natural Earth" },
      river: {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: (scenario.riverPath ?? []).map(lngLat) } },
      },
      zones: { type: "geojson", data: { type: "FeatureCollection", features: zoneFeatures }, promoteId: "zid" },
      arrows: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
      arrowheads: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#e9dfc6" } },
      {
        id: "relief",
        type: "color-relief",
        source: "dem-shade",
        layout: { visibility: classic },
        paint: {
          "color-relief-color": [
            "interpolate",
            ["linear"],
            ["elevation"],
            -3000, "#7fa9c9",
            -50, "#a9c9dc",
            0, "#bcd6de",
            1, "#d7e2b8",
            150, "#cbdca3",
            400, "#e6dca0",
            800, "#dcc085",
            1300, "#c99c68",
            2000, "#a9774b",
            3000, "#8a5a3a",
          ],
        },
      },
      { id: "satellite", type: "raster", source: "satellite", layout: { visibility: satellite }, paint: { "raster-brightness-max": 1, "raster-saturation": -0.1 } },
      {
        id: "hillshade",
        type: "hillshade",
        source: "dem-shade",
        paint: {
          "hillshade-exaggeration": basemap === "classic" ? 0.55 : 0.25,
          "hillshade-shadow-color": "#473520",
          "hillshade-highlight-color": "#fffaf0",
        },
      },
      { id: "borders", type: "line", source: "borders", paint: { "line-color": basemap === "classic" ? "#7b4f35" : "#f5ead2", "line-width": 1.4, "line-dasharray": [3, 2], "line-opacity": 0.85 } },
      {
        id: "river",
        type: "line",
        source: "river",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#3b82c4", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 5], "line-opacity": 0.85 },
      },
      {
        id: "zones-fill",
        type: "fill",
        source: "zones",
        filter: ["==", ["get", "kind"], "sector"],
        paint: { "fill-color": BLUE, "fill-opacity": ["*", 0.16, ["coalesce", ["feature-state", "o"], 0]] },
      },
      {
        id: "zones-sector-line",
        type: "line",
        source: "zones",
        filter: ["==", ["get", "kind"], "sector"],
        paint: { "line-color": BLUE, "line-width": 2, "line-opacity": ["coalesce", ["feature-state", "o"], 0] },
      },
      {
        id: "zones-siege-line",
        type: "line",
        source: "zones",
        filter: ["==", ["get", "kind"], "siege"],
        paint: { "line-color": RED, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2.5, 15, 5], "line-dasharray": [2, 1.2], "line-opacity": ["coalesce", ["feature-state", "o"], 0] },
      },
      {
        id: "arrows-casing",
        type: "line",
        source: "arrows",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 5, 10, 8, 14, 13], "line-opacity": ["*", 0.75, ["get", "o"]] },
      },
      {
        id: "arrows-solid",
        type: "line",
        source: "arrows",
        filter: ["!=", ["get", "kind"], "supply"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["case", ["==", ["get", "kind"], "enemy"], BLUE, RED],
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 5, 14, 8],
          "line-opacity": ["get", "o"],
        },
      },
      {
        id: "arrows-supply",
        type: "line",
        source: "arrows",
        filter: ["==", ["get", "kind"], "supply"],
        layout: { "line-join": "round" },
        paint: { "line-color": RED, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 6], "line-dasharray": [1.6, 1.1], "line-opacity": ["get", "o"] },
      },
      {
        id: "arrowheads",
        type: "symbol",
        source: "arrowheads",
        layout: {
          "icon-image": ["case", ["==", ["get", "kind"], "enemy"], "arrowhead-blue", "arrowhead-red"],
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.45, 10, 0.6, 14, 0.9],
        },
        paint: { "icon-opacity": ["get", "o"] },
      },
    ],
    sky: {
      "sky-color": "#8fb8e0",
      "horizon-color": "#e8eef2",
      "fog-color": "#dfe7ea",
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.6,
      "fog-ground-blend": 0.35,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.4, 12, 0],
    },
  };
}

function arrowheadImage(color: string): ImageData {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(58, 56);
  ctx.lineTo(32, 44);
  ctx.lineTo(6, 56);
  ctx.closePath();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

type MaplibreModule = typeof import("maplibre-gl");

export type MapBase = {
  setBasemap: (basemap: Basemap) => void;
  setNight: (night: number) => void;
  setArrows: (arrows: ArrowState[]) => void;
  setZones: (zones: Record<string, number>) => void;
  setLabels: (labels: LabelState[], strongpoints: StrongpointState[]) => void;
  dispose: () => void;
};

/** Bộ cập nhật các lớp 2D phủ trên địa hình (mũi tên, vùng, nhãn) và nền bản đồ; chỉ đẩy dữ liệu mới khi có thay đổi. */
export function createMapBase(maplibre: MaplibreModule, map: MapLibreMap, scenario: BattleScenario, initial: Basemap): MapBase {
  map.addImage("arrowhead-red", arrowheadImage(RED), { pixelRatio: 2 });
  map.addImage("arrowhead-blue", arrowheadImage(BLUE), { pixelRatio: 2 });
  let basemap = initial;
  let night = -1;
  let arrowKey = "";
  const zoneState: Record<string, number> = {};
  const markers = new Map<string, { marker: Marker; element: HTMLElement; key: string }>();

  const applyBasemap = () => {
    map.setLayoutProperty("satellite", "visibility", basemap === "satellite" ? "visible" : "none");
    map.setLayoutProperty("relief", "visibility", basemap === "classic" ? "visible" : "none");
    map.setPaintProperty("hillshade", "hillshade-exaggeration", basemap === "classic" ? 0.55 : 0.25);
    map.setPaintProperty("borders", "line-color", basemap === "classic" ? "#7b4f35" : "#f5ead2");
    const n = night;
    night = -1;
    applyNight(Math.max(0, n));
  };

  const applyNight = (value: number) => {
    if (Math.abs(value - night) < 0.01) return;
    night = value;
    map.setPaintProperty("satellite", "raster-brightness-max", 1 - 0.68 * value);
    map.setPaintProperty("relief", "color-relief-opacity", 1 - 0.62 * value);
    map.setPaintProperty("background", "background-color", mix("#e9dfc6", "#15192a", value));
    map.setPaintProperty("hillshade", "hillshade-highlight-color", mix("#fffaf0", "#3a4260", value));
    map.setSky({
      "sky-color": mix("#8fb8e0", "#0b1024", value),
      "horizon-color": mix("#e8eef2", "#26304a", value),
      "fog-color": mix("#dfe7ea", "#141a2c", value),
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.6,
      "fog-ground-blend": 0.35,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 0.4, 12, 0],
    });
  };

  const upsertMarker = (id: string, at: LatLng, className: string, text: string, opacity: number, title?: string) => {
    const key = `${className}|${text}`;
    let entry = markers.get(id);
    if (!entry) {
      // MapLibre tự gắn lớp định vị lên phần tử ngoài, nên chữ và kiểu dáng nằm ở phần tử con
      const wrapper = document.createElement("div");
      wrapper.setAttribute("aria-hidden", "true");
      const element = document.createElement("span");
      wrapper.appendChild(element);
      const marker = new maplibre.Marker({ element: wrapper, anchor: "bottom", offset: [0, -6] }).setLngLat(lngLat(at)).addTo(map);
      entry = { marker, element, key: "" };
      markers.set(id, entry);
    }
    if (entry.key !== key) {
      entry.element.className = className;
      entry.element.textContent = text;
      if (title) entry.element.title = title;
      entry.key = key;
    }
    entry.element.style.opacity = opacity.toFixed(2);
    entry.element.style.display = opacity < 0.02 ? "none" : "";
  };

  return {
    setBasemap(next) {
      if (next === basemap) return;
      basemap = next;
      applyBasemap();
    },
    setNight: applyNight,
    setArrows(arrows) {
      const key = arrows.map((a) => `${a.id}:${a.progress.toFixed(3)}:${a.opacity.toFixed(2)}`).join("|");
      if (key === arrowKey) return;
      arrowKey = key;
      const lines: GeoJSON.Feature[] = [];
      const heads: GeoJSON.Feature[] = [];
      for (const arrow of arrows) {
        const partial = partialPath(arrow.path, arrow.progress);
        if (partial.length < 2) continue;
        lines.push({ type: "Feature", properties: { kind: arrow.kind, o: arrow.opacity }, geometry: { type: "LineString", coordinates: partial.map(lngLat) } });
        if (arrow.kind !== "supply" && arrow.progress > 0.03) {
          heads.push({ type: "Feature", properties: { kind: arrow.kind, o: arrow.opacity, heading: headingDegrees(partial) }, geometry: { type: "Point", coordinates: lngLat(partial[partial.length - 1]) } });
        }
      }
      (map.getSource("arrows") as GeoJSONSource).setData({ type: "FeatureCollection", features: lines });
      (map.getSource("arrowheads") as GeoJSONSource).setData({ type: "FeatureCollection", features: heads });
    },
    setZones(zones) {
      for (const [id, value] of Object.entries(zones)) {
        const rounded = Math.round(value * 50) / 50;
        if (zoneState[id] === rounded) continue;
        zoneState[id] = rounded;
        map.setFeatureState({ source: "zones", id }, { o: rounded });
      }
    },
    setLabels(labels, strongpoints) {
      const seen = new Set<string>();
      for (const sp of strongpoints) {
        const id = `sp-${sp.id}`;
        seen.add(id);
        upsertMarker(id, sp.position, `mapfilm-sp mapfilm-sp--${sp.status}`, sp.label, sp.opacity, sp.name);
      }
      for (const label of labels) {
        const id = `label-${label.id}`;
        seen.add(id);
        upsertMarker(id, label.at, `mapfilm-label mapfilm-label--${label.tone}`, label.text, label.opacity);
      }
      for (const [id, entry] of markers) {
        if (seen.has(id)) continue;
        entry.marker.remove();
        markers.delete(id);
      }
    },
    dispose() {
      for (const entry of markers.values()) entry.marker.remove();
      markers.clear();
    },
  };
}

/** Trộn hai màu hex theo tỉ lệ t. */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}
