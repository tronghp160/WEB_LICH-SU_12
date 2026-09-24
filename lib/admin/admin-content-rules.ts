// Luật thao tác nội dung của quản trị viên (UC14) — hàm thuần, unit test được.
// Quản trị viên toàn quyền (RLS `admin_all`), nhưng giao diện ưu tiên ẨN hơn XÓA CỨNG (Phase 12, mục 2).

import type { WorkflowStatus } from "@/lib/utils/labels";

export type AdminContentAction = "restore_draft" | "hide" | "delete";

export const adminContentActionLabels: Record<AdminContentAction, string> = {
  restore_draft: "Khôi phục về bản nháp",
  hide: "Ẩn khỏi trang công khai",
  delete: "Xóa vĩnh viễn",
};

/**
 * Thao tác khả dụng theo trạng thái hiện tại:
 *  - khôi phục về nháp: mọi trạng thái trừ chính bản nháp
 *  - ẩn: nội dung đang hiển thị hoặc đang trong quy trình (published / pending_review / needs_revision)
 *  - xóa vĩnh viễn: luôn có, nhưng có hộp thoại xác nhận và bị khóa ngoại chặn nếu còn được nơi khác dùng
 */
export function availableAdminContentActions(status: WorkflowStatus): AdminContentAction[] {
  const actions: AdminContentAction[] = [];
  if (status !== "draft") actions.push("restore_draft");
  if (status === "published" || status === "pending_review" || status === "needs_revision") actions.push("hide");
  actions.push("delete");
  return actions;
}

/** Trạng thái đích của mỗi thao tác đổi trạng thái. */
export const adminContentTargets: Record<"restore_draft" | "hide", WorkflowStatus> = {
  restore_draft: "draft",
  hide: "hidden",
};

/** Thông báo khi xóa cứng bị khóa ngoại chặn (mã 23503), theo loại nội dung. */
export const deleteBlockedMessages = {
  "chu-de": "Không xóa được: còn sự kiện thuộc chủ đề này. Hãy chuyển hoặc xóa các sự kiện đó trước — hoặc chỉ cần ẩn chủ đề.",
  "su-kien": "Không xóa được sự kiện này do đang được nơi khác sử dụng.",
  "nhan-vat": "Không xóa được: nhân vật đang được gắn với sự kiện. Hãy gỡ khỏi các sự kiện đó trước — hoặc chỉ cần ẩn nhân vật.",
  "dia-diem": "Không xóa được: địa điểm đang được gắn với sự kiện. Hãy gỡ khỏi các sự kiện đó trước — hoặc chỉ cần ẩn địa điểm.",
} as const;
