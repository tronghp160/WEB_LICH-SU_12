import { describe, expect, it } from "vitest";
import { dienBienPhu1954 } from "@/lib/battles/dien-bien-phu-1954";
import { evaluateMapCamera, interpolateCam } from "@/lib/mapfilm/camera";
import { dienBienPhuMapFilm as film } from "@/lib/mapfilm/dien-bien-phu";
import { evaluateScene, nightAt, totalDuration } from "@/lib/mapfilm/evaluate";
import { angleDelta, distanceMeters, fromLocal, fromMercator, pointAlong, toLocal, toMercator } from "@/lib/mapfilm/geo";
import type { MapCam } from "@/lib/mapfilm/types";

describe("mapfilm/geo", () => {
  it("Mercator đi rồi về giữ nguyên tọa độ", () => {
    for (const p of [[21.3832, 103.016], [10.0, 114.3], [-33.9, 151.2]] as [number, number][]) {
      const back = fromMercator(toMercator(p));
      expect(back[0]).toBeCloseTo(p[0], 9);
      expect(back[1]).toBeCloseTo(p[1], 9);
    }
  });

  it("tọa độ cục bộ đúng mét: 1 km về phía đông và nam", () => {
    const origin = film.origin;
    const east = fromLocal(origin, [1000, 0]);
    const south = fromLocal(origin, [0, 1000]);
    expect(distanceMeters(origin, east)).toBeCloseTo(1000, -1);
    expect(distanceMeters(origin, south)).toBeCloseTo(1000, -1);
    expect(east[1]).toBeGreaterThan(origin[1]);
    expect(south[0]).toBeLessThan(origin[0]);
    const [x, z] = toLocal(origin, east);
    expect(x).toBeCloseTo(1000, 6);
    expect(z).toBeCloseTo(0, 6);
  });

  it("pointAlong: hai đầu và điểm giữa theo chiều dài", () => {
    const path: [number, number][] = [
      [21.38, 103.0],
      [21.38, 103.01],
      [21.39, 103.01],
    ];
    expect(pointAlong(path, 0).position).toEqual(path[0]);
    expect(pointAlong(path, 1).position).toEqual(path[2]);
    expect(pointAlong(path, 0.25).heading).toBeCloseTo(90, 0);
    expect(pointAlong(path, 0.9).heading).toBeCloseTo(0, 0);
  });

  it("angleDelta chọn đường ngắn nhất", () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
    expect(angleDelta(0, 180)).toBe(180);
  });
});

describe("mapfilm/camera", () => {
  const a: MapCam = { center: [16.6, 106.8], zoom: 4.3, pitch: 0, bearing: 350 };
  const b: MapCam = { center: [21.38, 103.01], zoom: 12.5, pitch: 60, bearing: 20 };

  it("hai đầu chặng bay trùng mốc", () => {
    const start = interpolateCam(a, b, 0);
    const end = interpolateCam(a, b, 1);
    expect(start.zoom).toBeCloseTo(a.zoom, 6);
    expect(end.zoom).toBeCloseTo(b.zoom, 6);
    expect(end.center[0]).toBeCloseTo(b.center[0], 6);
    expect(end.bearing % 360).toBeCloseTo(20, 6);
  });

  it("hướng đi đường ngắn nhất qua 0°", () => {
    expect(interpolateCam(a, b, 0.5).bearing).toBeCloseTo(365, 6);
  });

  it("chặng bay xa lùi ra giữa chừng (không phóng thẳng)", () => {
    const near: MapCam = { center: [21.38, 103.01], zoom: 12, pitch: 0, bearing: 0 };
    const far: MapCam = { center: [11.0, 107.0], zoom: 12, pitch: 0, bearing: 0 };
    expect(interpolateCam(near, far, 0.5).zoom).toBeLessThan(9);
  });

  it("camera của mọi cảnh liên tục (không nhảy giữa hai khung hình cách 1/30 giây)", () => {
    film.scenes.forEach((scene, index) => {
      let previous = evaluateMapCamera(scene.camera, 0);
      for (let t = 1 / 30; t <= scene.duration; t += 1 / 30) {
        const current = evaluateMapCamera(scene.camera, t);
        expect(Math.abs(current.zoom - previous.zoom), `cảnh ${index + 1}, t=${t.toFixed(2)}`).toBeLessThan(0.25);
        expect(Math.abs(angleDelta(previous.bearing, current.bearing)), `cảnh ${index + 1}`).toBeLessThan(4);
        expect(Math.abs(current.pitch - previous.pitch)).toBeLessThan(2);
        previous = current;
      }
    });
  });
});

