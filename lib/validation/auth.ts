import { z } from "zod";

/** Form đăng nhập nhân sự. Không kiểm tra độ dài mật khẩu tối thiểu ở đây: đăng nhập chỉ đối chiếu, không đặt mật khẩu. */
export const signInSchema = z.object({
  email: z
    .string({ error: "Vui lòng nhập email." })
    .trim()
    .min(1, "Vui lòng nhập email.")
    .max(254, "Email quá dài.")
    .pipe(z.email("Email không hợp lệ."))
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ error: "Vui lòng nhập mật khẩu." })
    .min(1, "Vui lòng nhập mật khẩu.")
    .max(200, "Mật khẩu quá dài."),
});

export type SignInInput = z.infer<typeof signInSchema>;
