import { describe, expect, it } from "vitest";
import { scoreMessage } from "@/components/quiz/QuizPlayer";
import { dienBienPhuLesson } from "@/lib/lessons/dien-bien-phu";
import { lessons } from "@/lib/lessons";
import {
  buildQuestionPool,
  buildYearRounds,
  drawRound,
  firstSentence,
  shuffleChoices,
  yearDistractors,
  yearGuessPoints,
} from "@/lib/quiz/generate";
import { questionsForLesson, questionsForTopic } from "@/lib/quiz/sets";
import type { QuizSourceData, SourceEvent, SourceImage } from "@/lib/quiz/types";
import { quizQuestionColumns, quizQuestionSchema } from "@/lib/validation/content";

function image(id: string, extra: Partial<SourceImage> = {}): SourceImage {
  return {
    id,
    url: `https://x/${id}-1200.webp`,
    alt: `Mô tả lộ đáp án ${id}`,
    caption: `Chú thích ${id}`,
    labels: ["Ảnh tư liệu 1954"],
    neutralLabels: ["Ảnh tư liệu"],
    photographer: "Tác giả",
    license: "CC BY 4.0",
    licenseUrl: null,
    sourcePageUrl: null,
    focalPoint: null,
    width: 1200,
    height: 800,
    era: "historical",
    isCover: false,
    sortOrder: 1,
    ...extra,
  };
}

function event(slug: string, startYear: number, extra: Partial<SourceEvent> = {}): SourceEvent {
  return {
    id: `id-${slug}`,
    slug,
    title: `Sự kiện ${slug}`,
    summary: `Tóm tắt ${slug}. Câu thứ hai.`,
    dateText: String(startYear),
    datePrecision: "exact",
    startYear,
    topicSlugs: ["chu-de-a"],
    figureIds: [],
    locationIds: [],
    images: [],
    ...extra,
  };
}

const data: QuizSourceData = {
  events: [
    event("a", 1945, { images: [image("a1", { isCover: true }), image("a-nay", { era: "today" })], figureIds: ["f1"], locationIds: ["l1"] }),
    event("b", 1954, { topicSlugs: ["chu-de-b"], images: [image("b1")] }),
    event("c", 1968, { datePrecision: "disputed" }),
    event("d", 1975),
    event("e", 1986, { datePrecision: "approximate" }),
  ],
  figures: ["f1", "f2", "f3", "f4"].map((id, index) => ({
    id,
    slug: id,
    name: `Nhân vật ${index + 1}`,
    biography: "Tiểu sử. Câu sau.",
    images: id === "f1" ? [image("chan-dung-f1")] : [],
  })),
  locations: ["l1", "l2", "l3", "l4"].map((id) => ({
    id,
    slug: id,
    name: `Địa điểm ${id}`,
    description: "Mô tả địa điểm.",
    images: [image(`nay-${id}`, { era: "today" })],
  })),
  authored: [
    { id: "q1", eventId: "id-b", question: "Câu soạn tay?", choices: ["Đúng", "Sai 1", "Sai 2", "Sai 3"], correctIndex: 0, explanation: "Vì thế.", mediaId: "b1" },
    // Sự kiện chưa công bố (RLS không trả) → bỏ qua.
    { id: "q2", eventId: "id-khong-co", question: "Câu mồ côi?", choices: ["1", "2", "3", "4"], correctIndex: 1, explanation: "…", mediaId: null },
  ],
};

