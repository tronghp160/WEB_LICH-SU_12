import Link from "next/link";
import { DatePrecisionBadge } from "@/components/content/DatePrecisionBadge";
import { SafeImage } from "@/components/ui/SafeImage";
import type { RelatedEvent } from "@/lib/queries/events";
import { responsiveImage } from "@/lib/utils/text";
import { groupEventsByYear } from "@/lib/utils/timeline";

type CompactTimelineProps = {
  events: (RelatedEvent & { note?: string | null })[];
  /** Nhãn cho trình đọc màn hình, ví dụ "Sự kiện của chủ đề". */
  label: string;
};

/**
 * Dòng thời gian thu gọn (trục dọc, mỗi sự kiện một dòng) cho trang chủ đề,
 * nhân vật, địa điểm. Bản đầy đủ có lọc/nhảy nhanh nằm ở /dong-thoi-gian.
 * Sự kiện đã được sắp theo thời gian từ query.
 */
export function CompactTimeline({ events, label }: CompactTimelineProps) {
  const groups = groupEventsByYear(events);

  return (
    <ol aria-label={label} className="ml-2">
      {groups.map((group) => (
        <li
          key={group.year}
          className="relative border-l-2 border-border pb-6 pl-6 last:pb-0 sm:pl-8"
        >
          <span
            aria-hidden="true"
            className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-4 border-background bg-accent"
          />
          <h3 className="font-serif text-2xl font-bold leading-none text-accent">{group.year}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {group.events.map((event) => (
              <li key={event.slug}>
                <Link
                  href={`/su-kien/${event.slug}`}
                  className="group flex gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {event.cover && (
                    <SafeImage
                      {...responsiveImage(event.cover.url, 200)}
                      sizes="96px"
                      alt=""
                      className="mt-1 aspect-[4/3] w-20 shrink-0 rounded-md bg-muted object-cover sm:w-24"
                      style={event.cover.focalPoint ? { objectPosition: event.cover.focalPoint } : undefined}
                      fallbackClassName="mt-1 aspect-[4/3] w-20 shrink-0 rounded-md sm:w-24"
                    />
                  )}
                  <span className="block min-w-0">
                  <span className="font-serif text-lg font-semibold text-foreground group-hover:text-accent">
                    {event.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-gold-deep">{event.dateText}</span>
                    <DatePrecisionBadge precision={event.datePrecision} />
                  </span>
                  {event.note && (
                    <span className="mt-0.5 block text-sm italic text-muted-foreground">
                      {event.note}
                    </span>
                  )}
                  <span className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {event.summary}
                  </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
