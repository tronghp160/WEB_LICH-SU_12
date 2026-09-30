// Các bộ trắc nghiệm: tổng hợp, theo chủ đề, theo bài học (GĐ4.1). Hàm thuần — dùng được ở server và unit test.

import type { Lesson } from "@/lib/lessons/types";
import type { QuizQuestion } from "@/lib/quiz/types";

/** Mỗi lượt chơi tối đa 10 câu (kế hoạch GĐ4.1). */
export const ROUND_SIZE = 10;
/** Bộ có ít hơn số câu này thì chưa mở (quá ít để thành một bài trắc nghiệm). */
export const MIN_QUESTIONS = 4;

export const quizPaths = {
  hub: "/trac-nghiem",
  all: "/trac-nghiem/tong-hop",
  topic: (slug: string) => `/trac-nghiem/chu-de/${slug}`,
  lesson: (slug: string) => `/trac-nghiem/bai-hoc/${slug}`,
  yearGame: "/trac-nghiem/doan-nam",
};

/** Khóa lưu kết quả trong trình duyệt (tiến độ học tập, GĐ4.4). */
export const quizSetIds = {
  all: "tong-hop",
  topic: (slug: string) => `chu-de:${slug}`,
  lesson: (slug: string) => `bai-hoc:${slug}`,
  yearGame: "doan-nam",
};

export function questionsForTopic(pool: readonly QuizQuestion[], topicSlug: string): QuizQuestion[] {
  return pool.filter((question) => question.topicSlugs.includes(topicSlug));
}

/** Câu riêng của bài học (viết trong lib/lessons) + câu hỏi của sự kiện mà bài học mở rộng. */
export function questionsForLesson(pool: readonly QuizQuestion[], lesson: Lesson): QuizQuestion[] {
  const lessonHref = `/bai-hoc/${lesson.slug}`;
  const own: QuizQuestion[] = (lesson.quiz ?? []).map((item, index) => ({
    id: `bai-hoc:${lesson.slug}:${index + 1}`,
    kind: "authored",
    prompt: item.question,
    image: item.image
      ? {
          url: item.image.src,
          alt: item.image.alt,
          caption: item.image.caption,
          labels: [],
          neutralLabels: [],
          // Ảnh bài học chỉ có một dòng ghi công gộp "tác giả, giấy phép".
          photographer: item.image.credit,
          license: null,
          licenseUrl: null,
          sourcePageUrl: item.image.sourceUrl,
          focalPoint: null,
          width: null,
          height: null,
        }
      : undefined,
    choices: [...item.choices],
    correctIndex: item.correct,
    explanation: item.explanation,
    review: { href: lessonHref, label: `Bài học: ${lesson.title}` },
    eventSlugs: [lesson.eventSlug],
    topicSlugs: [],
  }));
  return [...own, ...pool.filter((question) => question.eventSlugs.includes(lesson.eventSlug))];
}
