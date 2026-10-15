// Đề luyện thi THPT (docs/ke-hoach-thanh-toan.md, mục 7.2) — kiểu dữ liệu và hàm thuần dùng chung cho route, trình
// làm đề và unit test. Câu hỏi chỉ lấy được qua hàm SQL `get_exam_set` (kiểm mã kích hoạt + thiết bị).

export const examPaths = {
  hub: "/luyen-thi",
  set: (slug: string) => `/luyen-thi/${slug}`,
  activate: "/kich-hoat",
  api: (slug: string) => `/api/luyen-thi/${slug}`,
};

/** Khóa lưu kết quả trong tiến độ học tập (Hộ chiếu lịch sử). */
export const examSetId = (slug: string) => `luyen-thi:${slug}`;

/** Header gửi mã kích hoạt + mã thiết bị khi lấy câu hỏi (không đưa vào URL để khỏi lọt vào lịch sử/nhật ký). */
export const LICENSE_HEADER = "x-license-code";
export const DEVICE_HEADER = "x-device-id";

export type ExamSetInfo = {
  slug: string;
  title: string;
  description: string | null;
  durationMin: number;
  free: boolean;
};

export type ExamQuestion = {
  position: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  lessonSlug: string | null;
  eventSlug: string | null;
  eventTitle: string | null;
};

export type ExamPayload = { set: ExamSetInfo; questions: ExamQuestion[] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const optionalText = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);

/** Đọc kết quả jsonb của `get_exam_set` (đã `ok: true`) thành kiểu an toàn; dữ liệu sai dạng → null. */
export function parseExamPayload(value: unknown): ExamPayload | null {
  if (!isRecord(value) || !isRecord(value.set) || !Array.isArray(value.questions)) return null;
  const set = value.set;
  if (typeof set.slug !== "string" || typeof set.title !== "string" || typeof set.duration_min !== "number") return null;

  const questions: ExamQuestion[] = [];
  for (const item of value.questions) {
    if (!isRecord(item)) return null;
    const { position, question, choices, correct_index: correctIndex, explanation } = item;
    if (typeof position !== "number" || typeof question !== "string" || typeof explanation !== "string") return null;
    if (!Array.isArray(choices) || choices.length !== 4 || !choices.every((choice) => typeof choice === "string")) return null;
    if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;
    questions.push({
      position,
      question,
      choices: choices as string[],
      correctIndex,
      explanation,
      lessonSlug: optionalText(item.lesson_slug),
      eventSlug: optionalText(item.event_slug),
      eventTitle: optionalText(item.event_title),
    });
  }
  questions.sort((a, b) => a.position - b.position);
  return {
    set: { slug: set.slug, title: set.title, description: optionalText(set.description), durationMin: set.duration_min, free: set.free === true },
    questions,
  };
}

export type ExamScore = { correct: number; total: number; unanswered: number; score10: number };

/**
 * Chấm đề chỉ có trắc nghiệm (đề mẫu): quy về thang 10 theo tỉ lệ câu đúng, làm tròn 2 chữ số. Đề đầy đủ có Đúng/Sai chấm
 * theo lib/exams/format.ts (TRUE_FALSE_POINTS) — từ GĐ2 chấm phía server.
 */
export function scoreExam(questions: readonly ExamQuestion[], answers: readonly (number | null)[]): ExamScore {
  let correct = 0;
  let unanswered = 0;
  questions.forEach((question, index) => {
    const answer = answers[index];
    if (answer === null || answer === undefined) unanswered++;
    else if (answer === question.correctIndex) correct++;
  });
  const total = questions.length;
  const score10 = total === 0 ? 0 : Math.round((correct * 1000) / total) / 100;
  return { correct, total, unanswered, score10 };
}

/** 7.25 → "7,25"; 8 → "8" (dấu phẩy thập phân kiểu Việt Nam). */
export function formatScore10(score: number): string {
  return String(Math.round(score * 100) / 100).replace(".", ",");
}

/** Đồng hồ đếm ngược: 125 giây → "02:05"; quá 1 giờ → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(rest).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Lý do không lấy được đề → thông báo + hành động gợi ý cho người học. */
export function examAccessMessage(reason: string | undefined): { message: string; needsActivation: boolean } {
  switch (reason) {
    case "invalid_code":
    case "not_activated":
      return { message: "Đề này thuộc Gói luyện thi. Em cần kích hoạt mã trên máy này để làm đề.", needsActivation: true };
    case "revoked":
      return { message: "Mã kích hoạt trên máy này đã bị thu hồi. Liên hệ quản trị viên nếu em nghĩ đây là nhầm lẫn.", needsActivation: true };
    case "expired":
      return { message: "Mã kích hoạt đã hết hạn sử dụng.", needsActivation: true };
    case "not_found":
      return { message: "Không tìm thấy đề này hoặc đề chưa được công bố.", needsActivation: false };
    default:
      return { message: "Không tải được đề. Em kiểm tra mạng rồi thử lại nhé.", needsActivation: false };
  }
}
