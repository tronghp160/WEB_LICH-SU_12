import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TopicBadge } from "@/components/content/TopicBadge";
import { DatePrecisionBadge } from "@/components/content/DatePrecisionBadge";
import type { EventSummary } from "@/lib/queries/events";

export type EventCardProps = EventSummary & {
  /**
   * Hiện badge "Nổi bật" khi sự kiện là nổi bật (mặc định: có). Tắt trong các
   * khu vực vốn chỉ liệt kê sự kiện nổi bật, nơi badge này chỉ lặp thừa.
   */
  showFeaturedBadge?: boolean;
};

/**
 * Thẻ tóm tắt một sự kiện — dùng ở trang chủ, dòng thời gian, tra cứu.
 * Toàn bộ thẻ bấm được (liên kết "trải rộng" qua ::after của tiêu đề), riêng
 * badge chủ đề nằm cao hơn (z-10) để vẫn bấm được độc lập.
 */
export function EventCard({
  slug,
  title,
  summary,
  dateText,
  datePrecision,
  isFeatured,
  topicName,
  topicSlug,
  showFeaturedBadge = true,
}: EventCardProps) {
  const showFeatured = showFeaturedBadge && isFeatured;
  const hasBadges = showFeatured || Boolean(topicName) || datePrecision !== "exact";

  return (
    <Card className="relative flex h-full flex-col gap-2 p-4 transition-shadow hover:shadow-lg">
      {hasBadges && (
        // Một dòng, không xuống hàng: badge chủ đề dài tự rút gọn "…", các nhãn
        // còn lại (shrink-0) luôn hiện đủ.
        <div className="flex items-center gap-2">
          {showFeatured && (
            <Badge variant="accent" className="shrink-0">
              Nổi bật
            </Badge>
          )}
          {topicName && <TopicBadge name={topicName} slug={topicSlug} />}
          <DatePrecisionBadge precision={datePrecision} />
        </div>
      )}
      <h3 className="text-balance font-serif text-lg font-semibold text-surface-foreground">
        <Link
          href={`/su-kien/${slug}`}
          className="after:absolute after:inset-0 after:rounded-card after:content-[''] hover:text-accent focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-gold"
        >
          {title}
        </Link>
      </h3>
      <p className="line-clamp-2 text-sm font-medium text-gold-deep">{dateText}</p>
      <p className="line-clamp-3 text-sm text-muted-foreground">{summary}</p>
    </Card>
  );
}
