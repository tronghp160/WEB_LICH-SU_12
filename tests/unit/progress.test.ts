import { describe, expect, it } from "vitest";
import {
  buildStampCatalog,
  emptyProgress,
  evaluateStamps,
  isPassing,
  markLessonStudied,
  parseProgress,
  recordQuiz,
  stampDate,
  yearsInName,
} from "@/lib/progress/progress";
import { PROVINCES } from "@/lib/provinces";
import { distanceMeters, nearbyLocations } from "@/lib/utils/map";

const day1 = new Date("2026-09-30T02:00:00Z");
const day2 = new Date("2026-10-01T02:00:00Z");

describe("parseProgress", () => {
  it("dữ liệu trống, hỏng hoặc sai phiên bản → tiến độ trống", () => {
    expect(parseProgress(null)).toEqual(emptyProgress);
    expect(parseProgress("{không phải json")).toEqual(emptyProgress);
    expect(parseProgress(JSON.stringify({ v: 2, lessons: {}, quizzes: {} }))).toEqual(emptyProgress);
    expect(parseProgress("[]")).toEqual(emptyProgress);
  });

  it("bỏ riêng mục hỏng, giữ mục đúng", () => {
    const raw = JSON.stringify({
      v: 1,
      lessons: { a: { studiedAt: "2026-09-30T00:00:00.000Z" }, b: { studiedAt: 5 } },
      quizzes: {
        ok: { best: 8, total: 10, attempts: 2, lastAt: "x" },
        vuot: { best: 11, total: 10, attempts: 1, lastAt: "x" },
        am: { best: -1, total: 10, attempts: 1, lastAt: "x" },
      },
    });
    const progress = parseProgress(raw);
    expect(Object.keys(progress.lessons)).toEqual(["a"]);
    expect(Object.keys(progress.quizzes)).toEqual(["ok"]);
  });

  it("ghi rồi đọc lại được đúng như cũ", () => {
    const progress = markLessonStudied(recordQuiz(emptyProgress, "tong-hop", 7, 10, day1), "dbp", day1);
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });
});

describe("recordQuiz", () => {
  it("ngưỡng đóng dấu 70%", () => {
    expect(isPassing(7, 10)).toBe(true);
    expect(isPassing(6, 10)).toBe(false);
    expect(isPassing(700, 1000)).toBe(true);
    expect(isPassing(0, 0)).toBe(false);
  });

  it("giữ điểm cao nhất, đếm số lượt, nhớ lần đầu đạt", () => {
    let progress = recordQuiz(emptyProgress, "s", 5, 10, day1);
    expect(progress.quizzes.s).toMatchObject({ best: 5, total: 10, attempts: 1 });
    expect(progress.quizzes.s.passedAt).toBeUndefined();

    progress = recordQuiz(progress, "s", 8, 10, day1);
    expect(progress.quizzes.s).toMatchObject({ best: 8, attempts: 2, passedAt: day1.toISOString() });

    progress = recordQuiz(progress, "s", 3, 10, day2);
    expect(progress.quizzes.s).toMatchObject({ best: 8, attempts: 3, passedAt: day1.toISOString(), lastAt: day2.toISOString() });
  });

  it("so điểm theo tỉ lệ khi số câu mỗi lượt khác nhau", () => {
    const progress = recordQuiz(recordQuiz(emptyProgress, "s", 5, 6, day1), "s", 8, 10, day2);
    expect(progress.quizzes.s).toMatchObject({ best: 5, total: 6 });
  });

  it("không làm thay đổi object cũ; tổng 0 câu thì bỏ qua", () => {
    const before = recordQuiz(emptyProgress, "s", 5, 10, day1);
    recordQuiz(before, "s", 9, 10, day2);
    expect(before.quizzes.s.best).toBe(5);
    expect(recordQuiz(before, "x", 0, 0, day2)).toBe(before);
  });
});

describe("markLessonStudied", () => {
  it("chỉ ghi lần đầu", () => {
    const once = markLessonStudied(emptyProgress, "dbp", day1);
    expect(markLessonStudied(once, "dbp", day2)).toBe(once);
    expect(once.lessons.dbp.studiedAt).toBe(day1.toISOString());
  });
});

