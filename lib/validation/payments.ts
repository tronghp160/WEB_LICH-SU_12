// Kiểm tra form mua gói / ủng hộ (docs/ke-hoach-thanh-toan.md, mục 9). Số tiền gói KHÔNG đọc từ form; số tiền ủng hộ
// đọc ở đây nhưng khoảng cho phép kiểm ở server theo `products` (lib/payments/pricing.ts).

import { z } from "zod";
import { parseVndInput } from "@/lib/payments/pricing";

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const emptyToNull = (value: unknown) => {
  const text = trimmed(value);
  return text === "" || text === undefined ? null : text;
};

const slug = z.preprocess(trimmed, z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Sản phẩm không hợp lệ."));

const email = z.preprocess(
  emptyToNull,
  z.email("Email chưa đúng định dạng.").max(254, "Email quá dài.").nullable(),
);

const agree = z.preprocess((value) => value === "on" || value === "true", z.literal(true, { error: "Em cần đồng ý điều khoản trước khi thanh toán." }));

export const buyPackSchema = z.object({
  product: slug,
  email,
  agree,
});

export const donationSchema = z.object({
  product: slug,
  amount: z.preprocess(
    (value) => (typeof value === "string" ? parseVndInput(value) : null),
    z.number({ error: "Em hãy chọn hoặc nhập số tiền ủng hộ." }).int(),
  ),
  email,
  displayName: z.preprocess(emptyToNull, z.string().max(60, "Tên hiển thị tối đa 60 ký tự.").nullable()),
  message: z.preprocess(emptyToNull, z.string().max(200, "Lời nhắn tối đa 200 ký tự.").nullable()),
  showOnWall: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
  agree,
});

export type BuyPackInput = z.infer<typeof buyPackSchema>;
export type DonationInput = z.infer<typeof donationSchema>;
