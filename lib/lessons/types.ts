import type { BattleScenario } from "@/lib/battles/types";

export type LessonImage = {
  src: string;
  alt: string;
  caption: string;
  /** Tác giả và giấy phép, ví dụ "Adam Jones, CC BY-SA 2.0". */
  credit: string;
  /** Trang gốc của ảnh (Wikimedia Commons...) để người xem kiểm tra giấy phép. */
  sourceUrl: string;
};

export type LessonStat = {
  value: number;
  /** Chữ đứng sau con số, ví dụ "ngày đêm". */
  label: string;
  suffix?: string;
};

export type LessonVideo = {
  /** Id YouTube (11 ký tự). */
  youtubeId: string;
  title: string;
  channel: string;
  /** Video này gắn với phần nào của bài, để người học chọn xem. */
  note: string;
};

export type LessonKeyDate = {
  date: string;
  text: string;
};

export type LessonFigure = {
  name: string;
  role: string;
  text: string;
  /** Trang nhân vật trong hệ thống (nếu có). */
  href?: string;
  image?: LessonImage;
};

export type LessonFlashcard = {
  question: string;
  answer: string;
};

export type Lesson = {
  slug: string;
  /** Sự kiện trong database mà bài học này mở rộng (để trang chi tiết sự kiện gắn nút "Xem bài học tương tác"). */
  eventSlug: string;
  title: string;
  dateText: string;
  tagline: string;
  hero: LessonImage;
  heroStats: LessonStat[];
  textbook: {
    series: string;
    lesson: string;
    objectives: string[];
  };
  keyDates: LessonKeyDate[];
  battle: BattleScenario;
  videos: LessonVideo[];
  results: LessonStat[];
  significance: { title: string; text: string }[];
  quote?: { text: string; author: string };
  figures: LessonFigure[];
  flashcards: LessonFlashcard[];
  /** Ảnh "ngày nay" tại di tích. */
  today: LessonImage[];
  /** Các con số/chi tiết cần đối chiếu với SGK bản in trước khi dùng chính thức. */
  toVerify: string[];
};
