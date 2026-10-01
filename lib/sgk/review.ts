// Đường dẫn, khóa lưu của bộ trắc nghiệm theo Bài SGK và "Ôn lại phần sai" dẫn về đúng bài, mục. Tách khỏi
// lib/sgk/quiz.ts để các component phía trình duyệt không kéo theo dữ liệu chuyên đề (lib/lessons) vào bundle.

import type { QuizQuestion } from "@/lib/quiz/types";
import { placementsForEvent, sgkPaths } from "@/lib/sgk/curriculum";

export const sgkQuizPaths = {
  lesson: (slug: string) => `/trac-nghiem/bai/${slug}`,
  flashcards: "/trac-nghiem/the-ghi-nho",
};

/** Khóa lưu kết quả (tiến độ học tập) của bộ trắc nghiệm một Bài SGK. */
export const sgkQuizSetId = (slug: string) => `bai:${slug}`;

export type SectionReview = { href: string; label: string };

/**
 * Trả lời sai thì ôn lại ở đâu trong SGK: "Bài 7 › mục 3" (ưu tiên bài đang ôn). Không gắn được với bài nào → undefined
 * (khi đó vẫn còn link "Đọc thêm" tới trang sự kiện/nhân vật).
 */
export function sectionReviewFor(question: Pick<QuizQuestion, "eventSlugs">, preferLessonSlug?: string): SectionReview | undefined {
  const placements = question.eventSlugs.flatMap((slug) => placementsForEvent(slug));
  const placement = placements.find((item) => item.lesson.slug === preferLessonSlug) ?? placements[0];
  if (!placement) return undefined;
  return {
    href: sgkPaths.section(placement.lesson.slug, placement.section.id),
    label: `Bài ${placement.lesson.number} › mục ${placement.section.numeral}. ${placement.section.title}`,
  };
}
