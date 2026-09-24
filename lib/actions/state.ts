// Kiểu và hàm hỗ trợ cho các Server Action của form (file "use server" chỉ được export hàm async,
// nên kiểu và hàm thuần đặt ở đây).

import type { ZodError } from "zod";
import { translateDbError, type DbErrorLike } from "@/lib/utils/db-errors";

export type ActionState = {
  status: "idle" | "error" | "success";
  /** Thông báo chung của cả form. */
  message?: string;
  /** Lỗi theo từng trường (khóa = tên trường trong form). */
  fieldErrors?: Record<string, string>;
  /** Giá trị đã nhập, để giữ lại form khi có lỗi (không chứa tệp/mật khẩu). */
  values?: Record<string, string>;
  /** Cảnh báo khi lưu thành công nhưng còn điểm nên xem lại. */
  warnings?: string[];
  /** Nội dung đã đổi trạng thái do người khác xử lý trước — giao diện gợi ý tải lại trang. */
  stale?: boolean;
};

export const initialActionState: ActionState = { status: "idle" };

/** Chỉ giữ giá trị chuỗi từ FormData (bỏ tệp) để trả lại form khi lỗi. */
export function readFormValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

/** Lỗi Zod → lỗi theo trường (mỗi trường lấy thông báo đầu tiên) + thông báo chung. */
export function zodErrorState(error: ZodError, values: Record<string, string>): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return {
    status: "error",
    message: "Vui lòng kiểm tra lại các trường được đánh dấu.",
    fieldErrors,
    values,
  };
}

/** Lỗi database → thông báo tiếng Việt; nếu suy ra được trường (ví dụ trùng slug) thì gắn vào ô đó. */
export function dbErrorState(error: DbErrorLike, values: Record<string, string>): ActionState {
  const { message, field } = translateDbError(error);
  return {
    status: "error",
    message,
    fieldErrors: field ? { [field]: message } : undefined,
    values,
  };
}
