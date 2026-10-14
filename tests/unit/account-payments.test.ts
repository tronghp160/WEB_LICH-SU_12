import { beforeEach, describe, expect, it, vi } from "vitest";

// Gắn thanh toán với tài khoản — giai đoạn B6 (docs/ke-hoach-tai-khoan.md, mục 7.2, 7.3, T6).

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  rpc: vi.fn(),
  rate: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/supabase/admin", () => ({
  isAdminClientConfigured: () => true,
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/payments/rate-limit", () => ({ consumeRateLimit: mocks.rate }));

const { licenseEmailContent, scheduleLicenseEmail } = await import("@/lib/payments/email");
const { usableLicenses } = await import("@/lib/queries/account");
const { claimLicenseAction } = await import("@/lib/actions/account");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

describe("email mã kích hoạt (T6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Lịch sử 12 <no-reply@vidu.vn>");
  });

  it("nội dung có mã, mã đơn, link kích hoạt; HTML được thoát ký tự", () => {
    const content = licenseEmailContent({ orderCode: 100123, licenseCode: "LT12-AAAA-BBBB-CCCC", productName: "Gói <b>luyện</b> thi", site: "https://vidu.vn" });
    expect(content.subject).toContain("100123");
    expect(content.text).toContain("LT12-AAAA-BBBB-CCCC");
    expect(content.text).toContain("https://vidu.vn/kich-hoat");
    expect(content.html).toContain("Gói &lt;b&gt;luyện&lt;/b&gt; thi");
    expect(content.html).not.toContain("<b>luyện</b>");
  });

  it("chỉ hẹn gửi khi VỪA cấp mã (already=false) — webhook gửi lại không gửi trùng", () => {
    scheduleLicenseEmail(1, { ok: true, already: true, license_code: "LT12-AAAA-BBBB-CCCC" });
    scheduleLicenseEmail(1, { ok: false, reason: "amount_mismatch" } as never);
    scheduleLicenseEmail(1, { ok: true, already: false, license_code: null });
    scheduleLicenseEmail(1, null);
    expect(mocks.after).not.toHaveBeenCalled();
    scheduleLicenseEmail(1, { ok: true, already: false, license_code: "LT12-AAAA-BBBB-CCCC" });
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });

  it("chưa cấu hình RESEND_API_KEY / EMAIL_FROM → không gửi", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    scheduleLicenseEmail(1, { ok: true, already: false, license_code: "LT12-AAAA-BBBB-CCCC" });
    expect(mocks.after).not.toHaveBeenCalled();
  });
});

describe("usableLicenses", () => {
  const base = { code: "LT12-AAAA-BBBB-CCCC", productName: "Gói", productSlug: "goi", fromAccountOrder: true };
  it("bỏ mã bị thu hồi và mã hết hạn", () => {
    const now = new Date("2026-10-14T00:00:00Z");
    const list = [
      { ...base, status: "active", validUntil: null },
      { ...base, code: "B", status: "active", validUntil: "2026-12-31T00:00:00Z" },
      { ...base, code: "C", status: "revoked", validUntil: null },
      { ...base, code: "D", status: "active", validUntil: "2026-10-01T00:00:00Z" },
    ];
    expect(usableLicenses(list, now).map((item) => item.code)).toEqual(["LT12-AAAA-BBBB-CCCC", "B"]);
  });
});

describe("claimLicenseAction — thêm mã vào tài khoản", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u-1", email: "an@vidu.vn" } } });
    mocks.rate.mockResolvedValue("allowed");
    mocks.rpc.mockResolvedValue({ data: { ok: true, already: false }, error: null });
  });

  it("mã sai định dạng → báo lỗi, không gọi DB", async () => {
    expect(await claimLicenseAction({}, form({ code: "abc" }))).toMatchObject({ error: expect.stringContaining("không đúng") });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("chưa đăng nhập → về trang đăng nhập", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(claimLicenseAction({}, form({ code: "LT12-AAAA-BBBB-CCCC" }))).rejects.toThrow(/redirect \/dang-nhap/);
  });

  it("gọi claim_license với user id CỦA PHIÊN (không nhận từ form), mã đã chuẩn hóa", async () => {
    const state = await claimLicenseAction({}, form({ code: "lt12 aaaa bbbb cccc", user_id: "u-khac" }));
    expect(mocks.rpc).toHaveBeenCalledWith("claim_license", { p_code: "LT12-AAAA-BBBB-CCCC", p_user_id: "u-1" });
    expect(state.status).toBe("claimed");
  });

  it.each([
    ["owned_by_other", "tài khoản khác"],
    ["revoked", "thu hồi"],
    ["expired", "hết hạn"],
  ])("%s → thông báo tiếng Việt", async (reason, text) => {
    mocks.rpc.mockResolvedValue({ data: { ok: false, reason }, error: null });
    expect((await claimLicenseAction({}, form({ code: "LT12-AAAA-BBBB-CCCC" }))).error).toContain(text);
  });

  it("đã có trong tài khoản → already; vượt giới hạn → chặn trước khi gọi DB", async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: true, already: true }, error: null });
    expect((await claimLicenseAction({}, form({ code: "LT12-AAAA-BBBB-CCCC" }))).status).toBe("already");
    mocks.rpc.mockClear();
    mocks.rate.mockResolvedValue("limited");
    expect((await claimLicenseAction({}, form({ code: "LT12-AAAA-BBBB-CCCC" }))).error).toContain("quá nhiều lần");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
