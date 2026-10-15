"use client";

import { useActionState } from "react";
import { FormError } from "@/components/account/AccountField";
import { signInWithGoogleAction, type GoogleSignInState } from "@/lib/actions/account";

const initial: GoogleSignInState = {};

/** Logo "G" nhiều màu theo hướng dẫn thương hiệu của Google (không đổi màu, không cắt). */
function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

type GoogleButtonProps = {
  next: string;
  /** Chữ trên nút — mặc định "Google", đủ nghĩa khi nằm ngay dưới dòng "hoặc đăng nhập bằng". */
  label?: string;
  /** Tên cho trình đọc màn hình ("Google" một mình không đủ nghĩa); phải chứa chữ trên nút (WCAG 2.5.3). */
  ariaLabel?: string;
};

/**
 * Nút đăng nhập Google (mục 6.1): viền xám mảnh, nền trắng ở cả chế độ sáng lẫn tối (hướng dẫn thương hiệu Google cho
 * phép), bo góc, chiếm hết chiều ngang. Gửi form tới Server Action → chuyển sang trang chọn tài khoản Google. Chỉ hiện
 * khi Google đã bật trong Supabase (trang gọi isGoogleAuthEnabled()).
 */
export function GoogleButton({ next, label = "Google", ariaLabel = "Đăng nhập bằng Google" }: GoogleButtonProps) {
  const [state, formAction, pending] = useActionState(signInWithGoogleAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <FormError id="google-loi" message={state.error} />
      <button
        type="submit"
        disabled={pending}
        aria-label={pending ? "Đang mở Google…" : ariaLabel}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white px-6 text-base font-medium text-[#1f1f1f] transition-colors hover:bg-[#f8f9fa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleLogo />
        {pending ? "Đang mở Google…" : label}
      </button>
    </form>
  );
}

/** Đường kẻ "hoặc" giữa form email và nút Google. */
export function OrDivider({ label = "hoặc đăng nhập bằng" }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span aria-hidden="true">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
