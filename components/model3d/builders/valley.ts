import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { planeGeometry } from "@/components/mapfilm/models";
import { foliage, group, mesh, std, tube, type BuiltModel } from "@/components/model3d/kit";
import { fbm2, flagTexture, textPlateTexture, woodTexture } from "@/components/model3d/textures";
import { dienBienPhu1954, SP } from "@/lib/battles/dien-bien-phu-1954";
import type { LatLng } from "@/lib/battles/types";
import { clamp, easeInOut, lerp, smoothstep } from "@/lib/cinema/math";
import { blurGrid, decodeTerrarium } from "@/lib/cinema/terrain";
import { toMercator } from "@/lib/mapfilm/geo";
import { VALLEY_BOUNDS, VALLEY_DEM_URL } from "@/lib/models3d/valley";

/**
 * Sa bàn "Chiến thắng qua những con số": lòng chảo Điện Biên Phủ dựng từ ảnh độ cao thật (Terrain Tiles, SRTM) đặt trên bệ gỗ.
 * Khi mở: địa hình trồi lên, cờ Pháp trên các cứ điểm được thay bằng cờ đỏ sao vàng, rồi ba con số hiện thành hình khối:
 * 56 ô lịch (56 ngày đêm), 16.200 quân địch (từng chấm nhỏ), 62 máy bay bị bắn rơi, phá hủy.
 * 1 đơn vị = 500 m theo chiều ngang; độ cao phóng đại ×1,6.
 */
const SCALE_M = 500;
const EXAGGERATION = 1.6;
const BASE_ELEVATION = 480;
const SIZE = 36; // cạnh khối địa hình (đơn vị)
const CENTER_Z = -4;
const GRID = 200;

type Frame = { x: number; z: number };

