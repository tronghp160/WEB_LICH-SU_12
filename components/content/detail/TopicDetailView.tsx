import { CompactTimeline } from "@/components/content/CompactTimeline";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TimelineEvent } from "@/lib/queries/events";
import type { TopicDetail } from "@/lib/queries/topics";

type TopicDetailViewProps = {
  topic: TopicDetail;
  /** Sự kiện ĐÃ CÔNG BỐ thuộc chủ đề, đã sắp theo thời gian. */
  events: TimelineEvent[];
  /** Xem trước ở màn hình duyệt: không breadcrumb, không nút chuyển trang. */
  preview?: boolean;
};

/** Nội dung trang chi tiết chủ đề (UC05) — dùng chung cho trang công khai và xem trước ở màn hình duyệt. */
export function TopicDetailView({ topic, events, preview = false }: TopicDetailViewProps) {
  return (
    <article className={preview ? "" : "mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6"}>
      {!preview && (
        <Breadcrumb
          items={[{ label: "Trang chủ", href: "/" }, { label: "Chủ đề" }, { label: topic.name }]}
        />
      )}

      <header className={preview ? "max-w-3xl" : "mt-4 max-w-3xl"}>
        <h1 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
          {topic.name}
        </h1>
        {topic.description && <p className="mt-3 text-lg text-muted-foreground">{topic.description}</p>}
        {!preview && (
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href={`/dong-thoi-gian?chu-de=${topic.slug}`} variant="secondary" size="sm">
              Xem trên dòng thời gian
            </LinkButton>
            <LinkButton href={`/ban-do?chu-de=${topic.slug}`} variant="secondary" size="sm">
              Xem trên bản đồ
            </LinkButton>
          </div>
        )}
      </header>

      <section aria-labelledby="su-kien-chu-de" className={preview ? "mt-8" : "mt-10"}>
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
