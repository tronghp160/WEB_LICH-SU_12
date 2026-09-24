import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompactTimeline } from "@/components/content/CompactTimeline";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const events = (await getTimelineEvents()).filter((event) => event.topicSlug === topic.slug);

  return (
    <article className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb
        items={[{ label: "Trang chủ", href: "/" }, { label: "Chủ đề" }, { label: topic.name }]}
      />

      <header className="mt-4 max-w-3xl">
        <h1 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
          {topic.name}
        </h1>
        {topic.description && <p className="mt-3 text-lg text-muted-foreground">{topic.description}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton href={`/dong-thoi-gian?chu-de=${topic.slug}`} variant="secondary" size="sm">
            Xem trên dòng thời gian
          </LinkButton>
          <LinkButton href={`/ban-do?chu-de=${topic.slug}`} variant="secondary" size="sm">
            Xem trên bản đồ
          </LinkButton>
        </div>
      </header>

      <section aria-labelledby="su-kien-chu-de" className="mt-10">
        <h2 id="su-kien-chu-de" className="mb-6 font-serif text-2xl font-bold text-foreground">
          Sự kiện trong chủ đề ({events.length})
        </h2>
        {events.length > 0 ? (
          <CompactTimeline label={`Sự kiện thuộc chủ đề ${topic.name}`} events={events} />
        ) : (
          <EmptyState
            title="Chưa có sự kiện"
            description="Chủ đề này chưa có sự kiện nào được công bố."
          />
        )}
      </section>
    </article>
  );
}
