import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { depthPathFor } from "@/lib/photo3d/parallax";
import { interpolateFrame } from "@/lib/battles/animation";
import { cachMangThangTam1945 } from "@/lib/battles/cach-mang-thang-tam-1945";
import { dienBienPhu1954 } from "@/lib/battles/dien-bien-phu-1954";
import { getLesson, getLessonForEvent, interactiveEntries, lessons } from "@/lib/lessons";
import type { StrongpointStatus } from "@/lib/battles/types";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const rank: Record<StrongpointStatus, number> = { held: 0, attacked: 1, captured: 2 };

describe("kịch bản Điện Biên Phủ", () => {
  const { steps, unitDefinitions, strongpointDefinitions = [], arrowDefinitions = [], zoneDefinitions = [] } = dienBienPhu1954;
  const unitIds = unitDefinitions.map((unit) => unit.id).sort();

  it("7 bước, id không trùng, có tiêu đề, mốc thời gian, lời dẫn đủ dài", () => {
    expect(steps).toHaveLength(7);
    expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(5);
      expect(step.dateText?.length).toBeGreaterThan(3);
      expect(step.caption.length, step.id).toBeGreaterThan(200);
    }
  });

  it("mọi bước khai báo đủ đơn vị; mọi id cứ điểm/mũi tên/vùng tham chiếu đều tồn tại", () => {
    const pointIds = new Set(strongpointDefinitions.map((point) => point.id));
    const arrowIds = new Set(arrowDefinitions.map((arrow) => arrow.id));
    const zoneIds = new Set(zoneDefinitions.map((zone) => zone.id));
    for (const step of steps) {
      expect(Object.keys(step.units).sort(), step.id).toEqual(unitIds);
      for (const id of Object.keys(step.strongpoints ?? {})) expect(pointIds.has(id), `${step.id}/${id}`).toBe(true);
      for (const id of step.arrows ?? []) expect(arrowIds.has(id), `${step.id}/${id}`).toBe(true);
      for (const id of step.zones ?? []) expect(zoneIds.has(id), `${step.id}/${id}`).toBe(true);
    }
  });

  it("cứ điểm đã bị tiêu diệt không bao giờ quay lại trạng thái đang giữ", () => {
    const worst: Record<string, number> = {};
    for (const step of steps) {
      for (const [id, status] of Object.entries(step.strongpoints ?? {})) {
        expect(rank[status], `${step.id}/${id}`).toBeGreaterThanOrEqual(worst[id] ?? 0);
        worst[id] = Math.max(worst[id] ?? 0, rank[status] === 1 ? 0 : rank[status]);
      }
    }
  });

  it("diễn biến đúng thứ tự SGK: đợt 1 diệt Him Lam + phân khu Bắc, đợt 2 các điểm cao phía đông, đợt 3 hầm chỉ huy", () => {
    const byId = Object.fromEntries(steps.map((step) => [step.id, step.strongpoints ?? {}]));
    expect(byId["tap-doan-cu-diem"].himLam).toBe("held");
    expect([byId["dot-1"].himLam, byId["dot-1"].docLap, byId["dot-1"].banKeo]).toEqual(["captured", "captured", "captured"]);
    expect(byId["dot-1"].a1).toBe("held");
    expect([byId["dot-2"].e1, byId["dot-2"].d1, byId["dot-2"].c1]).toEqual(["captured", "captured", "captured"]);
    expect(byId["dot-2"].a1).toBe("attacked");
    expect(byId["dot-2"].hamChiHuy).toBe("held");
    expect(byId["dot-3"].hamChiHuy).toBe("captured");
    expect(Object.values(byId["ket-qua"]).every((status) => status === "captured")).toBe(true);
  });

  it("tọa độ các cứ điểm nằm trong lòng chảo Mường Thanh", () => {
    for (const point of strongpointDefinitions) {
      const [lat, lng] = point.position;
      expect(lat, point.id).toBeGreaterThan(21.32);
      expect(lat, point.id).toBeLessThan(21.43);
      expect(lng, point.id).toBeGreaterThan(102.98);
      expect(lng, point.id).toBeLessThan(103.04);
    }
  });

  it("mọi bước có khung nhìn; khung nhìn nằm trong giới hạn zoom của bản đồ", () => {
    for (const step of steps) {
      expect(step.camera, step.id).toBeDefined();
      expect(step.camera!.zoom).toBeGreaterThanOrEqual(dienBienPhu1954.minZoom!);
      expect(step.camera!.zoom).toBeLessThanOrEqual(dienBienPhu1954.maxZoom!);
    }
  });

  it("chuyển từ đợt 1 sang đợt 2: mũi tên đợt 1 mờ dần, mũi tên đợt 2 được vẽ dần", () => {
    const from = steps.find((step) => step.id === "dot-1")!;
    const to = steps.find((step) => step.id === "dot-2")!;
    const mid = interpolateFrame(from, to, 0.5);
    expect(mid.arrows["d1-him-lam"].progress).toBe(1);
    expect(mid.arrows["d1-him-lam"].opacity).toBeLessThan(1);
    expect(mid.arrows["d2-a1"].progress).toBeGreaterThan(0);
    expect(mid.arrows["d2-a1"].progress).toBeLessThan(1);
    expect(mid.tideLevel).toBeNull();
  });
});

