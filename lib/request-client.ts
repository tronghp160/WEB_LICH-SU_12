import "server-only";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { CLIENT_ID_COOKIE, CLIENT_ID_PATTERN, clientKey, pickClientIp, readIpTrust } from "@/lib/utils/client-ip";

export type RequestClient = {
  /** IP đáng tin (gửi cho cổng thanh toán), null khi không xác định được. */
  ip: string | null;
  /** Khóa giới hạn số lần thử — chỉ gửi xuống DB dưới dạng băm có muối. */
  key: string;
};

/**
 * Người gửi request hiện tại (T7). Chỉ gọi trong Server Action / Route Handler: khi không có IP đáng tin, hàm đặt cookie
 * định danh ngẫu nhiên (httpOnly, 1 năm) — Next.js chỉ cho đặt cookie ở hai nơi đó.
 */
export async function requestClient(): Promise<RequestClient> {
  const ip = pickClientIp(await headers(), readIpTrust());
  if (ip) return { ip, key: clientKey(ip, "") };

  const store = await cookies();
  let id = store.get(CLIENT_ID_COOKIE)?.value ?? "";
  if (!CLIENT_ID_PATTERN.test(id)) {
    id = randomBytes(16).toString("base64url");
    store.set(CLIENT_ID_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  return { ip: null, key: clientKey(null, id) };
}
