import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_BLOCKED, ADMIN_FORBIDDEN, ADMIN_LOGIN } from "@/lib/admin/routes";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/utils/labels";

export type Staff = {
  id: string;
  email: string;
  fullName: string | null;
  role: StaffRole;
};

/**
 * Trạng thái đăng nhập nội bộ của người đang gọi:
 *  - anonymous  : chưa đăng nhập (hoặc phiên hết hạn/không hợp lệ)
 *  - no-profile : có tài khoản Auth nhưng chưa có hồ sơ `staff_profiles` → không có quyền nào
 *  - locked     : hồ sơ bị khóa (`account_status = 'locked'`) → mất toàn bộ quyền nội bộ
 *  - active     : nhân sự đang hoạt động, kèm vai trò
 */
export type StaffState =
  | { status: "anonymous" }
  | { status: "no-profile"; email: string }
  | { status: "locked"; email: string; fullName: string | null }
  | { status: "active"; staff: Staff };

/**
 * Xác định trạng thái nhân sự từ một Supabase client (đã gắn phiên từ cookie).
 *
 * Dùng `auth.getUser()` — gọi máy chủ Auth để XÁC MINH token — chứ KHÔNG dùng
 * `getSession()` (chỉ đọc cookie, không đáng tin phía server). Hồ sơ đọc bằng
 * chính phiên của người dùng nên RLS `staff_read_own` chỉ cho thấy dòng của họ.
 */
export async function loadStaffState(supabase: SupabaseClient<Database>): Promise<StaffState> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "anonymous" };

  const user = data.user;
  const email = user.email ?? "";

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("full_name, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  // Lỗi truy vấn KHÔNG được coi là "chưa có hồ sơ" (sẽ nhầm sự cố thành thiếu quyền).
  if (profileError) {
    throw new Error(`Không đọc được hồ sơ nhân sự: ${profileError.message}`);
  }
  if (!profile) return { status: "no-profile", email };
  if (profile.account_status !== "active") {
    return { status: "locked", email, fullName: profile.full_name };
  }

  return {
    status: "active",
    staff: { id: user.id, email, fullName: profile.full_name, role: profile.role },
  };
}

/** Trạng thái nhân sự của request hiện tại; `cache` để layout và trang dùng chung một lần tra cứu. */
export const getStaffState = cache(async (): Promise<StaffState> => {
  return loadStaffState(await createClient());
});

/** Nhân sự đang hoạt động, hoặc null nếu chưa đăng nhập / bị khóa / chưa có hồ sơ. */
export async function getCurrentStaff(): Promise<Staff | null> {
  const state = await getStaffState();
  return state.status === "active" ? state.staff : null;
}

/**
 * Bắt buộc đã đăng nhập VÀ có một trong các vai trò `roles`; không thì chuyển hướng:
 *  - chưa đăng nhập            → trang đăng nhập
 *  - bị khóa / thiếu hồ sơ     → trang "Tài khoản đã bị khóa"
 *  - sai vai trò               → trang "Không có quyền"
 *
 * Gọi ở MỖI trang/Server Action nội bộ (không chỉ ở layout: layout không chặn được
 * trang con khi điều hướng phía client). Đây là lớp phụ trợ cho UI — quyền thật vẫn
 * do RLS ở database quyết định.
 */
export async function requireRole(roles: readonly StaffRole[]): Promise<Staff> {
  const state = await getStaffState();

  switch (state.status) {
    case "anonymous":
      redirect(ADMIN_LOGIN);
    case "no-profile":
    case "locked":
      redirect(ADMIN_BLOCKED);
    case "active":
      if (!roles.includes(state.staff.role)) redirect(ADMIN_FORBIDDEN);
      return state.staff;
  }
}
