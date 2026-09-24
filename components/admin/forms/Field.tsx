"use client";

import type { ReactNode } from "react";
import type { ActionState } from "@/lib/actions/state";
import { cn } from "@/lib/utils/cn";

export type FieldControlProps = {
  id: string;
  name: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  "aria-describedby"?: string;
};

type FieldProps = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  /** Nhận các thuộc tính a11y (id, name, aria-*) để gắn vào ô nhập. */
  children: (props: FieldControlProps) => ReactNode;
};

/**
 * Một trường form: nhãn, gợi ý, ô nhập, lỗi. Lỗi được nối vào ô nhập bằng aria-describedby và
 * aria-invalid. KHÔNG dùng thuộc tính `required` của trình duyệt (thông báo mặc định là tiếng Anh) —
 * form tắt kiểm tra gốc bằng `noValidate` và dùng lỗi tiếng Việt từ server.
 */
export function Field({ name, label, required, hint, error, className, children }: FieldProps) {
  const id = `field-${name}`;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-accent" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

/** Thông báo chung của form (lỗi / thành công / danh sách mục cần bổ sung). */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        isError
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-green-600/40 bg-green-600/10 text-green-800 dark:text-green-300",
      )}
    >
      <p className="font-medium">{state.message}</p>
      {state.warnings && state.warnings.length > 0 && (
        <ul className="mt-2 list-disc pl-5">
          {state.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Đọc giá trị hiển thị của một trường: ưu tiên giá trị vừa nhập (khi form trả lỗi), rồi tới giá trị gốc. */
export function valueReader(
  state: ActionState,
  initial: Record<string, string | number | boolean | null | undefined>,
) {
  return (name: string): string => {
    const typed = state.values?.[name];
    if (typed !== undefined) return typed;
    const original = initial[name];
    return original === null || original === undefined ? "" : String(original);
  };
}
