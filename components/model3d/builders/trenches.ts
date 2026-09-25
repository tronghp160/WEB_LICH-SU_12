import * as THREE from "three";
import { foliage, group, mesh, sandbagWall, std, tube, type BuiltModel } from "@/components/model3d/kit";
import { createSoldier } from "@/components/model3d/builders/soldier";
import { fbm2, flagTexture, leafTexture, proceduralTexture, soilTexture } from "@/components/model3d/textures";
import { clamp, smoothstep } from "@/lib/cinema/math";
import { createTerrain, fbm, type Trench } from "@/lib/cinema/terrain";

/**
 * Hệ thống chiến hào tiến sát cứ điểm (dựng theo mô tả, không theo bản vẽ thật): hào trục chạy ngang phía trước, ba hào nhánh gấp khúc
 * (zigzag để chống mảnh pháo) dẫn lên đồi, cứ điểm địch với hầm và bao cát, rào thép gai, hố bom. Địa hình sinh từ hàm địa hình của phim 3D Đồi A1.
 * Phía ta ở +z (gần người xem), cứ điểm địch ở phía −z.
 */
const X0 = -46;
const X1 = 46;
const Z0 = -34;
const Z1 = 34;
const SPACING = 0.46;

const zigzag = (start: [number, number], steps: number, dx: number, dz: number): [number, number][] => {
  const points: [number, number][] = [start];
  let [x, z] = start;
  for (let i = 0; i < steps; i++) {
    z -= dz;
    points.push([x, z]);
    x += i % 2 === 0 ? dx : -dx;
    points.push([x, z]);
  }
  return points;
};

