import "server-only";

import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, StaffRole } from "@/lib/utils/labels";

export type StaffMember = {
  id: string;
  fullName: string | null;
  role: StaffRole;
  status: AccountStatus;
  createdAt: string | null;
  /** null nếu chưa cấu hình khóa server để đọc email từ Auth. */
  email: string | null;
};

export type StaffDirectory = {
  members: StaffMember[];
  /** Có lấy được email từ Auth không (cần SUPABASE_SECRET_KEY). */
  emailsAvailable: boolean;
  /** Lý do không lấy được email (nếu có), để hiện cảnh báo. */
  emailWarning: string | null;
};

/**
 * Danh sách nhân sự (UC13). Hồ sơ đọc bằng PHIÊN của quản trị viên (RLS `admin_manage_staff`); email nằm ở bảng
 * Auth nên lấy thêm qua Admin API nếu có khóa server. Trang gọi phải đã qua requireRole(["system_admin"]).
 */
export async function listStaff(): Promise<StaffDirectory> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("id, full_name, role, account_status, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Không tải được danh sách nhân sự: ${error.message}`);

  let emails = new Map<string, string>();
  let emailsAvailable = false;
  let emailWarning: string | null = null;

  if (!isAdminClientConfigured()) {
    emailWarning = "Chưa cấu hình SUPABASE_SECRET_KEY nên chưa hiển thị được email và chưa tạo được tài khoản mới.";
  } else {
    try {
      const { data: users, error: listError } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
      if (listError) throw listError;
      emails = new Map(users.users.map((user) => [user.id, user.email ?? ""]));
      emailsAvailable = true;
    } catch {
      emailWarning = "Không lấy được email từ hệ thống đăng nhập. Danh sách vẫn hiển thị theo hồ sơ nhân sự.";
    }
  }

  return {
    members: data.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      role: row.role,
      status: row.account_status,
      createdAt: row.created_at,
      email: emails.get(row.id) ?? null,
    })),
    emailsAvailable,
    emailWarning,
  };
}
