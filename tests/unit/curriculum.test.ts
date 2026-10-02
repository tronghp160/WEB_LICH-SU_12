import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lessons } from "@/lib/lessons";
import { lessonCatalog } from "@/lib/lessons/catalog";
import {
  adjacentLessons,
  applyAssignments,
  flattenLessons,
  staticAssignments,
  getSgkLesson,
  lessonStatus,
  placementForFeature,
  placementsForEvent,
  SGK_12,
  sgkLessons,
  LESSON_TO_LEGACY_TOPIC,
} from "@/lib/sgk/curriculum";
import { searchSgkLessons } from "@/lib/sgk/search";
import { quickSearch } from "@/lib/sgk/quick-search";
import { questionsForSgkLesson } from "@/lib/sgk/quiz";
import { sectionReviewFor } from "@/lib/sgk/review";
import type { QuizQuestion } from "@/lib/quiz/types";

const EVENT_DIR = path.join(process.cwd(), "supabase/content/su-kien");
const seedEventSlugs = new Set(fs.readdirSync(EVENT_DIR).map((file) => file.replace(/\.md$/, "")));

describe("khung SGK Lịch sử 12", () => {
  it("6 chủ đề, 17 bài, số bài liên tục 1 → 17", () => {
    expect(SGK_12.map((topic) => topic.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sgkLessons.map((lesson) => lesson.number)).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
  });

  it("slug chủ đề, slug bài không trùng; slug bài bắt đầu bằng số bài", () => {
    expect(new Set(SGK_12.map((topic) => topic.slug)).size).toBe(6);
    expect(new Set(sgkLessons.map((lesson) => lesson.slug)).size).toBe(17);
    for (const lesson of sgkLessons) {
      expect(lesson.slug, lesson.title).toMatch(new RegExp(`^${lesson.number}-[a-z0-9-]+$`));
    }
  });

  it("số tiết của chủ đề bằng tổng số tiết các bài", () => {
    for (const topic of SGK_12) {
      expect(topic.lessons.reduce((sum, lesson) => sum + lesson.periods, 0), topic.slug).toBe(topic.periods);
    }
  });

  it("mỗi bài có yêu cầu cần đạt và ít nhất 2 mục, id mục không trùng trong bài", () => {
    for (const lesson of sgkLessons) {
      expect(lesson.goals.length, lesson.slug).toBeGreaterThan(0);
      expect(lesson.sections.length, lesson.slug).toBeGreaterThanOrEqual(2);
      expect(new Set(lesson.sections.map((section) => section.id)).size, lesson.slug).toBe(lesson.sections.length);
    }
  });

  it("mọi sự kiện được gắn đều có trong bộ nội dung (supabase/content/su-kien)", () => {
    for (const lesson of sgkLessons) {
      for (const section of lesson.sections) {
        for (const slug of section.eventSlugs ?? []) expect(seedEventSlugs.has(slug), `${lesson.slug}#${section.id}: ${slug}`).toBe(true);
      }
    }
  });

  it("mọi sự kiện trong bộ nội dung đều thuộc ít nhất một bài", () => {
    for (const slug of seedEventSlugs) expect(placementsForEvent(slug).length, slug).toBeGreaterThan(0);
  });

  it("mọi chuyên đề tương tác đều tồn tại và được gắn vào đúng một mục", () => {
    const featureSlugs = sgkLessons.flatMap((lesson) => lesson.sections.flatMap((section) => section.featureSlugs ?? []));
    expect(new Set(featureSlugs).size).toBe(featureSlugs.length);
    for (const slug of featureSlugs) expect(lessons.some((lesson) => lesson.slug === slug), slug).toBe(true);
    for (const lesson of lessons) expect(placementForFeature(lesson.slug), lesson.slug).toBeDefined();
  });

  it("trạng thái: Bài 6, 7 có chuyên đề; Bài 11 đang biên soạn; Bài 1, 9 có sự kiện", () => {
    expect(lessonStatus(getSgkLesson("6-cach-mang-thang-tam-nam-1945")!)).toBe("ready");
    expect(lessonStatus(getSgkLesson("7-khang-chien-chong-phap")!)).toBe("ready");
    expect(lessonStatus(getSgkLesson("11-thanh-tuu-va-bai-hoc-cua-cong-cuoc-doi-moi")!)).toBe("drafting");
    expect(lessonStatus(getSgkLesson("1-lien-hop-quoc")!)).toBe("partial");
    expect(lessonStatus(getSgkLesson("9-bao-ve-to-quoc-tu-sau-thang-4-1975")!)).toBe("partial");
  });

  it("bài trước / bài sau ở hai đầu mục lục", () => {
    expect(adjacentLessons("1-lien-hop-quoc").previous).toBeUndefined();
    expect(adjacentLessons("1-lien-hop-quoc").next?.number).toBe(2);
    expect(adjacentLessons("17-dau-an-ho-chi-minh").next).toBeUndefined();
    expect(adjacentLessons("khong-co").next).toBeUndefined();
  });

  it("Hiệp định Genève thuộc cả Bài 7 và Bài 13", () => {
    expect(placementsForEvent("hiep-dinh-geneve-ve-dong-duong").map((item) => item.lesson.number)).toEqual([7, 13]);
  });

  it("ánh xạ bài → chủ đề cũ chỉ dùng số bài có thật và 7 slug chủ đề trong seed", () => {
    const seed = fs.readFileSync(path.join(process.cwd(), "supabase/seed.sql"), "utf8");
    for (const [number, slug] of Object.entries(LESSON_TO_LEGACY_TOPIC)) {
      expect(sgkLessons.some((lesson) => lesson.number === Number(number)), number).toBe(true);
      expect(seed.includes(`'${slug}'`), slug).toBe(true);
    }
  });
});

describe("tìm Bài SGK", () => {
  it("theo số bài, có dấu hoặc không dấu", () => {
    expect(searchSgkLessons("bài 7").map((lesson) => lesson.number)).toEqual([7]);
    expect(searchSgkLessons("bai7").map((lesson) => lesson.number)).toEqual([7]);
    expect(searchSgkLessons("12").map((lesson) => lesson.number)).toEqual([12]);
    expect(searchSgkLessons("bài 99")).toEqual([]);
  });

  it("theo tên bài, tên mục", () => {
    expect(searchSgkLessons("chong phap").map((lesson) => lesson.number)).toContain(7);
    expect(searchSgkLessons("ASEAN").map((lesson) => lesson.number)).toEqual(expect.arrayContaining([4, 5]));
    expect(searchSgkLessons("Điện Biên Phủ").map((lesson) => lesson.number)).toEqual([7]);
    expect(searchSgkLessons("   ")).toEqual([]);
  });
});

describe("ôn tập theo Bài SGK", () => {
  const question = (id: string, eventSlugs: string[]): QuizQuestion => ({
    id,
    kind: "authored",
    prompt: "?",
    choices: ["a", "b", "c", "d"],
    correctIndex: 0,
    explanation: "",
    review: { href: "/", label: "" },
    eventSlugs,
    topicSlugs: [],
  });
  const pool = [
    question("dbp", ["chien-dich-dien-bien-phu"]),
    question("geneve", ["hiep-dinh-geneve-ve-dong-duong"]),
    question("wto", ["viet-nam-gia-nhap-wto-2007"]),
  ];

  it("bộ câu của Bài 7 gồm câu về sự kiện của bài và câu riêng của chuyên đề, không trùng", () => {
    const ids = questionsForSgkLesson(pool, getSgkLesson("7-khang-chien-chong-phap")!).map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(["dbp", "geneve"]));
    expect(ids).not.toContain("wto");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith("bai-hoc:chien-dich-dien-bien-phu:"))).toBe(true);
  });

  it("ôn lại phần sai: dẫn về đúng mục, ưu tiên bài đang ôn", () => {
    expect(sectionReviewFor(pool[1], "13-doi-ngoai-trong-khang-chien-1945-1975")?.href).toBe("/bai/13-doi-ngoai-trong-khang-chien-1945-1975#muc-1");
    expect(sectionReviewFor(pool[1])?.label).toMatch(/^Bài 7 › mục 3\./);
    expect(sectionReviewFor(question("x", ["khong-co"]))).toBeUndefined();
  });
});

