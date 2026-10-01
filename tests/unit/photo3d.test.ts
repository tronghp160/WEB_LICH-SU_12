import { describe, expect, it } from "vitest";
import {
  approach,
  BASE_ZOOM,
  depthPathFor,
  FOCUS_DEPTH,
  idleSway,
  PARALLAX_STRENGTH,
  projectPoint,
  tiltFromPointer,
  zoomCenter,
} from "@/lib/photo3d/parallax";

const CENTER = { x: 0.5, y: 0.5 };

/** Mô phỏng shader: màu tại điểm màn hình s lấy từ ảnh ở center + (s − ½)/Z + o·(d − f), với d là độ sâu của CHÍNH điểm đó. */
function shaderSample(screen: { x: number; y: number }, depth: number, tilt: { x: number; y: number }, zoom: number, center = CENTER) {
  const z = zoom * BASE_ZOOM;
  return {
    x: center.x + (screen.x - 0.5) / z + tilt.x * PARALLAX_STRENGTH * (depth - FOCUS_DEPTH),
    y: center.y + (screen.y - 0.5) / z + tilt.y * PARALLAX_STRENGTH * (depth - FOCUS_DEPTH),
  };
}

describe("ảnh thật có chiều sâu — hình học", () => {
  it("không nghiêng, không phóng: điểm ảnh ở gần đúng chỗ (chỉ phóng nhẹ quanh tâm)", () => {
    const at = projectPoint({ x: 0.5, y: 0.5 }, 0.9, { x: 0, y: 0 }, 1, CENTER);
    expect(at).toEqual({ x: 0.5, y: 0.5 });
    const corner = projectPoint({ x: 0.2, y: 0.3 }, 0.1, { x: 0, y: 0 }, 1, CENTER);
    expect(corner.x).toBeCloseTo(0.5 + (0.2 - 0.5) * BASE_ZOOM);
  });

  it("vị trí điểm chú thích khớp với shader (điểm màn hình tính ra lấy lại đúng điểm ảnh)", () => {
    const cases = [
      { point: { x: 0.12, y: 0.18 }, depth: 0.95, tilt: { x: -1, y: 0.4 }, zoom: 1 },
      { point: { x: 0.7, y: 0.6 }, depth: 0.2, tilt: { x: 0.6, y: -0.8 }, zoom: 2 },
    ];
    for (const { point, depth, tilt, zoom } of cases) {
      const center = zoomCenter({ x: 0.3, y: 0.7 }, zoom);
      const screen = projectPoint(point, depth, tilt, zoom, center);
      const back = shaderSample(screen, depth, tilt, zoom, center);
      expect(back.x).toBeCloseTo(point.x, 10);
      expect(back.y).toBeCloseTo(point.y, 10);
    }
  });

  it("thị sai: khi nghiêng, vật gần lệch ngược chiều vật xa; mặt phẳng tiêu cự đứng yên", () => {
    const tilt = { x: 1, y: 0 };
    const near = projectPoint({ x: 0.5, y: 0.5 }, 1, tilt, 1, CENTER);
    const far = projectPoint({ x: 0.5, y: 0.5 }, 0, tilt, 1, CENTER);
    const focus = projectPoint({ x: 0.5, y: 0.5 }, FOCUS_DEPTH, tilt, 1, CENTER);
    expect(near.x).toBeLessThan(0.5);
    expect(far.x).toBeGreaterThan(0.5);
    expect(focus.x).toBeCloseTo(0.5);
  });

  it("phóng to: tâm đi theo con trỏ nhưng khung nhìn không ra ngoài ảnh", () => {
    for (const zoom of [1.5, 2, 2.5]) {
      for (const pointer of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -3, y: 5 }]) {
        const center = zoomCenter(pointer, zoom);
        const half = 0.5 / (zoom * BASE_ZOOM);
        expect(center.x - half).toBeGreaterThanOrEqual(-1e-9);
        expect(center.x + half).toBeLessThanOrEqual(1 + 1e-9);
        expect(center.y - half).toBeGreaterThanOrEqual(-1e-9);
        expect(center.y + half).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
    expect(zoomCenter({ x: 0.5, y: 0.5 }, 2)).toEqual(CENTER);
  });

  it("độ nghiêng từ con trỏ nằm trong −1…1; lắc nhẹ khi rảnh cũng vậy; làm mượt tiến dần tới đích", () => {
    expect(tiltFromPointer({ x: 0, y: 1 })).toEqual({ x: -1, y: 1 });
    expect(tiltFromPointer({ x: 2, y: -1 })).toEqual({ x: 1, y: -1 });
    for (let t = 0; t < 30; t += 0.7) {
      const sway = idleSway(t);
      expect(Math.abs(sway.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(sway.y)).toBeLessThanOrEqual(1);
    }
    const step = approach({ x: 0, y: 0 }, { x: 1, y: -1 }, 0.1);
    expect(step.x).toBeGreaterThan(0);
    expect(step.x).toBeLessThan(1);
    expect(approach({ x: 0, y: 0 }, { x: 1, y: 1 }, 10).x).toBeCloseTo(1);
  });

  it("đường dẫn bản đồ độ sâu theo quy ước", () => {
    expect(depthPathFor("/lessons/dien-bien-phu/ho-boc-pha-a1.webp")).toBe("/lessons/dien-bien-phu/ho-boc-pha-a1-depth.webp");
  });
});
