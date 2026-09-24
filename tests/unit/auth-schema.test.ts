import { describe, expect, it } from "vitest";
import { signInSchema } from "@/lib/validation/auth";

function errorsOf(input: { email?: unknown; password?: unknown }) {
  const result = signInSchema.safeParse(input);
  return result.success ? null : result.error.flatten().fieldErrors;
}

describe("signInSchema", () => {
  it("nhận email hợp lệ, cắt khoảng trắng và đưa về chữ thường", () => {
    const result = signInSchema.safeParse({ email: "  Editor@Test.Local ", password: "x" });
    expect(result.success && result.data).toEqual({ email: "editor@test.local", password: "x" });
  });

  it("email rỗng hoặc chỉ khoảng trắng: yêu cầu nhập email", () => {
    expect(errorsOf({ email: "", password: "x" })?.email).toEqual(["Vui lòng nhập email."]);
    expect(errorsOf({ email: "   ", password: "x" })?.email).toEqual(["Vui lòng nhập email."]);
  });

  it("email sai định dạng: báo email không hợp lệ", () => {
    for (const email of ["khong-phai-email", "a@", "@b.com", "a b@c.com"]) {
      expect(errorsOf({ email, password: "x" })?.email, email).toEqual(["Email không hợp lệ."]);
    }
  });

  it("thiếu trường (null/undefined): vẫn ra thông báo tiếng Việt, không ném lỗi", () => {
    expect(errorsOf({ email: null, password: null })).toEqual({
      email: ["Vui lòng nhập email."],
      password: ["Vui lòng nhập mật khẩu."],
    });
  });

  it("mật khẩu rỗng bị từ chối, không giới hạn độ dài tối thiểu khi đăng nhập", () => {
    expect(errorsOf({ email: "a@b.com", password: "" })?.password).toEqual(["Vui lòng nhập mật khẩu."]);
    expect(errorsOf({ email: "a@b.com", password: "1" })).toBeNull();
  });

  it("chặn đầu vào quá dài", () => {
    expect(errorsOf({ email: `${"a".repeat(250)}@b.com`, password: "x" })?.email).toBeDefined();
    expect(errorsOf({ email: "a@b.com", password: "x".repeat(201) })?.password).toEqual(["Mật khẩu quá dài."]);
  });
});