describe("mapfilm/kịch bản Điện Biên Phủ", () => {
  const steps = dienBienPhu1954.steps;

  it("mỗi bước của bản đồ 2D có đúng một cảnh, cùng thứ tự", () => {
    expect(film.scenes.map((s) => s.stepId)).toEqual(steps.map((s) => s.id));
  });

  it("mọi id trong hành động đều tồn tại", () => {
    const arrows = new Set(dienBienPhu1954.arrowDefinitions?.map((a) => a.id));
    const zones = new Set(dienBienPhu1954.zoneDefinitions?.map((z) => z.id));
    const points = new Set(dienBienPhu1954.strongpointDefinitions?.map((s) => s.id));
    for (const scene of film.scenes) {
      for (const action of scene.actions) {
        if (action.type === "arrow") expect(arrows.has(action.arrow), action.arrow).toBe(true);
        if (action.type === "march" && !Array.isArray(action.path)) expect(arrows.has(action.path.arrow), action.path.arrow).toBe(true);
        if (action.type === "zone") expect(zones.has(action.id), action.id).toBe(true);
        if (action.type === "strongpoint") expect(points.has(action.id), action.id).toBe(true);
        if (action.type === "reveal") action.ids.forEach((id) => expect(points.has(id), id).toBe(true));
      }
    }
  });

  it("mốc thời gian của hành động, phụ đề và camera nằm trong cảnh", () => {
    film.scenes.forEach((scene) => {
      const d = scene.duration;
      for (const action of scene.actions) {
        const times = "t" in action ? [action.t] : [action.t0, action.t1];
        times.forEach((t) => {
          expect(t, `${scene.stepId}/${action.type}`).toBeGreaterThanOrEqual(0);
          expect(t, `${scene.stepId}/${action.type}`).toBeLessThanOrEqual(d);
        });
      }
      scene.camera.forEach((key, i) => {
        if (i > 0) expect(key.t).toBeGreaterThan(scene.camera[i - 1].t);
        expect(key.t).toBeLessThanOrEqual(d);
      });
      expect(scene.camera[0].t).toBe(0);
    });
  });

  it("phụ đề không chồng nhau và đủ thời gian đọc (≥ số từ / 4,4 từ mỗi giây)", () => {
    for (const scene of film.scenes) {
      scene.subtitles.forEach((s, i) => {
        expect(s.t1).toBeGreaterThan(s.t0);
        expect(s.t1).toBeLessThanOrEqual(scene.duration);
        if (i > 0) expect(s.t0).toBeGreaterThanOrEqual(scene.subtitles[i - 1].t1);
        const words = s.text.trim().split(/\s+/).length;
        expect(s.t1 - s.t0, s.text.slice(0, 40)).toBeGreaterThanOrEqual(words / 4.4);
      });
    }
  });

  it("cuối mỗi cảnh, bản đồ 3D khớp đúng trạng thái của bước 2D (cứ điểm, mũi tên, vùng, đơn vị)", () => {
    film.scenes.forEach((scene, index) => {
      const step = steps[index];
      const frame = evaluateScene(film, index, scene.duration);
      const shown = Object.fromEntries(frame.strongpoints.filter((s) => s.opacity > 0.99).map((s) => [s.id, s.status]));
      expect(shown, scene.stepId).toEqual(step.strongpoints ?? {});
      const arrows = frame.arrows.filter((a) => a.progress >= 1 && a.opacity > 0.99 && !scene.extraArrows?.some((e) => e.id === a.id)).map((a) => a.id);
      expect(arrows.sort(), scene.stepId).toEqual([...(step.arrows ?? [])].sort());
      const zones = Object.entries(frame.zones)
        .filter(([, value]) => value > 0.99)
        .map(([id]) => id);
      expect(zones.sort(), scene.stepId).toEqual([...(step.zones ?? [])].sort());
      for (const [id, unit] of Object.entries(step.units)) {
        const piece = frame.pieces.find((p) => p.key === id);
        if (!unit.visible) {
          expect(piece, `${scene.stepId}/${id}`).toBeUndefined();
          continue;
        }
        expect(piece, `${scene.stepId}/${id}`).toBeDefined();
        expect(piece!.position[0]).toBeCloseTo(unit.position[0], 6);
        expect(piece!.position[1]).toBeCloseTo(unit.position[1], 6);
      }
    });
  });

  it("đầu mỗi cảnh (từ cảnh 2) nối tiếp trạng thái cuối cảnh trước", () => {
    for (let index = 1; index < film.scenes.length; index++) {
      const start = evaluateScene(film, index, 0);
      const end = evaluateScene(film, index - 1, film.scenes[index - 1].duration);
      const startStatus = Object.fromEntries(start.strongpoints.map((s) => [s.id, s.status]));
      for (const s of end.strongpoints) if (s.opacity > 0.99) expect(startStatus[s.id], `${film.scenes[index].stepId}/${s.id}`).toBe(s.status);
    }
  });

  it("cứ điểm đã bị ta tiêu diệt không bao giờ trở lại tay địch", () => {
    const captured = new Set<string>();
    film.scenes.forEach((scene, index) => {
      for (let t = 0; t <= scene.duration; t += 0.5) {
        for (const s of evaluateScene(film, index, t).strongpoints) {
          if (captured.has(s.id)) expect(s.status, `${scene.stepId} t=${t} ${s.id}`).toBe("captured");
          if (s.status === "captured") captured.add(s.id);
        }
      }
    });
    expect(captured.size).toBe(10);
  });

  it("cờ: bị chiếm thì cờ Pháp hạ rồi cờ ta mới kéo lên", () => {
    const index = film.scenes.findIndex((s) => s.stepId === "dot-1");
    const at = (t: number) => evaluateScene(film, index, t).strongpoints.find((s) => s.id === "himLam")!;
    expect(at(14).flagFr).toBe(1);
    expect(at(14).flagVn).toBe(0);
    expect(at(15.6).flagVn).toBe(0);
    expect(at(19).flagFr).toBe(0);
    expect(at(19).flagVn).toBe(1);
  });

  it("pháo bắn: đạn bay trước, nổ sau khi chạm đất", () => {
    const index = film.scenes.findIndex((s) => s.stepId === "dot-1");
    const early = evaluateScene(film, index, 3.2);
    expect(early.shells.length).toBeGreaterThan(0);
    expect(early.muzzles.length).toBeGreaterThan(0);
    const later = evaluateScene(film, index, 8);
    expect(later.emitters.some((e) => e.kind === "shell")).toBe(true);
  });

  it("hàng quân đi dọc mũi tên và tới nơi thì dàn hàng", () => {
    const index = film.scenes.findIndex((s) => s.stepId === "dot-1");
    const mid = evaluateScene(film, index, 11).pieces.filter((p) => p.key.startsWith("xp-him-lam"));
    expect(mid.length).toBeGreaterThan(0);
    expect(mid.some((p) => p.moving)).toBe(true);
    const end = evaluateScene(film, index, 16).pieces.filter((p) => p.key.startsWith("xp-him-lam"));
    expect(end).toHaveLength(5);
    expect(new Set(end.map((p) => p.offset)).size).toBe(5);
  });

  it("tất định: cùng thời điểm cho cùng khung hình", () => {
    film.scenes.forEach((scene, index) => {
      const t = scene.duration * 0.47;
      expect(JSON.stringify(evaluateScene(film, index, t))).toBe(JSON.stringify(evaluateScene(film, index, t)));
    });
  });

  it("đêm A1 tối, rạng sáng sáng dần; tổng thời lượng hợp lý", () => {
    const scene = film.scenes.find((s) => s.stepId === "dot-3")!;
    expect(nightAt(scene, 10)).toBeGreaterThan(0.8);
    expect(nightAt(scene, 25)).toBeLessThan(0.2);
    const total = totalDuration(film);
    expect(total).toBeGreaterThan(200);
    expect(total).toBeLessThan(330);
  });
});
