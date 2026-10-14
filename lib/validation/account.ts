import { z } from "zod";

// Kiểm tra dữ liệu các form tài khoản học sinh (docs/ke-hoach-tai-khoan.md, mục 6.2–6.4 và 10).

const email = z
  .string({ error: "Vui lòng nhập email." })
  .trim()
  .min(1, "Vui lòng nhập email.")
  .max(254, "Email quá dài.")
  .pipe(z.email("Email không hợp lệ."))
  .transform((value) => value.toLowerCase());

/** Số byte UTF-8: bcrypt (Supabase Auth) chỉ dùng 72 BYTE đầu — chữ có dấu chiếm 2–3 byte. */
const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

/** Mật khẩu học sinh đặt mới: 8–72 ký tự, tối đa 72 byte, có cả chữ và số. */
export const learnerPasswordSchema = z
  .string({ error: "Vui lòng nhập mật khẩu." })
  .min(8, "Mật khẩu tối thiểu 8 ký tự.")
  .max(72, "Mật khẩu tối đa 72 ký tự.")
  .refine((value) => utf8Bytes(value) <= 72, "Mật khẩu quá dài (bớt chữ có dấu hoặc ký tự đặc biệt).")
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), "Mật khẩu phải gồm cả chữ và số.");

/** Tên hiển thị: 1–60 ký tự sau khi bỏ khoảng trắng thừa. */
export const displayNameSchema = z
  .string({ error: "Vui lòng nhập tên hiển thị." })
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Vui lòng nhập tên hiển thị.").max(60, "Tên hiển thị tối đa 60 ký tự."));

/** Ô đồng ý KHÔNG tích sẵn — chỉ nhận khi người dùng tự tích. */
const agree = z.preprocess(
  (value) => value === "on" || value === "true",
  z.literal(true, { error: "Em cần đồng ý Điều khoản sử dụng và Chính sách bảo mật." }),
);

export const signUpSchema = z.object({
  displayName: displayNameSchema,
  email,
  password: learnerPasswordSchema,
  agree,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

/** Hoàn tất đăng ký sau khi vào lần đầu bằng Google: chỉ tên hiển thị + đồng ý (email do Google xác minh). */
export const completeSignUpSchema = z.object({ displayName: displayNameSchema, agree });

/** Đăng nhập: chỉ đối chiếu, không áp quy tắc độ mạnh (tài khoản cũ / nhân sự có thể đặt khác). */
export const learnerSignInSchema = z.object({
  email,
  password: z.string({ error: "Vui lòng nhập mật khẩu." }).min(1, "Vui lòng nhập mật khẩu.").max(200, "Mật khẩu quá dài."),
});

export const emailOnlySchema = z.object({ email });

/** Hồ sơ ở /tai-khoan: tên hiển thị + trường (tùy chọn, ≤ 120 ký tự — khớp CHECK của learner_profiles.school). */
export const profileSchema = z.object({
  displayName: displayNameSchema,
  school: z
    .string()
    .optional()
    .transform((value) => (value ?? "").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(120, "Tên trường tối đa 120 ký tự."))
    .transform((value) => value || null),
});

/**
 * Đổi mật khẩu ở /tai-khoan/bao-mat. `current` bắt buộc khi tài khoản đã có mật khẩu (Server Action kiểm), bỏ trống với
 * tài khoản chỉ có Google đang đặt mật khẩu lần đầu.
 */
export const changePasswordSchema = z
  .object({
    current: z.string().max(200, "Mật khẩu quá dài.").optional(),
    password: learnerPasswordSchema,
    confirm: z.string({ error: "Vui lòng nhập lại mật khẩu." }),
  })
  .refine((value) => value.password === value.confirm, { path: ["confirm"], message: "Hai mật khẩu không khớp." });

/** Xóa tài khoản: gõ lại đúng email để xác nhận (mục 10). So khớp không phân biệt hoa/thường. */
export const deleteAccountSchema = z.object({
  confirmEmail: z.string({ error: "Gõ email của em để xác nhận." }).trim().min(1, "Gõ email của em để xác nhận.").max(254),
});

export const newPasswordSchema = z
  .object({
    password: learnerPasswordSchema,
    confirm: z.string({ error: "Vui lòng nhập lại mật khẩu." }),
  })
  .refine((value) => value.password === value.confirm, { path: ["confirm"], message: "Hai mật khẩu không khớp." });
