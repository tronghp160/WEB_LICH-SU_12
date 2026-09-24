import { describe, expect, it } from "vitest";
import { easeInOut, interpolateFrame, lerpLatLng, pointsAlong } from "@/lib/battles/animation";
import { bachDang938 } from "@/lib/battles/bach-dang-938";

describe("easeInOut", () => {
  it("giữ nguyên hai đầu và đi qua điểm giữa", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });

  it("kẹp giá trị ngoài [0, 1]", () => {
    expect(easeInOut(-3)).toBe(0);
    expect(easeInOut(7)).toBe(1);
  });

  it("tăng dần (không đi lùi)", () => {
    let previous = 0;
    for (let i = 1; i <= 20; i++) {
      const value = easeInOut(i / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});

describe("lerpLatLng và pointsAlong", () => {
  it("nội suy tuyến tính hai tọa độ", () => {
    expect(lerpLatLng([20, 106], [22, 108], 0.5)).toEqual([21, 107]);
  });

  it("chia đều n điểm gồm cả hai đầu", () => {
    const points = pointsAlong([0, 0], [4, 8], 5);
    expect(points).toHaveLength(5);
    expect(points[0]).toEqual([0, 0]);
    expect(points[4]).toEqual([4, 8]);
    expect(points[2]).toEqual([2, 4]);
  });

  it("một điểm thì lấy trung điểm", () => {
    expect(pointsAlong([0, 0], [2, 2], 1)).toEqual([[1, 1]]);
  });
});

describe("interpolateFrame", () => {
  const { steps } = bachDang938;
  const hanFleetId = "han-1";

  it("t = 0 giống hệt bước xuất phát, t = 1 giống hệt bước đích", () => {
    const from = steps[1];
    const to = steps[2];
    const start = interpolateFrame(from, to, 0);
    const end = interpolateFrame(from, to, 1);
    expect(start.units[hanFleetId].position).toEqual(from.units[hanFleetId].position);
    expect(end.units[hanFleetId].position).toEqual(to.units[hanFleetId].position);
    expect(start.tideLevel).toBeCloseTo(from.tideLevel);
    expect(end.tideLevel).toBeCloseTo(to.tideLevel);
  });

  it("đơn vị xuất hiện mờ dần từ 0 lên 1", () => {
    // Bước 0 → 1: quân mai phục từ ẩn sang hiện
    const half = interpolateFrame(steps[0], steps[1], 0.5);
    expect(half.units["viet-east"].opacity).toBeGreaterThan(0);
    expect(half.units["viet-east"].opacity).toBeLessThan(1);
    expect(interpolateFrame(steps[0], steps[1], 0).units["viet-east"].opacity).toBe(0);
    expect(interpolateFrame(steps[0], steps[1], 1).units["viet-east"].opacity).toBe(1);
  });

  it("trạng thái chìm và bãi cọc đổi ở nửa chặng, không chớp nháy", () => {
    const last = steps.length - 1;
    expect(interpolateFrame(steps[last - 1], steps[last], 0.2).units[hanFleetId].status).toBe("active");
    expect(interpolateFrame(steps[last - 1], steps[last], 0.9).units[hanFleetId].status).toBe("sunk");

    // Triều lên (cọc chìm) → triều rút (cọc lộ)
    const from = steps[3];
    const to = steps[4];
    expect(interpolateFrame(from, to, 0.1).stakes).toBe("submerged");
    expect(interpolateFrame(from, to, 0.95).stakes).toBe("exposed");
  });
});

describe("kịch bản Bạch Đằng 938", () => {
  const { steps, unitDefinitions } = bachDang938;
  const ids = unitDefinitions.map((unit) => unit.id);

  it("mọi bước đều khai báo đủ và không thừa đơn vị nào", () => {
    for (const step of steps) {
      expect(Object.keys(step.units).sort(), `bước ${step.id}`).toEqual([...ids].sort());
    }
  });

  it("id bước không trùng, có tiêu đề và lời dẫn", () => {
    expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
    for (const step of steps) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.caption.trim().length).toBeGreaterThan(20);
      expect(step.tideLabel.trim().length).toBeGreaterThan(0);
    }
  });

  it("mực triều nằm trong [0, 1]", () => {
    for (const step of steps) {
      expect(step.tideLevel).toBeGreaterThanOrEqual(0);
      expect(step.tideLevel).toBeLessThanOrEqual(1);
    }
  });

  it("tọa độ nằm trong khu vực cửa sông Bạch Đằng (Quảng Ninh – Hải Phòng)", () => {
    const all = steps.flatMap((step) => Object.values(step.units).map((unit) => unit.position));
    for (const [lat, lng] of [...all, ...bachDang938.riverPath, ...bachDang938.stakeLine]) {
      expect(lat).toBeGreaterThan(20.7);
      expect(lat).toBeLessThan(21.1);
      expect(lng).toBeGreaterThan(106.6);
      expect(lng).toBeLessThan(107.1);
    }
  });

  it("diễn biến đúng logic: cọc chìm khi triều cao, lộ khi triều rút, thuyền giặc chỉ chìm ở bước cuối", () => {
    const byId = Object.fromEntries(steps.map((step) => [step.id, step]));
    expect(byId["nhu-dich"].stakes).toBe("submerged");
    expect(byId["duoi-theo"].stakes).toBe("submerged");
    expect(byId["trieu-rut"].stakes).toBe("exposed");
    expect(byId["duoi-theo"].tideLevel).toBeGreaterThan(byId["trieu-rut"].tideLevel);

    for (const step of steps.slice(0, -1)) {
      for (const id of ids.filter((value) => value.startsWith("han-"))) {
        expect(step.units[id].status, `${step.id}/${id}`).toBe("active");
      }
    }
    for (const id of ids.filter((value) => value.startsWith("han-"))) {
      expect(steps[steps.length - 1].units[id].status).toBe("sunk");
    }
  });
});