describe("tìm nhanh nhóm theo loại", () => {
  const index = {
    events: [
      { slug: "dbp", title: "Chiến dịch Điện Biên Phủ", dateText: "13/3 – 7/5/1954" },
      { slug: "geneve", title: "Hiệp định Genève về Đông Dương", dateText: "21/7/1954" },
    ],
    figures: [{ slug: "vng", name: "Võ Nguyên Giáp", otherNames: "Văn", lifespan: "1911–2013" }],
    locations: [{ slug: "db", name: "Điện Biên Phủ", historicalName: "Mường Thanh" }],
  };

  it("gõ không dấu ra đủ các nhóm; gõ năm ra sự kiện", () => {
    const result = quickSearch(index, "dien bien");
    expect(result.lessons.map((lesson) => lesson.number)).toEqual([7]);
    expect(result.events.map((item) => item.slug)).toEqual(["dbp"]);
    expect(result.locations.map((item) => item.slug)).toEqual(["db"]);
    expect(quickSearch(index, "1954").events).toHaveLength(2);
    expect(quickSearch(index, "vo nguyen giap").figures).toHaveLength(1);
  });

  it("chưa có chỉ mục vẫn gợi ý bài; từ khóa trống → không có gì", () => {
    expect(quickSearch(null, "bài 7").lessons).toHaveLength(1);
    expect(quickSearch(index, "  ").events).toEqual([]);
  });
});

