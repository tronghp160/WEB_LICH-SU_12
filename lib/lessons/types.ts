import type { BattleScenario } from "@/lib/battles/types";

export type LessonImage = {
  src: string;
  alt: string;
  caption: string;
  /** Tác giả và giấy phép, ví dụ "Adam Jones, CC BY-SA 2.0". */
  credit: string;
  /** Trang gốc của ảnh (Wikimedia Commons...) để người xem kiểm tra giấy phép. */
  sourceUrl: string;
  /** Tên ngắn (thẻ chọn trong thư viện ảnh 3D); không có thì lấy vế đầu của chú thích. */
  title?: string;
  /** Kích thước thật của file ảnh (px) — cần cho khung "ảnh 3D" giữ đúng tỉ lệ. */
  width?: number;
  height?: number;
  /** Bản đồ độ sâu (ảnh xám, trắng = gần) để xem ảnh thật dạng 3D (components/photo3d). */
  depthSrc?: string;
  /** Điểm chú thích bấm được trên ảnh; x, y tính theo % khung ảnh. */
  hotspots?: PhotoHotspot[];
};

/**
 * Mô hình quét 3D của hiện vật/di tích thật, xoay được 360°, đăng công khai trên Sketchfab. Nhúng bằng trình xem chính
 * thức của Sketchfab (tác giả cho phép nhúng; không tải file về), ghi công tác giả kèm link.
 */
export type LessonScan3D = {
  /** Mã mô hình Sketchfab (32 ký tự hex). */
  sketchfabId: string;
  /** Tên mô hình như tác giả đặt. */
  title: string;
  author: string;
  authorUrl: string;
  /** Ảnh xem trước (hiện trước khi bấm, không tải trình xem). */
  poster: string;
  /** Xuất xứ và lưu ý ngắn cho người xem. */
  note: string;
  /** Dung lượng tải khi xem (MB, đo thực tế gồm cả trình xem) — báo trước cho người dùng mạng di động. */
  sizeMb: number;
};

/** Một hiện vật/di tích trong thư viện 3D: có ảnh chụp thật (xem dạng có chiều sâu) và/hoặc mô hình quét 360°. */
export type LessonExhibit = {
  title: string;
  text?: string;
  image?: LessonImage;
  scan?: LessonScan3D;
};

export type PhotoHotspot = {
  label: string;
  text: string;
  x: number;
  y: number;
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
  /** Mô hình 3D xoay 360° ở phần Kết quả (ví dụ sa bàn lòng chảo). */
  resultsScan?: LessonScan3D;
  /** Hiện vật và trang bị: ảnh chụp thật và/hoặc mô hình quét 360°, kèm lời giải thích. */
  artifacts?: LessonExhibit[];
  /** Mô hình quét 360° của di tích, hiện trước các ảnh "di tích ngày nay". */
  todayScans?: LessonExhibit[];
  /** Phim 3D dựng trong trình duyệt (xem components/cinema3d). */
  cinema?: { href: string; title: string; description: string; posterSrc: string; posterAlt: string };
  /** Ảnh "ngày nay" tại di tích. */
  today: LessonImage[];
  /** Các con số/chi tiết cần đối chiếu với SGK bản in trước khi dùng chính thức. */
  toVerify: string[];
};
