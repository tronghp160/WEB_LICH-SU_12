import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/content/EventCard";
import { SectionHeader } from "@/components/home/SectionHeader";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { getOnThisDay } from "@/lib/queries/home";

async function OnThisDayContent() {
  const result = await getOnThisDay();
  if (!result) return null;

  const dayLabel = `${result.day}/${result.month}`;
  const lead =
    result.kind === "today"
      ? `Hôm nay, ${dayLabel}`
      : result.kind === "upcoming"
        ? result.distance === 1
          ? `Ngày mai, ${dayLabel}`
          : `Còn ${result.distance} ngày nữa là ${dayLabel}`
        : result.distance === 1
          ? `Hôm qua, ${dayLabel}`
          : `${result.distance} ngày trước, ${dayLabel}`;

  return (
    <>
      <p className="mb-4 flex items-center gap-2 text-sm font-medium text-gold-deep">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        {lead}
        {" — "}
        {result.items.map((item) => `kỷ niệm ${item.yearsAgo} năm ${item.title}`).join("; ")}
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((item) => (
          <li key={item.slug}>
            <EventCard {...item} showFeaturedBadge={false} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** "Hôm nay trong lịch sử": sự kiện đúng ngày hôm nay (giờ Việt Nam) hoặc ngày kỷ niệm gần nhất (vừa qua hoặc sắp tới). */
export function OnThisDaySection() {
  return (
    <section aria-labelledby="on-this-day-heading" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <SectionHeader
        id="on-this-day-heading"
        title="Hôm nay trong lịch sử"
        description="Sự kiện đúng ngày hôm nay, hoặc ngày kỷ niệm gần nhất vừa qua hay sắp tới."
      />
      <SectionErrorBoundary title="Không tải được mục Hôm nay trong lịch sử">
        <Suspense fallback={<Skeleton className="h-64 rounded-card sm:w-1/2 lg:w-1/3" />}>
          <OnThisDayContent />
        </Suspense>
      </SectionErrorBoundary>
    </section>
  );
}
