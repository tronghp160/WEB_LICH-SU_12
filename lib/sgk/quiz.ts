// Ôn tập theo Bài SGK (KE_HOACH_NANG_CAP_GIAO_DIEN.md, mục 6.6): bộ trắc nghiệm của mỗi bài gồm câu hỏi về các sự kiện
// thuộc bài + câu riêng của chuyên đề tương tác trong bài. Hàm thuần — dùng ở server, client và unit test.

import { getLesson } from "@/lib/lessons";
import type { QuizQuestion } from "@/lib/quiz/types";
import { questionsForLesson } from "@/lib/quiz/sets";
import { lessonEventSlugs, lessonFeatureSlugs, type SgkLesson } from "@/lib/sgk/curriculum";

/** Câu hỏi của một Bài SGK: câu về sự kiện của bài + câu của chuyên đề tương tác trong bài (không trùng). */
export function questionsForSgkLesson(pool: readonly QuizQuestion[], lesson: SgkLesson): QuizQuestion[] {
  const events = new Set(lessonEventSlugs(lesson));
  const byId = new Map<string, QuizQuestion>();
  for (const featureSlug of lessonFeatureSlugs(lesson)) {
    const feature = getLesson(featureSlug);
    if (feature) for (const question of questionsForLesson(pool, feature)) byId.set(question.id, question);
  }
  for (const question of pool) {
    if (question.eventSlugs.some((slug) => events.has(slug))) byId.set(question.id, question);
  }
  return [...byId.values()];
}
