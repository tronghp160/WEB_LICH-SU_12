import type { Metadata } from "next";
import { Suspense } from "react";
import { Timeline } from "@/components/timeline/Timeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { getTimelineEvents } from "@/lib/queries/events";
import { getPublishedTopics } from "@/lib/queries/topics";
import { getCurriculum } from "@/lib/queries/sgk";
import { legacyTopicColor, placementsForEvent } from "@/lib/sgk/curriculum";

export const metadata: Metadata = {
  title: "Dòng thời gian",
  description:
    "Các sự kiện lịch sử Việt Nam lớp 12 sắp theo thứ tự thời gian, lọc theo chủ đề và nối sang bản đồ.",
};

async function TimelineContent() {
  const [events, topics, curriculum] = await Promise.all([getTimelineEvents(), getPublishedTopics(), getCurriculum()]);

  if (events.length === 0) {
    return (
      <EmptyState
        title="Chưa có sự kiện nào"
        description="Nội dung đang được biên soạn. Vui lòng quay lại sau."
      />
    );
  }

  return (
    <Timeline
      events={events}
      placements={Object.fromEntries(events.map((event) => [event.slug, placementsForEvent(event.slug, curriculum.lessons)]))}
      topics={topics
        .filter((topic) => topic.eventCount > 0)
        .map((topic) => ({ slug: topic.slug, name: topic.name, eventCount: topic.eventCount, color: legacyTopicColor(topic.slug) }))}
    />
  );
}

function TimelineSkeleton() {
  return (
    <div role="status" aria-label="Đang tải dòng thời gian" className="flex flex-col gap-4">
      <Skeleton className="h-9 w-2/3" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-40 rounded-card" />
      ))}
    </div>
  );
}

/** Dòng thời gian (UC02). Tiêu đề hiện ngay; dữ liệu được stream vào sau. */
export default function TimelinePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Dòng thời gian" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
          Dòng thời gian
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Các sự kiện lịch sử Việt Nam lớp 12 theo thứ tự thời gian. Lọc theo chủ đề, bấm nhãn &ldquo;Bài N&rdquo; để mở bài SGK
          tương ứng, hoặc &ldquo;Xem trên bản đồ&rdquo; để biết sự kiện diễn ra ở đâu.
        </p>
      </header>
      <SectionErrorBoundary title="Không tải được dòng thời gian">
        <Suspense fallback={<TimelineSkeleton />}>
          <TimelineContent />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
