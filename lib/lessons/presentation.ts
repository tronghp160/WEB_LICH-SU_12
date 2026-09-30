// Chế độ "Trình chiếu" cho giáo viên (GĐ4.7): dựng danh sách slide từ dữ liệu bài học (lib/lessons), không soạn riêng.
// Hàm thuần — unit test được; giao diện ở components/presentation.

import type { Lesson, LessonFigure, LessonFlashcard, LessonImage, LessonKeyDate, LessonStat } from "@/lib/lessons/types";

export type Slide =
  | { kind: "title"; title: string; dateText: string; tagline: string; image: LessonImage }
  | { kind: "objectives"; title: string; items: string[]; textbook: string }
  | { kind: "key-dates"; title: string; dates: LessonKeyDate[] }
  /** Một bước diễn biến trên bản đồ (chỉ số trong scenario.steps). */
  | { kind: "map"; stepIndex: number; title: string; dateText?: string; caption: string; fact?: { title: string; text: string } }
  | { kind: "stats"; title: string; stats: LessonStat[] }
  | { kind: "significance"; title: string; items: { title: string; text: string }[] }
  | { kind: "quote"; text: string; author: string }
  | { kind: "figures"; title: string; figures: LessonFigure[] }
  | { kind: "photo"; title: string; image: LessonImage }
  /** Thẻ ghi nhớ: bấm "tiếp" lần đầu hiện đáp án, lần hai mới sang slide sau. */
  | { kind: "flashcard"; index: number; total: number; card: LessonFlashcard }
  | { kind: "end"; title: string; quizHref: string; lessonHref: string };

/** Tiêu đề ngắn của slide — dùng cho mục lục và thông báo cho trình đọc màn hình. */
export function slideLabel(slide: Slide): string {
  switch (slide.kind) {
    case "title":
      return slide.title;
    case "flashcard":
      return `Ghi nhớ ${slide.index}/${slide.total}`;
    case "quote":
      return "Trích dẫn";
    default:
      return slide.title;
  }
}

export function buildSlides(lesson: Lesson): Slide[] {
  const slides: Slide[] = [
    { kind: "title", title: lesson.title, dateText: lesson.dateText, tagline: lesson.tagline, image: lesson.hero },
    {
      kind: "objectives",
      title: "Mục tiêu bài học",
      items: lesson.textbook.objectives,
      textbook: `${lesson.textbook.series} · ${lesson.textbook.lesson}`,
    },
    { kind: "key-dates", title: "Những mốc cần nhớ", dates: lesson.keyDates },
    ...lesson.battle.steps.map(
      (step, stepIndex): Slide => ({
        kind: "map",
        stepIndex,
        title: step.title,
        dateText: step.dateText,
        caption: step.caption,
        fact: step.fact,
      }),
    ),
    { kind: "stats", title: "Kết quả", stats: lesson.results },
    { kind: "significance", title: "Ý nghĩa lịch sử", items: lesson.significance },
  ];

  if (lesson.quote) slides.push({ kind: "quote", text: lesson.quote.text, author: lesson.quote.author });
  if (lesson.figures.length > 0) slides.push({ kind: "figures", title: "Những con người làm nên lịch sử", figures: lesson.figures });
  for (const image of lesson.today) slides.push({ kind: "photo", title: "Di tích ngày nay", image });
  lesson.flashcards.forEach((card, index) =>
    slides.push({ kind: "flashcard", index: index + 1, total: lesson.flashcards.length, card }),
  );
  slides.push({
    kind: "end",
    title: "Kiểm tra nhanh",
    quizHref: `/trac-nghiem/bai-hoc/${lesson.slug}`,
    lessonHref: `/bai-hoc/${lesson.slug}`,
  });
  return slides;
}

/** Số "bước bấm" của một slide: thẻ ghi nhớ có 2 (câu hỏi → đáp án), còn lại 1. */
export function slideBuilds(slide: Slide): number {
  return slide.kind === "flashcard" ? 2 : 1;
}

export type DeckPosition = { slide: number; build: number };

/** Bấm "tiếp": hiện phần tiếp theo của slide nếu còn, không thì sang slide sau (đứng yên ở slide cuối). */
export function nextPosition(slides: readonly Slide[], position: DeckPosition): DeckPosition {
  if (position.build + 1 < slideBuilds(slides[position.slide])) return { slide: position.slide, build: position.build + 1 };
  return position.slide + 1 < slides.length ? { slide: position.slide + 1, build: 0 } : position;
}

/** Bấm "lùi": về slide trước, hiện đầy đủ (như PowerPoint). */
export function previousPosition(slides: readonly Slide[], position: DeckPosition): DeckPosition {
  if (position.build > 0) return { slide: position.slide, build: position.build - 1 };
  if (position.slide === 0) return position;
  const slide = position.slide - 1;
  return { slide, build: slideBuilds(slides[slide]) - 1 };
}

/** Đọc số slide từ hash URL (#5 = slide 5, đếm từ 1); sai hoặc ngoài khoảng → slide đầu. */
export function slideFromHash(hash: string, count: number): number {
  const match = /^#(\d+)$/.exec(hash);
  if (!match) return 0;
  const number = Number(match[1]);
  return number >= 1 && number <= count ? number - 1 : 0;
}
