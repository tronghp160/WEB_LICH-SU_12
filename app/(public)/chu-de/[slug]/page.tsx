import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopicDetailView } from "@/components/content/detail/TopicDetailView";
import { getTimelineEvents } from "@/lib/queries/events";
import { getTopicDetail } from "@/lib/queries/topics";
import { truncateForMeta } from "@/lib/utils/text";

type TopicPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicDetail(slug);
  if (!topic) return { title: "Không tìm thấy nội dung" };

  const description = truncateForMeta(
    topic.description ?? `Các sự kiện thuộc chủ đề ${topic.name} trong Lịch sử Việt Nam lớp 12.`,
  );
  return {
    title: topic.name,
    description,
    openGraph: { title: topic.name, description, type: "website" },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = await getTopicDetail(slug);
  if (!topic) notFound();

  // Dòng thời gian đã sắp sẵn theo thời gian; chỉ giữ sự kiện của chủ đề này.
  const events = (await getTimelineEvents()).filter((event) => event.topicSlugs.includes(topic.slug));

  return <TopicDetailView topic={topic} events={events} />;
}
