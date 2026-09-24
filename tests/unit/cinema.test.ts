import { describe, expect, it } from "vitest";
import { evaluateCamera } from "@/lib/cinema/camera";
import { blastGlare, blastShake, emitterLifetime, evaluateEmitter, firstShotIndexAtOrAfter, flareState, flashOf, tracerAt } from "@/lib/cinema/effects";
import { BLAST_TIME, DURATION, filmA1, MINE } from "@/lib/cinema/film-a1";
import { catmullRom3, smoothNoise1 } from "@/lib/cinema/math";
import { createRng, hash2 } from "@/lib/cinema/rng";
import { soldierPose, truncateWithFall } from "@/lib/cinema/soldiers";
import { blurGrid, createTerrain, DEM_SIZE, decodeTerrarium } from "@/lib/cinema/terrain";
import { chapterAt, chapterCardAt, dawnAt, formatTime, labelsAt, subtitleAt } from "@/lib/cinema/timeline";

describe("bộ sinh số ngẫu nhiên và nhiễu", () => {
  it("cùng seed cho cùng dãy số, khác seed cho dãy khác", () => {
    const a = createRng(5);
    const b = createRng(5);
    const c = createRng(6);
    const seqA = Array.from({ length: 5 }, () => a.next());
    expect(seqA).toEqual(Array.from({ length: 5 }, () => b.next()));
    expect(seqA).not.toEqual(Array.from({ length: 5 }, () => c.next()));
    for (const v of seqA) expect(v).toBeGreaterThanOrEqual(0);
    for (const v of seqA) expect(v).toBeLessThan(1);
  });

  it("hash2 tất định và nằm trong [0, 1)", () => {
    expect(hash2(3, 9, 1)).toBe(hash2(3, 9, 1));
    expect(hash2(3, 9, 1)).not.toBe(hash2(9, 3, 1));
    for (let i = 0; i < 100; i++) {
      const v = hash2(i, i * 7, 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nhiễu mượt liên tục (không nhảy vọt) và tất định", () => {
    expect(smoothNoise1(3.3, 2)).toBe(smoothNoise1(3.3, 2));
    for (let x = 0; x < 20; x += 0.01) expect(Math.abs(smoothNoise1(x + 0.01) - smoothNoise1(x))).toBeLessThan(0.08);
  });

  it("Catmull–Rom đi qua điểm đầu và điểm cuối", () => {
    const pts: [number, number, number][] = [[0, 0, 0], [10, 5, 0], [20, 0, 5]];
    expect(catmullRom3(pts, 0)).toEqual([0, 0, 0]);
    expect(catmullRom3(pts, 1)).toEqual([20, 0, 5]);
    expect(catmullRom3(pts, 0.5)[0]).toBeCloseTo(10);
  });
});

describe("địa hình", () => {
  it("giải mã Terrarium đúng công thức R·256 + G + B/256 − 32768", () => {
    // R=129, G=228, B=128 → 129*256 + 228 + 0.5 − 32768 = 484,5
    const grid = decodeTerrarium([129, 228, 128, 255], 1, 1, 4);
    expect(grid[0]).toBeCloseTo(484.5, 3);
    expect(decodeTerrarium([128, 0, 0], 1, 1, 3)[0]).toBe(0);
  });

  it("làm mờ giữ nguyên nền phẳng và làm dịu đỉnh nhọn", () => {
    const flat = new Float32Array(25).fill(7);
    expect(Array.from(blurGrid(flat, 5, 5, 1, 2)).every((v) => Math.abs(v - 7) < 1e-4)).toBe(true);
    const spike = new Float32Array(25);
    spike[12] = 9;
    expect(blurGrid(spike, 5, 5, 1, 1)[12]).toBeLessThan(9);
  });

  const terrain = createTerrain(new Float32Array(DEM_SIZE * DEM_SIZE).fill(483), filmA1.terrain);

  it("đồi A1 cao hơn vùng xung quanh; đỉnh đồi cao hơn chân đồi ít nhất 20 m", () => {
    expect(terrain.heightAt(0, 0) - terrain.heightAt(300, 200)).toBeGreaterThan(20);
    expect(terrain.baseAt(0, 0)).toBeGreaterThan(terrain.baseAt(60, 30));
  });

  it("chiến hào thấp hơn mặt đất quanh nó, đúng độ sâu ~1,5 m; ngoài chiến hào thì không có độ sâu", () => {
    const trench = filmA1.terrain.trenches.find((t) => t.id === "vn-fwd")!;
    const [x, z] = trench.points[2];
    expect(terrain.trenchDepthAt(x, z)).toBeGreaterThan(1.2);
    expect(terrain.trenchDepthAt(x, z + 12)).toBe(0);
    // lòng chiến hào thấp hơn nền tự nhiên ~1,5 m (nhiễu nhỏ ±1 m)
    expect(terrain.baseAt(x, z) - terrain.heightAt(x, z)).toBeGreaterThan(0.6);
    expect(terrain.baseAt(x, z) - terrain.heightAt(x, z)).toBeLessThan(2.6);
  });

  it("hàm độ cao tất định và hữu hạn trong toàn vùng", () => {
    for (let x = -1100; x <= 1100; x += 137) for (let z = -1100; z <= 1100; z += 151) expect(Number.isFinite(terrain.heightAt(x, z))).toBe(true);
    expect(terrain.heightAt(12.3, -4.5)).toBe(terrain.heightAt(12.3, -4.5));
  });

  it("không có ảnh độ cao vẫn dựng được địa hình", () => {
    const fallback = createTerrain(null, filmA1.terrain);
    expect(Number.isFinite(fallback.heightAt(0, 0))).toBe(true);
    expect(fallback.heightAt(0, 0)).toBeGreaterThan(fallback.heightAt(300, 200) + 15);
  });
});

describe("kịch bản phim: tính toàn vẹn", () => {
  it("thời lượng, mốc nổ và mốc trời sáng hợp lý", () => {
    expect(filmA1.duration).toBe(DURATION);
    expect(filmA1.blastTime).toBe(BLAST_TIME);
    expect(filmA1.blast).toEqual({ x: MINE[0], z: MINE[1] });
    expect(filmA1.dawn[0]).toBeGreaterThan(BLAST_TIME);
    expect(filmA1.dawn[1]).toBeLessThanOrEqual(DURATION);
  });

  it("các cú máy liền nhau, phủ kín từ 0 tới hết phim, có đủ điểm nội suy", () => {
    const shots = filmA1.shots;
    expect(shots[0].t0).toBe(0);
    expect(shots[shots.length - 1].t1).toBe(DURATION);
    shots.forEach((shot, i) => {
      expect(shot.t1, shot.id).toBeGreaterThan(shot.t0);
      if (i > 0) expect(shot.t0, shot.id).toBe(shots[i - 1].t1);
      expect(shot.path.length, shot.id).toBeGreaterThanOrEqual(2);
      expect(shot.look.length, shot.id).toBeGreaterThanOrEqual(2);
    });
  });

  it("phụ đề không chồng nhau, nằm trong phim, đủ dài để đọc/nghe (≥ số từ / 4,4 từ mỗi giây)", () => {
    const subs = filmA1.subtitles;
    subs.forEach((s, i) => {
      expect(s.t0).toBeGreaterThanOrEqual(0);
      expect(s.t1).toBeLessThanOrEqual(DURATION);
      if (i > 0) expect(s.t0).toBeGreaterThanOrEqual(subs[i - 1].t1);
      const words = s.text.trim().split(/\s+/).length;
      expect(s.t1 - s.t0, s.text.slice(0, 30)).toBeGreaterThanOrEqual(words / 4.4);
    });
  });

  it("có phụ đề nhắc đúng các mốc: 20 giờ 30 phút, bộc phá, rạng sáng 7/5", () => {
    const text = filmA1.subtitles.map((s) => s.text).join(" ");
    expect(text).toContain("Hai mươi giờ ba mươi phút");
    expect(text).toContain("bộc phá");
    expect(text).toContain("Rạng sáng ngày bảy tháng năm");
  });

  it("chương tăng dần theo thời gian, chương đầu bắt đầu từ 0", () => {
    filmA1.chapters.forEach((c, i) => {
      if (i === 0) expect(c.t).toBe(0);
      else expect(c.t).toBeGreaterThan(filmA1.chapters[i - 1].t);
    });
    expect(chapterAt(filmA1, 50).chapter.title).toBe("Bộc phá");
    expect(chapterAt(filmA1, 109).chapter.title).toBe("Rạng sáng");
  });

  it("tra cứu phụ đề, thẻ chương, nhãn và mức trời sáng", () => {
    expect(subtitleAt(filmA1, 0.2)).toBeNull();
    expect(subtitleAt(filmA1, 5)?.text).toContain("Điện Biên Phủ, đêm 6 tháng 5");
    expect(chapterCardAt(filmA1, 0.4)?.alpha).toBeGreaterThan(0);
    expect(chapterCardAt(filmA1, 10)).toBeNull();
    expect(labelsAt(filmA1, 30).map((l) => l.text)).toContain("Khối bộc phá gần 1 tấn");
    expect(dawnAt(filmA1, 10)).toBe(0);
    expect(dawnAt(filmA1, DURATION)).toBe(1);
    expect(formatTime(75.9)).toBe("1:15");
  });

  it("các emitter, pháo sáng, công sự nằm trong phim; đúng một vụ nổ lớn tại đúng chỗ đặt bộc phá", () => {
    const blasts = filmA1.emitters.filter((e) => e.kind === "blast");
    expect(blasts).toHaveLength(1);
    expect(blasts[0].t0).toBe(BLAST_TIME);
    expect([blasts[0].x, blasts[0].z]).toEqual(MINE);
    for (const e of filmA1.emitters) expect(e.t0).toBeLessThan(DURATION);
    for (const f of filmA1.flares) expect(f.t).toBeLessThan(DURATION);
    const b1 = filmA1.props.find((p) => p.id === "B1")!;
    expect(b1.destroyedAt).toBe(BLAST_TIME);
    expect([b1.x, b1.z]).toEqual(MINE);
  });

  it("đường hầm dài ~45 m, kết thúc đúng chỗ đặt bộc phá", () => {
    const { from, to } = filmA1.tunnel;
    expect(Math.hypot(from[0] - to[0], from[1] - to[1])).toBeGreaterThan(43);
    expect(Math.hypot(from[0] - to[0], from[1] - to[1])).toBeLessThan(47);
    expect(to).toEqual(MINE);
  });
});

describe("máy quay", () => {
  it("liên tục trong từng cú máy, nhảy (cắt) chỉ xảy ra ở ranh giới cú máy", () => {
    const ground = () => 0;
    for (const shot of filmA1.shots) {
      const inside = shot.t1 - 0.02;
      const a = evaluateCamera(filmA1.shots, shot.t0 + 0.5, ground);
      const b = evaluateCamera(filmA1.shots, shot.t0 + 0.52, ground);
      expect(Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]), shot.id).toBeLessThan(5);
      expect(evaluateCamera(filmA1.shots, inside, ground).shot).toBe(shot.id);
    }
  });

  it("tất định: cùng t cho cùng khung hình (kể cả rung máy)", () => {
    expect(evaluateCamera(filmA1.shots, 62.3)).toEqual(evaluateCamera(filmA1.shots, 62.3));
  });

  it("agl: độ cao được cộng với mặt đất tại chỗ máy quay", () => {
    const flat = evaluateCamera(filmA1.shots, 40, () => 0);
    const raised = evaluateCamera(filmA1.shots, 40, () => 10);
    expect(raised.position[1] - flat.position[1]).toBeCloseTo(10, 5);
  });

  it("tiêu cự nằm trong khoảng hợp lý", () => {
    for (let t = 0; t <= DURATION; t += 1) {
      const fov = evaluateCamera(filmA1.shots, t).fov;
      expect(fov).toBeGreaterThan(20);
      expect(fov).toBeLessThan(70);
    }
  });
});

