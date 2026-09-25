import * as THREE from "three";
import { extrude, foliage, group, lathe, mesh, rod, sandbagWall, std, groundDisc, type BuiltModel } from "@/components/model3d/kit";
import { leafTexture, paintedSteelTexture, woodTexture } from "@/components/model3d/textures";

/**
 * Lựu pháo 105 mm (kiểu M101) trong trận địa ngụy trang. Nòng hướng về −z, nâng ~16°. Mọi chi tiết dựng bằng mã.
 * Kích thước theo thực tế (bánh xe ~1,1 m, nòng dài ~2,5 m, càng pháo dài ~3,7 m).
 */
export function buildHowitzer(): BuiltModel {
  const root = new THREE.Group();
  const paint = paintedSteelTexture([0.26, 0.31, 0.17], [3, 3]);
  const olive = std(0xffffff, { map: paint, rough: 0.62, metal: 0.35, bumpScale: 0.35 });
  const darkSteel = std(0x2d2f2c, { rough: 0.42, metal: 0.85 });
  const brass = std(0xb58a3a, { rough: 0.3, metal: 0.95 });
  const rubber = std(0x151515, { rough: 0.95 });
  const wood = std(0xffffff, { map: woodTexture([1.5, 1], 4, [0.46, 0.34, 0.2]), rough: 0.85 });

  root.add(groundDisc(140, { grass: true }));

  // ----- Bánh xe -----
  const wheel = (x: number) => {
    const w = new THREE.Group();
    w.add(mesh(new THREE.TorusGeometry(0.47, 0.135, 16, 40).rotateY(Math.PI / 2), rubber));
    w.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32).rotateZ(Math.PI / 2), olive));
    w.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 20).rotateZ(Math.PI / 2), darkSteel));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      w.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 8).rotateZ(Math.PI / 2), darkSteel, [0, Math.cos(a) * 0.27, Math.sin(a) * 0.27]));
    }
    w.position.set(x, 0.6, 0);
    return w;
  };
  root.add(wheel(-1.02), wheel(1.02));
  root.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 16).rotateZ(Math.PI / 2), darkSteel, [0, 0.6, 0]));

  // ----- Thân giá pháo -----
  root.add(mesh(new THREE.BoxGeometry(0.62, 0.34, 0.95), olive, [0, 0.82, 0.05]));
  root.add(mesh(new THREE.BoxGeometry(0.9, 0.16, 0.5), olive, [0, 0.66, 0.1]));
  // gối đỡ nòng (hai má)
  for (const x of [-0.24, 0.24]) root.add(mesh(new THREE.BoxGeometry(0.1, 0.5, 0.5), olive, [x, 1.1, -0.05]));

  // ----- Nòng pháo và bộ giật: quay quanh trục đỡ nòng để nâng góc bắn -----
  const barrelGroup = new THREE.Group();
  barrelGroup.position.set(0, 1.18, -0.05);
  barrelGroup.rotation.x = 0.28;
  const barrelProfile: [number, number][] = [
    [0.0, -0.75],
    [0.17, -0.75],
    [0.17, -0.45],
    [0.135, -0.4],
    [0.115, 0.2],
    [0.105, 1.1],
    [0.093, 1.9],
    [0.088, 2.3],
    [0.105, 2.36],
    [0.105, 2.5],
    [0.0, 2.5],
  ];
  barrelGroup.add(mesh(lathe(barrelProfile, 28).rotateX(-Math.PI / 2), darkSteel));
  // ống lót và hai xi lanh giật phía trên
  barrelGroup.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.15, 24).rotateX(Math.PI / 2), olive, [0, 0, 0.05]));
  for (const x of [-0.09, 0.09]) barrelGroup.add(mesh(new THREE.CylinderGeometry(0.052, 0.052, 1.35, 12).rotateX(Math.PI / 2), darkSteel, [x, 0.24, -0.05]));
  barrelGroup.add(mesh(new THREE.BoxGeometry(0.3, 0.32, 0.4), darkSteel, [0, 0, 0.72]));
  barrelGroup.add(mesh(rod([0.16, 0.05, 0.86], [0.42, 0.22, 1.02], 0.018, 8), darkSteel));
  barrelGroup.add(mesh(new THREE.SphereGeometry(0.04, 12, 10), darkSteel, [0.42, 0.22, 1.02]));
  root.add(barrelGroup);

  // ----- Lá chắn -----
  const shieldOutline: [number, number][] = [
    [-0.85, 0],
    [0.85, 0],
    [0.78, 0.98],
    [0.2, 1.04],
    [0.2, 0.62],
    [-0.2, 0.62],
    [-0.2, 1.04],
    [-0.78, 0.98],
  ];
  const shield = mesh(extrude(shieldOutline, 0.028, [], 0.012), olive, [0, 0.72, -0.62], { rot: [-0.16, 0, 0] });
  root.add(shield);
  for (const x of [-0.6, 0, 0.6]) root.add(mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), darkSteel, [x, 0.98, -0.6], { rot: [-0.16, 0, 0] }));

  // ----- Bộ nâng góc, thước ngắm -----
  const handwheel = mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 20).rotateY(Math.PI / 2), darkSteel, [-0.34, 0.86, 0.32]);
  root.add(handwheel);
  root.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8).rotateZ(Math.PI / 2), darkSteel, [-0.28, 0.86, 0.32]));
  root.add(mesh(new THREE.BoxGeometry(0.1, 0.13, 0.22), darkSteel, [-0.33, 1.42, -0.25]));
  root.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12).rotateX(Math.PI / 2), darkSteel, [-0.33, 1.47, -0.3]));

  // ----- Hai càng pháo và bàn đạp cắm đất -----
  const trail = (side: 1 | -1) => {
    const a: [number, number, number] = [0.26 * side, 0.6, 0.55];
    const b: [number, number, number] = [1.42 * side, 0.12, 3.7];
    const t = new THREE.Group();
    t.add(mesh(rod(a, b, 0.075, 10), olive));
    t.add(mesh(rod([a[0], a[1] + 0.09, a[2]], [b[0], b[1] + 0.09, b[2]], 0.035, 8), darkSteel));
    const spade = mesh(extrude([[-0.28, 0], [0.28, 0], [0.22, -0.52], [-0.22, -0.52]], 0.035, [], 0.01), olive, [b[0], b[1] - 0.02, b[2] + 0.05], { rot: [0.55, 0.12 * side, 0] });
    t.add(spade);
    t.add(mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 0.8), std(0x4b3722, { rough: 1 }), [b[0], 0, b[2] + 0.2], { cast: false }));
    t.add(mesh(rod([b[0], b[1] + 0.02, b[2] - 0.05], [b[0] + 0.28 * side, 0.85, b[2] - 0.05], 0.025, 8), darkSteel));
    return t;
  };
  root.add(trail(1), trail(-1));

  // ----- Vỏ đạn và đạn pháo -----
  const shellCase = () => {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0], [0.06, 0], [0.062, 0.02], [0.05, 0.42], [0.046, 0.46], [0, 0.46]], 16), brass));
    g.add(mesh(lathe([[0.046, 0.45], [0.046, 0.6], [0.036, 0.72], [0.0, 0.82]], 16), std(0x50543a, { rough: 0.5, metal: 0.6 })));
    g.add(mesh(new THREE.TorusGeometry(0.048, 0.006, 6, 16).rotateX(Math.PI / 2), brass, [0, 0.55, 0]));
    return g;
  };
  [[-0.5, 3.1, 0.2], [-0.4, 3.35, 1.9], [-0.2, 2.9, -0.3]].forEach(([x, z, rot], i) => {
    const s = shellCase();
    s.rotation.set(Math.PI / 2, 0, rot + i);
    s.position.set(-1.7 + x * 0.3 - i * 0.02, 0.07, z - 0.4 + i * 0.16);
    root.add(s);
  });

  // ----- Thùng đạn gỗ và bao cát che chắn -----
  const crate = (x: number, z: number, ry: number, h = 0.42) => {
    const c = group([mesh(new THREE.BoxGeometry(0.85, h, 0.42), wood), mesh(new THREE.BoxGeometry(0.87, 0.05, 0.44), std(0x3b2b1a, { rough: 0.9 }), [0, h / 2 - 0.02, 0])], [x, h / 2, z], [0, ry, 0]);
    return c;
  };
  root.add(crate(-2.5, 1.2, 0.3), crate(-2.6, 1.72, -0.1), crate(-2.45, 1.45, 0.25, 0.84));
  root.add(sandbagWall([-3.0, -1.9], [-1.1, -2.05], 3, { seed: 3 }), sandbagWall([3.0, -1.7], [1.3, -2.1], 3, { seed: 5 }), sandbagWall([-3.0, -1.9], [-3.15, 0.4], 2, { seed: 7 }));

  // ----- Lá ngụy trang -----
  const leaves = leafTexture(4);
  root.add(foliage([-0.8, 1.7, -0.45], 0.9, leaves, 1), foliage([0.85, 1.7, -0.5], 0.85, leaves, 2), foliage([0, 1.75, -0.4], 0.7, leaves, 3), foliage([1.35, 0.28, 1.4], 0.8, leaves, 5), foliage([-3.1, 0.75, -1.9], 0.8, leaves, 6), foliage([3.0, 0.75, -1.8], 0.8, leaves, 7));
  return { root };
}
