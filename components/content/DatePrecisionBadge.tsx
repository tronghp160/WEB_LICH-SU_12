import { Badge } from "@/components/ui/Badge";
import { datePrecisionLabels, type DatePrecision } from "@/lib/utils/labels";

type DatePrecisionBadgeProps = {
  precision: DatePrecision;
};

/** Chỉ hiển thị khi mốc thời gian KHÁC "exact" (Mục 6 + Phase 5 checklist). */
export function DatePrecisionBadge({ precision }: DatePrecisionBadgeProps) {
  if (precision === "exact") return null;

  const variant = precision === "disputed" ? "accent" : "outline";

  return <Badge variant={variant}>{datePrecisionLabels[precision]}</Badge>;
}
