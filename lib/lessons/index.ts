import { bachDang938 } from "@/lib/battles/bach-dang-938";
import { cachMangThangTamLesson } from "@/lib/lessons/cach-mang-thang-tam";
import { chienDichHoChiMinhLesson } from "@/lib/lessons/chien-dich-ho-chi-minh";
import { dienBienPhuLesson } from "@/lib/lessons/dien-bien-phu";
import { tetMauThanLesson } from "@/lib/lessons/tet-mau-than";
import type { Lesson } from "@/lib/lessons/types";

/** Danh mục bài học tương tác, theo thứ tự thời gian (viết cứng trong code; xem kế hoạch GĐ5.1 để đưa vào database). */
export const lessons: Lesson[] = [cachMangThangTamLesson, dienBienPhuLesson, tetMauThanLesson, chienDichHoChiMinhLesson];

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}

/** Bài học gắn với một sự kiện trong database (dùng cho nút "Xem bài học tương tác" ở trang chi tiết). */
export function getLessonForEvent(eventSlug: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.eventSlug === eventSlug || lesson.relatedEventSlugs?.includes(eventSlug));
}

/** Thẻ giới thiệu ở trang chủ và trang /bai-hoc: bài học đầy đủ + các trận tái hiện riêng lẻ. */
export type InteractiveEntry = {
  href: string;
  title: string;
  dateText: string;
  description: string;
  image?: string;
  /** Nhãn phụ, ví dụ nội dung mở rộng ngoài chương trình lớp 12. */
  badge?: string;
};

export const interactiveEntries: InteractiveEntry[] = [
  ...lessons.map((lesson) => ({
    href: `/bai-hoc/${lesson.slug}`,
    title: lesson.title,
    dateText: lesson.dateText,
    description: lesson.copy.cardDescription,
    image: lesson.hero.src,
  })),
  {
    href: `/tai-hien/${bachDang938.slug}`,
    title: bachDang938.title,
    dateText: bachDang938.dateText,
    description: "Thủy triều và bãi cọc ngầm đánh tan thủy quân Nam Hán, từng bước trên bản đồ.",
    // Thuộc chương trình lớp 11 (chiến tranh bảo vệ Tổ quốc trước 1945), giữ làm phần đọc thêm.
    badge: "Mở rộng · kiến thức lớp 11",
  },
];

/** Trải nghiệm 3D tách riêng (cũng mở được từ trong bài học). */
export const immersiveEntries: InteractiveEntry[] = [
  {
    href: "/ban-do-3d/dien-bien-phu",
    title: "Điện Biên Phủ trên bản đồ 3D",
    dateText: "13/3 – 7/5/1954",
    description: "Chiến dịch diễn ra trên địa hình thật, dừng lại ở từng giai đoạn để em quan sát.",
  },
  {
    href: "/phim-3d/doi-a1",
    title: "Phim 3D: Đồi A1, đêm 6/5/1954",
    dateText: "Đêm 6/5/1954",
    description: "Đoạn phim dựng bằng đồ họa 3D (minh họa), có thuyết minh tiếng Việt và phụ đề.",
  },
];
