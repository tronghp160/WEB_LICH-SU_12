import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { foliage, group, mesh, sandbagWall, std, type BuildContext, type BuiltModel } from "@/components/model3d/kit";
import { createParticleSystem } from "@/components/model3d/particles";
import { createSoldier } from "@/components/model3d/builders/soldier";
import { grassTexture, leafTexture, strataTexture, textPlateTexture, woodTexture } from "@/components/model3d/textures";
import type { Emitter } from "@/lib/cinema/types";

/**
 * Mặt cắt đồi A1 (không theo tỉ lệ): đường hầm đào ngang từ chân đồi vào dưới hầm chỉ huy của địch, buồng chứa khối bộc phá gần một tấn.
 * Nút "Mô phỏng vụ nổ": khối bộc phá nổ, cứ điểm trên đỉnh đồi bị hất tung, để lại hố sâu; bấm lần nữa để đặt lại.
 * Mặt cắt quay về +z; trục x chạy ngang đồi (chân đồi phía +x, nơi cửa hầm).
 */
const HALF_W = 13;
const DEPTH = 5;
const BASE_Y = 0;
const TUNNEL_Y = 5.1;

const hillY = (x: number) => 6.9 + 3.7 * Math.exp(-((x / 6.4) ** 2)) - 0.0;