describe("con dấu", () => {
  const defs = buildStampCatalog({
    lessons: [{ slug: "chien-dich-dien-bien-phu", title: "Chiến dịch Điện Biên Phủ", dateText: "1954" }],
    topics: [{ slug: "khang-chien-chong-phap", name: "Cuộc kháng chiến chống thực dân Pháp (1945–1954)" }],
    hasAllQuiz: true,
    hasYearGame: false,
  });

  it("thứ tự bài học → chủ đề → đặc biệt; không có bộ nào thì không có dấu", () => {
    expect(defs.map((def) => def.setId)).toEqual(["bai-hoc:chien-dich-dien-bien-phu", "chu-de:khang-chien-chong-phap", "tong-hop"]);
    expect(defs[0].href).toBe("/trac-nghiem/bai-hoc/chien-dich-dien-bien-phu");
    expect(defs[1].motto).toBe("1945–1954");
  });

  it("chỉ bộ đã đạt ngưỡng mới có dấu", () => {
    let progress = recordQuiz(emptyProgress, "chu-de:khang-chien-chong-phap", 9, 10, day1);
    progress = recordQuiz(progress, "tong-hop", 4, 10, day1);
    const stamps = evaluateStamps(defs, progress);
    expect(stamps.map((stamp) => Boolean(stamp.earnedAt))).toEqual([false, true, false]);
    expect(stamps[2].record?.best).toBe(4);
  });

  it("mốc năm trong tên chủ đề", () => {
    expect(yearsInName("Cuộc kháng chiến chống Mỹ, cứu nước (1954-1975)")).toBe("1954–1975");
    expect(yearsInName("Cách mạng tháng Tám năm 1945")).toBe("1945");
    expect(yearsInName("Công cuộc Đổi mới")).toBeUndefined();
  });

  it("ngày trên dấu theo giờ Việt Nam", () => {
    expect(stampDate("2026-09-30T18:00:00Z")).toBe("1/10/2026");
  });
});

describe("di tích gần em", () => {
  const hanoi = { lat: 21.028, lng: 105.854 };
  const places = [
    { slug: "dbp", latitude: 21.386, longitude: 103.023 },
    { slug: "ba-dinh", latitude: 21.037, longitude: 105.835 },
    { slug: "sai-gon", latitude: 10.777, longitude: 106.695 },
  ];

  it("khoảng cách haversine đúng cỡ thực tế", () => {
    expect(distanceMeters(hanoi, hanoi)).toBe(0);
    // Hà Nội – TP.HCM đường chim bay khoảng 1.140 km.
    expect(distanceMeters(hanoi, { lat: 10.776, lng: 106.701 }) / 1000).toBeGreaterThan(1100);
    expect(distanceMeters(hanoi, { lat: 10.776, lng: 106.701 }) / 1000).toBeLessThan(1180);
  });

  it("lọc trong bán kính, gần nhất trước", () => {
    const result = nearbyLocations(places, hanoi, 50);
    expect(result.withinRadius).toBe(true);
    expect(result.items.map((item) => item.slug)).toEqual(["ba-dinh"]);
    expect(result.items[0].distanceM).toBeLessThan(3000);
  });

  it("không có gì trong bán kính → vài di tích gần nhất", () => {
    const result = nearbyLocations(places, { lat: 16.46, lng: 107.59 }, 25, 2);
    expect(result.withinRadius).toBe(false);
    expect(result.items.map((item) => item.slug)).toEqual(["ba-dinh", "sai-gon"]);
  });

  it("34 tỉnh, thành phố, tên không trùng, tọa độ trong lãnh thổ Việt Nam", () => {
    expect(PROVINCES).toHaveLength(34);
    expect(new Set(PROVINCES.map((province) => province.name)).size).toBe(34);
    for (const province of PROVINCES) {
      expect(province.lat).toBeGreaterThan(8.3);
      expect(province.lat).toBeLessThan(23.4);
      expect(province.lng).toBeGreaterThan(102.1);
      expect(province.lng).toBeLessThan(109.5);
    }
  });
});
