// Luật quản lý nhân sự (UC13) — hàm thuần dùng chung cho giao diện và Server Action, unit test được.
// Trigger `prevent_last_admin_lockout` ở database (migration G3) là chốt chặn cuối cho "admin cuối cùng";
// các kiểm tra ở đây cho thông báo thân thiện sớm và chặn thêm việc admin tự khóa/tự hạ quyền chính mình.

import type { AccountStatus, StaffRole } from "@/lib/utils/labels";

export type StaffChange =
  | { type: "role"; role: StaffRole }
  | { type: "status"; status: AccountStatus };

export type StaffTarget = {
  id: string;
  role: StaffRole;
  status: AccountStatus;
};

/**
 * Kiểm tra một thay đổi vai trò/trạng thái của nhân sự. Trả về thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ.
 * `activeAdminCount` = số quản trị viên đang HOẠT ĐỘNG hiện tại (tính cả `target` nếu target là admin hoạt động).
 */
export function validateStaffChange(input: {
  actorId: string;
  target: StaffTarget;
  change: StaffChange;
  activeAdminCount: number;
}): string | null {
  const { actorId, target, change, activeAdminCount } = input;

  if (change.type === "role" && change.role === target.role) return "Vai trò không thay đổi.";
  if (change.type === "status" && change.status === target.status) return "Trạng thái không thay đổi.";

  const losesAdminAccess =
    (change.type === "role" && change.role !== "system_admin") || (change.type === "status" && change.status === "locked");

  // Không cho quản trị viên tự khóa hoặc tự hạ quyền chính mình (tránh tự cắt quyền ngoài ý muốn).
  if (target.id === actorId && losesAdminAccess) {
    return change.type === "status"
      ? "Bạn không thể tự khóa tài khoản của chính mình."
      : "Bạn không thể tự hạ quyền của chính mình. Hãy nhờ quản trị viên khác thực hiện.";
  }

  // Không để hệ thống không còn quản trị viên hoạt động nào.
  const targetIsActiveAdmin = target.role === "system_admin" && target.status === "active";
  if (targetIsActiveAdmin && losesAdminAccess && activeAdminCount <= 1) {
    return "Không thể thực hiện: đây là quản trị viên đang hoạt động cuối cùng của hệ thống.";
  }

  return null;
}

/** Đếm quản trị viên đang hoạt động trong danh sách nhân sự. */
export function countActiveAdmins(staff: readonly { role: StaffRole; status: AccountStatus }[]): number {
  return staff.filter((member) => member.role === "system_admin" && member.status === "active").length;
}
