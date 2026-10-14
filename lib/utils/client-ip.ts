// Lấy IP người dùng ĐÁNG TIN để giới hạn số lần thử (docs/ke-hoach-tai-khoan.md, mục 3 — T7). Hàm thuần, test được.
//
// Header IP do client tự gửi được, nên chỉ đọc header khi biết chắc nó do hạ tầng của mình đặt:
//   • Trên Vercel (biến VERCEL=1): Vercel ghi đè x-real-ip / x-forwarded-for / x-vercel-forwarded-for bằng IP thật.
//   • Tự host sau reverse proxy (TRUST_PROXY=1): proxy đặt x-real-ip hoặc NỐI IP thật vào CUỐI x-forwarded-for
//     (nginx `$proxy_add_x_forwarded_for`) → lấy phần tử cuối, không lấy phần tử đầu (client giả được).
//   • Còn lại (chạy thẳng, máy dev): không tin header nào → trả null; nơi gọi dùng cookie định danh ngẫu nhiên làm khóa
//     (lib/request-client.ts) để mọi người không bị dồn chung một "xô" rồi khóa lẫn nhau.

export type IpTrust = {
  /** Chạy trên Vercel: header IP do nền tảng đặt. */
  vercel: boolean;
  /** Tự host sau reverse proxy đáng tin (TRUST_PROXY=1). */
  trustProxy: boolean;
};

type HeaderReader = { get(name: string): string | null };

export function readIpTrust(env: Record<string, string | undefined> = process.env): IpTrust {
  return { vercel: env.VERCEL === "1", trustProxy: env.TRUST_PROXY?.trim() === "1" };
}

// IPv4 / IPv6 (chỉ ký tự hợp lệ, độ dài hợp lý) — chặn chuỗi rác dùng làm khóa.
const IP_PATTERN = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]*:[0-9a-f:.]*)$/i;

export function normalizeIp(value: string | null | undefined): string | null {
  const ip = value?.trim().toLowerCase() ?? "";
  return ip.length >= 2 && ip.length <= 45 && IP_PATTERN.test(ip) ? ip : null;
}

function lastForwarded(value: string | null): string | null {
  const parts = value?.split(",") ?? [];
  return normalizeIp(parts[parts.length - 1]);
}

function firstForwarded(value: string | null): string | null {
  return normalizeIp(value?.split(",")[0]);
}

/** IP đáng tin của request, hoặc null khi không có header nào đáng tin. */
export function pickClientIp(headers: HeaderReader, trust: IpTrust): string | null {
  if (trust.vercel) {
    return (
      firstForwarded(headers.get("x-vercel-forwarded-for")) ??
      normalizeIp(headers.get("x-real-ip")) ??
      firstForwarded(headers.get("x-forwarded-for"))
    );
  }
  if (trust.trustProxy) {
    return normalizeIp(headers.get("x-real-ip")) ?? lastForwarded(headers.get("x-forwarded-for"));
  }
  return null;
}

/** Cookie định danh ngẫu nhiên dùng làm khóa giới hạn khi không có IP đáng tin. */
export const CLIENT_ID_COOKIE = "ls12_khach";
export const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** Khóa giới hạn số lần thử: theo IP nếu có, không thì theo cookie định danh. */
export function clientKey(ip: string | null, clientId: string): string {
  return ip ? `ip:${ip}` : `khach:${clientId}`;
}
