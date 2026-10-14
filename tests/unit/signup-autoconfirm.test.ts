import { beforeEach, describe, expect, it, vi } from "vitest";

// Đăng ký bằng email khi Supabase BẬT / TẮT "Confirm email" (mailer_autoconfirm) — docs/ke-hoach-tai-khoan.md, mục 6.2.

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  settings: vi.fn(),
  ensureLearnerProfile: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: mocks.cookieSet, delete: () => {} }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signUp: mocks.signUp } }) }));
vi.mock("@/lib/auth/providers", () => ({ getAuthSettings: mocks.settings, isGoogleAuthEnabled: async () => false }));
vi.mock("@/lib/auth/learner", () => ({ ensureLearnerProfile: mocks.ensureLearnerProfile }));

const { signUpAction } = await import("@/lib/actions/account");

const form = () => {
  const data = new FormData();
  data.set("displayName", "Minh An");
  data.set("email", "an@gmail.com");
  data.set("password", "lichsu2026A");
  data.set("agree", "on");
  return data;
};

describe("signUpAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings.mockResolvedValue({ google: false, autoconfirm: false });
  });

  it("TẮT xác nhận email: có phiên ngay → tạo hồ sơ, vào thẳng tài khoản", async () => {
    mocks.settings.mockResolvedValue({ google: false, autoconfirm: true });
    mocks.signUp.mockResolvedValue({ data: { session: {}, user: { id: "u-1" } }, error: null });
    await expect(signUpAction({}, form())).rejects.toThrow("redirect /tai-khoan");
    expect(mocks.ensureLearnerProfile).toHaveBeenCalledTimes(1);
  });

  it("TẮT xác nhận email + email đã có tài khoản → báo ở ô email, KHÔNG đưa tới trang kiểm tra email", async () => {
    mocks.settings.mockResolvedValue({ google: false, autoconfirm: true });
    mocks.signUp.mockResolvedValue({ data: { session: null, user: null }, error: { code: "user_already_exists", status: 422 } });
    const state = await signUpAction({}, form());
    expect(state.fieldErrors?.email).toContain("đã có tài khoản");
    expect(state.values?.email).toBe("an@gmail.com");
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it("BẬT xác nhận email + email đã có → vẫn đi luồng 'kiểm tra email' chung (không lộ email nào đã có)", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null, user: null }, error: { code: "user_already_exists", status: 422 } });
    await expect(signUpAction({}, form())).rejects.toThrow("redirect /dang-ky/kiem-tra-email");
  });

  it("BẬT xác nhận email, email mới → trang kiểm tra email", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null, user: { id: "u-2" } }, error: null });
    await expect(signUpAction({}, form())).rejects.toThrow("redirect /dang-ky/kiem-tra-email");
    expect(mocks.ensureLearnerProfile).not.toHaveBeenCalled();
  });
});
