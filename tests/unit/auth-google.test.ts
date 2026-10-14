import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exchangeErrorReason, oauthErrorReason, profileDefaults } from "@/lib/auth/oauth";
import { completeSignUpPath } from "@/lib/auth/routes";
import { completeSignUpSchema } from "@/lib/validation/account";

// Đăng nhập Google — giai đoạn B3 (docs/ke-hoach-tai-khoan.md, mục 6.1 và 12). Google chặn trình duyệt tự động nên luồng
// thật kiểm tay; ở đây kiểm /auth/callback với Supabase giả và các hàm thuần.

class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`redirect ${url}`);
  }
}

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  staffRow: vi.fn(),
  ensureLearnerProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession, getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.staffRow }) }) }),
  }),
}));

vi.mock("@/lib/auth/learner", () => ({ ensureLearnerProfile: mocks.ensureLearnerProfile }));

const { GET } = await import("@/app/auth/callback/route");

/** Gọi route, trả về đường dẫn được chuyển tới. */
async function callback(query: string): Promise<string> {
  try {
    await GET(new NextRequest(`http://localhost:3000/auth/callback${query}`));
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
  throw new Error("route không chuyển hướng");
}

const USER = { id: "u-1", email: "an@gmail.com", user_metadata: { full_name: "Nguyễn An" } };

describe("/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: USER, session: {} }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.staffRow.mockResolvedValue({ data: null, error: null });
    mocks.ensureLearnerProfile.mockResolvedValue({ id: "u-1", display_name: "An" });
  });

  it("đã có hồ sơ → về `next` (đã lọc qua safeNext)", async () => {
    expect(await callback("?code=abc&next=%2Fluyen-thi")).toBe("/luyen-thi");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("next trỏ ra ngoài → /tai-khoan", async () => {
    expect(await callback("?code=abc&next=%2F%2Fevil.com")).toBe("/tai-khoan");
    expect(await callback("?code=abc&next=https%3A%2F%2Fevil.com")).toBe("/tai-khoan");
  });

  it("lần đầu, chưa có hồ sơ, không phải nhân sự → /dang-ky/hoan-tat giữ next", async () => {
    mocks.ensureLearnerProfile.mockResolvedValue(null);
    expect(await callback("?code=abc&next=%2Fluyen-thi")).toBe(completeSignUpPath("/luyen-thi"));
    expect(await callback("?code=abc")).toBe("/dang-ky/hoan-tat");
  });

  it("nhân sự đang hoạt động (Q1) → đi tiếp, không bắt tạo hồ sơ học sinh", async () => {
    mocks.ensureLearnerProfile.mockResolvedValue(null);
    mocks.staffRow.mockResolvedValue({ data: { account_status: "active" }, error: null });
    expect(await callback("?code=abc&next=%2Fquan-tri")).toBe("/quan-tri");
  });

  it("nhân sự bị khóa vẫn phải hoàn tất như học sinh", async () => {
    mocks.ensureLearnerProfile.mockResolvedValue(null);
    mocks.staffRow.mockResolvedValue({ data: { account_status: "locked" }, error: null });
    expect(await callback("?code=abc")).toBe("/dang-ky/hoan-tat");
  });

  it("bấm Hủy ở Google → trang lỗi, không gọi đổi code", async () => {
    expect(await callback("?error=access_denied&error_description=The+user+denied")).toBe("/auth/loi?ly-do=google-huy");
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("thiếu code hoặc code quá dài → lỗi chung", async () => {
    expect(await callback("")).toBe("/auth/loi?ly-do=google-loi");
    expect(await callback(`?code=${"a".repeat(501)}`)).toBe("/auth/loi?ly-do=google-loi");
  });

  it("dùng lại link callback lần hai khi chưa có phiên → hết hạn", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: "AuthPKCECodeVerifierMissingError", code: "pkce_code_verifier_not_found" },
    });
    expect(await callback("?code=abc")).toBe("/auth/loi?ly-do=google-het-han");
  });

  it("dùng lại link callback khi đang đăng nhập → đi tiếp như thường", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "flow_state_not_found" },
    });
    mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    expect(await callback("?code=abc&next=%2Fho-chieu")).toBe("/ho-chieu");
  });
});

