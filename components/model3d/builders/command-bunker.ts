import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { foliage, groundDisc, group, mesh, rod, sandbagWall, std, type BuiltModel } from "@/components/model3d/kit";
import { concreteTexture, corrugatedTexture, flagTexture, grassTexture, leafTexture, mapSheetTexture, soilTexture, strataTexture, woodTexture } from "@/components/model3d/textures";

/**
 * Hầm chỉ huy của tướng De Castries (cắt bổ): mái vòm thép lượn sóng phủ đất và bao cát, nửa hầm phía trước được cắt bỏ để thấy các gian bên trong.
 * Trục hầm dọc z (cửa ở +z). Sàn hầm ở y = −0,6; đất mặt ở y = 0.
 */
const R = 3.0;
const HALF = 7;
const CUT = 3.6;
const CUT_ANGLE = 1.1;
const CENTER_Y = -0.6;

/** Vòm bán nguyệt quanh trục z (tâm ở y = CENTER_Y): góc a ∈ [a0, a1] tính từ +x; `ridge` > 0 tạo sóng ngang như tôn lượn. */
function arch(radius: number, z0: number, z1: number, a0: number, a1: number, ridge = 0, ridgePitch = 0.24): THREE.BufferGeometry {
  const around = Math.max(6, Math.round(((a1 - a0) / Math.PI) * 56));
  const along = ridge > 0 ? Math.max(2, Math.round((z1 - z0) / (ridgePitch / 6))) : 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= along; j++) {
    const z = z0 + ((z1 - z0) * j) / along;
    const r = radius + (ridge > 0 ? Math.sin(((z - z0) / ridgePitch) * Math.PI * 2) * ridge : 0);
    for (let i = 0; i <= around; i++) {
      const a = a0 + ((a1 - a0) * i) / around;
      positions.push(Math.cos(a) * r, CENTER_Y + Math.sin(a) * r, z);
      uvs.push(((a - a0) / (a1 - a0)) * 4, (z - z0) / 4);
    }
  }
  for (let j = 0; j < along; j++) {
    for (let i = 0; i < around; i++) {
      const a = j * (around + 1) + i;
      const b = a + 1;
      const c = a + around + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildCommandBunker(): BuiltModel {
  const root = new THREE.Group();
  const steel = std(0xffffff, { map: corrugatedTexture(14, [1, 3]), rough: 0.5, metal: 0.75, side: THREE.DoubleSide, bumpScale: 0.3 });
  const grass = std(0xffffff, { map: grassTexture([2, 4], 32), rough: 1, side: THREE.DoubleSide, bumpScale: 1 });
  const wood = std(0xffffff, { map: woodTexture([1, 1], 33, [0.47, 0.33, 0.19]), rough: 0.85 });
  const planks = std(0xffffff, { map: woodTexture([3, 3], 34, [0.4, 0.28, 0.16]), rough: 0.9 });
  const dark = std(0x17140f, { rough: 0.7 });
  const concrete = std(0xffffff, { map: concreteTexture([1, 1], 35), rough: 1 });

  root.add(groundDisc(140, { grass: true }));
  // nền đất quanh hầm cao lên một chút, đất đỏ trần ở lối vào
  root.add(mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), std(0xffffff, { map: soilTexture([3, 3], 36), rough: 1 }), [0, 0.01, 0], { cast: false }));

  // ----- Vỏ hầm: phần nguyên hai đầu, phần giữa cắt bỏ nửa phía +x -----
  root.add(mesh(arch(R, -HALF, -CUT, 0, Math.PI, 0.06), steel), mesh(arch(R, CUT, HALF, 0, Math.PI, 0.06), steel));
  root.add(mesh(arch(R, -CUT, CUT, CUT_ANGLE, Math.PI, 0.06), steel));
  // lớp đất phủ (0,7 m) — phần nguyên có cỏ, phần cắt lộ mặt cắt nhiều lớp
  const cover = R + 0.7;
  root.add(mesh(arch(cover, -HALF, -CUT, 0, Math.PI), grass), mesh(arch(cover, CUT, HALF, 0, Math.PI), grass), mesh(arch(cover, -CUT, CUT, CUT_ANGLE, Math.PI), grass));
  // mặt cắt tại hai đầu vùng cắt: thép + đất lộ ra
  const strata = std(0xffffff, { map: strataTexture(37), rough: 1, side: THREE.DoubleSide });
  for (const z of [-CUT, CUT]) {
    const ring = new THREE.RingGeometry(R, cover, 48, 1, CUT_ANGLE, Math.PI - CUT_ANGLE);
    // uv cho họa tiết mặt cắt: theo độ dày
    const uv = ring.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6 + 0.2, uv.getY(i) * 0.6 + 0.2);
    root.add(mesh(ring, strata, [0, CENTER_Y, z], { cast: false }));
    const cut = new THREE.RingGeometry(R - 0.05, R, 48, 1, CUT_ANGLE, Math.PI - CUT_ANGLE);
    root.add(mesh(cut, std(0x6b6d70, { rough: 0.5, metal: 0.8, side: THREE.DoubleSide }), [0, CENTER_Y, z], { cast: false }));
  }
  // vòng khung thép (sườn vòm) mỗi 1,75 m
  for (let i = 0; i <= 8; i++) {
    const z = -HALF + i * ((2 * HALF) / 8);
    const inCut = Math.abs(z) < CUT - 0.01;
    root.add(mesh(new THREE.TorusGeometry(R - 0.08, 0.06, 8, 48, inCut ? Math.PI - CUT_ANGLE : Math.PI, ).rotateZ(inCut ? CUT_ANGLE : 0), std(0x3a3d40, { rough: 0.5, metal: 0.85 }), [0, CENTER_Y, z], { cast: false }));
  }

  // ----- Tường đầu hầm (cửa ở +z), vách ngăn các gian -----
  const halfDisc = (radius: number, holeW: number, holeH: number, holeY: number) => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius, 0, Math.PI, false);
    shape.lineTo(radius, 0);
    if (holeW > 0) {
      const hole = new THREE.Path();
      hole.moveTo(-holeW / 2, holeY);
      hole.lineTo(-holeW / 2, holeY + holeH);
      hole.lineTo(holeW / 2, holeY + holeH);
      hole.lineTo(holeW / 2, holeY);
      hole.closePath();
      shape.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false, curveSegments: 32 }).translate(0, 0, -0.07);
  };
  root.add(mesh(halfDisc(R - 0.02, 1.4, 2.0, 0.05), planks, [0, CENTER_Y + 0.05, HALF]));
  root.add(mesh(halfDisc(R - 0.02, 0, 0, 0), planks, [0, CENTER_Y + 0.05, -HALF]));
  for (const z of [-1.4, 1.4]) root.add(mesh(halfDisc(R - 0.04, 1.3, 2.0, 0.05), planks, [0, CENTER_Y + 0.05, z]));
  // khung cửa gỗ ở lối vào
  for (const x of [-0.75, 0.75]) root.add(mesh(new THREE.BoxGeometry(0.16, 2.15, 0.28), wood, [x, CENTER_Y + 1.12, HALF + 0.06]));
  root.add(mesh(new THREE.BoxGeometry(1.7, 0.16, 0.28), wood, [0, CENTER_Y + 2.2, HALF + 0.06]));
  // bậc thang bê tông từ mặt đất xuống cửa hầm
  for (let i = 0; i < 4; i++) root.add(mesh(new THREE.BoxGeometry(1.7, 0.16, 0.32).translate(0, 0.08, 0), concrete, [0, CENTER_Y + 0.05 + i * 0.15, HALF + 0.55 + (3 - i) * 0.32 + 0.1]));
  root.add(mesh(new THREE.BoxGeometry(2.6, 0.1, 1.6), concrete, [0, CENTER_Y + 0.02, HALF + 1.8]));
  root.add(sandbagWall([-2.5, HALF + 2.4], [-1.05, HALF + 0.6], 4, { seed: 41 }), sandbagWall([2.5, HALF + 2.4], [1.05, HALF + 0.6], 4, { seed: 43 }));

  // ----- Sàn, tường phụ, nội thất -----
  root.add(mesh(new THREE.BoxGeometry(2 * R - 0.15, 0.1, 2 * HALF - 0.2), planks, [0, CENTER_Y - 0.05, 0], { cast: false }));
  const rug = mesh(new THREE.PlaneGeometry(3.2, 2.2).rotateX(-Math.PI / 2), std(0x5a2020, { rough: 1 }), [0.2, CENTER_Y + 0.005, 0], { cast: false });
  root.add(rug);
  // phòng giữa: bàn tác chiến, ghế, đèn, bản đồ
  const table = group(
    [
      mesh(new THREE.BoxGeometry(1.6, 0.08, 0.95), wood, [0, 0.74, 0]),
      ...[
        [-0.7, -0.4],
        [0.7, -0.4],
        [-0.7, 0.4],
        [0.7, 0.4],
      ].map(([x, z]) => mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), wood, [x, 0.36, z])),
      mesh(new THREE.PlaneGeometry(1.4, 0.8).rotateX(-Math.PI / 2), std(0xffffff, { map: mapSheetTexture(), rough: 0.9 }), [0, 0.785, 0], { cast: false }),
    ],
    [0.3, CENTER_Y, 0],
  );
  root.add(table);
  const chair = (x: number, z: number, ry: number) =>
    group([mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), wood, [0, 0.46, 0]), mesh(new THREE.BoxGeometry(0.42, 0.5, 0.05), wood, [0, 0.75, -0.2]), ...[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([a, b]) => mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), wood, [a, 0.22, b]))], [x, CENTER_Y, z], [0, ry, 0]);
  root.add(chair(-0.55, -0.15, Math.PI / 2), chair(1.15, 0.2, -Math.PI / 2), chair(0.3, 0.75, Math.PI));
  // đèn dầu treo trên bàn (có ánh sáng ấm)
  const lampLight = new THREE.PointLight(0xffb45a, 9, 9, 1.6);
  lampLight.position.set(0.3, CENTER_Y + 1.6, 0);
  root.add(lampLight, mesh(new THREE.SphereGeometry(0.09, 12, 10), std(0xffe2a0, { emissive: 0xffb45a, emissiveIntensity: 2.4 }), [0.3, CENTER_Y + 1.6, 0], { cast: false }), mesh(rod([0.3, CENTER_Y + 1.7, 0], [0.3, CENTER_Y + 2.4, 0], 0.008, 4), dark));
  // phòng phía đuôi (z âm): giường tầng
  const bunk = (z: number) =>
    group(
      [
        ...[
          [-0.55, -0.9],
          [0.55, -0.9],
          [-0.55, 0.9],
          [0.55, 0.9],
        ].map(([x, dz]) => mesh(new THREE.BoxGeometry(0.06, 1.7, 0.06), wood, [x, 0.85, dz])),
        mesh(new THREE.BoxGeometry(1.1, 0.06, 1.9), wood, [0, 0.4, 0]),
        mesh(new THREE.BoxGeometry(1.1, 0.06, 1.9), wood, [0, 1.15, 0]),
        mesh(new RoundedBoxGeometry(1.0, 0.1, 1.8, 2, 0.04), std(0x5b6a4a, { rough: 1 }), [0, 0.48, 0]),
        mesh(new RoundedBoxGeometry(1.0, 0.1, 1.8, 2, 0.04), std(0x7a5a3a, { rough: 1 }), [0, 1.23, 0]),
      ],
      [-1.9, CENTER_Y, z],
    );
  root.add(bunk(-5.4), bunk(-3.5));
  // phòng phía cửa (z dương): bàn điện đài và tủ hồ sơ
  const radio = group(
    [
      mesh(new THREE.BoxGeometry(1.3, 0.06, 0.6), wood, [0, 0.74, 0]),
      mesh(new THREE.BoxGeometry(0.06, 0.72, 0.5), wood, [-0.6, 0.36, 0]),
      mesh(new THREE.BoxGeometry(0.06, 0.72, 0.5), wood, [0.6, 0.36, 0]),
      mesh(new RoundedBoxGeometry(0.5, 0.3, 0.32, 2, 0.02), std(0x3e4a34, { rough: 0.6, metal: 0.4 }), [-0.2, 0.92, 0]),
      mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16).rotateX(Math.PI / 2), std(0xd6d0b0, { rough: 0.3, metal: 0.5 }), [-0.32, 0.94, 0.17]),
      mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16).rotateX(Math.PI / 2), std(0xd6d0b0, { rough: 0.3, metal: 0.5 }), [-0.08, 0.94, 0.17]),
      mesh(rod([0.2, 0.77, 0.1], [0.32, 1.25, 0.1], 0.006, 5), std(0x222222, { rough: 0.4, metal: 0.9 })),
      mesh(new RoundedBoxGeometry(0.28, 0.16, 0.26, 2, 0.02), dark, [0.3, 0.85, 0]),
    ],
    [-1.7, CENTER_Y, 5.4],
    [0, Math.PI / 2, 0],
  );
  root.add(radio);
  root.add(group([mesh(new THREE.BoxGeometry(0.9, 1.7, 0.4), wood, [0, 0.85, 0]), ...[0.35, 0.75, 1.15, 1.5].map((y) => mesh(new THREE.BoxGeometry(0.8, 0.03, 0.36), dark, [0, y, 0.02]))], [-2.55, CENTER_Y, 3.8], [0, Math.PI / 2, 0]));

  // ----- Lá cờ "Quyết chiến, Quyết thắng" trên nóc hầm -----
  const poleBase = new THREE.Vector3(0, CENTER_Y + cover - 0.05, -2.0);
  root.add(mesh(new THREE.CylinderGeometry(0.045, 0.06, 4.2, 10), std(0xd8d0b8, { rough: 0.5, metal: 0.4 }), [poleBase.x, poleBase.y + 2.1, poleBase.z]));
  root.add(mesh(new THREE.SphereGeometry(0.08, 10, 8), std(0xd8b25a, { rough: 0.3, metal: 1 }), [poleBase.x, poleBase.y + 4.22, poleBase.z]));
  const clothGeo = new THREE.PlaneGeometry(2.4, 1.6, 20, 8).translate(1.2, -0.8, 0);
  const clothBase = Float32Array.from(clothGeo.getAttribute("position").array);
  const cloth = mesh(clothGeo, new THREE.MeshStandardMaterial({ map: flagTexture("QUYẾT CHIẾN QUYẾT THẮNG"), side: THREE.DoubleSide, roughness: 0.85, emissive: 0x330806, emissiveIntensity: 0.6 }), [poleBase.x + 0.05, poleBase.y + 4.05, poleBase.z]);
  cloth.rotation.y = -0.6;
  root.add(cloth);

  // ----- Bao cát dọc chân hầm và cành lá ngụy trang trên mái -----
  root.add(sandbagWall([cover - 0.1, -6.6], [cover - 0.1, -3.8], 3, { seed: 51, y: 0 }), sandbagWall([-(cover - 0.1), -6.6], [-(cover - 0.1), 6.2], 3, { seed: 52, y: 0 }), sandbagWall([cover - 0.1, 3.8], [cover - 0.1, 6.6], 3, { seed: 53, y: 0 }));
  const roofLeaves = leafTexture(39);
  for (const [x, y, z, size] of [
    [0.6, 2.95, -5.8, 0.9],
    [-1.4, 2.7, -4.2, 0.8],
    [1.9, 2.4, 5.4, 0.9],
    [-1.2, 2.85, 4.6, 0.8],
    [-2.5, 2.1, -6.3, 0.8],
  ] as [number, number, number, number][]) {
    root.add(foliage([x, y, z], size, roofLeaves, Math.round(z * 10)));
  }

  // ----- Cây cối, bụi rậm quanh hầm -----
  const leaves = leafTexture(38);
  const shrubs: [number, number, number][] = [
    [-6.4, 0, -3.5],
    [-6.8, 0, 2.5],
    [6.4, 0, -6.5],
    [7.2, 0, 4.8],
    [-4.2, 0, 8.4],
    [4.8, 0, 9.6],
    [-3.2, 0, -9.2],
  ];
  shrubs.forEach(([x, y, z], i) => root.add(group([foliage([0, 0.8, 0], 2.4, leaves, i + 1), foliage([0.4, 0.5, 0.3], 1.8, leaves, i + 20)], [x, y, z])));

  const pos = cloth.geometry.getAttribute("position") as THREE.BufferAttribute;
  return {
    root,
    update(time) {
      for (let i = 0; i < pos.count; i++) {
        const x = clothBase[i * 3];
        const along = x / 2.4;
        pos.setZ(i, Math.sin(x * 2.6 - time * 4.2) * 0.18 * along + Math.sin(x * 5 - time * 6.6) * 0.04 * along);
        pos.setY(i, clothBase[i * 3 + 1] - along * along * 0.08);
      }
      pos.needsUpdate = true;
      cloth.geometry.computeVertexNormals();
    },
  };
}
