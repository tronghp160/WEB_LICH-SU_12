import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { EventCard } from "@/components/content/EventCard";
import { SectionHeader } from "@/components/home/SectionHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { getFeaturedEvents } from "@/lib/queries/events";

async function FeaturedEventList() {
  const events = await getFeaturedEvents();

  if (events.length === 0) {
    return (
      <EmptyState
        title="Chưa có sự kiện nổi bật"
        description="Hiện chưa có sự kiện nổi bật nào được công bố. Bạn vẫn có thể xem toàn bộ sự kiện trên dòng thời gian."
        action={
          <LinkButton href="/dong-thoi-gian" variant="secondary">
            Xem dòng thời gian
          </LinkButton>
        }
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li key={event.slug}>
          {/* Cả khu vực này đều là sự kiện nổi bật → badge "Nổi bật" trên từng thẻ là thừa. */}
          <EventCard {...event} showFeaturedBadge={false} />
        </li>
      ))}
    </ul>
  );
}

function FeaturedEventListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải sự kiện nổi bật"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-44 rounded-card" />
      ))}
    </div>
  );
}

/** Dải sự kiện nổi bật (UC01), theo thứ tự thời gian. Tiêu đề hiện ngay; danh sách stream vào sau. */
export function FeaturedEventsSection() {
  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6"
    >
      <SectionHeader
        id="featured-heading"
        title="Sự kiện nổi bật"
        description="Những dấu mốc tiêu biểu, sắp theo thứ tự thời gian."
        action={
          <LinkButton href="/dong-thoi-gian" variant="secondary" size="sm">
            Xem toàn bộ dòng thời gian
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </LinkButton>
        }
      />
      <SectionErrorBoundary title="Không tải được sự kiện nổi bật">
        <Suspense fallback={<FeaturedEventListSkeleton />}>
          <FeaturedEventList />
        </Suspense>
      </SectionErrorBoundary>
    </section>
  );
}
