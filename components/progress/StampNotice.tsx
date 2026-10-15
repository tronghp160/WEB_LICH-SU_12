import { Stamp } from "lucide-react";
import Link from "next/link";
import { isPassing, PASS_RATIO } from "@/lib/progress/progress";
import { cn } from "@/lib/utils/cn";

export const PASSPORT_HREF = "/ho-chieu";

/**
 * Dòng báo dưới điểm số: đã được đóng dấu vào "Hộ chiếu lịch sử" hay cần bao nhiêu điểm nữa. `scale10`: điểm luyện
 * thi thang 10 (lưu dạng score10 × 100 / 1000) → báo "Đạt từ 7 điểm" thay vì "700/1000".
 */
export function StampNotice({ score, total, scale10 = false, className }: { score: number; total: number; scale10?: boolean; className?: string }) {
  const passed = isPassing(score, total);
  const needed = scale10 ? `${PASS_RATIO * 10} điểm` : `${Math.ceil(total * PASS_RATIO - 1e-9)}/${total}`;
  return (
    <p className={cn("flex items-center gap-2 text-sm", passed ? "font-medium text-foreground" : "text-muted-foreground", className)}>
      <Stamp className={cn("h-4 w-4 shrink-0", passed ? "text-accent" : "text-muted-foreground")} aria-hidden="true" />
      <span>
        {passed ? "Em đã được đóng dấu vào " : `Đạt từ ${needed} để được đóng dấu vào `}
        <Link href={PASSPORT_HREF} className="text-accent underline">
          Hộ chiếu lịch sử
        </Link>
        {passed ? "!" : "."}
      </span>
    </p>
  );
}
