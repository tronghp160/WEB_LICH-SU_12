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

/** Số liệu thật để dựng phần "Gói gồm những gì?" (docs/ke-hoach-luyen-thi.md, mục 5 — GĐ8). */
export type PackFacts = {
  /** Đề đúng cấu trúc thi thật (24 + 4) đã công bố, có câu. */
  fullSets: number;
  /** Câu đã công bố trong ngân hàng (lớp 12). */
  bankMcq: number;
  bankTrueFalse: number;
  /** Có ít nhất một dạng đề tự sinh đủ câu cho 3 đề không trùng. */
  generated: boolean;
  /** Số bài có sổ tay (bài có sự kiện đã công bố). */
  handbookLessons: number;
};

/**
 * Lợi ích của gói, CHỈ những gì đang có thật — mỗi dòng phụ thuộc số liệu thì chỉ hiện khi số liệu > 0. Dòng đầu (số đề)
 * vẫn là `summarizeExamPack().headline`.
 */
export function packBenefits(facts: PackFacts): string[] {
  const lines: string[] = [];
  if (facts.fullSets > 0) lines.push(`${facts.fullSets} đề đầy đủ đúng cấu trúc thi tốt nghiệp từ 2025 (24 câu trắc nghiệm + 4 câu Đúng/Sai, 50 phút)`);
  const bank = facts.bankMcq + facts.bankTrueFalse;
  if (bank > 0) lines.push(`Ngân hàng ${bank} câu hỏi đã kiểm duyệt${facts.bankTrueFalse > 0 ? `, trong đó ${facts.bankTrueFalse} câu Đúng/Sai` : ""}`);
  if (facts.generated) lines.push("Đề tự sinh theo ma trận: mỗi lần một đề mới, ưu tiên câu em chưa làm");
  lines.push(
    "Giải thích từng câu, kèm liên kết về bài SGK; phân tích điểm theo bài, mức độ, dạng câu",
    "Luyện tập theo bài không giới hạn (chưa có gói: 10 câu / ngày)",
    "Sổ câu sai + ôn ngắt quãng, tổng quan (điểm dự kiến, bản đồ thành thạo 17 bài) và lộ trình ôn theo mục tiêu điểm (cần đăng nhập)",
  );
  if (facts.handbookLessons > 0) lines.push(`Sổ tay ôn thi ${facts.handbookLessons} bài, in được`);
  lines.push("In đề + phiếu trả lời để làm trên giấy, nhập đáp án để chấm", "Con dấu “Luyện thi” trong Hộ chiếu khi đạt từ 7 điểm");
  return lines;
}
