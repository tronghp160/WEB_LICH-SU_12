import { bachDang938 } from "@/lib/battles/bach-dang-938";
import { dienBienPhuLesson } from "@/lib/lessons/dien-bien-phu";
import type { Lesson } from "@/lib/lessons/types";

/** Danh mục bài học tương tác (viết cứng trong code ở giai đoạn demo; xem kế hoạch GĐ3 để đưa vào database). */
export const lessons: Lesson[] = [dienBienPhuLesson];

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

/** Bài học gắn với một sự kiện trong database (dùng cho nút "Xem bài học tương tác" ở trang chi tiết). */
export function getLessonForEvent(eventSlug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.eventSlug === eventSlug);
}

/** Thẻ giới thiệu ở trang chủ: bài học đầy đủ + các trận tái hiện riêng lẻ. */
export type InteractiveEntry = { href: string; title: string; dateText: string; description: string; image?: string };

export const interactiveEntries: InteractiveEntry[] = [
  ...lessons.map((lesson) => ({
    href: `/bai-hoc/${lesson.slug}`,
    title: lesson.title,
    dateText: lesson.dateText,
    description: "Bản đồ diễn biến 7 bước, phim 3D đồi A1, ảnh tư liệu, video và thẻ ghi nhớ.",
    image: lesson.hero.src,
  })),
  {
    href: `/tai-hien/${bachDang938.slug}`,
    title: bachDang938.title,
    dateText: bachDang938.dateText,
    description: "Thủy triều và bãi cọc ngầm đánh tan thủy quân Nam Hán, từng bước trên bản đồ.",
  },
];