describe("kịch bản Cách mạng tháng Tám", () => {
  const byId = Object.fromEntries(cachMangThangTam1945.steps.map((step) => [step.id, step.strongpoints ?? {}]));

  it("diễn biến đúng thứ tự: 4 tỉnh sớm nhất → Hà Nội 19/8 → Huế, Sài Gòn → cả nước", () => {
    const early = ["bacGiang", "haiDuong", "haTinh", "quangNam"];
    expect(early.map((id) => byId["khoi-nghia-lan-rong"][id])).toEqual(["captured", "captured", "captured", "captured"]);
    expect(byId["khoi-nghia-lan-rong"].haNoi).toBe("held");
    expect(byId["ha-noi"].haNoi).toBe("captured");
    expect([byId["ha-noi"].hue, byId["ha-noi"].saiGon]).toEqual(["held", "held"]);
    expect([byId["hue-sai-gon"].hue, byId["hue-sai-gon"].saiGon]).toEqual(["captured", "captured"]);
    expect([byId["hue-sai-gon"].dongNaiThuong, byId["hue-sai-gon"].haTien]).toEqual(["held", "held"]);
    expect(Object.values(byId["ca-nuoc"]).every((status) => status === "captured")).toBe(true);
  });

  it("các địa phương nằm trong lãnh thổ Việt Nam", () => {
    for (const point of cachMangThangTam1945.strongpointDefinitions ?? []) {
      const [lat, lng] = point.position;
      expect(lat, point.id).toBeGreaterThan(8.3);
      expect(lat, point.id).toBeLessThan(23.4);
      expect(lng, point.id).toBeGreaterThan(102.1);
      expect(lng, point.id).toBeLessThan(109.5);
    }
  });
});

