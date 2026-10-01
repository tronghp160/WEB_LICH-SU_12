// Kiểu dữ liệu của trắc nghiệm (GĐ4.1) và trò chơi "Đoán năm" (GĐ4.2).
// Không import server-only để dùng được ở cả server (sinh câu hỏi) lẫn client (trình chơi) và unit test.

/** Ảnh kèm câu hỏi. Mô tả, chú thích và năm chụp chỉ hiện SAU khi trả lời (để không lộ đáp án). */
export type QuizImage = {
  url: string;
  /** Chữ thay thế đầy đủ — dùng sau khi trả lời. */
  alt: string;
  caption: string | null;
  /** Nhãn trung thực đầy đủ, ví dụ ["Ảnh tư liệu 1954", "Cảnh dựng lại"]. */
  labels: string[];
  /** Nhãn trung thực KHÔNG có năm (hiện trong lúc hỏi), ví dụ ["Ảnh tư liệu", "Cảnh dựng lại"]. */
  neutralLabels: string[];
  photographer: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourcePageUrl: string | null;
  focalPoint: string | null;
  width: number | null;
  height: number | null;
};

export type QuizKind =
  /** Soạn tay (bảng quiz_questions hoặc bài học). */
  | "authored"
  /** Ảnh tư liệu → sự kiện nào? */
  | "photo-event"
  /** Sự kiện → năm nào? */
  | "event-year"
  /** Chân dung → ai? */
  | "portrait"
  /** Ảnh di tích ngày nay → nơi nào? */
  | "place-photo";

export type QuizQuestion = {
  /** Ổn định giữa các lần tải (để lưu kết quả, làm key React). */
  id: string;
  kind: QuizKind;
  prompt: string;
  image?: QuizImage;
  /** Đúng 4 đáp án (trình chơi tự xáo thứ tự). */
  choices: string[];
  correctIndex: number;
  explanation: string;
  /** Trang để "ôn lại" khi trả lời sai. */
  review: { href: string; label: string };
  /** Sự kiện liên quan (lọc theo bài học). */
  eventSlugs: string[];
  /** Chủ đề liên quan (chủ đề chính + phụ của các sự kiện liên quan). */
  topicSlugs: string[];
};

/** Một vòng "Đoán năm": ảnh tư liệu của một sự kiện, đoán năm sự kiện diễn ra. */
export type YearRound = {
  id: string;
  image: QuizImage;
  year: number;
  eventTitle: string;
  dateText: string;
  review: { href: string; label: string };
};

// ---------- Dữ liệu nguồn (đã công bố) để sinh câu hỏi ----------

export type SourceImage = QuizImage & {
  id: string;
  era: string;
  isCover: boolean;
  sortOrder: number;
};

export type SourceEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  dateText: string;
  datePrecision: string;
  startYear: number;
  topicSlugs: string[];
  figureIds: string[];
  locationIds: string[];
  images: SourceImage[];
};

export type SourceFigure = {
  id: string;
  slug: string;
  name: string;
  biography: string | null;
  images: SourceImage[];
};

export type SourceLocation = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  images: SourceImage[];
};

export type SourceAuthored = {
  id: string;
  eventId: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  mediaId: string | null;
};

export type QuizSourceData = {
  events: SourceEvent[];
  figures: SourceFigure[];
  locations: SourceLocation[];
  authored: SourceAuthored[];
};
