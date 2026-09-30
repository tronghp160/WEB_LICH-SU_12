"use client";

import Link from "next/link";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { SafeImage } from "@/components/ui/SafeImage";
import { responsiveImage } from "@/lib/utils/text";
import type { MapLocation } from "@/lib/queries/locations";

type LocationPopupProps = {
  location: MapLocation;
  onSearchAround: (location: MapLocation) => void;
};

/** Nội dung popup của một địa điểm: tên, độ chính xác, sự kiện liên quan, lối sang trang chi tiết. */
export function LocationPopup({ location, onSearchAround }: LocationPopupProps) {
  return (
    <div className="flex min-w-52 max-w-64 flex-col gap-2 text-surface-foreground">
      {location.cover && (
        <SafeImage
          {...responsiveImage(location.cover.url, 320)}
          sizes="256px"
          alt={location.cover.alt}
          className="aspect-[16/9] w-full rounded-md bg-muted object-cover"
          style={location.cover.focalPoint ? { objectPosition: location.cover.focalPoint } : undefined}
          fallbackClassName="aspect-[16/9] w-full rounded-md"
        />
      )}
      <div>
        <p className="font-serif text-base font-semibold leading-snug">{location.name}</p>
        {location.historicalName && (
          <p className="text-xs text-muted-foreground">Tên lịch sử: {location.historicalName}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AccuracyBadge level={location.accuracyLevel} />
      </div>
      {location.accuracyNote && (
        <p className="text-xs text-muted-foreground">{location.accuracyNote}</p>
      )}

      {location.events.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-border pt-2">
          {location.events.map((event) => (
            <li key={event.slug} className="text-sm leading-snug">
              <Link href={`/su-kien/${event.slug}`} className="font-medium text-accent hover:underline">
                {event.title}
              </Link>
              <span className="block text-xs text-muted-foreground">{event.dateText}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-border pt-2 text-xs text-muted-foreground">
          Chưa có sự kiện đã công bố tại địa điểm này.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2 text-sm">
        <Link href={`/dia-diem/${location.slug}`} className="font-medium text-accent hover:underline">
          Xem địa điểm
        </Link>
        <button
          type="button"
          onClick={() => onSearchAround(location)}
          className="font-medium text-accent hover:underline"
        >
          Tìm quanh đây
        </button>
      </div>
    </div>
  );
}