describe("dữ liệu bài học", () => {
  it("tra cứu theo slug bài học và theo sự kiện (kể cả sự kiện liên quan)", () => {
    expect(getLesson("chien-dich-dien-bien-phu")?.title).toBe("Chiến dịch Điện Biên Phủ");
    expect(getLessonForEvent("chien-dich-dien-bien-phu")?.slug).toBe("chien-dich-dien-bien-phu");
    expect(getLessonForEvent("tong-khoi-nghia-gianh-chinh-quyen-o-ha-noi")?.slug).toBe("cach-mang-thang-tam-1945");
    expect(getLessonForEvent("tuyen-ngon-doc-lap")?.slug).toBe("cach-mang-thang-tam-1945");
    expect(getLesson("khong-co")).toBeUndefined();
    expect(getLessonForEvent("hiep-dinh-geneve-ve-dong-duong")).toBeUndefined();
  });

  it("slug bài học không trùng", () => {
    expect(new Set(lessons.map((lesson) => lesson.slug)).size).toBe(lessons.length);
  });

  for (const lesson of lessons) {
    describe(lesson.slug, () => {
      it("bản đồ: mọi bước khai báo đủ đơn vị, id tham chiếu tồn tại, khung nhìn trong giới hạn zoom", () => {
        const { steps, unitDefinitions, strongpointDefinitions = [], arrowDefinitions = [], zoneDefinitions = [], minZoom = 0, maxZoom = 20 } = lesson.battle;
        const unitIds = unitDefinitions.map((unit) => unit.id).sort();
        const pointIds = new Set(strongpointDefinitions.map((point) => point.id));
        const arrowIds = new Set(arrowDefinitions.map((arrow) => arrow.id));
        const zoneIds = new Set(zoneDefinitions.map((zone) => zone.id));
        expect(new Set(steps.map((step) => step.id)).size).toBe(steps.length);
        for (const step of steps) {
          expect(step.caption.length, step.id).toBeGreaterThan(200);
          expect(Object.keys(step.units).sort(), step.id).toEqual(unitIds);
          for (const id of Object.keys(step.strongpoints ?? {})) expect(pointIds.has(id), `${step.id}/${id}`).toBe(true);
          for (const id of step.arrows ?? []) expect(arrowIds.has(id), `${step.id}/${id}`).toBe(true);
          for (const id of step.zones ?? []) expect(zoneIds.has(id), `${step.id}/${id}`).toBe(true);
          expect(step.camera, step.id).toBeDefined();
          expect(step.camera!.zoom).toBeGreaterThanOrEqual(minZoom);
          expect(step.camera!.zoom).toBeLessThanOrEqual(maxZoom);
        }
      });

      it("nơi đã giành được / đã tiêu diệt không quay lại trạng thái cũ", () => {
        const worst: Record<string, number> = {};
        for (const step of lesson.battle.steps) {
          for (const [id, status] of Object.entries(step.strongpoints ?? {})) {
            expect(rank[status], `${step.id}/${id}`).toBeGreaterThanOrEqual(worst[id] ?? 0);
            worst[id] = Math.max(worst[id] ?? 0, rank[status] === 1 ? 0 : rank[status]);
          }
        }
      });

      it("hiện vật có ảnh hoặc mô hình quét; mô hình quét có mã Sketchfab hợp lệ, ghi công, ảnh xem trước", () => {
        const exhibits = [...(lesson.artifacts ?? []), ...(lesson.todayScans ?? [])];
        const scans = [...exhibits.flatMap((item) => (item.scan ? [item.scan] : [])), ...(lesson.resultsScan ? [lesson.resultsScan] : [])];
        for (const item of exhibits) expect(Boolean(item.image || item.scan), item.title).toBe(true);
        for (const item of lesson.todayScans ?? []) expect(item.scan, item.title).toBeDefined();
        expect(new Set(scans.map((scan) => scan.sketchfabId)).size).toBe(scans.length);
        for (const scan of scans) {
          expect(scan.sketchfabId, scan.title).toMatch(/^[0-9a-f]{32}$/);
          expect(scan.author.length).toBeGreaterThan(1);
          expect(scan.authorUrl).toMatch(/^https:\/\/sketchfab\.com\//);
          expect(scan.poster).toMatch(/^https:\/\/media\.sketchfab\.com\/models\/[0-9a-f]{32}\//);
          expect(scan.poster).toContain(scan.sketchfabId);
          expect(scan.note.length).toBeGreaterThan(20);
          expect(scan.sizeMb).toBeGreaterThan(0);
        }
      });

      it("trắc nghiệm riêng: 4 đáp án khác nhau, có giải thích", () => {
        for (const item of lesson.quiz ?? []) {
          expect(new Set(item.choices).size, item.question).toBe(4);
          expect(item.explanation.length).toBeGreaterThan(20);
        }
      });

      it("video có id YouTube hợp lệ (11 ký tự), tên kênh và ghi chú", () => {
        expect(lesson.videos.length).toBeGreaterThan(0);
        for (const video of lesson.videos) {
          expect(video.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
          expect(video.channel.length).toBeGreaterThan(2);
          expect(video.note.length).toBeGreaterThan(5);
        }
      });

      it("mọi ảnh có alt, ghi công/giấy phép, link trang gốc và file tồn tại trong public/ (≤ 250 KB)", () => {
        const images = [
          lesson.hero,
          ...lesson.today,
          ...lesson.figures.flatMap((figure) => (figure.image ? [figure.image] : [])),
          ...(lesson.artifacts ?? []).flatMap((item) => (item.image ? [item.image] : [])),
          ...(lesson.resultsImage ? [lesson.resultsImage] : []),
        ];
        const stepImages = lesson.battle.steps.flatMap((step) => (step.image ? [step.image] : []));
        for (const image of [...images, ...stepImages]) {
          expect(image.alt.length, image.src).toBeGreaterThan(10);
          expect(image.credit, image.src).toMatch(/phạm vi công cộng|CC BY|CC0|chỉ cần ghi công/);
          const file = path.join(PUBLIC_DIR, image.src);
          expect(fs.existsSync(file), image.src).toBe(true);
          expect(fs.statSync(file).size, image.src).toBeLessThanOrEqual(250 * 1024);
        }
        for (const image of images) expect(image.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      });

      it("ảnh 3D: có bản đồ độ sâu, đúng kích thước file, điểm chú thích nằm trong khung", async () => {
        const images = [lesson.hero, ...lesson.today, ...(lesson.artifacts ?? []).flatMap((item) => (item.image ? [item.image] : [])), ...(lesson.resultsImage ? [lesson.resultsImage] : [])];
        for (const image of images.filter((item) => item.depthSrc)) {
          expect(image.depthSrc).toBe(depthPathFor(image.src));
          const depthFile = path.join(PUBLIC_DIR, image.depthSrc!);
          expect(fs.existsSync(depthFile), image.depthSrc).toBe(true);
          expect(fs.statSync(depthFile).size, image.depthSrc).toBeLessThanOrEqual(60 * 1024);
          const meta = await sharp(path.join(PUBLIC_DIR, image.src)).metadata();
          expect([image.width, image.height], image.src).toEqual([meta.width, meta.height]);
          expect(image.title?.length, image.src).toBeGreaterThan(2);
          for (const hotspot of image.hotspots ?? []) {
            expect(hotspot.x, `${image.src}/${hotspot.label}`).toBeGreaterThanOrEqual(3);
            expect(hotspot.x).toBeLessThanOrEqual(97);
            expect(hotspot.y).toBeGreaterThanOrEqual(3);
            expect(hotspot.y).toBeLessThanOrEqual(97);
            expect(hotspot.text.length).toBeGreaterThan(15);
          }
        }
      });

      it("đủ các phần của bài: mục tiêu, mốc thời gian, ý nghĩa, nhân vật, thẻ ghi nhớ, danh sách cần đối chiếu", () => {
        expect(lesson.textbook.objectives.length).toBeGreaterThanOrEqual(3);
        expect(lesson.keyDates.length).toBeGreaterThanOrEqual(5);
        expect(lesson.significance.length).toBeGreaterThanOrEqual(3);
        expect(lesson.figures.length).toBeGreaterThanOrEqual(3);
        expect(lesson.flashcards.length).toBeGreaterThanOrEqual(5);
        expect(lesson.toVerify.length).toBeGreaterThan(0);
      });
    });
  }

  it("thẻ ở trang chủ trỏ tới bài học và trận tái hiện", () => {
    expect(interactiveEntries.map((entry) => entry.href)).toEqual([
      "/bai-hoc/cach-mang-thang-tam-1945",
      "/bai-hoc/chien-dich-dien-bien-phu",
      "/tai-hien/bach-dang-938",
    ]);
  });
});
