// Đề luyện thi THPT (docs/ke-hoach-thanh-toan.md, mục 7.2) — kiểu dữ liệu và hàm thuần dùng chung cho route, trình
// làm đề và unit test. Câu hỏi chỉ có trong lượt làm bài (lib/exams/attempt.ts — GĐ2), đáp án chỉ có sau khi nộp.

export const examPaths = {
  hub: "/luyen-thi",
  /** Trang giới thiệu + danh sách đề cho người ĐÃ có gói (không bị chuyển sang tổng quan — GĐ8). */
  list: "/luyen-thi?gioi-thieu=1#cac-de",
  skills: "/luyen-thi/ky-nang",
  set: (slug: string) => `/luyen-thi/${slug}`,
  /** Bản in đề + phiếu trả lời; nhập đáp án đã làm trên giấy (GĐ8). */
  print: (slug: string) => `/luyen-thi/${slug}/in`,
  paperEntry: (slug: string, attemptId: string) => `/luyen-thi/${slug}/nhap-dap-an?luot=${attemptId}`,
  /** Kỹ năng làm bài, sổ tay ôn thi (GĐ8). */
  skillTrueFalse: "/luyen-thi/ky-nang/dung-sai",
  skillSources: "/luyen-thi/ky-nang/doc-tu-lieu",
  handbook: "/luyen-thi/so-tay",
  handbookLesson: (lessonSlug: string) => `/luyen-thi/so-tay/${lessonSlug}`,
  activate: "/kich-hoat",
  /** Trang kết quả một lượt (chỉ chủ lượt xem được — dữ liệu tải qua API kèm mã thiết bị). */
  result: (attemptId: string) => `/luyen-thi/ket-qua/${attemptId}`,
  /** Luyện tập theo bài (GĐ4); ôn câu đến hạn; làm lại câu chưa đạt của một lượt; sổ câu sai. */
  practice: "/luyen-thi/luyen-tap",
  practiceLesson: (lessonSlug: string) => `/luyen-thi/luyen-tap?bai=${lessonSlug}`,
  review: "/luyen-thi/luyen-tap?on-tap=1",
  retry: (attemptId: string) => `/luyen-thi/luyen-tap?tu-luot=${attemptId}`,
  notebook: "/luyen-thi/so-cau-sai",
  /** Đề tự sinh theo ma trận, tổng quan, lộ trình ôn (GĐ5). */
  generatedHub: "/luyen-thi/de-ngau-nhien",
  generated: (blueprint: string) => `/luyen-thi/de-ngau-nhien/${blueprint}`,
  overview: "/luyen-thi/tong-quan",
  plan: "/luyen-thi/lo-trinh",
};

/** Khóa của đề tự sinh trong lịch sử / lượt dở trên máy (thay cho slug đề có sẵn). */
export const generatedKey = (blueprint: string) => `de-ngau-nhien:${blueprint}`;

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
    case "pack_required":
      return { message: "Đề tự sinh thuộc Gói luyện thi. Em kích hoạt mã trên máy này hoặc đăng nhập tài khoản đã mua gói để làm.", needsActivation: true };
    case "not_enough_items":
      return { message: "Ngân hàng câu hỏi chưa đủ câu cho dạng đề này. Em chọn dạng đề khác hoặc quay lại sau nhé.", needsActivation: false };
    case "invalid_items":
      return { message: "Một số câu vừa được cập nhật nên đề chưa tạo được. Em bấm bắt đầu lại nhé.", needsActivation: false };
    case "not_found":
      return { message: "Không tìm thấy đề này hoặc đề chưa được công bố.", needsActivation: false };
    case "empty":
      return { message: "Đề này chưa có câu hỏi. Em thử đề khác nhé.", needsActivation: false };
    case "rate_limited":
      return { message: "Em đã bắt đầu làm bài quá nhiều lần trong ít phút. Đợi khoảng 10 phút rồi thử lại nhé.", needsActivation: false };
    case "no_device":
      return { message: "Trình duyệt đang chặn lưu dữ liệu nên không làm bài được. Em bật lại lưu trữ (cookie / dữ liệu trang) rồi tải lại trang nhé.", needsActivation: false };
    default:
      return { message: "Không tải được đề. Em kiểm tra mạng rồi thử lại nhé.", needsActivation: false };
  }
}
