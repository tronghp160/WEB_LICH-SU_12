import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Nút "Google" ở trang đăng nhập / đăng ký (mục 6.1): nhãn cho trình đọc màn hình, input ẩn `next`, khóa nút khi đang mở
// Google. useActionState được giả lập để dựng được cả trạng thái đang chờ.

const mocks = vi.hoisted(() => ({
  actionState: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useActionState: mocks.actionState,
}));
vi.mock("@/lib/actions/account", () => ({ signInWithGoogleAction: vi.fn() }));

const { GoogleButton, OrDivider } = await import("@/components/account/GoogleButton");

const render = (props: Parameters<typeof GoogleButton>[0]) => renderToStaticMarkup(createElement(GoogleButton, props));

describe("GoogleButton", () => {
  beforeEach(() => {
    mocks.actionState.mockReturnValue([{}, vi.fn(), false]);
  });

  it("chữ 'Google', tên đọc 'Đăng nhập bằng Google', mang theo next, bấm được", () => {
    const html = render({ next: "/luyen-thi/de-2" });
    expect(html).toContain('aria-label="Đăng nhập bằng Google"');
    expect(html).toMatch(/<\/svg>Google<\/button>/);
    expect(html).toContain('<input type="hidden" name="next" value="/luyen-thi/de-2"/>');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("Tiếp tục với Google");
  });

  it("đổi được chữ và tên đọc (trang đăng ký)", () => {
    const html = render({ next: "/", label: "Liên kết Google", ariaLabel: "Đăng ký bằng Google" });
    expect(html).toContain('aria-label="Đăng ký bằng Google"');
    expect(html).toContain("Liên kết Google");
  });

  it("đang mở Google → nút bị khóa, chữ và tên đọc báo đang mở", () => {
    mocks.actionState.mockReturnValue([{}, vi.fn(), true]);
    const html = render({ next: "/" });
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-label="Đang mở Google…"');
    expect(html).toMatch(/<\/svg>Đang mở Google…<\/button>/);
  });

  it("lỗi từ Server Action hiện thành thông báo", () => {
    mocks.actionState.mockReturnValue([{ error: "Đăng nhập Google đang tạm tắt." }, vi.fn(), false]);
    expect(render({ next: "/" })).toContain('role="alert"');
  });
});

describe("OrDivider", () => {
  it("mặc định 'hoặc đăng nhập bằng', đổi được nhãn", () => {
    expect(renderToStaticMarkup(createElement(OrDivider))).toContain('aria-label="hoặc đăng nhập bằng"');
    expect(renderToStaticMarkup(createElement(OrDivider, { label: "hoặc đăng ký bằng" }))).toContain("hoặc đăng ký bằng");
  });
});
