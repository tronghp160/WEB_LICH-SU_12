import { Badge } from "@/components/ui/Badge";
import { accuracyLevelLabels, type AccuracyLevel } from "@/lib/utils/labels";

type AccuracyBadgeProps = {
  level: AccuracyLevel;
};

/** Độ chính xác toạ độ địa điểm — luôn hiển thị để trung thực dữ liệu (Mục 6). */
export function AccuracyBadge({ level }: AccuracyBadgeProps) {
  const variant = level === "exact" ? "gold" : "outline";

  return <Badge variant={variant}>{accuracyLevelLabels[level]}</Badge>;
}
