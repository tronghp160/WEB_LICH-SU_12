import { describe, expect, it } from "vitest";
import { ACCOUNT_HOME, isProtectedLearnerPath, loginPath, safeNext, signUpPath } from "@/lib/auth/routes";
import { translateLearnerAuthError } from "@/lib/utils/auth-errors";
import { emailOnlySchema, learnerPasswordSchema, newPasswordSchema, signUpSchema } from "@/lib/validation/account";

// Tài khoản học sinh — giai đoạn B2 (docs/ke-hoach-tai-khoan.md, mục 12).

describe("safeNext — chống chuyển hướng mở", () => {
  it("giữ đường dẫn nội bộ, kể cả query và #", () => {
    expect(safeNext("/luyen-thi")).toBe("/luyen-thi");
    expect(safeNext("/luyen-thi/de-2?lam=1#cau-3")).toBe("/luyen-thi/de-2?lam=1#cau-3");
    expect(safeNext("  /ho-chieu  ")).toBe("/ho-chieu");
  });

  it.each([
    ["//evil.com", "đường dẫn bắt đầu bằng //"],
    ["/\\evil.com", "/\\"],
    ["\\\\evil.com", "\\\\"],
    ["/%2F%2Fevil.com", "// đã mã hóa"],
    ["/%5Cevil.com", "\\ đã mã hóa"],
    ["https://evil.com", "URL tuyệt đối"],
    ["http:/evil.com", "URL thiếu /"],
    ["javascript:alert(1)", "javascript:"],
    ["evil.com", "không bắt đầu bằng /"],
    ["", "chuỗi rỗng"],
    ["/tai-khoan\r\nSet-Cookie: x=1", "xuống dòng"],
    ["/a\tb", "tab"],
    ["/%E0%A4%A", "mã % hỏng"],
    ["/" + "a".repeat(300), "quá dài"],
    ["/auth/confirm?token_hash=x", "route xác thực"],
    ["/AUTH/callback", "route xác thực (chữ hoa)"],
  ])("từ chối %j (%s) → trang mặc định", (value) => {
    expect(safeNext(value)).toBe(ACCOUNT_HOME);
  });

  it("không phải chuỗi → trang mặc định; fallback tùy chọn", () => {
    expect(safeNext(undefined)).toBe(ACCOUNT_HOME);
    expect(safeNext(["/a", "/b"])).toBe(ACCOUNT_HOME);
    expect(safeNext(null, "/")).toBe("/");
  });

  it("URL tuyệt đối CÙNG gốc với trang (mẫu email gửi {{ .RedirectTo }}) → đổi về đường dẫn", () => {
    const site = "https://lichsu12.vn";
    expect(safeNext("https://lichsu12.vn/luyen-thi?x=1", ACCOUNT_HOME, site)).toBe("/luyen-thi?x=1");
    expect(safeNext("https://lichsu12.vn", ACCOUNT_HOME, site)).toBe("/");
    expect(safeNext("https://lichsu12.vn.evil.com/luyen-thi", ACCOUNT_HOME, site)).toBe(ACCOUNT_HOME);
    expect(safeNext("http://lichsu12.vn/luyen-thi", ACCOUNT_HOME, site)).toBe(ACCOUNT_HOME);
    expect(safeNext("https://evil.com/luyen-thi", ACCOUNT_HOME, site)).toBe(ACCOUNT_HOME);
    // Không truyền gốc trang thì không bao giờ nhận URL tuyệt đối.
    expect(safeNext("https://lichsu12.vn/luyen-thi")).toBe(ACCOUNT_HOME);
  });
});

describe("isProtectedLearnerPath", () => {
  it("/tai-khoan và trang con cần đăng nhập", () => {
    expect(isProtectedLearnerPath("/tai-khoan")).toBe(true);
    expect(isProtectedLearnerPath("/tai-khoan/")).toBe(true);
    expect(isProtectedLearnerPath("/Tai-Khoan/don-hang")).toBe(true);
  });
  it("trang khác không bị chặn (so theo ranh giới đoạn)", () => {
    expect(isProtectedLearnerPath("/tai-khoan-abc")).toBe(false);
    expect(isProtectedLearnerPath("/dang-nhap")).toBe(false);
    expect(isProtectedLearnerPath("/")).toBe(false);
  });
});

