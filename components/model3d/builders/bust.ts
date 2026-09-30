import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lathe, mesh, shadowFloor, std, type BuiltModel } from "@/components/model3d/kit";
import { marbleTexture, textPlateTexture } from "@/components/model3d/textures";

/**
 * Tượng bán thân cách điệu bằng đồng đặt trên bệ đá cẩm thạch, có bảng tên. Khuôn mặt được giản lược (không có nét riêng),
 * để tránh dựng chân dung sai lệch của người thật; chỉ khác nhau về mũ và quân phục. Gốc tọa độ ở đỉnh bệ.
 */
export type BustVariant = {
  name: string;
  role: string;
  hat: "helmet" | "kepi" | "floppy";
  /** Vai áo có cầu vai (sĩ quan cao cấp). */
  epaulettes: boolean;
};

export function buildBust(variant: BustVariant): BuiltModel {
  const root = new THREE.Group();
  const bronze = std(0x8f6b3c, { rough: 0.36, metal: 0.92, envMapIntensity: 1.3 });
  const bronzeDark = std(0x6b4d2a, { rough: 0.45, metal: 0.9, envMapIntensity: 1.1 });
  const gold = std(0xd8b25a, { rough: 0.28, metal: 1 });
  const marble = std(0xffffff, { map: marbleTexture([1.4, 1.4], 5), rough: 0.25, metal: 0.05, envMapIntensity: 1.2 });

  // ----- Bệ đá và bảng tên -----
  root.add(mesh(new RoundedBoxGeometry(1.2, 0.16, 0.9, 3, 0.03), marble, [0, -0.08 - 0.72, 0]));
  root.add(mesh(new RoundedBoxGeometry(0.92, 0.72, 0.66, 3, 0.03), marble, [0, -0.36, 0]));
  root.add(mesh(new RoundedBoxGeometry(1.0, 0.08, 0.74, 3, 0.02), marble, [0, -0.04, 0]));
  const plate = new THREE.MeshStandardMaterial({ map: textPlateTexture([variant.name.toUpperCase(), variant.role], { width: 640, height: 200 }), roughness: 0.4, metalness: 0.3 });
  root.add(mesh(new THREE.PlaneGeometry(0.72, 0.225), plate, [0, -0.36, 0.336], { cast: false }));

  // ----- Vai, ngực và cổ áo -----
  const shoulders = mesh(new THREE.SphereGeometry(1, 40, 20).scale(0.3, 0.16, 0.17), bronze, [0, 0.58, 0]);
  const chest = mesh(new RoundedBoxGeometry(0.48, 0.44, 0.27, 6, 0.12), bronze, [0, 0.36, 0]);
  const base = mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.06, 32).scale(1, 1, 0.6), bronzeDark, [0, 0.04, 0]);
  root.add(shoulders, chest, base);
  root.add(mesh(new THREE.TorusGeometry(0.095, 0.024, 10, 28).rotateX(Math.PI / 2), bronzeDark, [0, 0.72, 0]));
  root.add(mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 20), bronze, [0, 0.78, 0]));
  // hàng cúc và túi ngực
  for (let i = 0; i < 4; i++) root.add(mesh(new THREE.SphereGeometry(0.018, 10, 8), gold, [0, 0.62 - i * 0.09, 0.138]));
  for (const x of [-0.13, 0.13]) root.add(mesh(new RoundedBoxGeometry(0.11, 0.1, 0.02, 2, 0.008), bronzeDark, [x, 0.46, 0.136]));
  if (variant.epaulettes) {
    for (const x of [-0.23, 0.23]) {
      root.add(mesh(new RoundedBoxGeometry(0.13, 0.024, 0.07, 2, 0.006), gold, [x, 0.65, 0.0], { rot: [0, 0, x > 0 ? -0.35 : 0.35] }));
      for (let i = 0; i < 2; i++) root.add(mesh(new THREE.SphereGeometry(0.014, 8, 6), bronzeDark, [x + (x > 0 ? -0.02 : 0.02) * i * 2, 0.716 - 0.007 * i * 3, 0]));
    }
  }

  // ----- Đầu giản lược: sọ, hàm, mũi, gò mày, tai (không có mắt, miệng) -----
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0.01);
  head.scale.setScalar(1.55);
  head.add(mesh(new THREE.SphereGeometry(1, 40, 24).scale(0.105, 0.135, 0.12), bronze, [0, 0, 0]));
  head.add(mesh(new THREE.SphereGeometry(1, 28, 16).scale(0.078, 0.07, 0.085), bronze, [0, -0.085, 0.022]));
  head.add(mesh(new THREE.SphereGeometry(1, 16, 12).scale(0.02, 0.05, 0.03), bronze, [0, -0.012, 0.12], { rot: [0.25, 0, 0] }));
  head.add(mesh(new THREE.SphereGeometry(1, 20, 10).scale(0.088, 0.018, 0.05), bronzeDark, [0, 0.03, 0.098]));
  for (const x of [-0.105, 0.105]) head.add(mesh(new THREE.SphereGeometry(1, 12, 10).scale(0.016, 0.04, 0.026), bronze, [x, -0.01, 0.0]));

  // ----- Mũ theo từng nhân vật -----
  if (variant.hat === "helmet") {
    // mũ cối: chỏm tròn + vành rộng hơi cụp xuống
    head.add(mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.128, 0.11, 0.135), bronzeDark, [0, 0.075, 0]));
    head.add(
      mesh(
        lathe(
          [
            [0.11, 0.0],
            [0.17, -0.006],
            [0.215, -0.024],
            [0.225, -0.034],
            [0.2, -0.03],
            [0.11, -0.012],
          ],
          40,
        ),
        bronzeDark,
        [0, 0.078, 0],
      ),
    );
    head.add(mesh(new THREE.SphereGeometry(0.014, 10, 8), gold, [0, 0.185, 0]));
    head.add(mesh(new THREE.TorusGeometry(0.128, 0.008, 6, 36).rotateX(Math.PI / 2), gold, [0, 0.093, 0]));
  } else if (variant.hat === "kepi") {
    // mũ kê-pi của sĩ quan Pháp: thân trụ thấp, đỉnh phẳng hơi nghiêng ra trước, có lưỡi trai
    const crown = mesh(new THREE.CylinderGeometry(0.115, 0.128, 0.085, 36), bronzeDark, [0, 0.135, 0], { rot: [0.08, 0, 0] });
    head.add(crown);
    head.add(mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.03, 36), bronzeDark, [0.0, 0.185, 0.012], { rot: [0.12, 0, 0] }));
    head.add(mesh(new THREE.TorusGeometry(0.12, 0.006, 6, 36).rotateX(Math.PI / 2), gold, [0, 0.112, 0.004]));
    head.add(mesh(new THREE.CircleGeometry(0.135, 32, Math.PI * 0.12, Math.PI * 0.76).rotateX(-Math.PI / 2 + 0.12).scale(1, 1, 0.9), new THREE.MeshStandardMaterial({ color: 0x5b4023, roughness: 0.5, metalness: 0.9, side: THREE.DoubleSide }), [0, 0.098, 0.07], { cast: true }));
    for (let i = 0; i < 3; i++) head.add(mesh(new THREE.BoxGeometry(0.1 - i * 0.02, 0.006, 0.006), gold, [0, 0.145 + i * 0.012, 0.125]));
  } else {
    // mũ tai bèo: chỏm tròn mềm, vành rộng rủ xuống
    head.add(mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(0.118, 0.085, 0.125), bronzeDark, [0, 0.085, 0]));
    head.add(
      mesh(
        lathe(
          [
            [0.11, 0.0],
            [0.17, -0.008],
            [0.23, -0.038],
            [0.245, -0.062],
            [0.235, -0.066],
            [0.17, -0.03],
            [0.11, -0.01],
          ],
          40,
        ),
        bronzeDark,
        [0, 0.085, 0],
      ),
    );
    head.add(mesh(new THREE.TorusGeometry(0.118, 0.007, 6, 36).rotateX(Math.PI / 2), bronze, [0, 0.096, 0]));
  }
  root.add(head);

  root.add(shadowFloor(2.4, -0.8));
  return { root };
}

export function bustBuilder(variant: BustVariant) {
  return () => buildBust(variant);
}
