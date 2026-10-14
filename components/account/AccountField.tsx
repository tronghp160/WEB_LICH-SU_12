import type { InputHTMLAttributes, ReactNode } from "react";
import { Input } from "@/components/ui/Input";

type AccountFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  /** Gợi ý dưới ô (luôn hiện, nối vào aria-describedby). */
  hint?: ReactNode;
};

/** Một ô nhập của form tài khoản: nhãn, gợi ý và lỗi gắn với ô qua aria-describedby (mục 12 — trợ năng). */
export function AccountField({ id, label, error, hint, ...inputProps }: AccountFieldProps) {
  const describedBy = [hint ? `${id}-goi-y` : null, error ? `${id}-loi` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...inputProps} />
      {hint && (
        <p id={`${id}-goi-y`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-loi`} className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

/** Lỗi chung của form. id riêng (không dùng role="alert" làm bộ chọn: trùng với thông báo chuyển trang của Next). */
export function FormError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
      {message}
    </p>
  );
}
