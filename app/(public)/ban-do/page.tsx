import type { Metadata } from "next";
import { Suspense } from "react";
import { MapExplorer } from "@/components/map/MapExplorer";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { getMapLocations } from "@/lib/queries/locations";
import { getPublishedTopics } from "@/lib/queries/topics";

export const metadata: Metadata = {
  title: "Bản đồ",
  description:
    "Khám phá nơi diễn ra các sự kiện lịch sử Việt Nam lớp 12 trên bản đồ, lọc theo chủ đề và tìm địa điểm trong một bán kính.",
};

async function MapContent() {
  const [locations, topics] = await Promise.all([getMapLocations(), getPublishedTopics()]);

  if (locations.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Chưa có địa điểm nào trên bản đồ"
          description="Nội dung đang được biên soạn. Vui lòng quay lại sau."
        />
      </div>
    );
  }

  return (
    <MapExplorer
      locations={locations}
      topics={topics
        .filter((topic) => topic.eventCount > 0)
        .map((topic) => ({ slug: topic.slug, name: topic.name, eventCount: topic.eventCount }))}
    />
  );
}

/** Bản đồ GIS (UC03). Khung tải hiện ngay; dữ liệu được stream vào sau. */
export default function MapPage() {
  return (
    <SectionErrorBoundary title="Không tải được bản đồ">
      <Suspense
        fallback={
          <div role="status" aria-label="Đang tải bản đồ">
            <Skeleton className="h-[calc(100dvh-4rem)] min-h-[32rem] w-full rounded-none" />
          </div>
        }
      >
        <MapContent />
      </Suspense>
    </SectionErrorBoundary>
  );
}
