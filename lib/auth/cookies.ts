import "server-only";

import { cookies } from "next/headers";
import { emailOnlySchema } from "@/lib/validation/account";

// Cookie phụ của luồng tài khoản học sinh (httpOnly, sống ngắn). Không chứa bí mật: chỉ để nối các bước của một luồng.

/** Email vừa đăng ký — để trang "kiểm tra email" hiện địa chỉ và gửi lại, không phải đặt email lên URL. */
export const SIGNUP_EMAIL_COOKIE = "ls12_dang_ky";
/** Đánh dấu phiên đến từ link đặt lại mật khẩu (giá trị = user id) — chỉ phiên này mới vào được /dat-lai-mat-khau. */
export const RECOVERY_COOKIE = "ls12_khoi_phuc";

export const shortCookie = (maxAgeSeconds: number) =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  }) as const;

/** Email đã đăng ký trong phiên duyệt này (trang "kiểm tra email"); null nếu không có / không hợp lệ. */
export async function readSignUpEmail(): Promise<string | null> {
  const value = (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
  const parsed = emailOnlySchema.safeParse({ email: value });
  return parsed.success ? parsed.data.email : null;
}

/** Phiên hiện tại có đến từ link đặt lại mật khẩu của chính user này không. */
export async function hasRecoveryMark(userId: string): Promise<boolean> {
  return (await cookies()).get(RECOVERY_COOKIE)?.value === userId;
}
