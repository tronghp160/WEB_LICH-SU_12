// Lời giới thiệu gói luyện thi DỰNG TỪ SỐ ĐỀ ĐÃ CÔNG BỐ (docs/ke-hoach-tai-khoan.md, mục 3 — T1): trang /luyen-thi không
// được hứa nhiều hơn số đề thật sự có trong gói. Hàm thuần, unit test được.

/** Số đề gói hướng tới (mục tiêu biên soạn, không phải lời hứa đã có). */
export const EXAM_PACK_TARGET = 10;

type PackSet = { free: boolean; questionCount: number | null; durationMin: number };

export type ExamPackSummary = {
  /** Số đề trả phí đã công bố (đếm được câu hỏi). */
  paidCount: number;
  /** Dòng đầu của mục "Gói gồm những gì?" — mô tả đúng số đề / số câu / thời gian hiện có. */
  headline: string;
  /** Có đề trả phí nào để bán không. */
  sellable: boolean;
};

function range(values: number[], unit: string): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
}

export function summarizeExamPack(sets: PackSet[]): ExamPackSummary {
  const paid = sets.filter((set) => !set.free && (set.questionCount ?? 0) > 0);
  const paidCount = paid.length;
  if (paidCount === 0) {
    return { paidCount, headline: "Các đề trong gói đang được biên soạn và kiểm duyệt", sellable: false };
  }

  const questions = range(
    paid.map((set) => set.questionCount ?? 0),
    "câu",
  );
  const minutes = range(
    paid.map((set) => set.durationMin),
    "phút",
  );
  const each = paidCount === 1 ? "" : "mỗi đề ";
  const base = `${paidCount} đề luyện, ${each}${questions}, bấm giờ ${minutes}`;
  const headline =
    paidCount >= EXAM_PACK_TARGET
      ? base
      : `Đang mở ${base}. Gói cập nhật dần đến ${EXAM_PACK_TARGET} đề, đề mới thêm vào tự mở cho người đã mua`;
  return { paidCount, headline, sellable: true };
}
