import { z } from "zod";
import { STAFF_ROLES } from "@/lib/utils/labels";

/** Mật khẩu cho tài khoản nhân sự mới: 8–72 ký tự (72 là giới hạn bcrypt), có cả chữ và số. */
export const staffPasswordSchema = z
  .string({ error: "Vui lòng nhập mật khẩu." })
  .min(8, "Mật khẩu tối thiểu 8 ký tự.")
  .max(72, "Mật khẩu tối đa 72 ký tự.")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Mật khẩu phải gồm cả chữ và số.");

/** Form tạo nhân sự mới (UC13). */
export const createStaffSchema = z.object({
  email: z
    .string({ error: "Vui lòng nhập email." })
    .trim()
    .min(1, "Vui lòng nhập email.")
    .max(254, "Email quá dài.")
    .pipe(z.email("Email không hợp lệ."))
    .transform((value) => value.toLowerCase()),
  full_name: z
    .string({ error: "Vui lòng nhập họ tên." })
    .trim()
    .min(1, "Vui lòng nhập họ tên.")
    .max(100, "Họ tên quá dài (tối đa 100 ký tự)."),
  role: z.enum(STAFF_ROLES, { error: "Vui lòng chọn vai trò." }),
  password: staffPasswordSchema,
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/**
 * Cấp quyền nhân sự cho tài khoản ĐÃ CÓ (vd. giáo viên từng đăng ký làm học sinh — docs/ke-hoach-tai-khoan.md, mục 7.4):
 * như tạo mới nhưng không có mật khẩu — người đó giữ cách đăng nhập của mình.
 */
export const grantStaffSchema = createStaffSchema.omit({ password: true });

/** Đổi vai trò / khóa-mở khóa: id là UUID hợp lệ, giá trị thuộc tập cho phép. */
export const staffIdSchema = z.string({ error: "Mã nhân sự không hợp lệ." }).uuid("Mã nhân sự không hợp lệ.");
export const staffRoleSchema = z.enum(STAFF_ROLES, { error: "Vai trò không hợp lệ." });
export const staffStatusSchema = z.enum(["active", "locked"], { error: "Trạng thái không hợp lệ." });
