import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getModelSpec, modelSpecs, specsByGroup } from "@/lib/models3d/specs";
import { VALLEY_BOUNDS } from "@/lib/models3d/valley";
import { toMercator } from "@/lib/mapfilm/geo";
import { SP } from "@/lib/battles/dien-bien-phu-1954";

const root = path.resolve(import.meta.dirname, "..", "..");

describe("models3d/danh sách mô hình", () => {
  it("id không trùng, mỗi mô hình có mô tả, ghi chú minh họa và ít nhất một điểm chú thích", () => {
    const ids = modelSpecs.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const spec of modelSpecs) {
      expect(spec.title.length, spec.id).toBeGreaterThan(3);
      expect(spec.description.length, spec.id).toBeGreaterThan(60);
      expect(spec.note.length, spec.id).toBeGreaterThan(30);
      expect(spec.hotspots.length, spec.id).toBeGreaterThan(0);
    }
  });

  it("điểm chú thích: id duy nhất, có chữ giải thích, tọa độ hữu hạn", () => {
    for (const spec of modelSpecs) {
      const hotspotIds = spec.hotspots.map((h) => h.id);
      expect(new Set(hotspotIds).size, spec.id).toBe(hotspotIds.length);
      for (const h of spec.hotspots) {
        expect(h.label.length, `${spec.id}/${h.id}`).toBeGreaterThan(2);
        expect(h.text.length, `${spec.id}/${h.id}`).toBeGreaterThan(30);
        expect(h.position.every(Number.isFinite), `${spec.id}/${h.id}`).toBe(true);
      }
    }
  });

  it("camera hợp lệ: mục tiêu nằm trong khoảng zoom, vị trí không trùng mục tiêu", () => {
    for (const { id, camera } of modelSpecs) {
      const distance = Math.hypot(camera.position[0] - camera.target[0], camera.position[1] - camera.target[1], camera.position[2] - camera.target[2]);
      expect(distance, id).toBeGreaterThanOrEqual(camera.minDistance);
      expect(distance, id).toBeLessThanOrEqual(camera.maxDistance);
      expect(camera.minDistance, id).toBeLessThan(camera.maxDistance);
    }
  });

  it("mô hình nào có nút thao tác thì nút có id và chữ", () => {
    for (const spec of modelSpecs) for (const action of spec.actions ?? []) expect(action.id.length + action.label.length, spec.id).toBeGreaterThan(4);
  });

  it("mô hình dựng bằng mã có bộ dựng tương ứng; mô hình glb ghi rõ tác giả và giấy phép", () => {
    const builders = readFileSync(path.join(root, "components/model3d/builders/index.ts"), "utf8");
    for (const spec of modelSpecs) {
      if (spec.source.kind === "procedural") expect(builders.includes(`"${spec.id}"`), `thiếu bộ dựng cho ${spec.id}`).toBe(true);
      else {
        expect(spec.source.credit.length).toBeGreaterThan(3);
        expect(spec.source.licenseUrl.startsWith("https://")).toBe(true);
      }
    }
  });

  it("mọi bộ dựng đăng ký đều có mô tả trong danh sách (không bộ dựng mồ côi)", () => {
    const builders = readFileSync(path.join(root, "components/model3d/builders/index.ts"), "utf8");
    const registered = [...builders.matchAll(/^\s+"([a-z0-9-]+)":/gm)].map((m) => m[1]);
    expect(registered.length).toBeGreaterThan(0);
    for (const id of registered) expect(getModelSpec(id), id).toBeDefined();
  });
});

describe("models3d/tượng nhân vật", () => {
  it("tượng nhân vật: có nhắc rõ là cách điệu, không phải chân dung", () => {
    for (const spec of specsByGroup("nhan-vat")) {
      expect(spec.note, spec.id).toMatch(/không phải/);
      expect(spec.hotspots.some((h) => /cách điệu/i.test(h.label)), spec.id).toBe(true);
    }
  });
});

describe("models3d/sa bàn lòng chảo", () => {
  it("ảnh độ cao phủ kín mọi cứ điểm với lề an toàn", () => {
    const [mx0, my0] = toMercator([VALLEY_BOUNDS.north, VALLEY_BOUNDS.west]);
    const [mx1, my1] = toMercator([VALLEY_BOUNDS.south, VALLEY_BOUNDS.east]);
    for (const [id, [lat, lng]] of Object.entries(SP)) {
      const [mx, my] = toMercator([lat, lng]);
      const u = (mx - mx0) / (mx1 - mx0);
      const v = (my - my0) / (my1 - my0);
      expect(u, `${id} u`).toBeGreaterThan(0.15);
      expect(u, `${id} u`).toBeLessThan(0.85);
      expect(v, `${id} v`).toBeGreaterThan(0.15);
      expect(v, `${id} v`).toBeLessThan(0.85);
    }
  });

  it("file ảnh độ cao tồn tại, là PNG 512×512 và nhỏ hơn 500 KB", () => {
    const file = readFileSync(path.join(root, "public/models/dbp-valley-dem.png"));
    expect(file.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(file.readUInt32BE(16)).toBe(512);
    expect(file.readUInt32BE(20)).toBe(512);
    expect(file.length).toBeLessThan(500 * 1024);
  });
});
