import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { bake, foliage, group, lathe, mesh, rod, shadowFloor, std, taper, tube, type BuiltModel } from "@/components/model3d/kit";
import { burlapTexture, leafTexture, woodTexture } from "@/components/model3d/textures";

/**
 * Người chiến sĩ bộ đội và trang bị ở Điện Biên Phủ: mũ nan cắm lá ngụy trang, quân phục xanh lá, ba lô có chăn cuộn,
 * ống gạo đeo chéo người, bi đông, dép cao su và súng trường. Cao ~1,7 m, quay mặt về +z. Dựng cách điệu bằng mã.
 */
export type SoldierParts = { root: THREE.Group };

export function createSoldier(options: { bake?: boolean; lowPoly?: boolean } = {}): THREE.Group {
  const root = new THREE.Group();
  const low = options.lowPoly === true;
  // độ mịn hình cầu / hình bo tròn: bản nhẹ dùng cho cảnh đông người
  const RoundedBox = (w: number, h: number, d: number, segments: number, radius: number) => new RoundedBoxGeometry(w, h, d, low ? 1 : segments, radius);
  const Sphere = (r: number, w: number, h: number) => new THREE.SphereGeometry(r, low ? Math.max(6, w >> 1) : w, low ? Math.max(4, h >> 1) : h);
  const cloth = burlapTexture([0.42, 0.47, 0.27], [2.5, 2.5], 21);
  const uniform = std(0x8c9670, { map: cloth, rough: 0.95, bumpScale: 0.5 });
  const trousers = std(0x7f8862, { map: cloth, rough: 0.95, bumpScale: 0.5 });
  const skin = std(0xb98460, { rough: 0.62 });
  const dark = std(0x17130f, { rough: 0.85 });
  const leather = std(0x3a2a1c, { rough: 0.6 });
  const rubber = std(0x14120f, { rough: 0.9 });
  const canvas = std(0xffffff, { map: burlapTexture([0.3, 0.36, 0.2], [2, 2], 22), rough: 1 });
  const metal = std(0x60646a, { rough: 0.4, metal: 0.9 });
  const wood = std(0xffffff, { map: woodTexture([0.3, 4], 23, [0.34, 0.22, 0.12]), rough: 0.7 });
  const khaki = std(0xffffff, { map: burlapTexture([0.7, 0.62, 0.42], [2, 2], 24), rough: 1 });

  // ----- Chân, dép cao su -----
  for (const side of [-1, 1]) {
    const x = 0.105 * side;
    root.add(mesh(taper([x, 0.93, 0.0], [x * 1.08, 0.5, 0.02], 0.085, 0.062), trousers));
    root.add(mesh(Sphere(0.065, 12, 10), trousers, [x * 1.08, 0.5, 0.02]));
    root.add(mesh(taper([x * 1.08, 0.5, 0.02], [x * 1.05, 0.12, 0.01], 0.062, 0.047), trousers));
    // bàn chân trần trong dép: đế cao su đen + quai
    root.add(mesh(Sphere(0.052, 12, 10).scale(1, 0.6, 2.1), skin, [x * 1.05, 0.055, 0.06]));
    root.add(mesh(RoundedBox(0.105, 0.02, 0.28, 2, 0.008), rubber, [x * 1.05, 0.012, 0.075]));
    root.add(mesh(tube([[x * 1.05 - 0.05, 0.02, 0.1], [x * 1.05, 0.085, 0.13], [x * 1.05 + 0.05, 0.02, 0.1]], 0.006, 5), rubber));
    root.add(mesh(tube([[x * 1.05 - 0.04, 0.02, -0.03], [x * 1.05, 0.06, -0.06], [x * 1.05 + 0.04, 0.02, -0.03]], 0.006, 5), rubber));
    // cuốn xà cạp
    root.add(mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.13, 12), khaki, [x * 1.05, 0.2, 0.01]));
  }

  // ----- Thân, thắt lưng, túi áo -----
  root.add(mesh(RoundedBox(0.4, 0.54, 0.235, 5, 0.08), uniform, [0, 1.2, 0]));
  root.add(mesh(RoundedBox(0.36, 0.2, 0.22, 4, 0.06), uniform, [0, 0.97, 0]));
  root.add(mesh(new THREE.BoxGeometry(0.385, 0.045, 0.235), leather, [0, 0.925, 0]));
  root.add(mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), std(0xb58a3a, { rough: 0.3, metal: 1 }), [0, 0.925, 0.122]));
  for (const x of [-0.1, 0.1]) root.add(mesh(RoundedBox(0.1, 0.11, 0.02, 2, 0.006), uniform, [x, 1.14, 0.12]));
  root.add(mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.09, 12), skin, [0, 1.5, 0.005]));
  // cổ áo
  root.add(mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 20).rotateX(Math.PI / 2), uniform, [0, 1.47, 0.005]));

  // ----- Đầu -----
  const head = new THREE.Group();
  head.position.set(0, 1.63, 0.015);
  head.add(mesh(Sphere(0.098, 24, 18).scale(0.92, 1.12, 1.02), skin, [0, 0, 0]));
  head.add(mesh(Sphere(0.03, 8, 6).scale(0.8, 1.5, 0.7), skin, [-0.09, -0.005, 0.0]));
  head.add(mesh(Sphere(0.03, 8, 6).scale(0.8, 1.5, 0.7), skin, [0.09, -0.005, 0.0]));
  head.add(mesh(new THREE.ConeGeometry(0.02, 0.05, 8).rotateX(Math.PI / 2 - 0.2), skin, [0, -0.012, 0.1]));
  for (const x of [-0.035, 0.035]) {
    head.add(mesh(Sphere(0.011, 8, 6), dark, [x, 0.018, 0.088], { cast: false }));
    head.add(mesh(new THREE.BoxGeometry(0.04, 0.008, 0.01), dark, [x, 0.04, 0.092], { cast: false }));
  }
  head.add(mesh(new THREE.BoxGeometry(0.04, 0.006, 0.008), std(0x6b3f33, { rough: 0.7 }), [0, -0.05, 0.088], { cast: false }));
  head.add(mesh(new THREE.SphereGeometry(0.1, low ? 10 : 20, low ? 6 : 12, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(0.94, 1.14, 1.04), dark, [0, 0.005, -0.004]));
  // mũ nan: chỏm tròn + vành rộng đan bằng nan, bọc vải, cắm cành lá
  const hatProfile: [number, number][] = [
    [0.0, 0.135],
    [0.06, 0.128],
    [0.105, 0.098],
    [0.118, 0.06],
    [0.16, 0.048],
    [0.22, 0.03],
    [0.255, 0.005],
    [0.255, -0.006],
    [0.16, 0.036],
    [0.115, 0.05],
    [0.0, 0.05],
  ];
  head.add(mesh(lathe(hatProfile, 40), std(0xffffff, { map: burlapTexture([0.56, 0.5, 0.3], [3, 3], 25), rough: 1, side: THREE.DoubleSide, bumpScale: 0.9 }), [0, 0.075, 0]));
  head.add(mesh(new THREE.TorusGeometry(0.117, 0.006, 6, 30).rotateX(Math.PI / 2), std(0x2f3a20, { rough: 1 }), [0, 0.13, 0]));
  const leaves = leafTexture(26);
  for (const [x, y, z, size] of [
    [0.1, 0.2, 0.06, 0.2],
    [-0.09, 0.21, 0.04, 0.2],
    [0.0, 0.24, -0.08, 0.22],
    [0.03, 0.22, 0.11, 0.17],
  ] as [number, number, number, number][]) {
    head.add(foliage([x, y, z], size, leaves, Math.round(x * 100)));
  }
  root.add(head);

  // ----- Ba lô có chăn cuộn, dây đeo, bi đông, ống gạo -----
  root.add(mesh(RoundedBox(0.32, 0.4, 0.16, 5, 0.05), canvas, [0, 1.19, -0.205]));
  root.add(mesh(RoundedBox(0.28, 0.16, 0.05, 3, 0.02), canvas, [0, 1.13, -0.3]));
  root.add(mesh(new THREE.CapsuleGeometry(0.06, 0.34, 6, 12).rotateZ(Math.PI / 2), std(0xffffff, { map: burlapTexture([0.42, 0.44, 0.4], [2, 1], 27), rough: 1 }), [0, 1.42, -0.2]));
  for (const x of [-0.16, 0.16]) {
    root.add(mesh(tube([[x, 1.42, -0.12], [x, 1.5, 0.0], [x * 1.05, 1.35, 0.115], [x * 0.9, 0.98, 0.1]], 0.014, 6), leather));
  }
  root.add(mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.17, 14).rotateZ(Math.PI / 2 + 0.2), std(0x5a6440, { rough: 0.55, metal: 0.55 }), [0.22, 0.82, -0.08]));
  root.add(mesh(tube([[0.22, 0.9, -0.06], [0.28, 1.15, -0.02], [0.05, 1.45, 0.02]], 0.008, 5), leather));
  root.add(mesh(tube([[-0.2, 1.47, 0.05], [-0.06, 1.28, 0.125], [0.12, 1.08, 0.13], [0.22, 0.9, 0.06]], 0.028, 8), khaki));

  // ----- Hai tay cầm súng trường chéo người -----
  const grip1: [number, number, number] = [-0.05, 1.31, 0.19];
  const grip2: [number, number, number] = [0.13, 1.14, 0.22];
  for (const [side, hand] of [
    [-1, grip1],
    [1, grip2],
  ] as [number, [number, number, number]][]) {
    const shoulder: [number, number, number] = [0.215 * side, 1.4, 0.0];
    const elbow: [number, number, number] = [0.27 * side, 1.15, 0.04];
    root.add(mesh(Sphere(0.06, 12, 10), uniform, shoulder));
    root.add(mesh(taper(shoulder, elbow, 0.058, 0.048), uniform));
    root.add(mesh(Sphere(0.05, 10, 8), uniform, elbow));
    root.add(mesh(taper(elbow, hand, 0.048, 0.038), uniform));
    root.add(mesh(Sphere(0.038, 10, 8), skin, hand));
  }
  const rifle = new THREE.Group();
  const from = new THREE.Vector3(0.17, 1.05, 0.22);
  const to = new THREE.Vector3(-0.1, 1.42, 0.2);
  const dir = to.clone().sub(from);
  const length = dir.length();
  rifle.position.copy(from);
  rifle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  rifle.add(mesh(RoundedBox(0.038, 0.06, 0.34, 2, 0.01), wood, [0, 0, 0.1]));
  rifle.add(mesh(new THREE.BoxGeometry(0.034, 0.045, 0.32), wood, [0, 0.005, 0.5]));
  rifle.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, length - 0.4, 8).rotateX(Math.PI / 2), metal, [0, 0.022, 0.4 + (length - 0.4) / 2 - 0.05]));
  rifle.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.22), metal, [0, 0.03, 0.62]));
  rifle.add(mesh(rod([0, 0, -0.06], [0, -0.09, -0.12], 0.008, 6), metal));
  root.add(rifle);

  return options.bake === false ? root : bake(root);
}

export function buildSoldier(): BuiltModel {
  const root = new THREE.Group();
  const plinth = group([
    mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.08, 64), std(0x1d1a17, { rough: 0.5, metal: 0.4 }), [0, -0.04, 0]),
    mesh(new THREE.TorusGeometry(0.85, 0.008, 8, 64).rotateX(Math.PI / 2), std(0xd8b25a, { rough: 0.3, metal: 1 }), [0, 0.001, 0]),
  ]);
  root.add(plinth, createSoldier(), shadowFloor(3, -0.08));
  return { root };
}
