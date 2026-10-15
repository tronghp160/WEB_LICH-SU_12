// Cấu hình phần luyện thi (docs/ke-hoach-luyen-thi.md, mục 4.6 và 9 — quyết định 6).
// Ngày thi tốt nghiệp đọc từ NEXT_PUBLIC_EXAM_DATE (YYYY-MM-DD, giờ Việt Nam). Để trống cho tới khi Bộ GD&ĐT công bố lịch
// thi chính thức — khi đó KHÔNG hiện đếm ngược (không tự đoán ngày).

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2027-06-11" → "2027-06-11"; rỗng / sai dạng / ngày không tồn tại → null. */
export function parseExamDate(value: string | undefined): string | null {
  const match = value?.trim().match(DATE_PATTERN);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return match[0];
}

/** Ngày thi (YYYY-MM-DD) hoặc null khi chưa cấu hình. NEXT_PUBLIC_ để dùng được cả ở client (đếm ngược). */
export const EXAM_DATE: string | null = parseExamDate(process.env.NEXT_PUBLIC_EXAM_DATE);

const dayInVietnam = (instant: Date) => instant.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

/**
 * Số ngày còn lại tới ngày thi theo lịch Việt Nam: hôm nay là ngày thi → 0; đã qua → số âm; chưa có ngày → null.
 */
export function daysUntilExam(examDate: string | null, now: Date = new Date()): number | null {
  if (!examDate) return null;
  const today = Date.parse(`${dayInVietnam(now)}T00:00:00Z`);
  return Math.round((Date.parse(`${examDate}T00:00:00Z`) - today) / 86_400_000);
}
