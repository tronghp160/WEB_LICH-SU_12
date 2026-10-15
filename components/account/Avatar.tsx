"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type AvatarProps = {
  /** Ảnh đại diện (thường là ảnh Google ở lh3.googleusercontent.com); trống thì hiện chữ cái đầu. */
  src?: string | null;
  name: string;
  /** Kích thước, ví dụ "h-8 w-8". */
  className: string;
  /** Kiểu chữ của chữ cái dự phòng. */
  letterClassName?: string;
};

/**
 * Ảnh đại diện hoặc chữ cái đầu của tên. Ảnh ngoài trang → <img> chứ không dùng next/image (quy ước dự án);
 * `no-referrer` vì Google đôi khi trả 403 khi có referrer; ảnh lỗi tải thì quay về chữ cái đầu.
 */
export function Avatar({ src, name, className, letterClassName = "text-sm font-semibold" }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn(className, "shrink-0 rounded-full object-cover")} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(className, letterClassName, "inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground")}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
