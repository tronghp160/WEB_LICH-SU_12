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

/** Câu trắc nghiệm riêng của bài học (ngoài câu hỏi của sự kiện trong database). Đáp án đúng: `choices[correct]`. */
export type LessonQuizQuestion = {
  question: string;
  /** Ảnh của bài học dùng làm câu hỏi (chú thích và mô tả chỉ hiện sau khi trả lời). */
  image?: LessonImage;
  choices: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation: string;
};

export type Lesson = {
  slug: string;
  /** Sự kiện trong database mà bài học này mở rộng (để trang chi tiết sự kiện gắn nút "Xem bài học tương tác"). */
  eventSlug: string;
  /** Các sự kiện khác bài học cũng bao trùm: trang của chúng cũng có nút vào bài học, trắc nghiệm bài học lấy thêm câu hỏi của chúng. */
  relatedEventSlugs?: string[];
  title: string;
  dateText: string;
  tagline: string;
  /** Chữ riêng của bài ở những mục dùng chung giữa các bài học. */
  copy: {
    /** Mô tả ngắn trên thẻ bài học (trang chủ, trang /bai-hoc). */
    cardDescription: string;
    /** Tiêu đề mục bản đồ diễn biến. */
    mapTitle: string;
    /** Câu dẫn thêm dưới tiêu đề bản đồ (sau câu hướng dẫn bấm Phát). */
    mapHint: string;
    videoTitle: string;
    resultsTitle: string;
    todayTitle: string;
  };
  hero: LessonImage;
  heroStats: LessonStat[];
  textbook: {
    series: string;
    lesson: string;
    objectives: string[];
  };
  keyDates: LessonKeyDate[];
  battle: BattleScenario;
  /** Slug của "phim trên bản đồ 3D" (lib/mapfilm) dựng từ cùng kịch bản bản đồ; có thì bài học hiện nút 2D/3D. */
  mapFilm?: string;
  videos: LessonVideo[];
  results: LessonStat[];
  significance: { title: string; text: string }[];
  quote?: { text: string; author: string };
  figures: LessonFigure[];
  flashcards: LessonFlashcard[];
  /** Trắc nghiệm cuối bài (/trac-nghiem/bai-hoc/[slug]); chỉ dùng chi tiết đã có trong bài học. */
  quiz?: LessonQuizQuestion[];
  /** Ảnh lớn ở phần Kết quả (ví dụ toàn cảnh chiến trường). */
  resultsImage?: LessonImage;
  /** Hiện vật và trang bị: ảnh chụp thật kèm lời giải thích. */
  artifacts?: { title: string; text: string; image: LessonImage }[];
  /** Phim 3D dựng trong trình duyệt (xem components/cinema3d). */
  cinema?: { href: string; title: string; description: string; posterSrc: string; posterAlt: string };
  /** Ảnh "ngày nay" tại di tích. */
  today: LessonImage[];
  /** Các con số/chi tiết cần đối chiếu với SGK bản in trước khi dùng chính thức. */
  toVerify: string[];
};
