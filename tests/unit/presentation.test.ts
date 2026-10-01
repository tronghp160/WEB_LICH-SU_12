import { describe, expect, it } from "vitest";
import { dienBienPhuLesson } from "@/lib/lessons/dien-bien-phu";
import { buildSlides, nextPosition, previousPosition, slideFromHash, slideLabel } from "@/lib/lessons/presentation";

const slides = buildSlides(dienBienPhuLesson);

describe("buildSlides", () => {
  it("mở đầu bằng slide tiêu đề, kết thúc bằng slide trắc nghiệm", () => {
    expect(slides[0].kind).toBe("title");
    const last = slides[slides.length - 1];
    expect(last.kind).toBe("end");
    if (last.kind === "end") expect(last.quizHref).toBe("/trac-nghiem/bai-hoc/chien-dich-dien-bien-phu");
  });

  it("mỗi bước diễn biến là một slide bản đồ, đúng thứ tự, liên tiếp nhau", () => {
    const mapSlides = slides.flatMap((slide, index) => (slide.kind === "map" ? [{ index, step: slide.stepIndex }] : []));
    expect(mapSlides.map((item) => item.step)).toEqual(dienBienPhuLesson.battle.steps.map((_, index) => index));
    // Liên tiếp → bản đồ không bị dựng lại giữa các bước (chuyển động mượt).
    expect(mapSlides.every((item, position) => position === 0 || item.index === mapSlides[position - 1].index + 1)).toBe(true);
  });

  it("có đủ ảnh di tích ngày nay và thẻ ghi nhớ của bài học", () => {
    expect(slides.filter((slide) => slide.kind === "photo")).toHaveLength(dienBienPhuLesson.today.length);
    expect(slides.filter((slide) => slide.kind === "flashcard")).toHaveLength(dienBienPhuLesson.flashcards.length);
  });

  it("slide nào cũng có nhãn", () => {
    expect(slides.every((slide) => slideLabel(slide).length > 0)).toBe(true);
  });
});

describe("điều hướng", () => {
  const firstCard = slides.findIndex((slide) => slide.kind === "flashcard");

  it("thẻ ghi nhớ: tiếp lần 1 hiện đáp án, lần 2 sang slide sau", () => {
    expect(nextPosition(slides, { slide: firstCard, build: 0 })).toEqual({ slide: firstCard, build: 1 });
    expect(nextPosition(slides, { slide: firstCard, build: 1 })).toEqual({ slide: firstCard + 1, build: 0 });
  });

  it("lùi về thẻ ghi nhớ thì thấy luôn đáp án; lùi tiếp thì ẩn đáp án", () => {
    expect(previousPosition(slides, { slide: firstCard + 1, build: 0 })).toEqual({ slide: firstCard, build: 1 });
    expect(previousPosition(slides, { slide: firstCard, build: 1 })).toEqual({ slide: firstCard, build: 0 });
  });

  it("đứng yên ở hai đầu", () => {
    expect(previousPosition(slides, { slide: 0, build: 0 })).toEqual({ slide: 0, build: 0 });
    const end = { slide: slides.length - 1, build: 0 };
    expect(nextPosition(slides, end)).toEqual(end);
  });

  it("đọc số slide từ hash URL", () => {
    expect(slideFromHash("#3", slides.length)).toBe(2);
    expect(slideFromHash("#0", slides.length)).toBe(0);
    expect(slideFromHash(`#${slides.length + 1}`, slides.length)).toBe(0);
    expect(slideFromHash("#abc", slides.length)).toBe(0);
    expect(slideFromHash("", slides.length)).toBe(0);
  });
});
