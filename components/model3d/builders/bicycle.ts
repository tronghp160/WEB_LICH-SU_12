import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { foliage, groundDisc, group, mesh, rod, std, tube, type BuiltModel } from "@/components/model3d/kit";
import { burlapTexture, leafTexture, textPlateTexture, woodTexture } from "@/components/model3d/textures";

/**
 * Xe đạp thồ: chiếc xe đạp thường được gia cố khung, buộc thêm giá gỗ và chở hàng trăm ki-lô-gam gạo, đạn dược theo đường rừng.
 * Đặt trên đường đất; xe quay dọc trục z (bánh trước ở −z). Có cần lái bằng tre để dắt xe.
 */
export function buildBicycle(): BuiltModel {
  const root = new THREE.Group();
  const paint = std(0x1b1c1e, { rough: 0.38, metal: 0.65 });
  const chrome = std(0xb8bcc2, { rough: 0.22, metal: 1 });
  const rubber = std(0x101010, { rough: 0.92 });
  const leather = std(0x231a14, { rough: 0.6 });
  const wood = std(0xffffff, { map: woodTexture([1, 1], 3, [0.5, 0.35, 0.2]), rough: 0.85 });
  const sackTexture = burlapTexture([0.68, 0.58, 0.38], [1, 1], 5);
  const bamboo = std(0xc8b55a, { rough: 0.55 });

  root.add(groundDisc(140));
  // vệt bánh xe trên đường đất
  for (const z of [-0.3, 0.3]) root.add(mesh(new THREE.PlaneGeometry(0.12, 14).rotateX(-Math.PI / 2), std(0x2a1d12, { rough: 1, transparent: true, opacity: 0.4 }), [0.02 * Math.sign(z), 0.004, 0], { cast: false, rot: [0, 0, 0] }));

  const WHEEL_R = 0.34;
  const wheelZ = 0.58;
  const axleY = WHEEL_R;

  // ----- Bánh xe (lốp, vành, nan hoa, moay-ơ) -----
  const wheel = (z: number) => {
    const w = new THREE.Group();
    w.add(mesh(new THREE.TorusGeometry(WHEEL_R - 0.03, 0.032, 10, 48).rotateY(Math.PI / 2), rubber));
    w.add(mesh(new THREE.TorusGeometry(WHEEL_R - 0.065, 0.009, 8, 48).rotateY(Math.PI / 2), chrome));
    w.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 14).rotateZ(Math.PI / 2), chrome));
    const spokes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const side = i % 2 === 0 ? 0.034 : -0.034;
      spokes.push(rod([side, 0, 0], [0, Math.cos(a) * (WHEEL_R - 0.07), Math.sin(a) * (WHEEL_R - 0.07)], 0.0028, 4));
    }
    w.add(mesh(mergeGeometries(spokes)!, chrome, [0, 0, 0], { cast: false }));
    w.position.set(0, axleY, z);
    return w;
  };
  root.add(wheel(-wheelZ), wheel(wheelZ));

  // ----- Khung xe (gia cố thêm một thanh chéo) -----
  const R: [number, number, number] = [0, axleY, wheelZ];
  const F: [number, number, number] = [0, axleY, -wheelZ];
  const B: [number, number, number] = [0, 0.3, 0.1];
  const S: [number, number, number] = [0, 0.86, 0.22];
  const H: [number, number, number] = [0, 0.92, -0.4];
  const H2: [number, number, number] = [0, 0.8, -0.44];
  const frame = (a: [number, number, number], b: [number, number, number], r = 0.015) => mesh(rod(a, b, r, 10), paint);
  root.add(frame(S, H, 0.017), frame(B, H2, 0.02), frame(B, S), frame(S, [0, 0.62, 0.32], 0.012), frame([0, 0.5, 0.06], [0, 0.66, 0.3], 0.011));
  for (const x of [-0.05, 0.05]) {
    root.add(frame([x * 0.4, B[1], B[2]], [x, R[1], R[2]], 0.011), frame([x * 0.3, S[1], S[2]], [x, R[1], R[2]], 0.009), frame([x, H2[1], H2[2]], [x, F[1], F[2]], 0.013));
  }
  root.add(frame([0, 0.92, -0.4], [0, 1.02, -0.4], 0.014));
  // ghi đông, tay phanh, tay cầm
  root.add(mesh(rod([-0.29, 1.02, -0.4], [0.29, 1.02, -0.4], 0.011, 8), chrome));
  for (const x of [-1, 1]) {
    root.add(mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.11, 10).rotateZ(Math.PI / 2), rubber, [x * 0.26, 1.02, -0.4]));
    root.add(mesh(rod([x * 0.2, 1.03, -0.42], [x * 0.2, 1.0, -0.5], 0.005, 6), chrome));
  }

  // ----- Yên xe, giò đạp, xích -----
  const saddle = mesh(new THREE.SphereGeometry(0.1, 16, 10).scale(1.0, 0.42, 1.65), leather, [0, 0.92, 0.22]);
  root.add(saddle, mesh(rod([0, 0.86, 0.22], [0, 0.93, 0.22], 0.011, 8), chrome));
  const ring = mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 24).rotateY(Math.PI / 2), chrome, [0.045, 0.3, 0.1]);
  root.add(ring, mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 10).rotateZ(Math.PI / 2), chrome, [0, 0.3, 0.1]));
  root.add(mesh(rod([0.07, 0.3, 0.1], [0.07, 0.12, 0.13], 0.011, 6), chrome), mesh(new THREE.BoxGeometry(0.02, 0.02, 0.1), rubber, [0.09, 0.115, 0.13]));
  root.add(mesh(rod([-0.07, 0.3, 0.1], [-0.07, 0.48, 0.07], 0.011, 6), chrome), mesh(new THREE.BoxGeometry(0.02, 0.02, 0.1), rubber, [-0.09, 0.485, 0.07]));
  root.add(mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 16).rotateY(Math.PI / 2), chrome, [0.045, axleY, wheelZ]));
  root.add(mesh(rod([0.045, 0.3 + 0.075, 0.1], [0.045, axleY + 0.03, wheelZ], 0.004, 4), paint), mesh(rod([0.045, 0.3 - 0.075, 0.1], [0.045, axleY - 0.03, wheelZ], 0.004, 4), paint));

  // ----- Chắn bùn -----
  for (const z of [-wheelZ, wheelZ]) root.add(mesh(new THREE.TorusGeometry(WHEEL_R + 0.02, 0.008, 6, 40, Math.PI * 0.8).rotateY(Math.PI / 2).rotateX(Math.PI * 0.1), paint, [0, axleY, z]));

  // ----- Giá đèo hàng bằng gỗ (gia cố) và chân chống -----
  const rack = mesh(new THREE.BoxGeometry(0.46, 0.035, 1.05), wood, [0, 0.72, 0.72]);
  root.add(rack);
  for (const x of [-0.2, 0.2]) root.add(mesh(rod([x, 0.72, 0.4], [x * 0.5, axleY, wheelZ], 0.011, 6), paint));
  root.add(mesh(new THREE.BoxGeometry(0.46, 0.035, 0.6), wood, [0, 0.72, -0.85]), mesh(rod([0.2, 0.72, -0.85], [0.05, axleY, -wheelZ], 0.011, 6), paint), mesh(rod([-0.2, 0.72, -0.85], [-0.05, axleY, -wheelZ], 0.011, 6), paint));
  root.add(mesh(rod([0.05, 0.3, 0.22], [0.2, 0.0, 0.28], 0.008, 6), paint));

  // ----- Cần lái bằng tre: buộc vào ghi đông, dài ra phía sau để người dắt xe -----
  const pole = new THREE.Group();
  const poleStart: [number, number, number] = [0, 1.02, -0.4];
  const poleEnd: [number, number, number] = [0.05, 1.12, 1.95];
  pole.add(mesh(rod(poleStart, poleEnd, 0.022, 10), bamboo));
  for (let i = 1; i < 9; i++) {
    const u = i / 9;
    const p = new THREE.Vector3().fromArray(poleStart).lerp(new THREE.Vector3().fromArray(poleEnd), u);
    pole.add(mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 12), std(0x8a7a30, { rough: 0.6 }), [p.x, p.y, p.z], { rot: [0.05, 0, 0] }));
  }
  root.add(pole);
  root.add(mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 12), std(0x3a2c18, { rough: 0.9 }), [0, 1.02, -0.33], { rot: [0, Math.PI / 2, 0] }));

  // ----- Hàng hóa: bao gạo chất cao, bọc tấm bạt xanh, buộc dây -----
  // bao tải nằm ngang: hình viên thuốc, thắt hai đầu
  const bag = (radius: number, length: number, position: [number, number, number], ry = 0, tint = 0xffffff) => {
    const geometry = new THREE.CapsuleGeometry(radius, length, 8, 16).rotateX(Math.PI / 2);
    geometry.scale(1, 0.82, 1);
    const material = std(tint, { map: sackTexture, rough: 1, bumpScale: 0.9 });
    return mesh(geometry, material, position, { rot: [0, ry, 0] });
  };
  const load = new THREE.Group();
  for (const [x, y, ry, tint] of [
    [-0.15, 0.88, 0.02, 0xffffff],
    [0.15, 0.88, -0.03, 0xe8dcc0],
    [-0.14, 1.14, -0.04, 0xf3ead0],
    [0.14, 1.14, 0.03, 0xffffff],
    [0.0, 1.4, 0.02, 0xe8dcc0],
  ] as [number, number, number, number][]) {
    load.add(bag(0.14, 0.62, [x, y, 0.72], ry, tint));
  }
  load.add(bag(0.11, 0.3, [0.32, 0.8, 0.55], 0.1), bag(0.11, 0.3, [-0.32, 0.8, 0.55], -0.1));
  // bạt xanh phủ hàng phía trước
  load.add(mesh(new RoundedBoxGeometry(0.5, 0.3, 0.75, 4, 0.1), std(0x39472a, { rough: 0.85 }), [0, 0.96, -0.85]), bag(0.11, 0.3, [0, 1.2, -0.86], 0.05));
  root.add(load);
  const rope = std(0x5a4526, { rough: 1 });
  root.add(mesh(tube([[-0.29, 0.78, 0.72], [-0.32, 1.1, 0.72], [0, 1.62, 0.72], [0.32, 1.1, 0.72], [0.29, 0.78, 0.72]], 0.008, 6), rope));
  root.add(mesh(tube([[-0.27, 0.85, -0.85], [-0.25, 1.15, -0.85], [0, 1.4, -0.85], [0.25, 1.15, -0.85], [0.27, 0.85, -0.85]], 0.008, 6), rope));
  // tấm nhãn "GẠO" trên bao
  const label = new THREE.MeshStandardMaterial({ map: textPlateTexture(["GẠO"], { width: 256, height: 128, bg: "#c9b78a", fg: "#7a1f1a", accent: "#7a1f1a" }), roughness: 0.9 });
  root.add(mesh(new THREE.PlaneGeometry(0.22, 0.11), label, [0.29, 1.14, 0.72], { rot: [0, Math.PI / 2, 0], cast: false }));
  root.add(mesh(new THREE.PlaneGeometry(0.22, 0.11), label, [-0.29, 1.14, 0.72], { rot: [0, -Math.PI / 2, 0], cast: false }));

  // ----- Lá ngụy trang và bụi cây ven đường -----
  const leaves = leafTexture(8);
  root.add(foliage([0.0, 1.66, 0.72], 0.55, leaves, 2), foliage([-0.12, 1.22, -0.86], 0.45, leaves, 3));
  const bush = group([foliage([0, 0.5, 0], 1.6, leaves, 4), foliage([0.5, 0.35, 0.3], 1.2, leaves, 5)], [-3.6, 0, -2.4]);
  const bush2 = group([foliage([0, 0.6, 0], 1.9, leaves, 6), foliage([-0.6, 0.4, 0.2], 1.3, leaves, 7)], [3.8, 0, 3.6]);
  root.add(bush, bush2);

  return { root };
}