export function buildTrenches(): BuiltModel {
  const root = new THREE.Group();
  const trenches: Trench[] = [
    {
      id: "hao-truc",
      points: [
        [-44, 22],
        [-30, 20.6],
        [-16, 21.4],
        [-2, 20],
        [12, 21],
        [28, 19.6],
        [44, 21.4],
      ],
      width: 1.5,
      depth: 1.8,
    },
    { id: "nhanh-1", points: zigzag([-18, 21], 5, 4, 3.6), width: 1.25, depth: 1.7 },
    { id: "nhanh-2", points: zigzag([2, 20.2], 5, -4, 3.4), width: 1.25, depth: 1.7 },
    { id: "nhanh-3", points: zigzag([22, 20.2], 4, 4, 3.8), width: 1.25, depth: 1.7 },
    // hào của địch quanh đỉnh đồi
    {
      id: "hao-dich",
      points: [
        [-12, -8],
        [-6, -10],
        [4, -10.4],
        [12, -8],
        [14, -2],
        [10, 3.4],
        [2, 4.4],
        [-8, 3.2],
        [-13, -2],
        [-12, -8],
      ],
      width: 1.6,
      depth: 1.5,
    },
  ];
  const craters = [
    { x: -8, z: 8, radius: 2.6, depth: 1.3 },
    { x: 11, z: 6, radius: 2.2, depth: 1.1 },
    { x: -2, z: 11.5, radius: 3, depth: 1.5 },
    { x: 16, z: 12, radius: 2.4, depth: 1.2 },
    { x: -22, z: 10, radius: 2.1, depth: 1.0 },
    { x: 3, z: -14, radius: 2.4, depth: 1.1 },
  ];
  const terrain = createTerrain(null, { hill: { cx: 0, cz: -3, angleDeg: 90, halfLong: 26, halfShort: 14, height: 7.5, plateau: 0.3 }, trenches, craters });
  const h0 = terrain.heightAt(0, 30);
  const heightAt = (x: number, z: number) => terrain.heightAt(x, z) - h0;

  // ----- Lưới địa hình -----
  const nx = Math.round((X1 - X0) / SPACING);
  const nz = Math.round((Z1 - Z0) / SPACING);
  const stride = nx + 1;
  const positions = new Float32Array(stride * (nz + 1) * 3);
  const colors = new Float32Array(stride * (nz + 1) * 3);
  const uvs = new Float32Array(stride * (nz + 1) * 2);
  const heights = new Float32Array(stride * (nz + 1));
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = X0 + i * SPACING;
      const z = Z0 + j * SPACING;
      heights[j * stride + i] = heightAt(x, z);
    }
  }
  const color = new THREE.Color();
  const grassA = new THREE.Color(0.14, 0.24, 0.07);
  const grassB = new THREE.Color(0.24, 0.33, 0.1);
  const soilA = new THREE.Color(0.3, 0.18, 0.09);
  const soilB = new THREE.Color(0.38, 0.24, 0.13);
  const wet = new THREE.Color(0.14, 0.09, 0.05);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const index = j * stride + i;
      const x = X0 + i * SPACING;
      const z = Z0 + j * SPACING;
      const edgeFade = smoothstep(0, 5, Math.min(x - X0, X1 - x, z - Z0, Z1 - z));
      // đáy đường viền mép khối địa hình chìm xuống để tạo "khối diorama"
      positions.set([x, heights[index] * edgeFade - (1 - edgeFade) * 1.2, z], index * 3);
      uvs.set([x / 3.2, z / 3.2], index * 2);
      const slope = Math.hypot(
        (heights[j * stride + Math.min(nx, i + 1)] - heights[j * stride + Math.max(0, i - 1)]) / (2 * SPACING),
        (heights[Math.min(nz, j + 1) * stride + i] - heights[Math.max(0, j - 1) * stride + i]) / (2 * SPACING),
      );
      const noise = fbm(x / 7, z / 7, 12);
      const noise2 = fbm(x / 2.4, z / 2.4, 13);
      const trenchDepth = terrain.trenchDepthAt(x, z);
      const hillHeight = clamp(heights[index] / 6.5);
      const bare = clamp(hillHeight * 0.85 + (noise - 0.5) * 0.9 + slope * 0.7 + trenchDepth * 0.3);
      color.copy(grassA).lerp(grassB, noise2);
      color.lerp(soilA.clone().lerp(soilB, noise2), smoothstep(0.3, 0.66, bare));
      color.lerp(wet, smoothstep(0.1, 1.4, trenchDepth) * 0.75);
      colors.set([color.r, color.g, color.b], index * 3);
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * stride + i;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  terrainGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  terrainGeometry.setIndex(indices);
  terrainGeometry.computeVertexNormals();
  const detail = proceduralTexture(256, (u, v) => {
    const n = 0.72 + fbm2(u, v, 16, 3) * 0.4;
    return [n, n, n];
  });
  root.add(mesh(terrainGeometry, std(0xffffff, { map: detail, vertexColors: true, rough: 1, bumpScale: 0.6 })));

  // thành khối: bốn mặt bên đất và đế gỗ tối
  const skirtMaterial = std(0x3b2a1a, { map: soilTexture([12, 1], 14), rough: 1 });
  for (const [x, z, w, r] of [
    [0, Z0, X1 - X0, 0],
    [0, Z1, X1 - X0, Math.PI],
    [X0, 0, Z1 - Z0, -Math.PI / 2],
    [X1, 0, Z1 - Z0, Math.PI / 2],
  ] as [number, number, number, number][]) {
    root.add(mesh(new THREE.PlaneGeometry(w, 6).translate(0, -3.3, 0), skirtMaterial, [x, 0, z], { rot: [0, r === 0 ? Math.PI : r === Math.PI ? 0 : r + Math.PI, 0], cast: false }));
  }
  root.add(mesh(new THREE.BoxGeometry(X1 - X0 + 3, 1.2, Z1 - Z0 + 3), std(0x241a10, { rough: 0.6 }), [0, -6.7, 0]));

  // ----- Cứ điểm của địch trên đồi: hầm bê tông, bao cát, cờ Pháp -----
  const bunkerAt = (x: number, z: number, scale: number) => {
    const y = heightAt(x, z);
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(2.4 * scale, 3.2 * scale, 1.2 * scale, 8), std(0xffffff, { map: soilTexture([1, 1], 15), rough: 1 }), [0, 0.6 * scale, 0]));
    g.add(mesh(new THREE.CylinderGeometry(1.8 * scale, 2.2 * scale, 0.8 * scale, 8), std(0x7a7568, { rough: 0.95 }), [0, 1.5 * scale, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.9 * scale, 0.3 * scale, 0.2 * scale), std(0x14110d, { rough: 0.9 }), [0, 1.6 * scale, 1.9 * scale]));
    g.position.set(x, y, z);
    root.add(g);
    root.add(sandbagWall([x - 2.6 * scale, z + 3.6 * scale], [x + 2.6 * scale, z + 3.6 * scale], 2, { seed: Math.round(x * 3 + z), y: heightAt(x, z + 3.6 * scale) - 0.1 }));
  };
  bunkerAt(0, -2.5, 1.5);
  bunkerAt(-9, -4.5, 1.1);
  bunkerAt(9.5, -5, 1.1);
  bunkerAt(-1, 2.2, 0.8);
  const flagPole = new THREE.CylinderGeometry(0.06, 0.07, 6, 8);
  const frenchFlag = mesh(new THREE.PlaneGeometry(1.7, 1.1).translate(0.85, -0.55, 0), new THREE.MeshStandardMaterial({ map: frenchTexture(), side: THREE.DoubleSide }), [0.1, heightAt(0, -2.5) + 6.9, -2.5]);
  root.add(mesh(flagPole, std(0xd8d0b8, { rough: 0.5 }), [0, heightAt(0, -2.5) + 3.9, -2.5]), frenchFlag);

  // ----- Rào thép gai trước hào địch -----
  const wire = std(0x8b8f94, { rough: 0.4, metal: 0.9 });
  const post = std(0x5a3d26, { rough: 0.9 });
  const wireLine = (x0: number, x1: number, z: number) => {
    const posts: [number, number][] = [];
    for (let x = x0; x <= x1; x += 2.2) posts.push([x, z + Math.sin(x * 0.4) * 0.6]);
    posts.forEach(([x, pz]) => root.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 6), post, [x, heightAt(x, pz) + 0.7, pz])));
    for (const h of [0.35, 0.8, 1.2]) {
      const points: [number, number, number][] = [];
      for (let x = x0; x <= x1; x += 0.7) {
        const pz = z + Math.sin(x * 0.4) * 0.6;
        points.push([x, heightAt(x, pz) + h + Math.sin(x * 5) * 0.05, pz + Math.cos(x * 7) * 0.08]);
      }
      root.add(mesh(tube(points, 0.014, 4, 0.1), wire, [0, 0, 0], { cast: false }));
    }
  };
  wireLine(-24, 24, 14.6);
  wireLine(-18, 20, -13.6);

  // ----- Sandbag ở miệng hào ta -----
  root.add(sandbagWall([-34, 19.8], [-6, 19.2], 2, { seed: 61, y: heightAt(-20, 19.5) - 0.2 }), sandbagWall([8, 19.4], [30, 19.0], 2, { seed: 62, y: heightAt(20, 19.2) - 0.2 }));

  // ----- Chiến sĩ ta trong hào, cờ đỏ sao vàng -----
  const soldiers: [number, number, number][] = [
    [-16, 21.4, Math.PI],
    [-14, 21.2, Math.PI],
    [-16, 13.6, Math.PI],
    [2, 20.2, Math.PI],
    [2, 15, Math.PI],
    [6, 14.6, Math.PI],
    [22, 19.8, Math.PI],
    [-6, 20.4, Math.PI],
  ];
  soldiers.forEach(([x, z, ry], i) => {
    const s = createSoldier({ lowPoly: true });
    s.scale.setScalar(0.95);
    s.position.set(x, heightAt(x, z) - 0.05, z);
    s.rotation.y = ry + (i % 3) * 0.15 - 0.15;
    root.add(s);
  });
  const ourFlagX = -18;
  root.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 4.6, 8), std(0xd8d0b8, { rough: 0.5 }), [ourFlagX, heightAt(ourFlagX, 21.2) + 2.3, 21.2]));
  const ourFlag = mesh(new THREE.PlaneGeometry(1.8, 1.2, 12, 4).translate(0.9, -0.6, 0), new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, emissive: 0x330806, emissiveIntensity: 0.5 }), [ourFlagX + 0.04, heightAt(ourFlagX, 21.2) + 4.4, 21.2]);
  root.add(ourFlag);

  const leaves = leafTexture(16);
  for (const [x, z] of [
    [-38, 10],
    [38, 8],
    [-34, -22],
    [36, -24],
    [-28, 27],
    [30, 28],
    [-3, -27],
  ]) {
    root.add(group([foliage([0, 0.9, 0], 3.2, leaves, Math.round(x)), foliage([0.6, 0.6, 0.4], 2.4, leaves, Math.round(z))], [x, heightAt(x, z), z]));
  }

  const flagPos = ourFlag.geometry.getAttribute("position") as THREE.BufferAttribute;
  const flagBase = Float32Array.from(flagPos.array);
  const frenchPos = frenchFlag.geometry.getAttribute("position") as THREE.BufferAttribute;
  return {
    root,
    update(time) {
      for (let i = 0; i < flagPos.count; i++) {
        const along = flagBase[i * 3] / 1.8;
        flagPos.setZ(i, Math.sin(flagBase[i * 3] * 3 - time * 4.5) * 0.14 * along);
      }
      flagPos.needsUpdate = true;
      ourFlag.geometry.computeVertexNormals();
      frenchFlag.rotation.y = Math.sin(time * 2.4) * 0.25;
      void frenchPos;
    },
  };
}

function frenchTexture(): THREE.CanvasTexture {
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