describe("dịch lỗi Google", () => {
  it("oauthErrorReason", () => {
    expect(oauthErrorReason("access_denied", null)).toBe("google-huy");
    expect(oauthErrorReason("server_error", "flow_state_expired")).toBe("google-het-han");
    expect(oauthErrorReason("server_error", "unexpected_failure")).toBe("google-loi");
    expect(oauthErrorReason(null, null)).toBe("google-loi");
  });

  it("exchangeErrorReason", () => {
    expect(exchangeErrorReason({ name: "AuthPKCECodeVerifierMissingError" })).toBe("google-het-han");
    expect(exchangeErrorReason({ code: "bad_code_verifier" })).toBe("google-het-han");
    expect(exchangeErrorReason({ code: "flow_state_expired" })).toBe("google-het-han");
    expect(exchangeErrorReason({ code: "unexpected_failure" })).toBe("google-loi");
    expect(exchangeErrorReason(null)).toBe("google-loi");
  });
});

describe("profileDefaults — tên / ảnh gợi ý từ Google", () => {
  it("ưu tiên display_name → full_name → name → phần trước @", () => {
    expect(profileDefaults({ email: "a@x.vn", user_metadata: { display_name: " Lan ", full_name: "Trần Lan" } }).displayName).toBe("Lan");
    expect(profileDefaults({ email: "a@x.vn", user_metadata: { full_name: "Trần   Thị Lan", name: "Lan" } }).displayName).toBe("Trần Thị Lan");
    expect(profileDefaults({ email: "a@x.vn", user_metadata: { name: "Lan" } }).displayName).toBe("Lan");
    expect(profileDefaults({ email: "hoc.sinh@x.vn", user_metadata: {} }).displayName).toBe("hoc.sinh");
    expect(profileDefaults({ email: null, user_metadata: null }).displayName).toBe("Học sinh");
  });

  it("tên dài cắt còn 60 ký tự", () => {
    expect(profileDefaults({ user_metadata: { full_name: "A".repeat(80) } }).displayName).toHaveLength(60);
  });

  it("ảnh chỉ nhận https ≤ 500 ký tự (khớp CHECK của learner_profiles)", () => {
    const ok = "https://lh3.googleusercontent.com/a/abc=s96-c";
    expect(profileDefaults({ user_metadata: { avatar_url: ok } }).avatarUrl).toBe(ok);
    expect(profileDefaults({ user_metadata: { picture: ok } }).avatarUrl).toBe(ok);
    expect(profileDefaults({ user_metadata: { avatar_url: "http://x.vn/a.png" } }).avatarUrl).toBeNull();
    expect(profileDefaults({ user_metadata: { avatar_url: "javascript:alert(1)" } }).avatarUrl).toBeNull();
    expect(profileDefaults({ user_metadata: { avatar_url: `https://x.vn/${"a".repeat(500)}` } }).avatarUrl).toBeNull();
    expect(profileDefaults({ user_metadata: {} }).avatarUrl).toBeNull();
  });
});

describe("completeSignUpSchema", () => {
  it("bắt buộc tự tích ô đồng ý", () => {
    expect(completeSignUpSchema.safeParse({ displayName: "Lan", agree: null }).success).toBe(false);
    expect(completeSignUpSchema.safeParse({ displayName: "Lan", agree: "on" }).success).toBe(true);
  });
  it("tên rỗng sau khi bỏ khoảng trắng bị từ chối", () => {
    expect(completeSignUpSchema.safeParse({ displayName: "   ", agree: "on" }).success).toBe(false);
  });
});
