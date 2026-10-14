"use client";

import { useSyncExternalStore } from "react";

// Phiên đăng nhập để HIỂN THỊ nút tài khoản trên Header (docs/ke-hoach-tai-khoan.md, mục 4.2 ý 6). Header nằm trong layout
// công khai — nếu đọc cookie ở server thì mọi trang (kể cả /bai-hoc/* SSG) thành động, nên phiên đọc ở trình duyệt.
// Chỉ để hiển thị: mọi quyết định quyền đều kiểm lại ở server (getUser) và RLS.
//
// Tiết kiệm: khách chưa đăng nhập (không có cookie `sb-…-auth-token`) KHÔNG tải thư viện Supabase; có cookie mới tải
// (import động, tách chunk) để đọc phiên + tên hiển thị.

export type SessionView =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "signed-in"; userId: string; email: string; name: string; avatarUrl: string | null; isStaff: boolean };

/** Hồ sơ vừa đổi (form Hồ sơ) → đọc lại tên hiển thị. */
export const SESSION_REFRESH_EVENT = "ls12:phien-doi";

const LOADING: SessionView = { status: "loading" };
const ANONYMOUS: SessionView = { status: "anonymous" };

let current: SessionView = LOADING;
const listeners = new Set<() => void>();
let started = false;
let generation = 0;

function set(view: SessionView) {
  current = view;
  listeners.forEach((listener) => listener());
}

/** Cookie phiên của @supabase/ssr: `sb-<ref>-auth-token` (có thể chia mảnh `.0`, `.1`). */
function hasAuthCookie(): boolean {
  try {
    return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(document.cookie);
  } catch {
    return false;
  }
}

const cleanText = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim().slice(0, 60) : null);

/** Đọc lại phiên. `force`: đọc lại cả hồ sơ dù vẫn là người dùng cũ (vừa đổi tên). */
export async function refreshSession(force = false): Promise<void> {
  const run = ++generation;
  if (!hasAuthCookie()) {
    set(ANONYMOUS);
    return;
  }
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (run !== generation) return;
    if (!user) {
      set(ANONYMOUS);
      return;
    }
    if (!force && current.status === "signed-in" && current.userId === user.id) return;

    const meta = user.user_metadata ?? {};
    const fallbackName =
      cleanText(meta.display_name) ?? cleanText(meta.full_name) ?? cleanText((user.email ?? "").split("@")[0]) ?? "Tài khoản";
    // Báo "đã đăng nhập" NGAY khi đọc được phiên (không qua mạng) — ProgressSync cần user id sớm, kẻo đăng xuất ngay sau
    // khi mở trang thì không kịp đẩy tiến độ. Tên / ảnh / quyền nhân sự đọc từ hồ sơ rồi cập nhật sau.
    if (current.status !== "signed-in" || current.userId !== user.id) {
      set({ status: "signed-in", userId: user.id, email: user.email ?? "", name: fallbackName, avatarUrl: null, isStaff: false });
    }

    const [profile, staff] = await Promise.all([
      supabase.from("learner_profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("staff_profiles").select("full_name, account_status").eq("id", user.id).maybeSingle(),
    ]);
    if (run !== generation) return;
    set({
      status: "signed-in",
      userId: user.id,
      email: user.email ?? "",
      name: cleanText(profile.data?.display_name) ?? cleanText(staff.data?.full_name) ?? fallbackName,
      avatarUrl: profile.data?.avatar_url ?? null,
      isStaff: staff.data?.account_status === "active",
    });
  } catch {
    // Mất mạng / chặn script: coi như chưa biết → hiện nút "Đăng nhập" (bấm vào, server tự đưa về trang đúng).
    if (run === generation) set(ANONYMOUS);
  }
}

/** Đăng xuất phía client vừa gửi → đổi ngay sang "chưa đăng nhập" (server action sẽ chuyển trang sau). */
export function markSignedOut() {
  generation++;
  set(ANONYMOUS);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!started) {
    started = true;
    void refreshSession();
    window.addEventListener(SESSION_REFRESH_EVENT, () => void refreshSession(true));
    // Đăng nhập / đăng xuất ở tab khác: quay lại tab này thì đọc lại.
    window.addEventListener("focus", () => void refreshSession());
  }
  return () => {
    listeners.delete(onChange);
  };
}

export function useSession(): SessionView {
  return useSyncExternalStore(subscribe, () => current, () => LOADING);
}
