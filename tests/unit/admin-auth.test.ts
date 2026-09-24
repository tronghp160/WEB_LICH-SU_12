import { describe, expect, it } from "vitest";
import { isProtectedAdminPath } from "@/lib/admin/routes";
import { BLOCKED_ACCOUNT_MESSAGE, translateAuthError } from "@/lib/utils/auth-errors";

describe("isProtectedAdminPath", () => {
  it("khu vực nội bộ và mọi trang con cần đăng nhập", () => {
    for (const path of [
      "/quan-tri",
      "/quan-tri/",
      "/quan-tri/noi-dung",
      "/quan-tri/noi-dung/su-kien/abc/edit",
      "/quan-tri/khong-co-quyen",
      "/quan-tri/tai-khoan-bi-khoa",
    ]) {
      expect(isProtectedAdminPath(path), path).toBe(true);
    }
  });

  it("trang đăng nhập được miễn (kể cả dấu / cuối và chữ hoa)", () => {
    for (const path of ["/quan-tri/dang-nhap", "/quan-tri/dang-nhap/", "/QUAN-TRI/Dang-Nhap"]) {
      expect(isProtectedAdminPath(path), path).toBe(false);
    }
  });

  it("không lách được bằng dấu / thừa hoặc chữ hoa", () => {
    expect(isProtectedAdminPath("/QUAN-TRI")).toBe(true);
    expect(isProtectedAdminPath("/quan-tri//")).toBe(true);
  });

  it("trang công khai và đường dẫn gần giống không bị chặn", () => {
    for (const path of ["/", "/dong-thoi-gian", "/ban-do", "/su-kien/quan-tri", "/quan-tri-abc", "/quantri"]) {
      expect(isProtectedAdminPath(path), path).toBe(false);
    }
  });
});

describe("translateAuthError", () => {
  it("sai thông tin đăng nhập: một thông báo chung, không lộ email có tồn tại", () => {
    expect(translateAuthError({ code: "invalid_credentials", status: 400 })).toBe(
      "Email hoặc mật khẩu không đúng.",
    );
    expect(translateAuthError({ code: "user_not_found" })).toBe("Email hoặc mật khẩu không đúng.");
  });

  it("email chưa xác nhận", () => {
    expect(translateAuthError({ code: "email_not_confirmed" })).toContain("chưa được xác nhận");
  });

  it("tài khoản bị chặn", () => {
    expect(translateAuthError({ code: "user_banned" })).toBe(BLOCKED_ACCOUNT_MESSAGE);
  });

  it("quá nhiều lần thử", () => {
    expect(translateAuthError({ code: "over_request_rate_limit" })).toContain("quá nhiều lần");
    expect(translateAuthError({ status: 429 })).toContain("quá nhiều lần");
  });

  it("mất kết nối / lỗi máy chủ", () => {
    expect(translateAuthError({ name: "AuthRetryableFetchError", status: 0 })).toContain("kết nối");
    expect(translateAuthError({ status: 503 })).toContain("kết nối");
  });

  it("lỗi lạ: thông báo tiếng Việt chung, không lộ mã lỗi nội bộ", () => {
    const message = translateAuthError({ code: "weird_internal_code", status: 400 });
    expect(message).toBe("Không đăng nhập được. Vui lòng thử lại.");
    expect(message).not.toContain("weird");
  });
});
