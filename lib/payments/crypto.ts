// Băm và ký cho chức năng thanh toán — chạy ở server (node:crypto). Không import "server-only" để unit test được;
// các module gọi tới (config, orders) đã có "server-only".

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hmacSha256Hex(secret: string, text: string): string {
  return createHmac("sha256", secret).update(text, "utf8").digest("hex");
}

/** So sánh hai chuỗi hex trong thời gian không đổi (chống dò chữ ký theo thời gian phản hồi). */
export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]*$/i.test(a) || !/^[0-9a-f]*$/i.test(b) || a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Token ngẫu nhiên dạng hex (mặc định 32 byte = 64 ký tự). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Băm có muối cho IP / mã thiết bị: không lưu giá trị thô, và không tra ngược được bằng bảng băm sẵn. */
export function saltedHash(salt: string, value: string): string {
  return sha256Hex(`${salt}:${value}`);
}