describe("buildQuestionPool", () => {
  const pool = buildQuestionPool(data);
  const byKind = (kind: string) => pool.filter((question) => question.kind === kind);

  it("mọi câu có đúng 4 đáp án khác nhau và đáp án đúng nằm trong đó", () => {
    expect(pool.length).toBeGreaterThan(0);
    for (const question of pool) {
      expect(question.choices).toHaveLength(4);
      expect(new Set(question.choices).size).toBe(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
    }
  });

  it("id không trùng", () => {
    expect(new Set(pool.map((question) => question.id)).size).toBe(pool.length);
  });

  it("câu soạn tay: giữ ảnh của chính sự kiện, bỏ câu của sự kiện không công bố", () => {
    const authored = byKind("authored");
    expect(authored.map((question) => question.id)).toEqual(["soan:q1"]);
    expect(authored[0].image?.url).toContain("b1");
    expect(authored[0].review.href).toBe("/su-kien/b");
  });

  it("ảnh tư liệu → sự kiện: chỉ ảnh không phải ảnh ngày nay; đáp án đúng là tên sự kiện", () => {
    const photo = byKind("photo-event");
    expect(photo.map((question) => question.id).sort()).toEqual(["anh-su-kien:a1", "anh-su-kien:b1"]);
    const first = photo.find((question) => question.id === "anh-su-kien:a1")!;
    expect(first.choices[first.correctIndex]).toBe("Sự kiện a");
  });

  it("năm: bỏ sự kiện có năm còn tranh luận hoặc chỉ khoảng", () => {
    const years = byKind("event-year").map((question) => question.eventSlugs[0]);
    expect(years.sort()).toEqual(["a", "b", "d"]);
    const a = byKind("event-year").find((question) => question.eventSlugs[0] === "a")!;
    expect(a.choices[a.correctIndex]).toBe("1945");
  });

  it("chân dung và di tích: gắn chủ đề/sự kiện qua liên kết của sự kiện", () => {
    const portrait = byKind("portrait");
    expect(portrait).toHaveLength(1);
    expect(portrait[0].eventSlugs).toEqual(["a"]);
    expect(portrait[0].topicSlugs).toEqual(["chu-de-a"]);
    const places = byKind("place-photo");
    expect(places).toHaveLength(4);
    expect(places.find((question) => question.id === "di-tich:l1")!.eventSlugs).toEqual(["a"]);
  });

  it("tất định: cùng dữ liệu → cùng câu hỏi và đáp án nhiễu", () => {
    expect(buildQuestionPool(data)).toEqual(pool);
  });

  it("ít hơn 4 sự kiện thì không sinh câu ảnh → sự kiện", () => {
    const small = buildQuestionPool({ ...data, events: data.events.slice(0, 3), authored: [] });
    expect(small.some((question) => question.kind === "photo-event")).toBe(false);
  });
});

describe("yearDistractors", () => {
  it("lấy năm của sự kiện khác gần nhất, không trùng năm đúng", () => {
    expect(yearDistractors(1945, [1945, 1941, 1954, 1911, 1975])).toEqual([1941, 1954, 1975]);
  });
  it("thiếu năm thì thêm năm lệch", () => {
    expect(yearDistractors(1945, [1945])).toEqual([1944, 1946, 1943]);
  });
});

describe("buildYearRounds", () => {
  it("chỉ ảnh tư liệu của sự kiện có năm chắc chắn", () => {
    const rounds = buildYearRounds(data);
    expect(rounds.map((round) => round.id).sort()).toEqual(["doan-nam:a1", "doan-nam:b1"]);
    expect(rounds.find((round) => round.id === "doan-nam:b1")!.year).toBe(1954);
  });
  it("điểm: đúng năm 100, mỗi năm lệch -5, tối thiểu 0", () => {
    expect(yearGuessPoints(1954, 1954)).toBe(100);
    expect(yearGuessPoints(1950, 1954)).toBe(80);
    expect(yearGuessPoints(1990, 1954)).toBe(0);
  });
});

describe("xáo câu hỏi", () => {
  const pool = buildQuestionPool(data);
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  it("xáo đáp án vẫn giữ đúng đáp án đúng", () => {
    for (const question of pool) {
      const shuffled = shuffleChoices(question, random);
      expect(shuffled.choices[shuffled.correctIndex]).toBe(question.choices[question.correctIndex]);
      expect([...shuffled.choices].sort()).toEqual([...question.choices].sort());
    }
  });

  it("một lượt lấy tối đa số câu yêu cầu, không lặp câu", () => {
    const round = drawRound(pool, 3, random);
    expect(round).toHaveLength(3);
    expect(new Set(round.map((question) => question.id)).size).toBe(3);
    expect(drawRound(pool, 100, random)).toHaveLength(pool.length);
  });

  it("không lặp ảnh trong một lượt khi còn đủ câu khác", () => {
    const withImage = pool.filter((question) => question.image);
    const distinctImages = new Set(withImage.map((question) => question.image!.url)).size;
    expect(distinctImages).toBeLessThan(withImage.length); // dữ liệu thử có ảnh dùng chung (ảnh bìa a1, b1)
    for (let attempt = 0; attempt < 20; attempt++) {
      const round = drawRound(pool, distinctImages, random).filter((question) => question.image);
      const urls = round.map((question) => question.image!.url);
      expect(new Set(urls).size).toBe(urls.length);
    }
  });
});

describe("bộ câu hỏi", () => {
  const pool = buildQuestionPool(data);
  it("theo chủ đề: lọc theo chủ đề của sự kiện liên quan", () => {
    const topicB = questionsForTopic(pool, "chu-de-b");
    expect(topicB.length).toBeGreaterThan(0);
    expect(topicB.every((question) => question.topicSlugs.includes("chu-de-b"))).toBe(true);
  });

  it("theo bài học: câu riêng của bài học trước, rồi câu của sự kiện bài học mở rộng", () => {
    const lesson = { ...dienBienPhuLesson, eventSlug: "a" };
    const questions = questionsForLesson(pool, lesson);
    expect(questions.slice(0, lesson.quiz!.length).every((question) => question.id.startsWith("bai-hoc:"))).toBe(true);
    expect(questions.slice(lesson.quiz!.length).every((question) => question.eventSlugs.includes("a"))).toBe(true);
  });
});

describe("câu trắc nghiệm của bài học (dữ liệu viết tay)", () => {
  for (const lesson of lessons) {
    it(`${lesson.slug}: 4 đáp án khác nhau, có giải thích`, () => {
      for (const item of lesson.quiz ?? []) {
        expect(new Set(item.choices.map((choice) => choice.toLowerCase())).size).toBe(4);
        expect(item.explanation.length).toBeGreaterThan(10);
        expect(item.question).not.toMatch(/TODO|FIXME/);
      }
    });
  }
});

describe("quizQuestionSchema", () => {
  const valid = {
    event_id: "3f1c2b8e-5d4a-4c1b-9e7f-1a2b3c4d5e6f",
    question: "Ai đọc Tuyên ngôn Độc lập?",
    choice_0: " Hồ Chí Minh ",
    choice_1: "Võ Nguyên Giáp",
    choice_2: "Phạm Văn Đồng",
    choice_3: "Trường Chinh",
    correct_index: "0",
    explanation: "Chủ tịch Hồ Chí Minh đọc ngày 2/9/1945.",
    media_id: "",
  };

  it("nhận dữ liệu hợp lệ, cắt khoảng trắng, ảnh rỗng → null", () => {
    const parsed = quizQuestionSchema.parse(valid);
    expect(quizQuestionColumns(parsed)).toEqual({
      question: valid.question,
      choices: ["Hồ Chí Minh", "Võ Nguyên Giáp", "Phạm Văn Đồng", "Trường Chinh"],
      correct_index: 0,
      explanation: valid.explanation,
      media_id: null,
    });
  });

  it("chặn đáp án trùng (không phân biệt hoa thường)", () => {
    const result = quizQuestionSchema.safeParse({ ...valid, choice_3: "hồ chí minh" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["choice_3"]);
  });

  it("bắt buộc chọn đáp án đúng và điền đủ 4 đáp án", () => {
    expect(quizQuestionSchema.safeParse({ ...valid, correct_index: undefined }).success).toBe(false);
    expect(quizQuestionSchema.safeParse({ ...valid, choice_2: "  " }).success).toBe(false);
  });
});

describe("firstSentence và lời nhận xét", () => {
  it("lấy câu đầu, bỏ ký hiệu Markdown", () => {
    expect(firstSentence("**Đậm** câu một. Câu hai.")).toBe("Đậm câu một.");
    expect(firstSentence(null)).toBe("");
  });
  it("lời nhận xét theo tỉ lệ đúng", () => {
    expect(scoreMessage(10, 10)).toMatch(/Xuất sắc/);
    expect(scoreMessage(2, 10)).toMatch(/ôn|đọc lại/i);
  });
});
