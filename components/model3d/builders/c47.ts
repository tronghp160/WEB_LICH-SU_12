import * as THREE from "three";
import { extrude, group, lathe, mesh, rod, std, type BuiltModel } from "@/components/model3d/kit";
import { concreteTexture, grassTexture, rivetedPanelTexture, roundelTexture, woodTexture } from "@/components/model3d/textures";

/**
 * Máy bay vận tải C-47 (Dakota) hai động cơ cánh quạt, dáng đậu trên đường băng (mũi hơi ngóc). Nhìn thực tế: dài 19,4 m, sải cánh 29 m.
 * Nút "Nổ máy" cho cánh quạt quay; nút "Thả hàng" thả các kiện hàng bằng dù như cách Pháp tiếp tế cho Điện Biên Phủ.
 * Mũi hướng về −z. Gốc tọa độ ở mặt đất dưới trục bánh chính.
 */
const FUSELAGE: [number, number][] = [
  // (bán kính, khoảng cách từ đuôi)
  [0.05, 0],
  [0.22, 0.3],
  [0.42, 2],
  [0.68, 4.5],
  [0.98, 7.2],
  [1.18, 9.5],
  [1.26, 12],
  [1.28, 14.5],
  [1.2, 16.5],
  [1.0, 17.9],
  [0.65, 18.9],
  [0.28, 19.35],
  [0.02, 19.45],
];

function radiusAt(distanceFromTail: number): number {
  for (let i = 1; i < FUSELAGE.length; i++) {
    const [r1, y1] = FUSELAGE[i];
    const [r0, y0] = FUSELAGE[i - 1];
    if (distanceFromTail <= y1) return r0 + ((r1 - r0) * (distanceFromTail - y0)) / (y1 - y0);
  }
  return 0;
}

const TILT = 0.19;

/** Mặt phẳng đứng (đuôi): đường viền (z, y), dày `depth` theo x. */
function vertical(outline: [number, number][], depth: number): THREE.BufferGeometry {
  return extrude(
    outline.map(([z, y]) => [-z, y]),
    depth,
    [],
    0.02,
  ).rotateY(Math.PI / 2);
}

/** Mặt phẳng nằm (cánh): đường viền (x, độ lùi về phía mũi), dày `depth` theo y. */
function horizontal(outline: [number, number][], depth: number): THREE.BufferGeometry {
  return extrude(outline, depth, [], 0.03).rotateX(-Math.PI / 2);
}

