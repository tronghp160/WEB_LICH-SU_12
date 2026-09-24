import { Badge } from "@/components/ui/Badge";
import { accuracyLevelLabels, type AccuracyLevel } from "@/lib/utils/labels";

type AccuracyBadgeProps = {
  level: AccuracyLevel;
};

/**
 * Độ chính xác toạ độ địa điểm — luôn hiển thị để trung thực dữ liệu (Mục 6).
 * `shrink-0`: nhãn này thể hiện độ tin cậy của dữ liệu nên không bao giờ bị cắt "…".
 */
export function AccuracyBadge({ level }: AccuracyBadgeProps) {
  const variant = level === "exact" ? "gold" : "outline";

  return (
    <Badge variant={variant} className="shrink-0">
      {accuracyLevelLabels[level]}
    </Badge>
  );
}
