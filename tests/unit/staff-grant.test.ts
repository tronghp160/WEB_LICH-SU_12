import { beforeEach, describe, expect, it, vi } from "vitest";

// "Cấp quyền cho tài khoản đã có" ở trang Nhân sự — giai đoạn B7 (docs/ke-hoach-tai-khoan.md, mục 7.4).

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/admin", () => ({ isAdminClientConfigured: () => true, createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => ({ insert: mocks.insert }) }) }));

const { grantExistingStaffAction } = await import("@/lib/actions/staff");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const VALID = { email: " Co.Lan@Gmail.com ", full_name: "Cô Lan", role: "editor" };
const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("grantExistingStaffAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin", role: "system_admin" });
    mocks.rpc.mockResolvedValue({ data: USER_ID, error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("chỉ quản trị viên: requireRole(['system_admin']) chạy TRƯỚC mọi tra cứu", async () => {
    mocks.requireRole.mockRejectedValue(new Error("redirect /quan-tri/khong-co-quyen"));
    await expect(grantExistingStaffAction({ status: "idle" }, form(VALID))).rejects.toThrow(/khong-co-quyen/);
    expect(mocks.requireRole).toHaveBeenCalledWith(["system_admin"]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("thiếu vai trò / email sai → lỗi trường, không tra cứu", async () => {
    const state = await grantExistingStaffAction({ status: "idle" }, form({ email: "khong-phai-email", full_name: "A", role: "" }));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeTruthy();
    expect(state.fieldErrors?.role).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("tìm theo email đã chuẩn hóa rồi chèn hồ sơ nhân sự bằng phiên admin, không tạo mật khẩu", async () => {
    const state = await grantExistingStaffAction({ status: "idle" }, form(VALID));
    expect(mocks.rpc).toHaveBeenCalledWith("find_auth_user_by_email", { p_email: "co.lan@gmail.com" });
    expect(mocks.insert).toHaveBeenCalledWith({ id: USER_ID, full_name: "Cô Lan", role: "editor", account_status: "active" });
    expect(state.status).toBe("success");
    expect(state.message).toContain("co.lan@gmail.com");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/quan-tri/nhan-su");
  });

  it("chưa có tài khoản dùng email này → gợi ý 'Tạo nhân sự mới'", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const state = await grantExistingStaffAction({ status: "idle" }, form(VALID));
    expect(state.fieldErrors?.email).toContain("Tạo nhân sự mới");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("đã là nhân sự (23505) → báo dùng danh sách để đổi vai trò / mở khóa", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505", message: "duplicate" } });
    const state = await grantExistingStaffAction({ status: "idle" }, form(VALID));
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toContain("đã là nhân sự");
  });
});
