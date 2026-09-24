"use server";

import { redirect } from "next/navigation";
import { ADMIN_HOME, ADMIN_LOGIN } from "@/lib/admin/routes";
import { loadStaffState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/lib/validation/auth";
import { BLOCKED_ACCOUNT_MESSAGE, translateAuthError } from "@/lib/utils/auth-errors";

export type SignInState = {
  /** Lỗi chung của cả form (sai thông tin, tài khoản khóa, mất mạng…). */
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  /** Giữ lại email đã nhập khi có lỗi (KHÔNG bao giờ trả lại mật khẩu). */
  email?: string;
};

/** Đăng nhập nhân sự (UC06): kiểm tra dữ liệu → đăng nhập → đối chiếu hồ sơ `staff_profiles`. */
export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return { email, fieldErrors: { email: flat.email?.[0], password: flat.password?.[0] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { email, error: translateAuthError(error) };
  }

  // Đăng nhập Auth thành công KHÔNG đồng nghĩa có quyền nội bộ: phải có hồ sơ và đang hoạt động.
  const state = await loadStaffState(supabase);
  if (state.status !== "active") {
    await supabase.auth.signOut();
    return { email, error: BLOCKED_ACCOUNT_MESSAGE };
  }

  redirect(ADMIN_HOME);
}

/** Đăng xuất rồi về trang đăng nhập. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN);
}