export function buildC47(): BuiltModel {
  const root = new THREE.Group();
  const alu = std(0xd2d6da, { rough: 0.34, metal: 1, envMapIntensity: 1.3, map: rivetedPanelTexture([7, 2.4]), bumpScale: 0.25 });
  const aluWing = std(0xd2d6da, { rough: 0.36, metal: 1, envMapIntensity: 1.2, map: rivetedPanelTexture([0.55, 0.55], 14), bumpScale: 0.25 });
  const aluDark = std(0x8f9398, { rough: 0.4, metal: 1 });
  const glass = std(0x0b1620, { rough: 0.1, metal: 0.3, envMapIntensity: 1.6 });
  const black = std(0x1a1b1c, { rough: 0.5, metal: 0.6 });
  const rubber = std(0x111111, { rough: 0.95 });
  const olive = std(0x4c5230, { rough: 0.6, metal: 0.3 });

  // ----- Đường băng -----
  const grass = mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), std(0xffffff, { map: grassTexture([50, 50]), rough: 1 }), [0, 0, 0], { cast: false });
  root.add(grass);
  const runwayTexture = concreteTexture([2, 24]);
  const runway = mesh(new THREE.PlaneGeometry(22, 300).rotateX(-Math.PI / 2), std(0x9a9a94, { map: runwayTexture, rough: 0.95 }), [0, 0.01, 0], { cast: false });
  root.add(runway);
  for (let z = -140; z < 140; z += 16) root.add(mesh(new THREE.PlaneGeometry(0.5, 7).rotateX(-Math.PI / 2), std(0xe6e3d6, { rough: 0.9 }), [0, 0.02, z], { cast: false }));

  // ----- Thân máy bay (mọi thứ tính trong hệ cục bộ; gốc = trục bánh chính, cả cụm nghiêng nhẹ mũi ngóc) -----
  const body = new THREE.Group();
  body.position.set(0, 0.72, 0);
  body.rotation.x = TILT;
  root.add(body);

  const FUS_Y = 1.6;
  const FUS_SHIFT = 9;
  const fuselage = mesh(lathe(FUSELAGE.map(([r, y]) => [r, y] as [number, number]), 40).rotateX(-Math.PI / 2).translate(0, 0, FUS_SHIFT), alu, [0, FUS_Y, 0]);
  body.add(fuselage);
  const zAt = (dist: number) => FUS_SHIFT - dist; // khoảng cách từ đuôi → z cục bộ
  const distAtZ = (z: number) => FUS_SHIFT - z;

  // kính buồng lái và cửa sổ khoang hành khách
  for (const side of [-1, 1]) {
    for (const [z, w] of [
      [-7.6, 0.5],
      [-6.9, 0.5],
    ] as [number, number][]) {
      const r = radiusAt(distAtZ(z));
      body.add(mesh(new THREE.BoxGeometry(0.06, 0.42, w), glass, [side * (Math.sqrt(Math.max(r * r - 0.5 * 0.5, 0.01)) - 0.01), FUS_Y + 0.5, z], { rot: [0, 0, side * 0.42], cast: false }));
    }
    for (let i = 0; i < 6; i++) {
      const z = -0.6 + i * 1.28;
      const r = radiusAt(distAtZ(z));
      const x = Math.sqrt(Math.max(r * r - 0.42 * 0.42, 0.01));
      body.add(mesh(new THREE.BoxGeometry(0.03, 0.32, 0.46), glass, [side * (x + 0.03), FUS_Y + 0.42, z], { rot: [0, 0, side * 0.34], cast: false }));
      body.add(mesh(new THREE.BoxGeometry(0.03, 0.38, 0.52), aluDark, [side * (x + 0.018), FUS_Y + 0.42, z], { rot: [0, 0, side * 0.34], cast: false }));
    }
  }
  body.add(mesh(new THREE.BoxGeometry(1.6, 0.25, 1.1), glass, [0, FUS_Y + 0.98, zAt(17.3)], { rot: [0.35, 0, 0], cast: false }));

  // cửa hàng bên trái phía sau cánh (nơi thả dù): một tấm vỏ cong ôm sát thân
  const doorR = radiusAt(distAtZ(4.4)) + 0.04;
  const doorPanel = mesh(new THREE.CylinderGeometry(doorR, doorR, 2.3, 24, 1, true, Math.PI * 0.5 + Math.PI * 0.86, Math.PI * 0.28).rotateX(Math.PI / 2), aluDark, [0, FUS_Y, 4.4], { cast: false });
  (doorPanel.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  body.add(doorPanel, mesh(new THREE.BoxGeometry(0.08, 0.06, 0.4), black, [-doorR - 0.02, FUS_Y + 0.02, 5.3], { cast: false }));

  // phù hiệu tròn xanh–trắng–đỏ của không quân Pháp ở hai bên đuôi
  const roundel = new THREE.MeshStandardMaterial({ map: roundelTexture(), roughness: 0.55, metalness: 0.1, transparent: true });
  for (const side of [-1, 1]) {
    const r = radiusAt(distAtZ(6.5));
    body.add(mesh(new THREE.CircleGeometry(0.3, 40), roundel, [side * (r + 0.01), FUS_Y + 0.02, 6.5], { rot: [0, side * Math.PI / 2, 0], cast: false }));
  }

  // ----- Cánh: phần giữa dày, hai đầu cánh mỏng dần -----
  const WING_Y = 1.3;
  const wingMid = mesh(horizontal([[-5.6, 0.0], [5.6, 0.0], [5.6, 4.3], [-5.6, 4.3]], 0.62), aluWing, [0, WING_Y, 1.0]);
  body.add(wingMid);
  for (const side of [-1, 1]) {
    const outline: [number, number][] = [
      [5.4 * side, 0.0],
      [14.5 * side, 1.0],
      [14.5 * side, 3.05],
      [5.4 * side, 4.3],
    ];
    if (side === -1) outline.reverse();
    const wing = mesh(horizontal(outline, 0.34), aluWing, [0, WING_Y + 0.08, 1.0]);
    wing.rotation.z = side * 0.05; // cánh hơi vếch lên
    wing.position.y += side === 1 ? 0 : 0;
    body.add(wing);
    // đèn cánh, phù hiệu tròn ở mặt trên đầu cánh
    body.add(mesh(new THREE.CircleGeometry(0.55, 40).rotateX(-Math.PI / 2), roundel, [side * 10.2, WING_Y + 0.38 + 10.2 * 0.05, 0.25], { cast: false }));
    body.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), std(side === 1 ? 0x1fa35a : 0xd83a2f, { emissive: side === 1 ? 0x1fa35a : 0xd83a2f, emissiveIntensity: 1.6 }), [side * 14.5, WING_Y + 0.44 + 0.72, 2.0], { cast: false }));
  }

  // ----- Hai động cơ: vỏ động cơ, cánh quạt ba lá -----
  const propellers: THREE.Group[] = [];
  const discs: THREE.Mesh[] = [];
  const nacelleProfile: [number, number][] = [
    [0.04, 0],
    [0.3, 1.0],
    [0.62, 2.6],
    [0.8, 4.0],
    [0.82, 5.6],
    [0.9, 5.8],
    [0.9, 6.3],
    [0.6, 6.5],
  ];
  const bladeOutline: [number, number][] = [
    [-0.1, 0.25],
    [0.1, 0.25],
    [0.16, 1.0],
    [0.12, 1.75],
    [-0.12, 1.75],
    [-0.16, 1.0],
  ];
  for (const side of [-1, 1]) {
    const x = side * 4.7;
    const nacelle = mesh(lathe(nacelleProfile, 32).rotateX(-Math.PI / 2).translate(0, 0, 0.9), alu, [x, WING_Y, 0]);
    body.add(nacelle);
    // xi lanh động cơ hình sao lộ ra sau vành che
    const engine = mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.5, 24).rotateX(Math.PI / 2), black, [x, WING_Y, -5.1]);
    body.add(engine);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      body.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.25, 8).rotateX(Math.PI / 2), aluDark, [x + Math.cos(a) * 0.6, WING_Y + Math.sin(a) * 0.6, -5.3], { cast: false }));
    }
    const prop = new THREE.Group();
    prop.position.set(x, WING_Y, -5.55);
    prop.add(mesh(new THREE.SphereGeometry(0.3, 20, 12).scale(1, 1, 1.35), std(0x2a2b2d, { rough: 0.35, metal: 0.8 }), [0, 0, -0.1]));
    for (let i = 0; i < 3; i++) {
      const blade = mesh(extrude(bladeOutline, 0.045, [], 0.012), black, [0, 0, 0]);
      const tip = mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05).translate(0, 1.6, 0), std(0xd8c02a, { rough: 0.5 }), [0, 0, 0], { cast: false });
      const holder = new THREE.Group();
      holder.add(blade, tip);
      holder.rotation.z = (i / 3) * Math.PI * 2;
      holder.children[0].rotation.x = 0.18;
      prop.add(holder);
    }
    // đĩa mờ khi quay nhanh
    const disc = mesh(new THREE.CircleGeometry(1.8, 48), new THREE.MeshBasicMaterial({ color: 0x9aa0a6, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), [0, 0, 0.02], { cast: false, receive: false });
    prop.add(disc);
    discs.push(disc);
    propellers.push(prop);
    body.add(prop);
  }

  // ----- Đuôi -----
  body.add(mesh(vertical([[6.0, 2.05], [9.3, 2.35], [8.9, 5.5], [8.3, 6.0], [7.2, 5.7]], 0.2), aluWing, [0, 0, 0]));
  body.add(mesh(vertical([[8.8, 3.0], [9.35, 2.9], [9.0, 5.6], [8.85, 5.7]], 0.14), olive, [0, 0.02, 0.02]));
  for (const side of [-1, 1]) {
    const outline: [number, number][] = [
      [0.5 * side, 0.0],
      [4.6 * side, 0.9],
      [4.6 * side, 2.0],
      [0.5 * side, 2.7],
    ];
    if (side === -1) outline.reverse();
    body.add(mesh(horizontal(outline, 0.18), aluWing, [0, FUS_Y + 0.05, 7.1]));
  }
  body.add(mesh(horizontal([[-0.6, 0.0], [0.6, 0.0], [0.6, 2.7], [-0.6, 2.7]], 0.22), aluWing, [0, FUS_Y + 0.05, 7.1]));

  // ----- Bánh xe chính, bánh đuôi -----
  for (const side of [-1, 1]) {
    const x = side * 4.7;
    body.add(mesh(rod([x, WING_Y - 0.1, -0.7], [x, 0, 0.2], 0.11, 10), std(0x2b2d30, { rough: 0.4, metal: 0.9 })));
    body.add(mesh(rod([x, WING_Y - 0.1, 0.9], [x, 0.1, 0.2], 0.06, 8), std(0x2b2d30, { rough: 0.4, metal: 0.9 })));
    const tire = group([
      mesh(new THREE.TorusGeometry(0.5, 0.22, 16, 32).rotateY(Math.PI / 2), rubber),
      mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 24).rotateZ(Math.PI / 2), aluDark),
      mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14).rotateZ(Math.PI / 2), black),
    ]);
    tire.position.set(x, 0, 0.2);
    body.add(tire);
  }
  body.add(mesh(rod([0, FUS_Y - 0.5, 8.0], [0, 1.1, 8.35], 0.07, 8), black));
  body.add(mesh(new THREE.TorusGeometry(0.14, 0.06, 10, 20).rotateY(Math.PI / 2), rubber, [0, 1.05, 8.35]));

  // ----- Kiện hàng chờ thả (thùng gỗ + dù) -----
  const crateMaterial = std(0xffffff, { map: woodTexture([1, 1], 12, [0.5, 0.36, 0.2]), rough: 0.85 });
  const chuteMaterial = std(0xe8e2d0, { rough: 0.9, side: THREE.DoubleSide });
  const ropeMaterial = std(0xcccccc, { rough: 0.9 });
  const crates: { group: THREE.Group; canopy: THREE.Object3D; drift: THREE.Vector2; delay: number }[] = [];
  const doorWorld = new THREE.Vector3(-3.2, 1.6, 5.4);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), crateMaterial, [0, 0.35, 0]), mesh(new THREE.BoxGeometry(0.84, 0.06, 0.84), std(0x3b2b1a, { rough: 0.9 }), [0, 0.7, 0]));
    const canopyGroup = new THREE.Group();
    canopyGroup.add(mesh(new THREE.SphereGeometry(2.2, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), chuteMaterial, [0, 4.4, 0], { scale: [1, 0.8, 1] }));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      canopyGroup.add(mesh(rod([Math.cos(a) * 2.1, 4.5, Math.sin(a) * 2.1], [Math.cos(a) * 0.3, 0.75, Math.sin(a) * 0.3], 0.012, 4), ropeMaterial, [0, 0, 0], { cast: false }));
    }
    g.add(canopyGroup);
    g.visible = false;
    root.add(g);
    crates.push({ group: g, canopy: canopyGroup, drift: new THREE.Vector2(-1.2 - i * 0.8, 4 + i * 1.6), delay: i * 0.55 });
  }

  // đặt vị trí cửa hàng theo hệ thế giới (sau khi thân nghiêng)
  const doorPoint = new THREE.Vector3(-doorR, FUS_Y, 4.4).applyEuler(new THREE.Euler(TILT, 0, 0)).add(new THREE.Vector3(0, 0.72, 0));
  doorWorld.copy(doorPoint);

  let spin = 0;
  let spinTarget = 0;
  let dropAt = -1;
  let clock = 0;

  return {
    root,
    update(time, dt) {
      clock = time;
      spin += (spinTarget - spin) * Math.min(1, dt * 1.6);
      propellers.forEach((prop, i) => {
        prop.rotation.z += spin * dt * (i === 0 ? 1 : 1.07);
      });
      discs.forEach((disc) => {
        (disc.material as THREE.MeshBasicMaterial).opacity = Math.min(0.28, (spin / 30) * 0.28);
      });
      // dù: rơi chậm, lắc lư, tán dù phồng lên sau khoảng nửa giây
      crates.forEach((crate, i) => {
        if (dropAt < 0) {
          crate.group.visible = false;
          return;
        }
        const age = time - dropAt - crate.delay;
        if (age < 0) {
          crate.group.visible = false;
          return;
        }
        crate.group.visible = true;
        const fall = Math.min(1, age / 7);
        const ease = 1 - (1 - fall) * (1 - fall);
        const sway = Math.sin(age * 1.4 + i) * 0.35 * (1 - fall);
        crate.group.position.set(doorWorld.x + crate.drift.x * ease + sway, 0.02 + (doorWorld.y + 5 - 0.02) * (1 - ease) ** 1.4, doorWorld.z + crate.drift.y * ease);
        const open = Math.min(1, age / 0.7);
        crate.canopy.scale.setScalar(0.05 + open * 0.95 - (fall >= 1 ? 0.75 : 0));
        crate.canopy.visible = true;
        crate.canopy.rotation.z = Math.sin(age * 1.1 + i * 2) * 0.12 * (1 - fall);
      });
    },
    actions: {
      engines: () => {
        spinTarget = spinTarget > 0 ? 0 : 34;
      },
      drop: () => {
        dropAt = clock + 0.05;
      },
    },
  };
}
