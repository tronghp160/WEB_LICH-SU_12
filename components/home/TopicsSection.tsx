import { Suspense } from "react";
import { TopicCard } from "@/components/content/TopicCard";
import { SectionHeader } from "@/components/home/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { getPublishedTopics } from "@/lib/queries/topics";

async function TopicList() {
  const topics = await getPublishedTopics();

  if (topics.length === 0) {
    return (
      <EmptyState
        title="Chưa có chủ đề nào"
        description="Nội dung đang được biên soạn. Vui lòng quay lại sau."
      />
    );
  }

  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {topics.map((topic, index) => (
        <li key={topic.id}>
          <TopicCard
            slug={topic.slug}
            name={topic.name}
            description={topic.description}
            eventCount={topic.eventCount}
            position={index + 1}
          />
        </li>
      ))}
    </ol>
  );
}

function TopicListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải danh sách chủ đề"
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-28 rounded-card" />
      ))}
    </div>
  );
}

/** Lưới chủ đề (UC01). Tiêu đề hiện ngay; danh sách được stream vào sau. */
export function TopicsSection() {
  return (
    <section aria-labelledby="topics-heading" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <SectionHeader
        id="topics-heading"
        title="Các chủ đề trong chương trình"
        description="Chọn một chủ đề để xem các sự kiện liên quan."
      />
      <SectionErrorBoundary title="Không tải được danh sách chủ đề">
        <Suspense fallback={<TopicListSkeleton />}>
          <TopicList />
        </Suspense>
      </SectionErrorBoundary>
    </section>
  );
}
