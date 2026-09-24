import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TopicBadge } from "@/components/content/TopicBadge";
import { DatePrecisionBadge } from "@/components/content/DatePrecisionBadge";
import type { DatePrecision } from "@/lib/utils/labels";

export type EventCardProps = {
  slug: string;
  title: string;
  summary: string;
  dateText: string;
  datePrecision: DatePrecision;
  isFeatured?: boolean;
  topicName?: string;
  topicSlug?: string;
};

/** Thẻ tóm tắt một sự kiện — dùng ở trang chủ, dòng thời gian, tra cứu. */
export function EventCard({
  slug,
  title,
  summary,
  dateText,
  datePrecision,
  isFeatured,
  topicName,
  topicSlug,
}: EventCardProps) {
  return (
    <Card className="flex flex-col gap-2 p-4 transition-shadow hover:shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        {isFeatured && <Badge variant="accent">Nổi bật</Badge>}
        {topicName && <TopicBadge name={topicName} slug={topicSlug} />}
        <DatePrecisionBadge precision={datePrecision} />
      </div>
      <Link href={`/su-kien/${slug}`} className="group">
        <h3 className="font-serif text-lg font-semibold text-surface-foreground group-hover:text-accent">
          {title}
        </h3>
      </Link>
      <p className="text-sm font-medium text-gold">{dateText}</p>
      <p className="line-clamp-3 text-sm text-muted-foreground">{summary}</p>
    </Card>
  );
}