export function buildA1Tunnel(context: BuildContext): BuiltModel {
  const root = new THREE.Group();

  // ----- Khối đất cắt ngang: đường viền mặt đồi, đùn theo độ sâu -----
  const outline: THREE.Vector2[] = [new THREE.Vector2(-HALF_W, BASE_Y)];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const x = -HALF_W + (2 * HALF_W * i) / N;
    outline.push(new THREE.Vector2(x, hillY(x)));
  }
  outline.push(new THREE.Vector2(HALF_W, BASE_Y));
  const shape = new THREE.Shape(outline);
  const block = new THREE.ExtrudeGeometry(shape, { depth: 2 * DEPTH, bevelEnabled: false, curveSegments: 1 });
  block.translate(0, 0, -DEPTH);
  block.computeVertexNormals();
  // uv của hai mặt cắt (trước/sau): độ sâu tính từ mặt đồi để lớp đất mùn luôn bám mặt đồi
  const position = block.getAttribute("position") as THREE.BufferAttribute;
  const normal = block.getAttribute("normal") as THREE.BufferAttribute;
  const uv = block.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(normal.getZ(i)) > 0.9) {
      const x = position.getX(i);
      const y = position.getY(i);
      uv.setXY(i, (x + HALF_W) / (2 * HALF_W), 1 - (hillY(x) - y) / 12);
    } else {
      uv.setXY(i, position.getX(i) * 0.12, position.getY(i) * 0.12 + position.getZ(i) * 0.12);
    }
  }
  uv.needsUpdate = true;
  const strataMaterial = std(0xffffff, { map: strataTexture(41), rough: 1 });
  const grassMaterial = std(0xffffff, { map: grassTexture([4, 4], 42), rough: 1, emissive: 0x24381a, emissiveIntensity: 0.9 });
  // hai nhóm mặt: [0] = hai mặt cắt (nắp), [1] = mặt bên/trên (mặt đồi có cỏ)
  const blockMesh = mesh(block, [strataMaterial, grassMaterial]);
  root.add(blockMesh);

  // bệ gỗ và bảng tên
  root.add(mesh(new RoundedBoxGeometry(2 * HALF_W + 1.4, 0.9, 2 * DEPTH + 1.4, 3, 0.12), std(0xffffff, { map: woodTexture([4, 1], 43, [0.3, 0.2, 0.11]), rough: 0.6 }), [0, BASE_Y - 0.45, 0]));
  root.add(mesh(new THREE.PlaneGeometry(9, 0.62), new THREE.MeshStandardMaterial({ map: textPlateTexture(["ĐỒI A1 — MẶT CẮT ĐƯỜNG HẦM BỘC PHÁ"], { width: 1024, height: 128, bg: "#2b2216" }), roughness: 0.5 }), [0, BASE_Y - 0.45, DEPTH + 0.72], { cast: false }));

  // ----- Đường hầm: khoang tối đào ngang từ chân đồi (phải) vào buồng bộc phá dưới đỉnh đồi -----
  const zFront = DEPTH + 0.02;
  const voidMaterial = std(0x0a0806, { rough: 1 });
  const tunnelLength = HALF_W + 0.4;
  root.add(mesh(new THREE.BoxGeometry(tunnelLength - 1.4, 1.7, 0.03), voidMaterial, [(tunnelLength - 1.4) / 2 - 0.2 + 0.0 + 0.6, TUNNEL_Y, zFront], { cast: false }));
  root.add(mesh(new THREE.BoxGeometry(3.6, 2.4, 0.03), voidMaterial, [-0.6, TUNNEL_Y + 0.25, zFront], { cast: false }));
  // cửa hầm mở ra sườn đồi bên phải
  root.add(mesh(new THREE.BoxGeometry(0.03, 1.7, 2 * DEPTH * 0.0 + 0.9), voidMaterial, [HALF_W + 0.01, TUNNEL_Y, DEPTH * 0.5], { cast: false }));
  // khung chống gỗ (cột + xà) cách nhau 1,6 m
  const timber = std(0xffffff, { map: woodTexture([1, 1], 44, [0.45, 0.31, 0.17]), rough: 0.9 });
  for (let x = 10.6; x > 1.6; x -= 1.6) {
    root.add(mesh(new THREE.BoxGeometry(0.16, 1.75, 0.16), timber, [x, TUNNEL_Y, zFront + 0.06]), mesh(new THREE.BoxGeometry(0.16, 1.75, 0.16), timber, [x - 0.02, TUNNEL_Y, zFront + 0.06]));
    root.add(mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), timber, [x, TUNNEL_Y + 0.88, zFront + 0.06]));
  }
  for (let x = 10.6; x > 1.6; x -= 1.6) root.add(mesh(new THREE.BoxGeometry(1.7, 0.14, 0.16), timber, [x - 0.8 + 0.8, TUNNEL_Y + 0.88, zFront + 0.06]));
  for (let x = 10.6; x > 1.6; x -= 1.6) root.add(mesh(new THREE.BoxGeometry(0.14, 1.75, 0.14), timber, [x - 0.85, TUNNEL_Y, zFront + 0.06]));
  // ván lót sàn hầm
  root.add(mesh(new THREE.BoxGeometry(tunnelLength - 1.0, 0.06, 0.9), timber, [(tunnelLength - 1.0) / 2 + 0.2, TUNNEL_Y - 0.86, DEPTH * 0.5 - 0.15], { cast: false }));
  // đèn dọc hầm
  for (let x = 9.6; x > 2; x -= 2.4) {
    root.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), std(0xffe2a0, { emissive: 0xffb45a, emissiveIntensity: 2.6 }), [x, TUNNEL_Y + 0.7, zFront + 0.05], { cast: false }));
  }
  const tunnelLight = new THREE.PointLight(0xffb45a, 14, 12, 1.8);
  tunnelLight.position.set(6, TUNNEL_Y + 0.5, zFront + 1.4);
  root.add(tunnelLight);

  // ----- Buồng bộc phá: thùng thuốc nổ xếp chồng, nhãn "≈ 1 tấn" -----
  const crates = new THREE.Group();
  const crateGeometries: THREE.BufferGeometry[] = [];
  const crateMaterial = std(0xffffff, { map: woodTexture([1, 1], 45, [0.55, 0.4, 0.22]), rough: 0.8 });
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 2; k++) {
        if (j === 2 && k === 1) continue;
        crateGeometries.push(new THREE.BoxGeometry(0.62, 0.5, 0.5).translate(-1.5 + i * 0.66, TUNNEL_Y - 0.55 + j * 0.53, zFront + 0.32 + k * 0.5));
      }
    }
  }
  const crateMesh = mesh(mergeGeometries(crateGeometries)!, crateMaterial);
  crates.add(crateMesh);
  const glow = new THREE.PointLight(0xff6a2a, 3, 8, 1.6);
  glow.position.set(-0.6, TUNNEL_Y + 0.4, zFront + 2.2);
  crates.add(glow);
  root.add(crates);
  root.add(mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: textPlateTexture(["Khối bộc phá"], { width: 512, height: 128, bg: "#3a1b12", fg: "#ffd7a0" }), roughness: 0.6 }), [-0.6, TUNNEL_Y + 1.6, zFront + 0.06], { cast: false }));

  // ----- Trên đỉnh đồi: cứ điểm (hầm chỉ huy) của địch -----
  const bunker = new THREE.Group();
  const bunkerMaterial = std(0xffffff, { map: strataTexture(46), rough: 1 });
  bunker.add(mesh(new THREE.CylinderGeometry(2.7, 3.7, 1.4, 8), bunkerMaterial, [0, 0.7, 0]));
  bunker.add(mesh(new THREE.CylinderGeometry(2.0, 2.6, 0.9, 8), std(0x6b6b60, { rough: 1 }), [0, 1.8, 0]));
  bunker.add(sandbagWall([-2.3, 1.7], [2.3, 1.7], 2, { seed: 47, y: 1.4 }));
  bunker.add(mesh(new THREE.BoxGeometry(0.9, 0.35, 0.2), std(0x14110d, { rough: 0.8 }), [0, 2.25, 2.0]));
  const pole = mesh(new THREE.CylinderGeometry(0.04, 0.05, 3, 8), std(0xd8d0b8, { rough: 0.5 }), [1.2, 3.4, 0]);
  const frenchFlag = mesh(new THREE.PlaneGeometry(1.1, 0.7).translate(0.55, -0.35, 0), new THREE.MeshStandardMaterial({ map: frenchFlagTexture(), side: THREE.DoubleSide }), [1.2, 4.85, 0]);
  bunker.add(pole, frenchFlag);
  bunker.position.set(0, hillY(0) + 0.05, 0);
  root.add(bunker);

  // lính Pháp nhỏ trên đỉnh và các bao cát ta ở sườn đồi bên phải: chiến hào của ta dẫn tới cửa hầm
  const french = group([], [0, 0, 0]);
  root.add(french);
  for (let i = 0; i < 2; i++) {
    const soldier = createSoldier({ lowPoly: true });
    soldier.scale.setScalar(0.7);
    soldier.position.set(-3.3 + i * 0.7, hillY(-3.3 + i * 0.7) + 0.02, 1.6 - i * 0.4);
    soldier.rotation.y = 0.6;
    french.add(soldier);
    soldier.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.MeshStandardMaterial).color) {
        const material = (m.material as THREE.MeshStandardMaterial).clone();
        material.color.multiply(new THREE.Color(0.75, 0.85, 1.35));
        m.material = material;
      }
    });
  }
  const ours = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const soldier = createSoldier({ lowPoly: true });
    soldier.scale.setScalar(0.85);
    const x = 9.4 + i * 0.85;
    soldier.position.set(Math.min(x, HALF_W - 0.4), hillY(Math.min(x, HALF_W - 0.4)) - 0.02 + (i < 2 ? 0 : 0), 1.3 - i * 0.6);
    soldier.rotation.y = -0.9;
    ours.add(soldier);
  }
  root.add(ours);
  root.add(sandbagWall([8.4, 3.1], [8.4, 0.2], 2, { seed: 48, y: hillY(8.4) - 0.4 }));

  const leaves = leafTexture(49);
  root.add(foliage([-11, hillY(-11) + 0.6, 2.5], 1.7, leaves, 1), foliage([11.4, hillY(11.4) + 0.5, -2.5], 1.5, leaves, 2), foliage([-7.5, hillY(-7.5) + 0.5, -3.5], 1.5, leaves, 3), foliage([7.5, hillY(7.5) + 0.5, 3.5], 1.3, leaves, 4));

  // ----- Vụ nổ -----
  const particles = createParticleSystem();
  root.add(particles.group);
  // hố bom: vệt đất cháy sẫm ở giữa, loang ra ngoài, có vành đất hất lên
  const craterCanvas = document.createElement("canvas");
  craterCanvas.width = craterCanvas.height = 256;
  const cctx = craterCanvas.getContext("2d")!;
  const cgrad = cctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  cgrad.addColorStop(0, "rgba(14,8,4,1)");
  cgrad.addColorStop(0.55, "rgba(34,20,10,0.96)");
  cgrad.addColorStop(0.85, "rgba(60,40,24,0.7)");
  cgrad.addColorStop(1, "rgba(60,40,24,0)");
  cctx.fillStyle = cgrad;
  cctx.fillRect(0, 0, 256, 256);
  const craterTexture = new THREE.CanvasTexture(craterCanvas);
  craterTexture.colorSpace = THREE.SRGBColorSpace;
  const craterMesh = mesh(new THREE.CircleGeometry(3.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: craterTexture, transparent: true, depthWrite: false }), [0, hillY(0) + 0.05, 0], { cast: false, receive: false });
  const craterRim = mesh(new THREE.TorusGeometry(2.7, 0.36, 8, 32).rotateX(Math.PI / 2).scale(1, 0.7, 1), std(0x5a3d26, { rough: 1 }), [0, hillY(0) + 0.08, 0], { cast: false });
  craterMesh.visible = false;
  craterRim.visible = false;
  root.add(craterMesh, craterRim);
  const debris = new THREE.Group();
  const debrisPieces: { mesh: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3 }[] = [];
  const debrisMaterial = std(0x6b5a44, { rough: 1 });
  for (let i = 0; i < 26; i++) {
    const size = 0.16 + ((i * 37) % 10) * 0.05;
    const piece = mesh(new THREE.DodecahedronGeometry(size, 0), debrisMaterial);
    const angle = i * 2.399;
    const speed = 3.5 + ((i * 53) % 10) * 0.55;
    debrisPieces.push({ mesh: piece, v: new THREE.Vector3(Math.cos(angle) * speed, 6.5 + ((i * 29) % 8) * 0.7, Math.sin(angle) * speed * 0.55), spin: new THREE.Vector3(i * 0.3, i * 0.17, i * 0.11) });
    debris.add(piece);
  }
  debris.visible = false;
  root.add(debris);
  const flashLight = new THREE.PointLight(0xffd29a, 0, 40, 1.3);
  flashLight.position.set(0, hillY(0) + 2.5, 2);
  root.add(flashLight);

  const emitters: Emitter[] = [
    { id: "boc-pha", kind: "blast", t0: 0, x: 0, z: 0, scale: 0.42, seed: 7 },
    { id: "boc-pha-phu", kind: "shell", t0: 0.15, x: 1.6, z: 0.8, scale: 0.5, seed: 11 },
    { id: "boc-pha-phu-2", kind: "shell", t0: 0.35, x: -1.9, z: -0.6, scale: 0.5, seed: 12 },
  ];
  let exploded = false;
  let boomAt = 0;
  let clock = 0;
  const groundAt = () => hillY(0);

  const setState = (time: number) => {
    const age = exploded ? time - boomAt : -1;
    bunker.visible = !exploded || age < 0.04;
    french.visible = !exploded;
    craterMesh.visible = craterRim.visible = exploded && age > 0.08;
    debris.visible = exploded && age > 0;
    glow.intensity = exploded ? Math.max(0, 3 - age * 0.9) : 3 + Math.sin(time * 3) * 0.6;
    flashLight.intensity = exploded && age > 0 ? 220 * Math.exp(-age / 0.28) : 0;
    frenchFlag.rotation.y = Math.sin(time * 3) * 0.3;
    if (exploded && age > 0) {
      debrisPieces.forEach(({ mesh: piece, v, spin }, i) => {
        const g = 9.8;
        const x = v.x * age * 0.5;
        const y = v.y * age - 0.5 * g * age * age;
        const z = v.z * age * 0.5;
        const floor = hillY(x) + 0.1;
        piece.position.set(x, Math.max(hillY(0) + y, floor + 0.1), z);
        piece.rotation.set(spin.x * age * 2, spin.y * age * 2, spin.z * age * 2);
        piece.visible = age < 9;
        void i;
      });
    }
  };

  return {
    root,
    update(time, dt, camera) {
      clock = time;
      setState(time);
      const viewportHeight = context.renderer.domElement.height;
      particles.update(exploded ? emitters : [], exploded ? time - boomAt : 0, groundAt, camera as THREE.PerspectiveCamera, viewportHeight);
      void dt;
    },
    actions: {
      boom: () => {
        exploded = !exploded;
        if (exploded) boomAt = clock + 0.02;
      },
    },
    dispose: () => particles.dispose(),
  };
}

function frenchFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ["#1d3f8f", "#f4f4f4", "#d42a2a"].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * 64, 0, 64, 128);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
