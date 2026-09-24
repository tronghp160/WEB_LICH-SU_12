import { describe, expect, it } from "vitest";
import { countActiveAdmins, validateStaffChange } from "@/lib/admin/staff-rules";
import { createStaffSchema, staffRoleSchema, staffStatusSchema } from "@/lib/validation/staff";

const admin = { id: "a", role: "system_admin" as const, status: "active" as const };
const otherAdmin = { id: "b", role: "system_admin" as const, status: "active" as const };
const editor = { id: "c", role: "editor" as const, status: "active" as const };

describe("validateStaffChange", () => {
  it("đổi vai trò/khóa nhân sự bình thường → hợp lệ", () => {
    expect(validateStaffChange({ actorId: "a", target: editor, change: { type: "role", role: "reviewer" }, activeAdminCount: 1 })).toBeNull();
    expect(validateStaffChange({ actorId: "a", target: editor, change: { type: "status", status: "locked" }, activeAdminCount: 1 })).toBeNull();
    expect(
      validateStaffChange({ actorId: "a", target: { ...editor, status: "locked" }, change: { type: "status", status: "active" }, activeAdminCount: 1 }),
    ).toBeNull();
  });

  it("không thay đổi gì → báo rõ", () => {
    expect(validateStaffChange({ actorId: "a", target: editor, change: { type: "role", role: "editor" }, activeAdminCount: 1 })).toContain("không thay đổi");
    expect(validateStaffChange({ actorId: "a", target: editor, change: { type: "status", status: "active" }, activeAdminCount: 1 })).toContain("không thay đổi");
  });

  it("admin không tự khóa mình, không tự hạ quyền mình (kể cả khi còn admin khác)", () => {
    expect(validateStaffChange({ actorId: "a", target: admin, change: { type: "status", status: "locked" }, activeAdminCount: 2 })).toContain("tự khóa");
    expect(validateStaffChange({ actorId: "a", target: admin, change: { type: "role", role: "editor" }, activeAdminCount: 2 })).toContain("tự hạ quyền");
  });

  it("không khóa/hạ quyền quản trị viên hoạt động cuối cùng", () => {
    expect(validateStaffChange({ actorId: "x", target: admin, change: { type: "status", status: "locked" }, activeAdminCount: 1 })).toContain("cuối cùng");
    expect(validateStaffChange({ actorId: "x", target: admin, change: { type: "role", role: "reviewer" }, activeAdminCount: 1 })).toContain("cuối cùng");
  });

  it("còn admin khác thì khóa/hạ quyền một admin (không phải chính mình) được", () => {
    expect(validateStaffChange({ actorId: "a", target: otherAdmin, change: { type: "status", status: "locked" }, activeAdminCount: 2 })).toBeNull();
    expect(validateStaffChange({ actorId: "a", target: otherAdmin, change: { type: "role", role: "editor" }, activeAdminCount: 2 })).toBeNull();
  });

  it("nâng quyền không bị coi là mất quyền quản trị", () => {
    expect(validateStaffChange({ actorId: "a", target: editor, change: { type: "role", role: "system_admin" }, activeAdminCount: 1 })).toBeNull();
  });

  it("admin đang bị khóa không tính là 'admin cuối cùng'", () => {
    expect(
      validateStaffChange({ actorId: "a", target: { ...otherAdmin, status: "locked" }, change: { type: "role", role: "editor" }, activeAdminCount: 1 }),
    ).toBeNull();
  });
});

describe("countActiveAdmins", () => {
  it("chỉ đếm admin đang hoạt động", () => {
    expect(
      countActiveAdmins([admin, otherAdmin, { ...otherAdmin, status: "locked" }, editor, { ...editor, role: "reviewer" }]),
    ).toBe(2);
    expect(countActiveAdmins([])).toBe(0);
  });
});

describe("createStaffSchema", () => {
  const valid = { email: "  New@Test.Local ", full_name: " Nguyễn Văn A ", role: "editor", password: "Matkhau123" };

  it("nhận dữ liệu hợp lệ, chuẩn hóa email và họ tên", () => {
    const result = createStaffSchema.safeParse(valid);
    expect(result.success && result.data).toEqual({ email: "new@test.local", full_name: "Nguyễn Văn A", role: "editor", password: "Matkhau123" });
  });

  it("từ chối mật khẩu yếu: ngắn, thiếu số, thiếu chữ, quá dài", () => {
    for (const password of ["abc12", "chuchuchuchu", "12345678", "a1".repeat(40)]) {
      const result = createStaffSchema.safeParse({ ...valid, password });
      expect(result.success, password).toBe(false);
    }
  });

  it("từ chối email sai, họ tên rỗng, vai trò lạ (thông báo tiếng Việt)", () => {
    const result = createStaffSchema.safeParse({ email: "khong-phai-email", full_name: "  ", role: "superuser", password: "Matkhau123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.email?.[0]).toBe("Email không hợp lệ.");
      expect(errors.full_name?.[0]).toBe("Vui lòng nhập họ tên.");
      expect(errors.role?.[0]).toBe("Vui lòng chọn vai trò.");
    }
  });
});

describe("staffRoleSchema / staffStatusSchema", () => {
  it("chỉ nhận giá trị hợp lệ", () => {
    expect(staffRoleSchema.safeParse("reviewer").success).toBe(true);
    expect(staffRoleSchema.safeParse("admin").success).toBe(false);
    expect(staffStatusSchema.safeParse("locked").success).toBe(true);
    expect(staffStatusSchema.safeParse("banned").success).toBe(false);
  });
});
