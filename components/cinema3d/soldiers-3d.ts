import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clamp, smoothstep } from "@/lib/cinema/math";
import { FALL_DURATION, soldierPose } from "@/lib/cinema/soldiers";
import type { FilmScript, SoldierPlan, SoldierPose } from "@/lib/cinema/types";

/**
 * Lính 3D dạng khối (low-poly) có "xương" giả lập: mỗi người gồm 13 bộ phận, mỗi bộ phận là một InstancedMesh
 * để cả trăm người chỉ tốn 13 lượt vẽ. Tư thế là hàm của (kế hoạch, thời gian) nên tua phim vẫn đúng.
 * Đây là hình khối cách điệu (không phải mô hình quét người thật): đủ để đọc được hành động từ xa và cận cảnh vài mét.
 */

const BODY = { pelvis: 0.92, thigh: 0.46, shin: 0.46, uarm: 0.3, farm: 0.28 };

function boxAt(w: number, h: number, d: number, x: number, y: number, z: number, color: [number, number, number] = [1, 1, 1]): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const count = g.getAttribute("position").count;
  g.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: count }, () => color).flat(), 3));
  return g;
}

function withColor(g: THREE.BufferGeometry, color: [number, number, number]): THREE.BufferGeometry {
  const count = g.getAttribute("position").count;
  g.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: count }, () => color).flat(), 3));
  return g;
}

