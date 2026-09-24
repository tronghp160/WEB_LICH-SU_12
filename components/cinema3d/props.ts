import * as THREE from "three";
import { clamp, easeInOut, type Vec2 } from "@/lib/cinema/math";
import { createRng } from "@/lib/cinema/rng";
import type { Terrain } from "@/lib/cinema/terrain";
import { labelsAt } from "@/lib/cinema/timeline";
import type { FilmScript } from "@/lib/cinema/types";
import { PATCH } from "@/components/cinema3d/terrain-mesh";

export type StaticGlow = { x: number; y: number; z: number; size: number; color: [number, number, number]; alpha: number; flicker: number };

export type PropsSystem = {
  group: THREE.Group;
  glows: StaticGlow[];
  update: (t: number, dawn: number, camera: THREE.Camera) => void;
};

const BLAST_CLEAR_RADIUS = 24;

function makeLabelTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSize = 44;
  ctx.font = `600 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  const width = Math.ceil(ctx.measureText(text).width) + 56;
  const height = fontSize + 34;
  canvas.width = width;
  canvas.height = height;
  ctx.font = `600 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(10, 12, 18, 0.72)";
  ctx.strokeStyle = "rgba(255, 213, 120, 0.9)";
  ctx.lineWidth = 3;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 2);
  ctx.arcTo(width - 2, 2, width - 2, height - 2, r);
  ctx.arcTo(width - 2, height - 2, 2, height - 2, r);
  ctx.arcTo(2, height - 2, 2, 2, r);
  ctx.arcTo(2, 2, width - 2, 2, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff4d6";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 28, height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, aspect: width / height };
}

function makeFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#da251d";
  ctx.fillRect(0, 0, 384, 256);
  ctx.fillStyle = "#ffcd00";
  ctx.beginPath();
  const cx = 192;
  const cy = 132;
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 84 : 33;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function nearTrench(terrain: Terrain, x: number, z: number, margin = 2.2): boolean {
  return (
    terrain.trenchDepthAt(x, z) > 0.2 ||
    terrain.trenchDepthAt(x + margin, z) > 0.2 ||
    terrain.trenchDepthAt(x - margin, z) > 0.2 ||
    terrain.trenchDepthAt(x, z + margin) > 0.2 ||
    terrain.trenchDepthAt(x, z - margin) > 0.2
  );
}

