import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { loginMethods, type LoginMethods } from "@/lib/auth/identities";
import { profileDefaults } from "@/lib/auth/oauth";
import { completeSignUpPath, loginPath } from "@/lib/auth/routes";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

// Tài khoản học sinh phía server (docs/ke-hoach-tai-khoan.md, mục 5 và 6.6). Quyền thật vẫn do RLS quyết định; các hàm
// này chỉ lấy người dùng ĐÃ XÁC MINH (getUser gọi máy chủ Auth) và hồ sơ của chính họ.

export type LearnerProfile = Database["public"]["Tables"]["learner_profiles"]["Row"];

export type Learner = {
  id: string;
  email: string;
  /** Hồ sơ học sinh; null với tài khoản nhân sự chưa từng đăng ký làm học sinh. */
  profile: LearnerProfile | null;
  /** Có hồ sơ nhân sự đang hoạt động (để hiện lối vào khu quản trị). */
  isStaff: boolean;
  /** Tên gợi ý khi chưa có hồ sơ (người vào lần đầu bằng Google — trang /dang-ky/hoan-tat). */
  suggestedName: string;
  /** Mật khẩu / Google (trang Bảo mật). */
  methods: LoginMethods;
  /** Ảnh đại diện: hồ sơ trước, không có thì ảnh Google. */
  avatarUrl: string | null;
  createdAt: string;
};

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : null;
};

/**
 * Tạo hồ sơ học sinh "lười" (không dùng trigger trên auth.users) sau khi xác nhận email / đăng nhập. Chỉ tạo khi người
 * dùng ĐÃ đồng ý điều khoản lúc đăng ký (`user_metadata.terms_version`) — tài khoản nhân sự do quản trị viên tạo không
 * tự sinh hồ sơ học sinh. Ghi bằng phiên của chính người dùng (RLS own_insert). Gọi lặp lại vô hại.
 */
export async function ensureLearnerProfile(supabase: SupabaseClient<Database>, user: User): Promise<LearnerProfile | null> {
  const { data: existing, error } = await supabase.from("learner_profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw new Error(`Không đọc được hồ sơ học sinh: ${error.message}`);
  if (existing) return existing;

  const meta = user.user_metadata ?? {};
  const termsVersion = text(meta.terms_version, 20);
  if (!termsVersion) return null;

  const { displayName, avatarUrl } = profileDefaults(user);
  const { data: created, error: insertError } = await supabase
    .from("learner_profiles")
    .insert({ id: user.id, display_name: displayName, avatar_url: avatarUrl, terms_version: termsVersion })
    .select("*")
    .single();
  if (insertError) {
    // Hai yêu cầu cùng tạo (bấm link xác nhận hai lần) → dòng đã có.
    if (insertError.code === "23505") {
      const { data } = await supabase.from("learner_profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    }
    throw new Error(`Không tạo được hồ sơ học sinh: ${insertError.message}`);
  }
  return created;
}

/** Người dùng đang đăng nhập (đã xác minh) kèm hồ sơ; null khi chưa đăng nhập. `cache` để layout và trang dùng chung. */
export const getLearner = cache(async (): Promise<Learner | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;

  const [profile, staff] = await Promise.all([
    ensureLearnerProfile(supabase, user),
    supabase.from("staff_profiles").select("account_status").eq("id", user.id).maybeSingle(),
  ]);
  return {
    id: user.id,
    email: user.email ?? "",
    profile,
    isStaff: staff.data?.account_status === "active",
    suggestedName: profileDefaults(user).displayName,
    methods: loginMethods(user),
    avatarUrl: profile?.avatar_url ?? profileDefaults(user).avatarUrl,
    createdAt: user.created_at,
  };
});

/**
 * Bắt buộc đăng nhập; chưa đăng nhập thì về /dang-nhap?next=<trang hiện tại>. Đã đăng nhập (Google lần đầu) mà chưa
 * đồng ý điều khoản — chưa có hồ sơ, không phải nhân sự — thì về /dang-ky/hoan-tat trước.
 */
export async function requireLearner(next: string): Promise<Learner> {
  const learner = await getLearner();
  if (!learner) redirect(loginPath(next));
  if (!learner.profile && !learner.isStaff) redirect(completeSignUpPath(next));
  return learner;
}
