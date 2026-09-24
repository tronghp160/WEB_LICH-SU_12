import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailView } from "@/components/content/detail/EventDetailView";
import { getEventDetail } from "@/lib/queries/event-detail";
import { getTimelineEvents, type TimelineEvent } from "@/lib/queries/events";
import { truncateForMeta } from "@/lib/utils/text";

type EventPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventDetail(slug);
  if (!event) return { title: "Không tìm thấy nội dung" };

  const description = truncateForMeta(event.summary);
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, type: "article" },
  };
}

/** Danh sách sự kiện cho "trước/sau" và "cùng chủ đề". Nội dung phụ: lỗi thì bỏ qua, không làm hỏng trang. */
async function loadTimelineQuietly(): Promise<TimelineEvent[]> {
  try {
    return await getTimelineEvents();
  } catch {
    return [];
  }
}

/** Sự kiện trước/sau trên dòng thời gian + sự kiện cùng chủ đề (hàm thuần trên danh sách đã sắp theo thời gian). */
function pickNeighbours(all: TimelineEvent[], slug: string, topicSlug: string | undefined) {
  const index = all.findIndex((event) => event.slug === slug);
  return {
    previous: index > 0 ? all[index - 1] : undefined,
    next: index >= 0 ? all[index + 1] : undefined,
    sameTopic: topicSlug
      ? all.filter((event) => event.topicSlug === topicSlug && event.slug !== slug).slice(0, 3)
      : [],
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  // Hai truy vấn độc lập → chạy SONG SONG (trước đây tuần tự làm thời gian phản hồi gấp đôi). Chi tiết sự kiện
  // đã được `generateMetadata` nạp cùng request nhờ React cache nên không tốn thêm lượt gọi.
  const [event, timeline] = await Promise.all([getEventDetail(slug), loadTimelineQuietly()]);
  if (!event) notFound();

  const { previous, next, sameTopic } = pickNeighbours(timeline, slug, event.topicSlug);
  return <EventDetailView event={event} previous={previous} next={next} sameTopic={sameTopic} />;
}
