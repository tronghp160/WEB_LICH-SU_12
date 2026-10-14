import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/auth/routes";

/** Ô đồng ý Điều khoản + Chính sách — KHÔNG tích sẵn (docs/ke-hoach-tai-khoan.md, mục 11). Dùng ở /dang-ky và /dang-ky/hoan-tat. */
export function AgreeTermsField({ error }: { error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="agree"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "agree-loi" : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span>
          Em đã đọc và đồng ý{" "}
          <Link href={TERMS_PATH} target="_blank" className="text-accent underline">
            Điều khoản sử dụng
          </Link>{" "}
          và{" "}
          <Link href={PRIVACY_PATH} target="_blank" className="text-accent underline">
            Chính sách bảo mật
          </Link>
          .
        </span>
      </label>
      {error && (
        <p id="agree-loi" className="text-sm text-accent">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Nếu em dưới 16 tuổi, hãy nhờ bố mẹ đồng ý trước khi tạo tài khoản.</p>
    </div>
  );
}