export function buildProps(script: FilmScript, terrain: Terrain): PropsSystem {
  const group = new THREE.Group();
  const glows: StaticGlow[] = [];
  const rng = createRng(2026);
  const [blastX, blastZ] = [script.blast.x, script.blast.z];
  const nearBlast = (x: number, z: number) => Math.hypot(x - blastX, z - blastZ) < BLAST_CLEAR_RADIUS;

  // ---------- Bao cát dọc chiến hào địch ----------
  const sandbagGeometry = new THREE.BoxGeometry(0.52, 0.22, 0.3);
  const sandbagMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.13, 0.115, 0.075), roughness: 1 });
  const bagPlacements: { x: number; y: number; z: number; yaw: number; near: boolean }[] = [];
  for (const trench of script.terrain.trenches.filter((tr) => tr.id.startsWith("fr-"))) {
    for (let s = 0; s < trench.points.length - 1; s++) {
      const [ax, az] = trench.points[s];
      const [bx, bz] = trench.points[s + 1];
      const length = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / length;
      const dz = (bz - az) / length;
      const yaw = Math.atan2(dx, dz) + Math.PI / 2;
      for (let d = 0; d < length; d += 0.55) {
        for (const side of [-1, 1]) {
          if (rng.chance(0.35)) continue;
          const off = trench.width / 2 + 0.55 + rng.range(-0.08, 0.08);
          const x = ax + dx * d - dz * off * side;
          const z = az + dz * d + dx * off * side;
          const rows = rng.chance(0.5) ? 2 : 3;
          for (let row = 0; row < rows; row++) {
            bagPlacements.push({ x, y: terrain.heightAt(x, z) + 0.06 + row * 0.2, z, yaw: yaw + rng.range(-0.12, 0.12), near: nearBlast(x, z) });
          }
        }
      }
    }
  }
  const makeBags = (placements: typeof bagPlacements) => {
    const mesh = new THREE.InstancedMesh(sandbagGeometry, sandbagMaterial, Math.max(1, placements.length));
    const m = new THREE.Matrix4();
    placements.forEach((p, i) => mesh.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.yaw, 0)), new THREE.Vector3(1, 1, 1))));
    mesh.count = placements.length;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  };
  makeBags(bagPlacements.filter((p) => !p.near));
  const blastBags = makeBags(bagPlacements.filter((p) => p.near));

  // ---------- Hầm chỉ huy / lô cốt ----------
  const earthMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.15, 0.1, 0.065), roughness: 1 });
  const timberMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.1, 0.07, 0.045), roughness: 0.9 });
  const slitMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.8, 0.28) });
  const intact = new Map<string, THREE.Group>();
  const ruins = new Map<string, THREE.Group>();
  for (const prop of script.props) {
    const y = terrain.heightAt(prop.x, prop.z);
    const [sx, sy, sz] = prop.size;
    const holder = new THREE.Group();
    holder.position.set(prop.x, y - 0.2, prop.z);
    holder.rotation.y = prop.rotation;

    const body = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * 0.6, sz), timberMaterial);
    body.position.y = sy * 0.3;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(sx + 1.4, 0.55, sz + 1.4), earthMaterial);
    roof.position.y = sy * 0.6 + 0.2;
    const mound = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.4, 0.5, sz + 0.4), earthMaterial);
    mound.position.y = sy * 0.6 + 0.65;
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(sx * 0.62, 0.26), slitMaterial);
    slit.position.set(0, sy * 0.36, sz / 2 + 0.02);
    const slit2 = slit.clone();
    slit2.rotation.y = Math.PI;
    slit2.position.z = -sz / 2 - 0.02;
    for (const mesh of [body, roof, mound]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    holder.add(body, roof, mound, slit, slit2);

    // vòng bao cát quanh chân hầm
    const ringBags: { x: number; y: number; z: number; yaw: number }[] = [];
    for (let k = 0; k < 2; k++) {
      for (let d = -sx / 2 - 0.5; d <= sx / 2 + 0.5; d += 0.55) {
        ringBags.push({ x: d, y: 0.12 + k * 0.2, z: sz / 2 + 0.5, yaw: 0 }, { x: d, y: 0.12 + k * 0.2, z: -sz / 2 - 0.5, yaw: 0 });
      }
    }
    const ring = new THREE.InstancedMesh(sandbagGeometry, sandbagMaterial, ringBags.length);
    const m = new THREE.Matrix4();
    ringBags.forEach((p, i) => ring.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
    ring.castShadow = true;
    holder.add(ring);
    group.add(holder);
    intact.set(prop.id, holder);

    glows.push({ x: prop.x + Math.sin(prop.rotation) * (sz / 2 + 0.3), y: y + sy * 0.34, z: prop.z + Math.cos(prop.rotation) * (sz / 2 + 0.3), size: 2.2, color: [1, 0.55, 0.2], alpha: 0.5, flicker: 0.25 });

    if (prop.destroyedAt !== undefined) {
      const ruin = new THREE.Group();
      ruin.position.set(prop.x, y, prop.z);
      for (let k = 0; k < 16; k++) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(rng.range(0.4, 2.2), rng.range(0.12, 0.3), rng.range(0.15, 0.5)), timberMaterial);
        const r = rng.range(1, 9);
        const a = rng.range(0, Math.PI * 2);
        beam.position.set(Math.cos(a) * r, rng.range(-3.2, -2), Math.sin(a) * r);
        beam.rotation.set(rng.range(-0.5, 0.5), rng.range(0, 3), rng.range(-0.6, 0.6));
        beam.castShadow = true;
        ruin.add(beam);
      }
      ruin.visible = false;
      group.add(ruin);
      ruins.set(prop.id, ruin);
    }
  }

  // ---------- Rào thép gai ----------
  const posts: THREE.Vector3[] = [];
  const wireVertices: number[] = [];
  const coils: { x: number; y: number; z: number; yaw: number; near: boolean }[] = [];
  for (const wire of script.wires) {
    let previous: { x: number; y: number; z: number } | null = null;
    const pts = wire.points as Vec2[];
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, az] = pts[s];
      const [bx, bz] = pts[s + 1];
      const length = Math.hypot(bx - ax, bz - az);
      for (let d = 0; d <= length; d += 3) {
        const x = ax + ((bx - ax) * d) / length;
        const z = az + ((bz - az) * d) / length;
        if (nearTrench(terrain, x, z)) {
          previous = null;
          continue;
        }
        const y = terrain.heightAt(x, z);
        posts.push(new THREE.Vector3(x, y + 0.65, z));
        if (previous && Math.hypot(x - previous.x, z - previous.z) < 4) {
          for (const h of [0.25, 0.65, 1.05]) {
            wireVertices.push(previous.x, previous.y + h, previous.z, x, y + h + 0.12, z);
            wireVertices.push(x, y + h + 0.12, z, previous.x, previous.y + h + 0.2, previous.z);
          }
          const dx = x - previous.x;
          const dz = z - previous.z;
          const segmentLength = Math.hypot(dx, dz);
          for (let c = 0; c < segmentLength; c += 0.55) {
            const px = previous.x + (dx * c) / segmentLength;
            const pz = previous.z + (dz * c) / segmentLength;
            coils.push({ x: px, y: terrain.heightAt(px, pz) + 0.42, z: pz, yaw: Math.atan2(dx, dz), near: nearBlast(px, pz) });
          }
        }
        previous = { x, y, z };
      }
    }
  }
  const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.05, 0.055), roughness: 0.7, metalness: 0.3 });
  const postMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.035, 1.3, 5), metal, Math.max(1, posts.length));
  posts.forEach((p, i) => postMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  postMesh.count = posts.length;
  postMesh.frustumCulled = false;
  group.add(postMesh);
  const wireGeometry = new THREE.BufferGeometry();
  wireGeometry.setAttribute("position", new THREE.Float32BufferAttribute(wireVertices, 3));
  const wireLines = new THREE.LineSegments(wireGeometry, new THREE.LineBasicMaterial({ color: new THREE.Color(0.045, 0.045, 0.055) }));
  wireLines.frustumCulled = false;
  group.add(wireLines);
  const coilMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.012, 4, 10), metal, Math.max(1, coils.length));
  coils.forEach((c, i) => coilMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(c.x, c.y, c.z).multiply(new THREE.Matrix4().makeRotationY(c.yaw))));
  coilMesh.count = coils.length;
  coilMesh.frustumCulled = false;
  group.add(coilMesh);

  // ---------- Cây cối ----------
  const trees: { x: number; z: number; h: number }[] = [];
  while (trees.length < 240) {
    const x = rng.range(-1050, 1050);
    const z = rng.range(-1050, 1050);
    const inPatch = x > PATCH.minX - 20 && x < PATCH.maxX + 20 && z > PATCH.minZ - 20 && z < PATCH.maxZ + 20;
    if (inPatch) continue;
    trees.push({ x, z, h: rng.range(5, 11) });
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 1, 5).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.08, 0.05, 0.03), roughness: 1 }), trees.length);
  const canopyMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.04, 0.09, 0.035), roughness: 1 }), trees.length);
  trees.forEach((tree, i) => {
    const y = terrain.heightAt(tree.x, tree.z);
    trunkMesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(tree.x, y, tree.z), new THREE.Quaternion(), new THREE.Vector3(1, tree.h * 0.45, 1)));
    canopyMesh.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(tree.x, y + tree.h * 0.32, tree.z), new THREE.Quaternion(), new THREE.Vector3(tree.h * 0.28, tree.h * 0.75, tree.h * 0.28)));
  });
  trunkMesh.frustumCulled = false;
  canopyMesh.frustumCulled = false;
  group.add(trunkMesh, canopyMesh);

  // ---------- Đường hầm và khối bộc phá (nhìn xuyên đất) ----------
  const tunnelMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.72, 0.28), transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const chamberMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.32, 0.16), transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const tunnelPoints: THREE.Vector3[] = [];
  const { from, to, depth } = script.tunnel;
  for (let k = 0; k <= 10; k++) {
    const x = from[0] + ((to[0] - from[0]) * k) / 10;
    const z = from[1] + ((to[1] - from[1]) * k) / 10;
    tunnelPoints.push(new THREE.Vector3(x, terrain.heightAt(x, z) - depth - Math.sin((k / 10) * Math.PI) * 0.6, z));
  }
  const tunnel = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tunnelPoints), 40, 0.6, 8, false), tunnelMaterial);
  tunnel.renderOrder = 60;
  tunnel.frustumCulled = false;
  const chamberPos = tunnelPoints[tunnelPoints.length - 1];
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.4, 4.4), chamberMaterial);
  chamber.position.copy(chamberPos);
  chamber.renderOrder = 61;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, depth + 6, 6), tunnelMaterial);
  shaft.position.set(chamberPos.x, chamberPos.y + (depth + 6) / 2, chamberPos.z);
  shaft.renderOrder = 60;
  group.add(tunnel, chamber, shaft);

  // ---------- Nhãn chú thích ----------
  const labelSprites = script.labels.map((label) => {
    const { texture, aspect } = makeLabelTexture(label.text);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, fog: false, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.05 * aspect, 0.05, 1);
    sprite.position.set(...label.position);
    sprite.renderOrder = 100;
    sprite.visible = false;
    group.add(sprite);
    return sprite;
  });

  // ---------- Cột cờ ----------
  const flagGroup = new THREE.Group();
  const flagGround = terrain.heightAt(script.flag.x, script.flag.z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 10, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color(0.55, 0.5, 0.42), roughness: 0.7 }));
  pole.position.y = 5;
  pole.castShadow = true;
  const clothGeometry = new THREE.PlaneGeometry(3.6, 2.4, 18, 10);
  const clothBase = Float32Array.from(clothGeometry.getAttribute("position").array);
  const cloth = new THREE.Mesh(clothGeometry, new THREE.MeshStandardMaterial({ map: makeFlagTexture(), side: THREE.DoubleSide, roughness: 0.9, emissive: new THREE.Color(0.32, 0.03, 0.02), emissiveMap: null }));
  cloth.position.set(1.85, 8.4, 0);
  cloth.rotation.y = Math.PI / 2 * 0;
  cloth.castShadow = true;
  flagGroup.add(pole, cloth);
  flagGroup.position.set(script.flag.x, flagGround, script.flag.z);
  flagGroup.visible = false;
  group.add(flagGroup);

  const m4 = new THREE.Matrix4();
  void m4;
  return {
    group,
    glows,
    update(t, dawn, camera) {
      void camera;
      const blasted = t >= script.blastTime;
      blastBags.visible = !blasted;
      for (const [id, holder] of intact) {
        const prop = script.props.find((p) => p.id === id)!;
        holder.visible = prop.destroyedAt === undefined || t < prop.destroyedAt;
        const ruin = ruins.get(id);
        if (ruin) ruin.visible = !holder.visible;
      }
      // Đường hầm hiện dần / tắt dần theo cửa sổ thời gian của kịch bản
      const { visibleFrom, visibleTo } = script.tunnel;
      const fade = clamp(Math.min((t - visibleFrom) / 1.2, (visibleTo - t) / 1.2));
      tunnelMaterial.opacity = 0.55 * fade;
      chamberMaterial.opacity = (0.45 + 0.2 * Math.sin(t * 5)) * fade;
      tunnel.visible = chamber.visible = shaft.visible = fade > 0.001;

      const active = labelsAt(script, t);
      labelSprites.forEach((sprite, i) => {
        const label = script.labels[i];
        const hit = active.find((l) => l.text === label.text && l.t0 === label.t0);
        sprite.visible = !!hit;
        (sprite.material as THREE.SpriteMaterial).opacity = hit ? hit.alpha : 0;
      });

      // Cờ: xuất hiện khi người cắm cờ tới nơi, kéo lên trong [raiseFrom, raiseTo], tung bay
      const { raiseFrom, raiseTo } = script.flag;
      flagGroup.visible = t >= raiseFrom - 3;
      const raise = easeInOut((t - raiseFrom) / (raiseTo - raiseFrom));
      cloth.position.y = 1.4 + 7 * raise;
      const pos = cloth.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const x = clothBase[i * 3];
        const y = clothBase[i * 3 + 1];
        const k = (x + 1.8) / 3.6;
        pos.setZ(i, Math.sin(x * 2.1 - t * 5.5 + y * 0.9) * 0.22 * k + Math.sin(x * 4.3 - t * 8) * 0.05 * k);
        pos.setY(i, y + Math.sin(x * 1.7 - t * 4.2) * 0.06 * k);
      }
      pos.needsUpdate = true;
      cloth.geometry.computeVertexNormals();
      // ánh sáng bình minh làm lá cờ rực hơn
      (cloth.material as THREE.MeshStandardMaterial).emissive.setRGB(0.32 + 0.3 * dawn, 0.03 + 0.05 * dawn, 0.02);
    },
  };
}
