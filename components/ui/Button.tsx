import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Quy ước (KE_HOACH_NANG_CAP_GIAO_DIEN.md, mục 4 và 7.5): mỗi màn hình chỉ MỘT nút `primary` (đỏ son).
 * `secondary`/`ghost` cho hành động phụ, `link` cho liên kết chữ trong đoạn ("Xem tất cả →"), `icon` cho nút chỉ có
 * biểu tượng (bắt buộc kèm aria-label).
 */
type Variant = "primary" | "secondary" | "ghost" | "link" | "icon";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:opacity-90 focus-visible:outline-accent",
  secondary:
    "bg-transparent text-foreground border border-border hover:bg-muted focus-visible:outline-gold",
  ghost:
    "bg-transparent text-foreground hover:bg-muted focus-visible:outline-gold",
  link: "bg-transparent px-0 text-accent underline-offset-4 hover:underline focus-visible:outline-gold",
  icon: "bg-transparent text-foreground hover:bg-muted focus-visible:outline-gold",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Nút `icon` vuông theo cỡ; nút `link` không có chiều cao/đệm cố định (nằm trong dòng chữ). */
function sizeFor(variant: Variant, size: Size): string {
  if (variant === "link") return size === "lg" ? "text-base" : "text-sm";
  if (variant === "icon") return { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" }[size];
  return sizeClasses[size];
}

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeFor(variant, size), className)}
      {...props}
    />
  );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

/** Dùng khi nút thực chất là điều hướng (Next.js Link) thay vì hành động. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(baseClasses, variantClasses[variant], sizeFor(variant, size), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
