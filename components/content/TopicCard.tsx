import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SafeImage } from "@/components/ui/SafeImage";
import { responsiveImage } from "@/lib/utils/text";
import type { PublishedTopic } from "@/lib/queries/topics";

type TopicCardProps = Omit<PublishedTopic, "id"> & {
  /** Số thứ tự hiển thị (1-based) theo vị trí trong danh sách, dạng "01". */
  position: number;
};

/** Thẻ chủ đề kiểu "mục lục sách": ảnh đại diện (có số thứ tự) hoặc số thứ tự lớn, tên, mô tả, số sự kiện. */
export function TopicCard({ slug, name, description, eventCount, position, cover }: TopicCardProps) {
  const number = String(position).padStart(2, "0");
  return (
    <Link
      href={`/chu-de/${slug}`}
      className="group block h-full rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <Card className="flex h-full items-start gap-4 p-5 transition-all group-hover:border-gold group-hover:shadow-lg">
        {cover ? (
          <span className="relative block h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted" aria-hidden="true">
            <SafeImage
              {...responsiveImage(cover.url, 200)}
              sizes="96px"
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={cover.focalPoint ? { objectPosition: cover.focalPoint } : undefined}
              fallbackClassName="h-full w-full"
            />
            <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 font-serif text-sm font-bold text-white">
              {number}
            </span>
          </span>
        ) : (
          <span className="font-serif text-3xl font-bold leading-none text-gold-deep" aria-hidden="true">
            {number}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-balance font-serif text-lg font-semibold text-surface-foreground group-hover:text-accent">
            {name}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          )}
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {eventCount > 0 ? `${eventCount} sự kiện` : "Chưa có sự kiện"}
          </p>
        </div>
        <ChevronRight
          className="mt-1 hidden h-5 w-5 shrink-0 text-muted-foreground group-hover:text-accent sm:block"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}