describe("loginPath / signUpPath", () => {
  it("chỉ thêm ?next= khi khác trang mặc định, và mã hóa đúng", () => {
    expect(loginPath()).toBe("/dang-nhap");
    expect(loginPath(ACCOUNT_HOME)).toBe("/dang-nhap");
    expect(loginPath("/luyen-thi/de-2?lam=1")).toBe("/dang-nhap?next=%2Fluyen-thi%2Fde-2%3Flam%3D1");
    expect(loginPath("//evil.com")).toBe("/dang-nhap");
    expect(signUpPath("/luyen-thi")).toBe("/dang-ky?next=%2Fluyen-thi");
  });
});

describe("kiểm tra form tài khoản", () => {
  const valid = { displayName: "  Lan   Anh ", email: " Lan@Gmail.COM ", password: "lichsu2026", agree: "on" };

  it("đăng ký hợp lệ: gọn tên, email chữ thường", () => {
    const parsed = signUpSchema.parse(valid);
    expect(parsed).toEqual({ displayName: "Lan Anh", email: "lan@gmail.com", password: "lichsu2026", agree: true });
  });

  it("ô đồng ý phải được tích", () => {
    const result = signUpSchema.safeParse({ ...valid, agree: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.agree?.[0]).toMatch(/đồng ý/);
  });

  it("tên hiển thị: không rỗng, tối đa 60 ký tự", () => {
    expect(signUpSchema.safeParse({ ...valid, displayName: "   " }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, displayName: "a".repeat(61) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, displayName: "a".repeat(60) }).success).toBe(true);
  });

  it.each([
    ["ngắn", "abc123", false],
    ["không có số", "lichsuvietnam", false],
    ["không có chữ", "12345678", false],
    ["đủ 8, chữ + số", "lichsu12", true],
    ["chữ có dấu tính là chữ", "điệnbiên1954", true],
    ["73 ký tự", "a1".repeat(36) + "b", false],
    ["≤ 72 ký tự nhưng > 72 byte (chữ có dấu)", "ệ".repeat(30) + "1", false],
  ])("mật khẩu %s", (_label, password, ok) => {
    expect(learnerPasswordSchema.safeParse(password).success).toBe(ok);
  });

  it("đặt mật khẩu mới: hai ô phải khớp", () => {
    const result = newPasswordSchema.safeParse({ password: "lichsu2026", confirm: "lichsu2027" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.confirm?.[0]).toBe("Hai mật khẩu không khớp.");
    expect(newPasswordSchema.safeParse({ password: "lichsu2026", confirm: "lichsu2026" }).success).toBe(true);
  });

  it("email: bắt buộc, đúng dạng", () => {
    expect(emailOnlySchema.safeParse({ email: "" }).success).toBe(false);
    expect(emailOnlySchema.safeParse({ email: "khong-phai-email" }).success).toBe(false);
    expect(emailOnlySchema.parse({ email: "A@B.VN" }).email).toBe("a@b.vn");
  });
});

describe("translateLearnerAuthError", () => {
  it("không phân biệt sai email với sai mật khẩu", () => {
    expect(translateLearnerAuthError({ code: "invalid_credentials" })).toBe(translateLearnerAuthError({ code: "user_not_found" }));
  });
  it.each([
    ["email_not_confirmed", /chưa xác nhận email/],
    ["weak_password", /quá yếu/],
    ["same_password", /khác mật khẩu cũ/],
    ["otp_expired", /hết hạn/],
    ["over_email_send_rate_limit", /một phút/],
    ["provider_disabled", /tạm tắt/],
    ["identity_already_exists", /đã gắn/],
    ["email_address_not_authorized", /chưa gửi được email/],
  ])("%s → thông báo tiếng Việt", (code, pattern) => {
    expect(translateLearnerAuthError({ code })).toMatch(pattern);
  });
  it("mất mạng / quá nhiều lần / lỗi lạ", () => {
    expect(translateLearnerAuthError({ name: "AuthRetryableFetchError", status: 0 })).toMatch(/kết nối/);
    expect(translateLearnerAuthError({ status: 429 })).toMatch(/quá nhanh/);
    expect(translateLearnerAuthError({ code: "gi_do_moi" })).toMatch(/thử lại/);
  });
  it("không nhắc quản trị viên (khác thông báo của nhân sự)", () => {
    for (const code of ["email_not_confirmed", "user_banned", "invalid_credentials"]) {
      expect(translateLearnerAuthError({ code })).not.toMatch(/quản trị viên/);
    }
  });
});