function buildGeometries() {
  const helmetDome = new THREE.SphereGeometry(0.155, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const helmetBrim = new THREE.CylinderGeometry(0.19, 0.2, 0.02, 10);
  helmetBrim.translate(0, -0.005, 0);
  const shin = mergeGeometries([boxAt(0.13, 0.46, 0.14, 0, -0.23, 0), boxAt(0.14, 0.09, 0.27, 0, -0.44, 0.06, [0.25, 0.22, 0.2])])!;
  return {
    torso: new THREE.BoxGeometry(0.46, 0.6, 0.26),
    head: new THREE.SphereGeometry(0.108, 10, 8),
    helmet: mergeGeometries([withColor(helmetDome, [1, 1, 1]), withColor(helmetBrim, [0.85, 0.85, 0.85])])!,
    thigh: boxAt(0.17, 0.46, 0.17, 0, -0.23, 0),
    shin,
    uarm: boxAt(0.105, 0.3, 0.105, 0, -0.15, 0),
    farm: boxAt(0.095, 0.28, 0.095, 0, -0.14, 0),
    rifle: mergeGeometries([boxAt(0.05, 0.07, 0.42, 0, 0, -0.24, [0.5, 0.36, 0.25]), boxAt(0.035, 0.05, 0.5, 0, 0.005, 0.22, [0.32, 0.32, 0.34])])!,
    pack: new THREE.BoxGeometry(0.34, 0.4, 0.16),
  };
}

type PartName = keyof ReturnType<typeof buildGeometries> | "thighL" | "thighR" | "shinL" | "shinR" | "uarmL" | "uarmR" | "farmL" | "farmR";

export type SoldiersSystem = {
  group: THREE.Group;
  update: (t: number, ground: (x: number, z: number) => number) => void;
  /** Số người đang hiển thị ở lần update gần nhất. */
  visibleCount: () => number;
};

type Angles = {
  drop: number;
  lean: number;
  headYaw: number;
  thighL: number;
  kneeL: number;
  thighR: number;
  kneeR: number;
  uarmL: number;
  farmL: number;
  uarmR: number;
  farmR: number;
  rifle: "aim" | "carry" | "slung";
  bodyPitch: number;
  lateral: number;
  yawExtra: number;
};

const CARRY = { uarmR: 0.55, farmR: 1.15, uarmL: 0.85, farmL: 0.9 };
const AIM = { uarmR: 1.25, farmR: 0.55, uarmL: 1.45, farmL: 0.2 };

function solve(pose: SoldierPose, plan: SoldierPlan, t: number): Angles {
  const id = plan.id;
  const a: Angles = {
    drop: 0,
    lean: 0.03,
    headYaw: Math.sin(t * 0.35 + id) * 0.35,
    thighL: 0,
    kneeL: 0.05,
    thighR: 0,
    kneeR: 0.05,
    ...CARRY,
    rifle: "carry",
    bodyPitch: 0,
    lateral: 0,
    yawExtra: 0,
  };
  const breathe = Math.sin(t * 1.7 + id * 1.3);

  switch (pose.kind) {
    case "run":
    case "walk": {
      const running = pose.kind === "run";
      const phase = (pose.odometer / (running ? 2.3 : 1.5)) * Math.PI * 2 + id * 0.7;
      const amp = running ? 0.85 : 0.45;
      const flex = running ? 1.5 : 0.5;
      a.thighR = amp * Math.sin(phase);
      a.thighL = -amp * Math.sin(phase);
      a.kneeR = flex * Math.max(0, Math.cos(phase)) + 0.1;
      a.kneeL = flex * Math.max(0, -Math.cos(phase)) + 0.1;
      a.uarmL = 0.75 - (running ? 0.55 : 0.3) * Math.sin(phase);
      a.uarmR = 0.6 + 0.12 * Math.sin(phase);
      a.lean = running ? 0.24 : 0.06;
      a.drop = running ? 0.09 + 0.045 * Math.cos(phase * 2) : 0.02 + 0.02 * Math.cos(phase * 2);
      a.lateral = Math.sin(phase) * (running ? 0.06 : 0.03);
      a.headYaw = 0;
      break;
    }
    case "kneel": {
      a.drop = 0.42;
      a.thighL = 1.4;
      a.kneeL = 1.4;
      a.thighR = -0.05;
      a.kneeR = 1.5;
      a.lean = 0.14;
      Object.assign(a, AIM);
      a.rifle = "aim";
      break;
    }
    case "fire": {
      a.thighL = 0.16;
      a.thighR = -0.12;
      a.kneeL = 0.12;
      a.drop = 0.03;
      a.lean = 0.07;
      Object.assign(a, AIM);
      a.rifle = "aim";
      a.headYaw = 0;
      break;
    }
    case "throw": {
      const k = smoothstep(0, 1, pose.since / 1.0);
      a.uarmR = 2.8 - 3.4 * k;
      a.farmR = 1.3 - 1.2 * k;
      a.uarmL = 1.0;
      a.farmL = 0.6;
      a.lean = -0.1 + 0.4 * k;
      a.thighL = 0.3;
      a.thighR = -0.25;
      a.rifle = "slung";
      break;
    }
    case "fall": {
      const k = clamp(pose.since / FALL_DURATION);
      const forward = id % 2 === 0;
      a.bodyPitch = (forward ? 1 : -1) * (Math.PI / 2) * (1 - (1 - k) ** 2);
      a.drop = 0.7 * k ** 1.4 + (forward ? 0 : 0.05);
      a.thighL = 0.35 * k;
      a.thighR = -0.25 * k;
      a.kneeL = 0.3 * k;
      a.kneeR = 0.5 * k;
      a.uarmL = 1.6 * k;
      a.uarmR = 1.2 * k;
      a.farmL = 0.3;
      a.farmR = 0.4;
      a.rifle = "carry";
      a.yawExtra = k * ((id % 7) - 3) * 0.22;
      a.lean = 0;
      a.headYaw = 0;
      break;
    }
    case "handsup": {
      a.uarmL = 3.05 + 0.04 * Math.sin(t * 9 + id);
      a.uarmR = 3.0 + 0.04 * Math.sin(t * 8 + id * 2);
      a.farmL = 0.1;
      a.farmR = 0.1;
      a.lean = -0.04;
      a.thighL = 0.05;
      a.thighR = -0.05;
      a.rifle = "slung";
      break;
    }
    case "flag": {
      a.uarmR = 3.0;
      a.farmR = 0.05;
      a.uarmL = 2.9;
      a.farmL = 0.1;
      a.lean = -0.02 + 0.02 * breathe;
      a.headYaw = 0;
      a.rifle = "slung";
      break;
    }
    default: {
      // idle
      a.lean = 0.03 + 0.012 * breathe;
      a.drop = 0.006 * breathe;
      a.thighL = 0.05;
      a.thighR = -0.04;
    }
  }
  return a;
}

const PALETTE = {
  vn: { uniform: [0.15, 0.19, 0.075] as const, helmet: [0.2, 0.23, 0.095] as const },
  fr: { uniform: [0.3, 0.25, 0.15] as const, helmet: [0.09, 0.12, 0.08] as const },
};

export function buildSoldiers(script: FilmScript): SoldiersSystem {
  const plans = script.soldiers;
  const count = plans.length;
  const geometries = buildGeometries();
  const group = new THREE.Group();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.02 });
  const parts = new Map<PartName, THREE.InstancedMesh>();
  const makePart = (name: PartName, geometry: THREE.BufferGeometry, color: (plan: SoldierPlan, i: number) => THREE.Color) => {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    plans.forEach((plan, i) => mesh.setColorAt(i, color(plan, i)));
    mesh.instanceColor!.needsUpdate = true;
    parts.set(name, mesh);
    group.add(mesh);
  };

  const tint = (base: readonly [number, number, number], jitter: number, seed: number) => {
    const k = 1 + (Math.sin(seed * 12.9898) * 43758.5453 - Math.floor(Math.sin(seed * 12.9898) * 43758.5453) - 0.5) * jitter;
    return new THREE.Color(base[0] * k, base[1] * k, base[2] * k);
  };
  const uniform = (plan: SoldierPlan, i: number) => tint(PALETTE[plan.faction].uniform, 0.35, i + 1);
  const helmet = (plan: SoldierPlan, i: number) => tint(PALETTE[plan.faction].helmet, 0.3, i + 50);
  const skin = (_plan: SoldierPlan, i: number) => tint([0.38, 0.25, 0.17], 0.35, i + 99);
  const rifleColor = () => new THREE.Color(0.55, 0.55, 0.55);
  const packColor = (plan: SoldierPlan, i: number) => (plan.faction === "vn" ? tint([0.11, 0.14, 0.06], 0.3, i + 7) : new THREE.Color(0.01, 0.01, 0.01));

  makePart("torso", geometries.torso, uniform);
  makePart("head", geometries.head, skin);
  makePart("helmet", geometries.helmet, helmet);
  makePart("thighL", geometries.thigh, uniform);
  makePart("thighR", geometries.thigh, uniform);
  makePart("shinL", geometries.shin, uniform);
  makePart("shinR", geometries.shin, uniform);
  makePart("uarmL", geometries.uarm, uniform);
  makePart("uarmR", geometries.uarm, uniform);
  makePart("farmL", geometries.farm, uniform);
  makePart("farmR", geometries.farm, uniform);
  makePart("rifle", geometries.rifle, rifleColor);
  makePart("pack", geometries.pack, packColor);

  // Vật liệu dùng vertexColors: các hình khối không có thuộc tính color sẽ mặc định trắng (1,1,1) do three.js điền sẵn
  for (const g of [geometries.torso, geometries.head, geometries.pack]) withColor(g, [1, 1, 1]);

  const root = new THREE.Matrix4();
  const pelvis = new THREE.Matrix4();
  const torsoFrame = new THREE.Matrix4();
  const m = new THREE.Matrix4();
  const limb = new THREE.Matrix4();
  const child = new THREE.Matrix4();
  const rotX = new THREE.Matrix4();
  const rotY = new THREE.Matrix4();
  const rotZ = new THREE.Matrix4();
  const trans = new THREE.Matrix4();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const scaleMatrix = new THREE.Matrix4();
  let visible = 0;

  const T = (x: number, y: number, z: number) => trans.makeTranslation(x, y, z);
  const set = (name: PartName, i: number, matrix: THREE.Matrix4) => parts.get(name)!.setMatrixAt(i, matrix);

  const place = (name: PartName, i: number, base: THREE.Matrix4, x: number, y: number, z: number, rx = 0) => {
    m.copy(base).multiply(T(x, y, z));
    if (rx !== 0) m.multiply(rotX.makeRotationX(rx));
    set(name, i, m);
    return m;
  };

  return {
    group,
    visibleCount: () => visible,
    update(t, ground) {
      visible = 0;
      for (let i = 0; i < count; i++) {
        const plan = plans[i];
        const pose = soldierPose(plan, t);
        if (!pose.visible) {
          for (const mesh of parts.values()) mesh.setMatrixAt(i, zero);
          continue;
        }
        visible++;
        const a = solve(pose, plan, t);
        const s = plan.scale;
        const gy = ground(pose.x, pose.z);
        const yaw = pose.heading + a.yawExtra;

        // Khung xương chậu: đặt tại chân + độ cao hông, quay theo hướng, nghiêng ngã quanh hông
        root.makeTranslation(pose.x, gy + (BODY.pelvis - a.drop) * s, pose.z).multiply(rotY.makeRotationY(yaw)).multiply(T(a.lateral, 0, 0));
        if (a.bodyPitch !== 0) root.multiply(rotX.makeRotationX(a.bodyPitch));
        if (s !== 1) root.multiply(scaleMatrix.makeScale(s, s, s));
        pelvis.copy(root);
        torsoFrame.copy(pelvis).multiply(rotX.makeRotationX(a.lean));

        // Thân, đầu, mũ, ba lô
        place("torso", i, torsoFrame, 0, 0.3, 0);
        m.copy(torsoFrame).multiply(T(0, 0.71, 0)).multiply(rotY.makeRotationY(a.headYaw));
        set("head", i, m);
        m.copy(torsoFrame).multiply(T(0, 0.75, 0)).multiply(rotY.makeRotationY(a.headYaw));
        set("helmet", i, m);
        place("pack", i, torsoFrame, 0, 0.34, -0.21);

        // Chân: đùi quay quanh hông, cẳng chân quay quanh đầu gối (gập ra sau khi angle dương)
        const leg = (side: "L" | "R", x: number, thigh: number, knee: number) => {
          limb.copy(pelvis).multiply(T(x, 0, 0)).multiply(rotX.makeRotationX(-thigh));
          set(side === "L" ? "thighL" : "thighR", i, limb);
          child.copy(limb).multiply(T(0, -BODY.thigh, 0)).multiply(rotX.makeRotationX(knee));
          set(side === "L" ? "shinL" : "shinR", i, child);
        };
        leg("L", 0.1, a.thighL, a.kneeL);
        leg("R", -0.1, a.thighR, a.kneeR);

        // Tay: vai ở đỉnh thân; cánh tay trên quay quanh vai, cẳng tay quay quanh khuỷu (gập ra trước)
        const arm = (side: "L" | "R", x: number, upper: number, fore: number) => {
          limb.copy(torsoFrame).multiply(T(x, 0.56, 0)).multiply(rotX.makeRotationX(-upper));
          set(side === "L" ? "uarmL" : "uarmR", i, limb);
          child.copy(limb).multiply(T(0, -BODY.uarm, 0)).multiply(rotX.makeRotationX(-fore));
          set(side === "L" ? "farmL" : "farmR", i, child);
        };
        arm("L", 0.285, a.uarmL, a.farmL);
        arm("R", -0.285, a.uarmR, a.farmR);

        // Súng
        if (a.rifle === "aim") {
          m.copy(torsoFrame).multiply(T(-0.09, 0.5, 0.42));
        } else if (a.rifle === "carry") {
          m.copy(torsoFrame).multiply(T(-0.12, 0.3, 0.3)).multiply(rotX.makeRotationX(0.5));
        } else {
          m.copy(torsoFrame).multiply(T(0, 0.3, -0.22)).multiply(rotX.makeRotationX(-Math.PI / 2 + 0.1));
        }
        set("rifle", i, m);
        void rotZ;
      }
      for (const mesh of parts.values()) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