export async function buildValley(): Promise<BuiltModel> {
  const root = new THREE.Group();

  // ----- Ảnh độ cao thật -----
  const response = await fetch(VALLEY_DEM_URL);
  if (!response.ok) throw new Error("Không tải được ảnh độ cao lòng chảo");
  const bitmap = await createImageBitmap(await response.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const demSize = bitmap.width;
  const dem = blurGrid(decodeTerrarium(ctx.getImageData(0, 0, demSize, demSize).data, demSize, demSize, 4), demSize, demSize, 1, 1);

  const [mx0, my0] = toMercator([VALLEY_BOUNDS.north, VALLEY_BOUNDS.west]);
  const [mx1, my1] = toMercator([VALLEY_BOUNDS.south, VALLEY_BOUNDS.east]);
  const elevationAt = (u: number, v: number): number => {
    const gx = clamp(u, 0, 0.9999) * (demSize - 1);
    const gy = clamp(v, 0, 0.9999) * (demSize - 1);
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const i = iy * demSize + ix;
    return lerp(lerp(dem[i], dem[i + 1], fx), lerp(dem[i + demSize], dem[i + demSize + 1], fx), fy);
  };
  const yOf = (elevation: number) => Math.max(0, ((elevation - BASE_ELEVATION) / SCALE_M) * EXAGGERATION) * 1;
  const uvOf = ([lat, lng]: LatLng): [number, number] => {
    const [mx, my] = toMercator([lat, lng]);
    return [(mx - mx0) / (mx1 - mx0), (my - my0) / (my1 - my0)];
  };
  const surfaceAt = (point: LatLng): [number, number, number] => {
    const [u, v] = uvOf(point);
    return [(u - 0.5) * SIZE, yOf(elevationAt(u, v)), (v - 0.5) * SIZE + CENTER_Z];
  };

  // ----- Lưới địa hình, tô màu theo độ cao và độ dốc -----
  const positions = new Float32Array((GRID + 1) * (GRID + 1) * 3);
  const colors = new Float32Array((GRID + 1) * (GRID + 1) * 3);
  const heights = new Float32Array((GRID + 1) * (GRID + 1));
  for (let j = 0; j <= GRID; j++) {
    for (let i = 0; i <= GRID; i++) {
      heights[j * (GRID + 1) + i] = elevationAt(i / GRID, j / GRID);
    }
  }
  const stops: { h: number; c: [number, number, number] }[] = [
    { h: 470, c: [0.5, 0.56, 0.22] },
    { h: 540, c: [0.42, 0.55, 0.21] },
    { h: 720, c: [0.24, 0.42, 0.16] },
    { h: 1050, c: [0.15, 0.31, 0.12] },
    { h: 1450, c: [0.16, 0.26, 0.13] },
    { h: 1900, c: [0.34, 0.3, 0.24] },
  ];
  const rock: [number, number, number] = [0.34, 0.27, 0.19];
  const color = new THREE.Color();
  for (let j = 0; j <= GRID; j++) {
    for (let i = 0; i <= GRID; i++) {
      const k = j * (GRID + 1) + i;
      const u = i / GRID;
      const v = j / GRID;
      const h = heights[k];
      positions.set([(u - 0.5) * SIZE, yOf(h), (v - 0.5) * SIZE + CENTER_Z], k * 3);
      const slope = Math.hypot(heights[j * (GRID + 1) + Math.min(GRID, i + 1)] - heights[j * (GRID + 1) + Math.max(0, i - 1)], heights[Math.min(GRID, j + 1) * (GRID + 1) + i] - heights[Math.max(0, j - 1) * (GRID + 1) + i]) / 70;
      let c: [number, number, number] = stops[0].c;
      for (let s = 1; s < stops.length; s++) {
        if (h <= stops[s].h) {
          const t = clamp((h - stops[s - 1].h) / (stops[s].h - stops[s - 1].h));
          const a = stops[s - 1].c;
          const b = stops[s].c;
          c = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
          break;
        }
        c = stops[s].c;
      }
      const noise = 0.85 + fbm2(u * 6, v * 6, 8, 3) * 0.3;
      const rocky = smoothstep(0.55, 1.4, slope) * 0.6;
      color.setRGB(lerp(c[0], rock[0], rocky) * noise * 0.62, lerp(c[1], rock[1], rocky) * noise * 0.62, lerp(c[2], rock[2], rocky) * noise * 0.62);
      colors.set([color.r, color.g, color.b], k * 3);
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const a = j * (GRID + 1) + i;
      indices.push(a, a + GRID + 1, a + 1, a + 1, a + GRID + 1, a + GRID + 2);
    }
  }
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  terrainGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeometry.setIndex(indices);
  terrainGeometry.computeVertexNormals();
  const terrain = mesh(terrainGeometry, std(0xffffff, { vertexColors: true, rough: 0.95 }));
  const terrainHolder = new THREE.Group();
  terrainHolder.add(terrain);
  root.add(terrainHolder);

  // thành khối: bốn mặt bên bằng đất, đế gỗ và bảng tên
  const skirtColor = std(0x4a3524, { rough: 1 });
  const half = SIZE / 2;
  for (const [x, z, w, ry] of [
    [0, CENTER_Z - half, SIZE, Math.PI],
    [0, CENTER_Z + half, SIZE, 0],
    [-half, CENTER_Z, SIZE, Math.PI / 2],
    [half, CENTER_Z, SIZE, -Math.PI / 2],
  ] as [number, number, number, number][]) {
    root.add(mesh(new THREE.PlaneGeometry(w, 2.2).translate(0, -1.1, 0), skirtColor, [x, 0, z], { rot: [0, ry, 0], cast: false }));
  }
  const plinthMaterial = std(0xffffff, { map: woodTexture([10, 1], 71, [0.36, 0.24, 0.13]), rough: 0.55 });
  root.add(mesh(new RoundedBoxGeometry(64, 1.4, 54, 3, 0.2), plinthMaterial, [0, -2.9, 0]));
  root.add(mesh(new THREE.BoxGeometry(SIZE + 0.6, 0.5, SIZE + 0.6), std(0x231910, { rough: 0.7 }), [0, -2.05, CENTER_Z], { cast: false }));
  const plate = mesh(
    new THREE.PlaneGeometry(22, 1.6),
    new THREE.MeshStandardMaterial({ map: textPlateTexture(["LÒNG CHẢO ĐIỆN BIÊN PHỦ", "13/3 – 7/5/1954"], { width: 1024, height: 160 }), roughness: 0.5 }),
    [0, -2.9, 27.01],
    { cast: false },
  );
  root.add(plate);

  // ----- Sông Nậm Rốm, đường băng -----
  const river = dienBienPhu1954.riverPath ?? [];
  if (river.length > 1) {
    const points = river.map((p) => {
      const [x, y, z] = surfaceAt(p);
      return [x, y + 0.05, z] as [number, number, number];
    });
    root.add(mesh(tube(points, 0.06, 5, 0.3), std(0x3b82c4, { rough: 0.25, metal: 0.2, emissive: 0x0c2c52, emissiveIntensity: 0.4 }), [0, 0, 0], { cast: false }));
  }
  const [ax, ay, az] = surfaceAt(SP.sanBay);
  root.add(mesh(new THREE.BoxGeometry(0.1, 0.03, 2.1), std(0xc9c6bb, { rough: 0.8 }), [ax, ay + 0.05, az], { cast: false }));

  // ----- Cứ điểm: hầm nhỏ + cột cờ; ban đầu treo cờ Pháp, sau đó đổi thành cờ đỏ sao vàng -----
  const bunkerMaterial = std(0x6d5f4c, { rough: 1 });
  const poleMaterial = std(0xd9d2bc, { rough: 0.5 });
  const frenchMap = frenchFlagTexture();
  const redMap = flagTexture();
  const points = Object.entries(SP) as [string, LatLng][];
  const pennants: { french: THREE.Mesh; ours: THREE.Mesh; at: number; base: THREE.Vector3 }[] = [];
  points.forEach(([id, position], index) => {
    const [x, y, z] = surfaceAt(position);
    const s = id === "hamChiHuy" || id === "a1" ? 1.25 : 1;
    root.add(mesh(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 0.14 * s, 8), bunkerMaterial, [x, y + 0.07 * s, z]));
    root.add(mesh(new THREE.CylinderGeometry(0.03 * s, 0.035 * s, 1.0 * s, 6), poleMaterial, [x, y + 0.6 * s, z]));
    const french = mesh(new THREE.PlaneGeometry(0.5 * s, 0.33 * s).translate(0.25 * s, -0.165 * s, 0), new THREE.MeshStandardMaterial({ map: frenchMap, side: THREE.DoubleSide, roughness: 0.9 }), [x, y + 1.05 * s, z], { cast: false });
    const ours = mesh(new THREE.PlaneGeometry(0.62 * s, 0.41 * s).translate(0.31 * s, -0.205 * s, 0), new THREE.MeshStandardMaterial({ map: redMap, side: THREE.DoubleSide, roughness: 0.85, emissive: 0x330806, emissiveIntensity: 0.6 }), [x, y + 0.4 * s, z], { cast: false });
    ours.visible = false;
    root.add(french, ours);
    pennants.push({ french, ours, at: 1.7 + index * 0.16, base: new THREE.Vector3(x, y + 1.05 * s, z) });
  });

  // ----- Nhãn số liệu (luôn quay mặt về người xem) -----
  const sprite = (lines: string[], position: [number, number, number], width: number) => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "rgba(26,20,14,0.86)";
    g.beginPath();
    g.roundRect(8, 8, 496, 240, 28);
    g.fill();
    g.strokeStyle = "#d8b25a";
    g.lineWidth = 5;
    g.stroke();
    g.fillStyle = "#ffe9b0";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = '700 118px "Lora", Georgia, serif';
    g.fillText(lines[0], 256, 100, 460);
    g.fillStyle = "#f3e3b8";
    g.font = '500 38px "Be Vietnam Pro", system-ui, sans-serif';
    g.fillText(lines[1], 256, 194, 470);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    s.scale.set(width, width / 2, 1);
    s.position.set(...position);
    s.renderOrder = 50;
    return s;
  };

  // ----- 1) Lịch 56 ngày đêm: 8 cột × 7 hàng ô nhỏ, sáng dần từ 13/3 đến 7/5 -----
  const calendarOrigin: Frame = { x: -24.5, z: 19 };
  const tileGeometry = new RoundedBoxGeometry(0.56, 0.5, 0.56, 2, 0.06);
  const tiles = new THREE.InstancedMesh(tileGeometry, std(0xffffff, { rough: 0.5, metal: 0.1 }), 56);
  tiles.castShadow = true;
  tiles.receiveShadow = true;
  tiles.frustumCulled = false;
  const tileMatrix = new THREE.Matrix4();
  const tilePos = new THREE.Vector3();
  const tileScale = new THREE.Vector3();
  const tileQuat = new THREE.Quaternion();
  const tileColor = new THREE.Color();
  const calendarLabel = sprite(["56", "ngày đêm chiến đấu"], [calendarOrigin.x + 2.1, 4.2, calendarOrigin.z + 1.9], 6.6);
  root.add(tiles, calendarLabel);

  // ----- 2) 16.200 quân địch: mỗi chấm một người, cột nhô lên thành một khối -----
  const COLS = 150;
  const ROWS = 108;
  const troopSpacing = 0.082;
  const troopOrigin: Frame = { x: -8.5, z: 19 };
  const troops = new THREE.InstancedMesh(new THREE.BoxGeometry(0.056, 1, 0.056).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), COLS * ROWS);
  troops.frustumCulled = false;
  troops.castShadow = false;
  troops.receiveShadow = false;
  const troopHeights = new Float32Array(COLS * ROWS);
  const troopBase = [new THREE.Color(0x3b5f9a), new THREE.Color(0x5d7ba8), new THREE.Color(0x8c98a8)];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = r * COLS + c;
      troopHeights[k] = 0.22 + (((c * 7 + r * 13) % 10) / 10) * 0.16;
      troops.setColorAt(k, tileColor.copy(troopBase[(c * 3 + r * 5) % 3]).multiplyScalar(0.85 + (((c + r) % 5) / 5) * 0.3));
    }
  }
  root.add(troops);
  root.add(mesh(new THREE.BoxGeometry(COLS * troopSpacing + 0.5, 0.18, ROWS * troopSpacing + 0.5), std(0x2a2118, { rough: 0.8 }), [troopOrigin.x + (COLS * troopSpacing) / 2, -0.09, troopOrigin.z + (ROWS * troopSpacing) / 2], { cast: false }));
  root.add(sprite(["16.200", "quân địch bị loại khỏi vòng chiến đấu"], [troopOrigin.x + (COLS * troopSpacing) / 2, 3.2, troopOrigin.z + (ROWS * troopSpacing) / 2], 7.4));

  // ----- 3) 62 máy bay bị bắn rơi, phá hủy: nằm nghiêng ngả trên bãi -----
  const planeGeo = planeGeometry();
  const planes = new THREE.InstancedMesh(planeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 }), 62);
  planes.castShadow = true;
  planes.frustumCulled = false;
  const planeOrigin: Frame = { x: 3.4, z: 18.4 };
  const planeSlots: { x: number; z: number; yaw: number; roll: number; pitch: number }[] = [];
  for (let n = 0; n < 62; n++) {
    const row = Math.floor(n / 16);
    const col = n % 16;
    const jitter = ((n * 37) % 10) / 10 - 0.5;
    planeSlots.push({ x: planeOrigin.x + col * 1.5 + (row % 2) * 0.7, z: planeOrigin.z + row * 2.0 + jitter * 0.4, yaw: n * 1.7, roll: 0.5 + ((n * 53) % 10) * 0.12, pitch: ((n * 29) % 10) * 0.04 - 0.1 });
  }
  root.add(planes);
  root.add(mesh(new THREE.BoxGeometry(24.4, 0.16, 8.6), std(0x2a2118, { rough: 0.8 }), [planeOrigin.x + 11.6, -0.08, planeOrigin.z + 3.1], { cast: false }));
  root.add(sprite(["62", "máy bay bị bắn rơi, phá hủy"], [planeOrigin.x + 11.4, 4.4, planeOrigin.z + 3.4], 6.6));

  // cây cối trang trí quanh bệ
  for (const [x, z] of [
    [-27, -22],
    [27, -22],
    [-28, 8],
    [28, 8],
  ]) root.add(group([foliage([0, 0.7, 0], 2.2, leafFallback(), Math.round(x))], [x, 0, z]));

  // ----- Hoạt cảnh -----
  let startedAt = 0;
  let first = true;
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  let finished = false;

  const update = (time: number) => {
    if (first) {
      startedAt = time;
      first = false;
    }
    const t = time - startedAt;
    // địa hình trồi lên
    const rise = easeInOut(t / 1.6);
    terrainHolder.scale.y = 0.02 + 0.98 * rise;
    // đổi cờ
    for (const p of pennants) {
      const k = clamp((t - p.at) / 0.9);
      p.french.visible = k < 0.5;
      p.french.position.y = p.base.y - k * 1.0;
      p.ours.visible = k >= 0.5;
      p.ours.position.set(p.base.x, p.base.y - 0.7 + smoothstep(0.5, 1, k) * 0.7, p.base.z);
      const wave = Math.sin(time * 4 + p.base.x) * 0.25;
      p.french.rotation.y = wave;
      p.ours.rotation.y = wave;
    }
    // lịch: 56 ô sáng dần (từ 3 s đến 8 s)
    for (let n = 0; n < 56; n++) {
      const col = n % 8;
      const row = Math.floor(n / 8);
      const k = clamp((t - (3 + (n / 56) * 5)) / 0.4);
      tilePos.set(calendarOrigin.x + col * 0.66, 0.25 + k * 0.32 * (1 + 0.6 * Math.sin(k * Math.PI)), calendarOrigin.z + row * 0.66);
      tileScale.set(1, 0.4 + k * 0.6, 1);
      tileQuat.identity();
      tileMatrix.compose(tilePos, tileQuat, tileScale);
      tiles.setMatrixAt(n, tileMatrix);
      tileColor.set(0x3a352f).lerp(new THREE.Color().setHSL(0.09 - (n / 56) * 0.09, 0.85, 0.5 - (n / 56) * 0.06), k);
      tiles.setColorAt(n, tileColor);
      if (k > 0 && k < 1) tiles.instanceColor!.needsUpdate = true;
    }
    tiles.instanceMatrix.needsUpdate = true;
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
    calendarLabel.material.opacity = smoothstep(3.2, 4.2, t);
    // quân địch: cột nhô lên thành sóng từ trái sang phải (4 s – 9 s)
    if (!finished || t < 10) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const k = r * COLS + c;
          const delay = 4 + (c / COLS) * 3.2 + ((r * 7) % 10) * 0.03;
          const g = clamp((t - delay) / 0.7);
          position.set(troopOrigin.x + c * troopSpacing, 0, troopOrigin.z + r * troopSpacing);
          scale.set(1, troopHeights[k] * g * g * (3 - 2 * g) + 0.001, 1);
          matrix.compose(position, quat.identity(), scale);
          troops.setMatrixAt(k, matrix);
        }
      }
      troops.instanceMatrix.needsUpdate = true;
    }
    // máy bay: rơi xuống bãi lần lượt (5 s – 10 s)
    for (let n = 0; n < 62; n++) {
      const slot = planeSlots[n];
      const g = clamp((t - (5 + (n / 62) * 4.5)) / 0.9);
      const fall = 1 - g;
      position.set(slot.x, 0.02 + 0.28 + fall * fall * 7, slot.z);
      euler.set(slot.pitch + fall * 0.6, slot.yaw, slot.roll * g);
      quat.setFromEuler(euler);
      const s = g <= 0 ? 0.0001 : 0.05;
      scale.set(s, s, s);
      matrix.compose(position, quat, scale);
      planes.setMatrixAt(n, matrix);
    }
    planes.instanceMatrix.needsUpdate = true;
    if (t > 10.5) finished = true;
  };

  void group;
  return {
    root,
    update: (time) => update(time),
    actions: {
      replay: () => {
        first = true;
        finished = false;
      },
    },
    dispose: () => {
      planeGeo.dispose();
      tileGeometry.dispose();
    },
  };
}

function leafFallback(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#3f7a2a";
  g.beginPath();
  g.ellipse(32, 32, 26, 12, 0.6, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
}

function frenchFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ["#1d3f8f", "#f4f4f4", "#d42a2a"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * 64, 0, 64, 128);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
