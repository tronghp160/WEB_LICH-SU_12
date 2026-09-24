"use server";

import { revalidatePath } from "next/cache";
import { validateStaffChange, countActiveAdmins, type StaffChange } from "@/lib/admin/staff-rules";
import { dbErrorState, readFormValues, zodErrorState, type ActionState } from "@/lib/actions/state";
import { requireRole } from "@/lib/auth";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { staffRoleLabels } from "@/lib/utils/labels";
import { createStaffSchema, staffIdSchema, staffRoleSchema, staffStatusSchema } from "@/lib/validation/staff";

// Quản lý nhân sự (UC13) — CHỈ quản trị viên. requireRole() đứng ĐẦU mọi action, trước khi đụng tới khóa server.
// Đổi vai trò/khóa đi bằng phiên của admin nên RLS `admin_manage_staff` và trigger G3 ở database vẫn áp dụng.

const STAFF_PATH = "/quan-tri/nhan-su";

/** Dịch lỗi Auth Admin API khi tạo tài khoản. Không lộ thông tin nội bộ. */
function translateCreateUserError(error: { code?: string; status?: number; message?: string }): { message: string; field?: string } {
  if (error.code === "email_exists" || error.code === "user_already_exists" || /already (been )?registered/i.test(error.message ?? "")) {
    return { message: "Email này đã có tài khoản.", field: "email" };
  }
  if (error.code === "weak_password") {
    return { message: "Mật khẩu quá yếu. Hãy dùng mật khẩu dài hơn, gồm chữ và số.", field: "password" };
  }
  if (error.code === "email_address_invalid") {
    return { message: "Email không hợp lệ hoặc không được chấp nhận.", field: "email" };
  }
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return { message: "Đang tạo quá nhiều tài khoản trong thời gian ngắn. Vui lòng thử lại sau ít phút." };
  }
  return { message: "Không tạo được tài khoản do lỗi hệ thống. Vui lòng thử lại sau." };
}

/** Tạo tài khoản nhân sự: tạo người dùng Auth (đã xác nhận email) rồi chèn hồ sơ; hồ sơ lỗi thì gỡ người dùng vừa tạo. */
export async function createStaffAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["system_admin"]);

  const values = readFormValues(formData);
  // Không bao giờ trả lại mật khẩu cho form (kể cả khi có lỗi).
  const safeValues = Object.fromEntries(Object.entries(values).filter(([key]) => key !== "password"));

  const parsed = createStaffSchema.safeParse(values);
  if (!parsed.success) return zodErrorState(parsed.error, safeValues);

  if (!isAdminClientConfigured()) {
    return {
      status: "error",
      message: "Chưa cấu hình SUPABASE_SECRET_KEY trên máy chủ nên chưa thể tạo tài khoản. Hãy thêm khóa vào biến môi trường rồi thử lại.",
      values: safeValues,
    };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (createError || !created.user) {
    const { message, field } = translateCreateUserError(createError ?? {});
    return { status: "error", message, fieldErrors: field ? { [field]: message } : undefined, values: safeValues };
  }

  // Hồ sơ nhân sự: ghi bằng phiên của admin (RLS admin_manage_staff). Lỗi → hoàn tác việc tạo người dùng Auth.
  const supabase = await createClient();
  const { error: profileError } = await supabase.from("staff_profiles").insert({
    id: created.user.id,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
    account_status: "active",
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ...dbErrorState(profileError, safeValues), message: "Không tạo được hồ sơ nhân sự nên đã hủy việc tạo tài khoản. Vui lòng thử lại." };
  }

  revalidatePath(STAFF_PATH);
  return {
    status: "success",
    message: `Đã tạo tài khoản ${parsed.data.email} (${staffRoleLabels[parsed.data.role]}). Hãy sao chép mật khẩu tạm ở ô “Mật khẩu tạm” bên dưới (rời trang sẽ không xem lại được) rồi gửi cho người đó, và nhắc đổi sau khi đăng nhập.`,
    values: {},
  };
}

/** Đọc mục tiêu + số admin đang hoạt động, kiểm tra luật, rồi cập nhật. Dùng chung cho đổi vai trò và khóa/mở khóa. */
async function applyChange(formData: FormData, buildChange: (values: Record<string, string>) => StaffChange | null): Promise<ActionState> {
  const actor = await requireRole(["system_admin"]);
  const values = readFormValues(formData);

  const id = staffIdSchema.safeParse(values.id);
  if (!id.success) return { status: "error", message: id.error.issues[0].message, values };

  const change = buildChange(values);
  if (!change) return { status: "error", message: "Giá trị thay đổi không hợp lệ.", values };

  const supabase = await createClient();
  const { data: all, error } = await supabase.from("staff_profiles").select("id, role, account_status");
  if (error) return dbErrorState(error, values);

  const target = all.find((row) => row.id === id.data);
  if (!target) return { status: "error", message: "Không tìm thấy nhân sự này.", values };

  const problem = validateStaffChange({
    actorId: actor.id,
    target: { id: target.id, role: target.role, status: target.account_status },
    change,
    activeAdminCount: countActiveAdmins(all.map((row) => ({ role: row.role, status: row.account_status }))),
  });
  if (problem) return { status: "error", message: problem, values };

  const patch = change.type === "role" ? { role: change.role } : { account_status: change.status };
  const { data, error: updateError } = await supabase.from("staff_profiles").update(patch).eq("id", id.data).select("id");
  // Trigger G3 ở database từ chối việc làm mất admin cuối cùng (thông báo tiếng Việt đi qua dbErrorState).
  if (updateError) return dbErrorState(updateError, values);
  if (!data || data.length === 0) return { status: "error", message: "Không cập nhật được: bạn không có quyền hoặc nhân sự không tồn tại.", values };

  revalidatePath(STAFF_PATH);
  return {
    status: "success",
    message: change.type === "role" ? `Đã đổi vai trò thành “${staffRoleLabels[change.role]}”.` : change.status === "locked" ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.",
    values,
  };
}

export async function changeStaffRoleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return applyChange(formData, (values) => {
    const role = staffRoleSchema.safeParse(values.role);
    return role.success ? { type: "role", role: role.data } : null;
  });
}

/** Khóa hoặc mở khóa tài khoản. Tài khoản bị khóa mất toàn bộ quyền nội bộ ở lần thao tác kế tiếp (requireRole kiểm tra mỗi lần). */
export async function setStaffStatusAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  return applyChange(formData, (values) => {
    const status = staffStatusSchema.safeParse(values.status);
    return status.success ? { type: "status", status: status.data } : null;
  });
}
