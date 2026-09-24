import * as THREE from "three";
import { clamp, smoothstep } from "@/lib/cinema/math";
import { hash2 } from "@/lib/cinema/rng";
import { DEM_HALF_EXTENT, fbm, type Terrain } from "@/lib/cinema/terrain";
import type { FilmScript } from "@/lib/cinema/types";

/** Vùng lưới mịn (0,8 m) quanh đồi A1, chiến hào ta và công sự địch; phần còn lại của lòng chảo dùng lưới thô (6 m). */
export const PATCH = { minX: -140, maxX: 250, minZ: -110, maxZ: 110, spacing: 0.8 };
const BASE_SPACING = 6;

export type TerrainMeshes = {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  /** Uniform của hố bom: x, z, độ sâu tối đa (m), bán kính (m). */
  blast: { value: THREE.Vector4 };
  /** 0 → 1: mức cháy sém quanh hố bom. */
  scorch: { value: number };
};

/** Nhiễu giá trị tuần hoàn (lưới bọc vòng theo `period`) để ghép ngói không lộ đường nối. */
function tileableNoise(x: number, y: number, period: number, seed: number): number {
  const wrap = (v: number) => ((v % period) + period) % period;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const h = (ix: number, iy: number) => hash2(wrap(ix), wrap(iy), seed);
  const top = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * ux;
  const bottom = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * ux;
  return top + (bottom - top) * uy;
}

function makeDetailTexture(): THREE.DataTexture {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // 4 tầng nhiễu: đất vón cục, sỏi nhỏ và hạt mịn
      const n = tileableNoise(u * 8, v * 8, 8, 1) * 0.5 + tileableNoise(u * 16, v * 16, 16, 2) * 0.32 + tileableNoise(u * 32, v * 32, 32, 3) * 0.18;
      const value = Math.round(clamp(0.52 + (n - 0.5) * 1.5) * 255);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

type Grid = { nx: number; nz: number; heights: Float32Array; x0: number; z0: number; spacing: number };

function sampleGrid(terrain: Terrain, x0: number, z0: number, nx: number, nz: number, spacing: number): Grid {
  const heights = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) heights[j * (nx + 1) + i] = terrain.heightAt(x0 + i * spacing, z0 + j * spacing);
  return { nx, nz, heights, x0, z0, spacing };
}

/** Màu đất theo độ dốc, độ cao so với chân đồi và chiến hào (đã ở không gian tuyến tính). */
function groundColor(terrain: Terrain, spec: FilmScript["terrain"], x: number, z: number, slope: number, trenchDepth: number, out: THREE.Color): THREE.Color {
  const dx = x - spec.hill.cx;
  const dz = z - spec.hill.cz;
  const angle = (spec.hill.angleDeg * Math.PI) / 180;
  const u = dx * Math.sin(angle) - dz * Math.cos(angle);
  const v = -dx * -Math.cos(angle) + dz * Math.sin(angle);
  const r = Math.hypot(u / spec.hill.halfLong, v / spec.hill.halfShort);
  const hillMask = 1 - smoothstep(0.55, 1.15, r);
  const noise = fbm(x / 9, z / 9, 21);
  const noise2 = fbm(x / 3.2, z / 3.2, 31);

  const grassA = new THREE.Color(0.06, 0.07, 0.038);
  const grassB = new THREE.Color(0.1, 0.1, 0.05);
  const soilA = new THREE.Color(0.24, 0.14, 0.085);
  const soilB = new THREE.Color(0.33, 0.21, 0.13);

  const patchy = fbm(x / 45, z / 45, 41);
  const bare = clamp(hillMask * 0.9 + (noise - 0.5) * 0.9 + (patchy - 0.5) * 1.3 + slope * 0.9 + 0.02);
  const grass = grassA.clone().lerp(grassB, noise2);
  const soil = soilA.clone().lerp(soilB, noise2);
  out.copy(grass).lerp(soil, smoothstep(0.25, 0.65, bare));
  // chiến hào: đất ẩm tối màu
  const inTrench = smoothstep(0.05, 0.9, trenchDepth);
  out.multiplyScalar(1 - 0.45 * inTrench);
  void terrain;
  return out;
}

