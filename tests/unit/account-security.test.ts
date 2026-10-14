import { describe, expect, it } from "vitest";
import { loginMethods } from "@/lib/auth/identities";
import { oauthErrorReason } from "@/lib/auth/oauth";
import { translateLearnerAuthError } from "@/lib/utils/auth-errors";
import { changePasswordSchema, deleteAccountSchema, profileSchema } from "@/lib/validation/account";

// Trang tài khoản + Bảo mật — giai đoạn B4 (docs/ke-hoach-tai-khoan.md, mục 4.4, 10, 12).

const identity = (provider: string) => ({ provider, identity_id: `${provider}-id` });

describe("loginMethods — cách đăng nhập từ identities", () => {
  it("đăng ký bằng email: chỉ mật khẩu", () => {
    expect(loginMethods({ identities: [identity("email")] })).toEqual({ password: true, google: false, canUnlinkGoogle: false });
  });

  it("chỉ Google: chưa có mật khẩu, không gỡ được Google", () => {
    expect(loginMethods({ identities: [identity("google")] })).toEqual({ password: false, google: true, canUnlinkGoogle: false });
  });

  it("Google đã tự đặt mật khẩu (cờ password_set): có mật khẩu nhưng vẫn không gỡ được Google (Supabase không thêm danh tính email)", () => {
    expect(loginMethods({ identities: [identity("google")], user_metadata: { password_set: true } })).toEqual({
      password: true,
      google: true,
      canUnlinkGoogle: false,
    });
  });

  it("email + Google: gỡ được Google", () => {
    expect(loginMethods({ identities: [identity("email"), identity("google")] })).toEqual({
      password: true,
      google: true,
      canUnlinkGoogle: true,
    });
  });

  it("cờ password_set phải đúng kiểu boolean true; identities rỗng / null", () => {
    expect(loginMethods({ identities: null, user_metadata: { password_set: "true" } }).password).toBe(false);
    expect(loginMethods({}).google).toBe(false);
  });
});

describe("profileSchema", () => {
  it("chuẩn hóa khoảng trắng; trường trống → null", () => {
    expect(profileSchema.parse({ displayName: "  Lan   Anh ", school: "   " })).toEqual({ displayName: "Lan Anh", school: null });
    expect(profileSchema.parse({ displayName: "An" })).toEqual({ displayName: "An", school: null });
    expect(profileSchema.parse({ displayName: "An", school: " THPT  Chu Văn An " })).toEqual({ displayName: "An", school: "THPT Chu Văn An" });
  });

  it("từ chối tên trống, tên > 60, trường > 120 ký tự", () => {
    expect(profileSchema.safeParse({ displayName: "   " }).success).toBe(false);
    expect(profileSchema.safeParse({ displayName: "a".repeat(61) }).success).toBe(false);
    const long = profileSchema.safeParse({ displayName: "An", school: "t".repeat(121) });
    expect(long.success).toBe(false);
    expect(long.error?.flatten().fieldErrors.school?.[0]).toContain("120");
  });
});

describe("changePasswordSchema", () => {
  it("mật khẩu hiện tại không bắt buộc ở lớp schema (tài khoản Google đặt lần đầu)", () => {
    expect(changePasswordSchema.safeParse({ password: "lichsu2026A", confirm: "lichsu2026A" }).success).toBe(true);
  });

  it("áp quy tắc mật khẩu mới + khớp ô nhập lại", () => {
    const weak = changePasswordSchema.safeParse({ current: "cu", password: "abcdefgh", confirm: "abcdefgh" });
    expect(weak.error?.flatten().fieldErrors.password?.[0]).toContain("chữ và số");
    const mismatch = changePasswordSchema.safeParse({ current: "cu", password: "lichsu2026A", confirm: "lichsu2026B" });
    expect(mismatch.error?.flatten().fieldErrors.confirm?.[0]).toBe("Hai mật khẩu không khớp.");
  });
});

describe("deleteAccountSchema", () => {
  it("bắt gõ email, bỏ khoảng trắng hai đầu", () => {
    expect(deleteAccountSchema.safeParse({ confirmEmail: "  " }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
    expect(deleteAccountSchema.parse({ confirmEmail: " An@Gmail.com " })).toEqual({ confirmEmail: "An@Gmail.com" });
  });
});

describe("lỗi liên kết Google", () => {
  it("Gmail đã gắn tài khoản khác → google-da-gan", () => {
    expect(oauthErrorReason("server_error", "identity_already_exists")).toBe("google-da-gan");
  });

  it.each([
    ["manual_linking_disabled", "chưa bật liên kết"],
    ["single_identity_not_deletable", "cách đăng nhập duy nhất"],
    ["reauthentication_needed", "đăng nhập lại"],
  ])("%s → thông báo tiếng Việt", (code, text) => {
    expect(translateLearnerAuthError({ code })).toContain(text);
  });
});
