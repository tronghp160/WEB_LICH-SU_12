import { describe, expect, it } from "vitest";
import { CLIENT_ID_PATTERN, clientKey, normalizeIp, pickClientIp, readIpTrust } from "@/lib/utils/client-ip";

const headers = (values: Record<string, string>) => new Headers(values);
const NONE = { vercel: false, trustProxy: false };
const VERCEL = { vercel: true, trustProxy: false };
const PROXY = { vercel: false, trustProxy: true };

describe("readIpTrust", () => {
  it("chỉ tin header khi VERCEL=1 hoặc TRUST_PROXY=1", () => {
    expect(readIpTrust({})).toEqual(NONE);
    expect(readIpTrust({ VERCEL: "1" })).toEqual(VERCEL);
    expect(readIpTrust({ TRUST_PROXY: " 1 " })).toEqual(PROXY);
    expect(readIpTrust({ TRUST_PROXY: "true", VERCEL: "0" })).toEqual(NONE);
  });
});

describe("normalizeIp", () => {
  it("nhận IPv4 / IPv6, bỏ khoảng trắng, chữ thường", () => {
    expect(normalizeIp(" 203.0.113.7 ")).toBe("203.0.113.7");
    expect(normalizeIp("2001:DB8::1")).toBe("2001:db8::1");
    expect(normalizeIp("::1")).toBe("::1");
    expect(normalizeIp("::ffff:192.0.2.1")).toBe("::ffff:192.0.2.1");
  });

  it("từ chối chuỗi rác, rỗng, quá dài", () => {
    for (const value of [null, undefined, "", "unknown", "1.2.3", "abc", "<script>", "1.2.3.4; drop", "a".repeat(50) + ":1"]) {
      expect(normalizeIp(value)).toBeNull();
    }
  });
});

describe("pickClientIp", () => {
  it("chạy thẳng (không Vercel, không proxy): không tin header nào — client giả được", () => {
    expect(pickClientIp(headers({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" }), NONE)).toBeNull();
  });

  it("Vercel: ưu tiên x-vercel-forwarded-for, rồi x-real-ip, rồi x-forwarded-for", () => {
    expect(pickClientIp(headers({ "x-vercel-forwarded-for": "9.9.9.9", "x-real-ip": "2.2.2.2" }), VERCEL)).toBe("9.9.9.9");
    expect(pickClientIp(headers({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }), VERCEL)).toBe("2.2.2.2");
    expect(pickClientIp(headers({ "x-forwarded-for": "3.3.3.3, 10.0.0.1" }), VERCEL)).toBe("3.3.3.3");
  });

  it("proxy tự host: lấy x-real-ip hoặc phần tử CUỐI x-forwarded-for (phần đầu do client tự ghi)", () => {
    expect(pickClientIp(headers({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "6.6.6.6, 5.5.5.5" }), PROXY)).toBe("2.2.2.2");
    expect(pickClientIp(headers({ "x-forwarded-for": "6.6.6.6, 5.5.5.5" }), PROXY)).toBe("5.5.5.5");
    expect(pickClientIp(headers({ "x-vercel-forwarded-for": "9.9.9.9" }), PROXY)).toBeNull();
  });

  it("header có giá trị rác → null", () => {
    expect(pickClientIp(headers({ "x-real-ip": "khong-ro" }), VERCEL)).toBeNull();
  });
});

describe("clientKey", () => {
  it("theo IP nếu có, không thì theo cookie định danh — hai khóa không bao giờ trùng nhau", () => {
    expect(clientKey("1.2.3.4", "abc")).toBe("ip:1.2.3.4");
    expect(clientKey(null, "abc")).toBe("khach:abc");
  });

  it("cookie định danh: 22 ký tự base64url (16 byte ngẫu nhiên)", () => {
    expect(CLIENT_ID_PATTERN.test("AbCdEfGhIjKlMnOpQrSt_-")).toBe(true);
    expect(CLIENT_ID_PATTERN.test("ngắn")).toBe(false);
    expect(CLIENT_ID_PATTERN.test("AbCdEfGhIjKlMnOpQrSt_=")).toBe(false);
  });
});