describe("lính", () => {
  it("số lượng hợp lý: hai phe, id không trùng", () => {
    const vn = filmA1.soldiers.filter((s) => s.faction === "vn");
    const fr = filmA1.soldiers.filter((s) => s.faction === "fr");
    expect(vn.length).toBeGreaterThanOrEqual(60);
    expect(fr.length).toBeGreaterThanOrEqual(40);
    expect(new Set(filmA1.soldiers.map((s) => s.id)).size).toBe(filmA1.soldiers.length);
  });

  it("mỗi kế hoạch có đoạn liền mạch, không chồng nhau, phủ hết phim", () => {
    for (const plan of filmA1.soldiers) {
      expect(plan.segments.length).toBeGreaterThan(0);
      plan.segments.forEach((seg, i) => {
        expect(seg.t1, `${plan.id}/${i}`).toBeGreaterThan(seg.t0);
        if (i > 0) expect(seg.t0, `${plan.id}/${i}`).toBeCloseTo(plan.segments[i - 1].t1, 6);
      });
      expect(plan.segments[plan.segments.length - 1].t1).toBeGreaterThanOrEqual(DURATION);
    }
  });

  it("tất định và mọi tọa độ hữu hạn ở mọi thời điểm", () => {
    for (const plan of filmA1.soldiers) {
      for (let t = 0; t <= DURATION; t += 2.5) {
        const pose = soldierPose(plan, t);
        expect(Number.isFinite(pose.x) && Number.isFinite(pose.z) && Number.isFinite(pose.heading)).toBe(true);
        expect(pose).toEqual(soldierPose(plan, t));
      }
    }
  });

  it("trước giờ nổ phần lớn bộ đội ta còn nằm trong chiến hào phía đông; sau giờ nổ họ tiến lên đỉnh đồi", () => {
    const vn = filmA1.soldiers.filter((s) => s.faction === "vn");
    const before = vn.map((s) => soldierPose(s, BLAST_TIME - 1));
    expect(before.filter((p) => p.x > 20 && p.kind !== "hidden").length).toBeGreaterThan(vn.length * 0.9);
    const after = vn.map((s) => soldierPose(s, 82));
    expect(after.filter((p) => p.x < 40).length).toBeGreaterThan(vn.length * 0.6);
  });

  it("bộc phá: lính địch sát tâm nổ biến mất, lính gần đó bị hất ngã, lính xa thì còn đứng", () => {
    const fr = filmA1.soldiers.filter((s) => s.faction === "fr");
    const nearBlast = fr.filter((s) => Math.hypot(soldierPose(s, BLAST_TIME - 1).x - MINE[0], soldierPose(s, BLAST_TIME - 1).z - MINE[1]) < 20);
    expect(nearBlast.length).toBeGreaterThan(0);
    for (const s of nearBlast) expect(soldierPose(s, BLAST_TIME + 1).visible).toBe(false);
    const knocked = fr.filter((s) => {
      const p = soldierPose(s, BLAST_TIME - 1);
      const d = Math.hypot(p.x - MINE[0], p.z - MINE[1]);
      return d >= 20 && d < 36;
    });
    for (const s of knocked) expect(soldierPose(s, BLAST_TIME + 2).kind).toBe("fall");
  });

  it("có người cắm cờ đứng ở chân cột cờ vào cuối phim", () => {
    const bearer = filmA1.soldiers.find((s) => soldierPose(s, 100).kind === "flag");
    expect(bearer).toBeDefined();
    const pose = soldierPose(bearer!, 100);
    expect(Math.hypot(pose.x - filmA1.flag.x, pose.z - filmA1.flag.z)).toBeLessThan(5);
  });

  it("cắt kế hoạch tại điểm ngã: sau đó nằm yên tại chỗ", () => {
    const runner = filmA1.soldiers.find((s) => soldierPose(s, 60).kind === "run" && s.faction === "vn")!;
    const cut = truncateWithFall(runner, 60);
    const at = soldierPose(cut, 60);
    const later = soldierPose(cut, 90);
    expect(later.kind).toBe("fall");
    expect([later.x, later.z]).toEqual([at.x, at.z]);
  });

  it("đạn: đã sắp theo thời gian, hướng là vector đơn vị, cả hai phe đều bắn", () => {
    const shots = filmA1.shots3d;
    expect(shots.length).toBeGreaterThan(400);
    for (let i = 1; i < shots.length; i++) expect(shots[i].t).toBeGreaterThanOrEqual(shots[i - 1].t);
    for (const shot of shots.slice(0, 400)) {
      expect(Math.hypot(...shot.dir)).toBeCloseTo(1, 5);
      expect(shot.range).toBeGreaterThan(0);
    }
    expect(shots.some((s) => s.faction === "vn")).toBe(true);
    expect(shots.some((s) => s.faction === "fr")).toBe(true);
    expect(firstShotIndexAtOrAfter(shots, 0)).toBe(0);
    expect(firstShotIndexAtOrAfter(shots, 1e6)).toBe(shots.length);
    const i = firstShotIndexAtOrAfter(shots, 60);
    expect(shots[i].t).toBeGreaterThanOrEqual(60);
    if (i > 0) expect(shots[i - 1].t).toBeLessThan(60);
  });

  it("đầu đạn bay đúng hướng, biến mất khi hết tầm", () => {
    const shot = filmA1.shots3d.find((s) => s.t > 55)!;
    expect(tracerAt(shot, shot.t - 0.01)).toBeNull();
    const mid = tracerAt(shot, shot.t + 0.05)!;
    const travelled = Math.hypot(mid.head[0] - shot.origin[0], mid.head[1] - shot.origin[1], mid.head[2] - shot.origin[2]);
    expect(travelled).toBeCloseTo(320 * 0.05, 3);
    expect(tracerAt(shot, shot.t + 5)).toBeNull();
  });
});