describe("danh mục chuyên đề gọn (menu)", () => {
  it("khớp đúng slug, tên, mốc thời gian của lib/lessons", () => {
    expect(lessonCatalog).toEqual(lessons.map((lesson) => ({ slug: lesson.slug, title: lesson.title, dateText: lesson.dateText })));
  });
});

describe("gán sự kiện từ database (GĐ7)", () => {
  it("dữ liệu ban đầu sinh từ code áp ngược lại cho đúng khung cũ", () => {
    const applied = applyAssignments(SGK_12, staticAssignments());
    for (const [index, lesson] of flattenLessons(applied).entries()) {
      for (const [sectionIndex, section] of lesson.sections.entries()) {
        expect(section.eventSlugs, `${lesson.slug}#${section.id}`).toEqual(sgkLessons[index].sections[sectionIndex].eventSlugs ?? []);
      }
    }
  });

  it("theo sort_order; bỏ dòng gán vào bài/mục không tồn tại; giữ chuyên đề viết trong code", () => {
    const applied = flattenLessons(
      applyAssignments(SGK_12, [
        { lessonSlug: "1-lien-hop-quoc", sectionId: "muc-1", eventSlug: "b", sortOrder: 2 },
        { lessonSlug: "1-lien-hop-quoc", sectionId: "muc-1", eventSlug: "a", sortOrder: 1 },
        { lessonSlug: "1-lien-hop-quoc", sectionId: "muc-9", eventSlug: "x", sortOrder: 1 },
        { lessonSlug: "99-khong-co", sectionId: "muc-1", eventSlug: "y", sortOrder: 1 },
      ]),
    );
    const bai1 = getSgkLesson("1-lien-hop-quoc", applied)!;
    expect(bai1.sections[0].eventSlugs).toEqual(["a", "b"]);
    expect(placementsForEvent("a", applied).map((item) => item.lesson.number)).toEqual([1]);
    expect(placementsForEvent("chien-dich-dien-bien-phu", applied)).toEqual([]);
    expect(getSgkLesson("7-khang-chien-chong-phap", applied)!.sections[2].featureSlugs).toEqual(["chien-dich-dien-bien-phu"]);
  });
});