function buildGeometry(grid: Grid, terrain: Terrain, spec: FilmScript["terrain"], skipQuad?: (cx: number, cz: number) => boolean, skirt = 0): THREE.BufferGeometry {
  const { nx, nz, heights, x0, z0, spacing } = grid;
  const stride = nx + 1;
  const vertexCount = stride * (nz + 1);
  const skirtCount = skirt > 0 ? 2 * (nx + 1) + 2 * (nz + 1) : 0;
  const positions = new Float32Array((vertexCount + skirtCount) * 3);
  const normals = new Float32Array((vertexCount + skirtCount) * 3);
  const colors = new Float32Array((vertexCount + skirtCount) * 3);
  const uvs = new Float32Array((vertexCount + skirtCount) * 2);
  const color = new THREE.Color();

  const heightAtIndex = (i: number, j: number) => heights[clamp(j, 0, nz) * stride + clamp(i, 0, nx)];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const index = j * stride + i;
      const x = x0 + i * spacing;
      const z = z0 + j * spacing;
      const h = heights[index];
      const dhdx = (heightAtIndex(i + 1, j) - heightAtIndex(i - 1, j)) / (2 * spacing);
      const dhdz = (heightAtIndex(i, j + 1) - heightAtIndex(i, j - 1)) / (2 * spacing);
      const len = Math.hypot(dhdx, 1, dhdz);
      positions.set([x, h, z], index * 3);
      normals.set([-dhdx / len, 1 / len, -dhdz / len], index * 3);
      const slope = Math.hypot(dhdx, dhdz);
      groundColor(terrain, spec, x, z, slope, terrain.trenchDepthAt(x, z), color);
      colors.set([color.r, color.g, color.b], index * 3);
      uvs.set([x / 6, z / 6], index * 2);
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = x0 + (i + 0.5) * spacing;
      const cz = z0 + (j + 0.5) * spacing;
      if (skipQuad?.(cx, cz)) continue;
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  if (skirt > 0) {
    // Váy quanh mép lưới mịn để che khe hở với lưới thô
    let v = vertexCount;
    const edgeIndices: number[][] = [
      Array.from({ length: nx + 1 }, (_, i) => i),
      Array.from({ length: nx + 1 }, (_, i) => nz * stride + i),
      Array.from({ length: nz + 1 }, (_, j) => j * stride),
      Array.from({ length: nz + 1 }, (_, j) => j * stride + nx),
    ];
    edgeIndices.forEach((edge, e) => {
      const first = v;
      for (const source of edge) {
        positions.set([positions[source * 3], positions[source * 3 + 1] - skirt, positions[source * 3 + 2]], v * 3);
        normals.set([normals[source * 3], normals[source * 3 + 1], normals[source * 3 + 2]], v * 3);
        colors.set([colors[source * 3], colors[source * 3 + 1], colors[source * 3 + 2]], v * 3);
        uvs.set([uvs[source * 2], uvs[source * 2 + 1]], v * 2);
        v++;
      }
      for (let k = 0; k < edge.length - 1; k++) {
        const t0 = edge[k];
        const t1 = edge[k + 1];
        const b0 = first + k;
        const b1 = first + k + 1;
        // hai chiều cuộn để bề mặt nhìn được từ cả hai phía (material dùng DoubleSide cho váy nên chiều không quan trọng)
        indices.push(t0, b0, t1, t1, b0, b1);
        void e;
      }
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

export function buildTerrainMeshes(terrain: Terrain, spec: FilmScript["terrain"]): TerrainMeshes {
  const blast = { value: new THREE.Vector4(0, 0, 0, 12) };
  const scorch = { value: 0 };

  const detail = makeDetailTexture();
  const makeMaterial = (polygonOffset: number) => {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: detail,
      roughness: 0.96,
      metalness: 0,
      side: THREE.DoubleSide,
      polygonOffset: polygonOffset !== 0,
      polygonOffsetFactor: polygonOffset,
      polygonOffsetUnits: polygonOffset,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uBlast = blast;
      shader.uniforms.uScorch = scorch;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
uniform vec4 uBlast;
varying vec2 vGroundXZ;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
vGroundXZ = position.xz;
float bd = length(position.xz - uBlast.xy);
float bowl = exp(-bd * bd / (uBlast.w * uBlast.w));
transformed.y -= uBlast.z * bowl - uBlast.z * 0.16 * exp(-pow((bd - uBlast.w * 1.35) / (uBlast.w * 0.4), 2.0));`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
uniform vec4 uBlast;
uniform float uScorch;
varying vec2 vGroundXZ;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float sd = length(vGroundXZ - uBlast.xy);
float scorch = exp(-sd * sd / (uBlast.w * uBlast.w * 6.0)) * uScorch;
diffuseColor.rgb *= 1.0 - 0.8 * scorch;`,
        );
    };
    return material;
  };
  // Lưới mịn nằm đè lên lưới thô ở vùng chồng lấn (tránh nhấp nháy z-fighting)
  const material = makeMaterial(0);
  const patchMaterial = makeMaterial(-2);

  const group = new THREE.Group();

  // Lưới thô phủ toàn bộ vùng dữ liệu, khoét lỗ ở vùng lưới mịn
  const n = Math.round((2 * DEM_HALF_EXTENT) / BASE_SPACING);
  const baseSpacing = (2 * DEM_HALF_EXTENT) / n;
  const baseGrid = sampleGrid(terrain, -DEM_HALF_EXTENT, -DEM_HALF_EXTENT, n, n, baseSpacing);
  const inPatch = (cx: number, cz: number) => cx > PATCH.minX + 1 && cx < PATCH.maxX - 1 && cz > PATCH.minZ + 1 && cz < PATCH.maxZ - 1;
  const base = new THREE.Mesh(buildGeometry(baseGrid, terrain, spec, inPatch), material);
  base.receiveShadow = true;
  base.frustumCulled = false;
  group.add(base);

  const nx = Math.round((PATCH.maxX - PATCH.minX) / PATCH.spacing);
  const nz = Math.round((PATCH.maxZ - PATCH.minZ) / PATCH.spacing);
  const patchGrid = sampleGrid(terrain, PATCH.minX, PATCH.minZ, nx, nz, PATCH.spacing);
  const patch = new THREE.Mesh(buildGeometry(patchGrid, terrain, spec, undefined, 1.2), patchMaterial);
  patch.receiveShadow = true;
  patch.frustumCulled = false;
  group.add(patch);

  return { group, materials: [material, patchMaterial], blast, scorch };
}