describe("hiệu ứng nổ và cháy", () => {
  const blast = filmA1.emitters.find((e) => e.kind === "blast")!;

  const collect = (t: number) => {
    const out: number[][] = [];
    evaluateEmitter(blast, t, 30, (layer, x, y, z, size, r, g, b, a) => out.push([layer === "glow" ? 0 : 1, x, y, z, size, r, g, b, a]));
    return out;
  };

  it("chưa nổ thì không có hạt; sau khi nổ thì có hàng trăm hạt", () => {
    expect(collect(BLAST_TIME - 0.01)).toHaveLength(0);
    expect(collect(BLAST_TIME + 0.5).length).toBeGreaterThan(300);
  });

  it("tất định: cùng t cho đúng cùng các hạt (tua phim không lệch)", () => {
    expect(collect(BLAST_TIME + 3.7)).toEqual(collect(BLAST_TIME + 3.7));
  });

  it("mọi hạt hợp lệ: tọa độ hữu hạn, kích thước dương, alpha trong [0, 1], màu trong [0, 1]", () => {
    for (const t of [0.1, 0.6, 2, 6, 15, 40]) {
      for (const [, x, y, z, size, r, g, b, a] of collect(BLAST_TIME + t)) {
        expect([x, y, z, size, r, g, b, a].every(Number.isFinite)).toBe(true);
        expect(size).toBeGreaterThan(0);
        expect(a).toBeGreaterThanOrEqual(-1e-9);
        expect(a).toBeLessThanOrEqual(1 + 1e-9);
        for (const c of [r, g, b]) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1.001);
        }
      }
    }
  });

  it("cột khói cao lên theo thời gian; mảnh văng không chui xuống dưới mặt đất", () => {
    const top = (t: number) => Math.max(...collect(BLAST_TIME + t).filter((p) => p[0] === 1 && p[4] > 5).map((p) => p[2]));
    expect(top(20)).toBeGreaterThan(top(3));
    for (const t of [0.5, 1.5, 3, 6]) for (const p of collect(BLAST_TIME + t)) expect(p[2]).toBeGreaterThanOrEqual(30 - 1e-6);
  });

  it("hết vòng đời thì không còn hạt", () => {
    expect(collect(BLAST_TIME + emitterLifetime(blast) + 1)).toHaveLength(0);
  });

  it("lửa cháy liên tục sau khi bùng lên và không dừng lại", () => {
    const fire = filmA1.emitters.find((e) => e.kind === "fire")!;
    const count = (t: number) => {
      let n = 0;
      evaluateEmitter(fire, t, 30, () => n++);
      return n;
    };
    expect(count(fire.t0 - 1)).toBe(0);
    expect(count(fire.t0 + 5)).toBeGreaterThan(10);
    expect(count(DURATION)).toBeGreaterThan(10);
  });

  it("chớp sáng lớn nhất ngay lúc nổ rồi tắt dần; pháo sáng bay lên rồi rơi dần và tắt", () => {
    expect(flashOf(blast, BLAST_TIME - 0.1)).toBe(0);
    expect(flashOf(blast, BLAST_TIME + 0.01)).toBeGreaterThan(0.9);
    expect(flashOf(blast, BLAST_TIME + 2)).toBeLessThan(0.05);
    const flare = filmA1.flares[0];
    expect(flareState(flare, flare.t - 1)).toBeNull();
    const rising = flareState(flare, flare.t + 1)!;
    const later = flareState(flare, flare.t + 12)!;
    expect(rising.rising).toBe(true);
    expect(later.y).toBeLessThan(125);
    expect(later.intensity).toBeGreaterThan(0.5);
    expect(flareState(flare, flare.t + 40)).toBeNull();
  });

  it("rung máy và chớp trắng chỉ quanh vụ nổ", () => {
    expect(blastShake(BLAST_TIME - 1, BLAST_TIME)).toBe(0);
    expect(blastShake(BLAST_TIME + 0.5, BLAST_TIME)).toBeGreaterThan(0.5);
    expect(blastShake(BLAST_TIME + 8, BLAST_TIME)).toBe(0);
    expect(blastGlare(BLAST_TIME + 0.05, BLAST_TIME)).toBeGreaterThan(0.7);
    expect(blastGlare(BLAST_TIME + 4, BLAST_TIME)).toBe(0);
  });
});
