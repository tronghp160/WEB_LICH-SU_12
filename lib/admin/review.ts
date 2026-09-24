// Luật kiểm duyệt (UC10–UC12) — hàm thuần dùng chung cho giao diện và Server Action, unit test được.
// Phản chiếu policy `reviewer_update_status` ở database (chỉ đổi TRẠNG THÁI; trạng thái mới chỉ là
// needs_revision / published / hidden). Đây chỉ là lớp ẩn/hiện nút và kiểm tra sớm — quyền thật do RLS quyết định.

import { z } from "zod";
import type { StaffRole, WorkflowStatus } from "@/lib/utils/labels";

export type ReviewAction = "request_revision" | "publish" | "hide" | "republish";

export const REVIEW_ACTIONS = ["request_revision", "publish", "hide", "republish"] as const;

/**
 * Mỗi hành động chỉ hợp lệ từ MỘT trạng thái xuất phát. Server Action cập nhật kèm điều kiện
 * `workflow_status = from` để phát hiện xử lý đồng thời (0 dòng bị ảnh hưởng = đã có người xử lý trước).
 */
export const REVIEW_TRANSITIONS: Record<ReviewAction, { from: WorkflowStatus; to: WorkflowStatus }> = {
  // UC11: chỉ trả sửa nội dung ĐANG CHỜ DUYỆT (bản đã công bố chỉ có thể ẩn).
  request_revision: { from: "pending_review", to: "needs_revision" },
  // UC12
  publish: { from: "pending_review", to: "published" },
  hide: { from: "published", to: "hidden" },
  republish: { from: "hidden", to: "published" },
};

export const reviewActionLabels: Record<ReviewAction, string> = {
  request_revision: "Yêu cầu chỉnh sửa",
  publish: "Công bố",
  hide: "Ẩn",
  republish: "Công bố lại",
};

export function parseReviewAction(value: string): ReviewAction | null {
  return REVIEW_ACTIONS.find((action) => action === value) ?? null;
}

/** Vai trò được thực hiện kiểm duyệt: kiểm duyệt viên và quản trị viên. */
export function canReview(role: StaffRole): boolean {
  return role === "reviewer" || role === "system_admin";
}

/** Các hành động có thể làm với một nội dung ở trạng thái này (rỗng nếu vai trò không được kiểm duyệt). */
export function availableReviewActions(role: StaffRole, status: WorkflowStatus): ReviewAction[] {
  if (!canReview(role)) return [];
  return REVIEW_ACTIONS.filter((action) => REVIEW_TRANSITIONS[action].from === status);
}

/** Lý do trả sửa: bắt buộc (UC11), đủ dài để người biên tập hiểu cần sửa gì. */
export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 2000;

export const revisionReasonSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string({ error: "Vui lòng nhập lý do yêu cầu chỉnh sửa." })
    .min(1, "Vui lòng nhập lý do yêu cầu chỉnh sửa.")
    .min(REASON_MIN_LENGTH, `Lý do quá ngắn (tối thiểu ${REASON_MIN_LENGTH} ký tự) — hãy nêu rõ cần sửa gì.`)
    .max(REASON_MAX_LENGTH, `Lý do quá dài (tối đa ${REASON_MAX_LENGTH} ký tự).`),
);

/**
 * Giá trị `review_note` ghi kèm mỗi hành động (đã chốt với người dùng):
 *  - trả sửa: lưu lý do
 *  - công bố / công bố lại: XÓA lý do cũ (đã xử lý xong, tránh hiện lý do lỗi thời)
 *  - ẩn: giữ nguyên (không đụng tới cột này)
 */
export function reviewNoteFor(action: ReviewAction, reason: string | null): { review_note: string | null } | Record<string, never> {
  if (action === "request_revision") return { review_note: reason };
  if (action === "publish" || action === "republish") return { review_note: null };
  return {};
}

/** Mục đối chiếu gợi ý cho người duyệt theo loại nội dung (chỉ tham khảo, không chặn công bố). */
export const REVIEW_CHECKLISTS: Record<"chu-de" | "su-kien" | "nhan-vat" | "dia-diem", string[]> = {
  "su-kien": [
    "Mốc thời gian (năm, ngày, độ chính xác) khớp với nguồn",
    "Địa điểm chính và các địa điểm phụ đúng",
    "Quan hệ của từng nhân vật với sự kiện đúng",
    "Nguồn tham khảo đủ và đáng tin cậy",
  ],
  "nhan-vat": [
    "Năm sinh, năm mất khớp với nguồn",
    "Tiểu sử đúng, không có chi tiết chưa kiểm chứng",
    "Ảnh chân dung có giấy phép rõ ràng",
  ],
  "dia-diem": [
    "Tọa độ đúng vị trí trên bản đồ",
    "Độ chính xác của tọa độ được ghi trung thực",
    "Tên hiện tại và tên lịch sử đúng",
  ],
  "chu-de": ["Tên chủ đề khớp với chương trình", "Mô tả đúng phạm vi chủ đề"],
};

/** Thông báo khi cập nhật trả về 0 dòng: nội dung đã đổi trạng thái do người khác xử lý trước. */
export function staleMessage(currentStatusLabel: string | null): string {
  return currentStatusLabel
    ? `Nội dung đã được xử lý bởi người khác (hiện ở trạng thái “${currentStatusLabel}”). Vui lòng tải lại trang.`
    : "Nội dung không còn tồn tại hoặc đã được xử lý bởi người khác. Vui lòng tải lại trang.";
}
