import Link from "next/link";
import type { SgkPlacement } from "@/lib/sgk/curriculum";
import { sgkPaths } from "@/lib/sgk/curriculum";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TopicBadge } from "@/components/content/TopicBadge";
import { DatePrecisionBadge } from "@/components/content/DatePrecisionBadge";
import { SafeImage } from "@/components/ui/SafeImage";
import type { EventSummary } from "@/lib/queries/events";
import { responsiveImage } from "@/lib/utils/text";

export type EventCardProps = EventSummary & {
  /**
   * Hiện badge "Nổi bật" khi sự kiện là nổi bật (mặc định: có). Tắt trong các
   * khu vực vốn chỉ liệt kê sự kiện nổi bật, nơi badge này chỉ lặp thừa.
   */
  showFeaturedBadge?: boolean;
  /** Ẩn ảnh đầu thẻ (khu vực đã có ảnh lớn khác hoặc cần danh sách gọn). */
  hideImage?: boolean;
  /** Ẩn nhãn chủ đề (trang Bài SGK: đã biết thuộc bài nào, nhãn tên chủ đề dài chỉ gây nhiễu — V-34). */
  hideTopic?: boolean;
  /** Sự kiện thuộc Bài SGK nào: hiện nhãn ngắn "Bài 7" (màu chủ đề) THAY cho tên chủ đề dài (V-34). */
  placements?: SgkPlacement[];
  /**
   * Hành động phụ dưới thẻ (ví dụ "Xem trên bản đồ"). Được nâng lên z-10 nên
   * bấm được độc lập với liên kết trải rộng của cả thẻ.
   */
  children?: ReactNode;
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
  year,
  cover,
  showFeaturedBadge = true,
  hideImage = false,
  hideTopic = false,
  placements,
  children,
}: EventCardProps) {
  const showFeatured = showFeaturedBadge && isFeatured;
  const lessonsOfEvent = [...new Map((placements ?? []).map((item) => [item.lesson.slug, item])).values()];
  const showLessons = lessonsOfEvent.length > 0;
  const showTopic = !hideTopic && !showLessons && Boolean(topicName);
  const hasBadges = showFeatured || showTopic || showLessons || datePrecision !== "exact";

  return (
    <Card className="group relative flex h-full flex-col gap-2 overflow-hidden p-4 transition-shadow hover:shadow-lg">
      {!hideImage && (
        // Ảnh đầu thẻ tràn viền (bù padding của Card); không có ảnh thì hiện năm lớn trên nền màu.
        <div className="-mx-4 -mt-4 mb-2 aspect-[16/9] overflow-hidden bg-muted">
          {cover ? (
            <SafeImage
              {...responsiveImage(cover.url, 480)}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              alt={cover.alt}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={cover.focalPoint ? { objectPosition: cover.focalPoint } : undefined}
              fallbackClassName="h-full w-full"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-full w-full items-end bg-gradient-to-br from-gold/25 via-muted to-accent/15 p-4"
            >
              <span className="font-serif text-5xl font-bold text-gold-deep/80">{year ?? ""}</span>
            </div>
          )}
        </div>
      )}
      {hasBadges && (
        // Một dòng, không xuống hàng: badge chủ đề dài tự rút gọn "…", các nhãn
        // còn lại (shrink-0) luôn hiện đủ.
        <div className="flex items-center gap-2">
          {showFeatured && (
            <Badge variant="accent" className="shrink-0">
              Nổi bật
            </Badge>
          )}
          {showTopic && topicName && <TopicBadge name={topicName} slug={topicSlug} />}
          {lessonsOfEvent.map(({ lesson, section }) => (
            <Link
              key={lesson.slug}
              href={sgkPaths.section(lesson.slug, section.id)}
              data-topic-color={lesson.topic.color}
              title={`Bài ${lesson.number}. ${lesson.title}`}
              className="relative z-10 inline-flex shrink-0 items-center rounded-md border border-[var(--topic)] px-2 py-0.5 text-xs font-semibold text-[var(--topic)] hover:bg-[var(--topic)] hover:text-background"
            >
              Bài {lesson.number}
            </Link>
          ))}
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
      {children && <div className="relative z-10 mt-auto pt-2">{children}</div>}
    </Card>
  );
}
