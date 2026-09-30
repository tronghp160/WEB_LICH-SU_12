import { Stamp } from "lucide-react";
import Link from "next/link";
import { isPassing, PASS_RATIO } from "@/lib/progress/progress";
import { cn } from "@/lib/utils/cn";

export const PASSPORT_HREF = "/ho-chieu";

/** Dòng báo dưới điểm số: đã được đóng dấu vào "Hộ chiếu lịch sử" hay cần bao nhiêu điểm nữa. */
export function StampNotice({ score, total, className }: { score: number; total: number; className?: string }) {
  const passed = isPassing(score, total);
  const needed = Math.ceil(total * PASS_RATIO - 1e-9);
  return (
    <p className={cn("flex items-center gap-2 text-sm", passed ? "font-medium text-foreground" : "text-muted-foreground", className)}>
      <Stamp className={cn("h-4 w-4 shrink-0", passed ? "text-accent" : "text-muted-foreground")} aria-hidden="true" />
      <span>
        {passed ? "Em đã được đóng dấu vào " : `Đạt từ ${needed}/${total} để được đóng dấu vào `}
        <Link href={PASSPORT_HREF} className="text-accent underline">
          Hộ chiếu lịch sử
        </Link>
        {passed ? "!" : "."}
      </span>
    </p>
  );
}
