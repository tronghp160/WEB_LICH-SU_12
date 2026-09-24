import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { DatePrecisionBadge } from "@/components/content/DatePrecisionBadge";
import { EventCard } from "@/components/content/EventCard";
import { MediaGallery } from "@/components/content/MediaGallery";
import { SourceList } from "@/components/content/SourceList";
import { TopicBadge } from "@/components/content/TopicBadge";
import { MiniMapLazy } from "@/components/map/MiniMapLazy";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getEventDetail } from "@/lib/queries/event-detail";
import { getTimelineEvents, type TimelineEvent } from "@/lib/queries/events";
import { formatLifespan, splitParagraphs, truncateForMeta } from "@/lib/utils/text";

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

/** Sự kiện trước/sau trên dòng thời gian + sự kiện cùng chủ đề. Nội dung phụ: lỗi thì bỏ qua, không làm hỏng trang. */
async function getNeighbours(slug: string, topicSlug: string | undefined) {
  let all: TimelineEvent[] = [];
  try {
    all = await getTimelineEvents();
  } catch {
    return { previous: undefined, next: undefined, sameTopic: [] };
  }
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
  const event = await getEventDetail(slug);
  if (!event) notFound();

  const { previous, next, sameTopic } = await getNeighbours(slug, event.topicSlug);
  const paragraphs = splitParagraphs(event.content);
  const mapLocations = event.locations.flatMap((location) =>
    location.latitude !== null && location.longitude !== null
      ? [
          {
            slug: location.slug,
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracyLevel: location.accuracyLevel,
            role: location.role,
            isPrimary: location.isPrimary,
          },
        ]
      : [],
  );

  return (
    <article className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Dòng thời gian", href: "/dong-thoi-gian" },
          { label: event.title },
        ]}
      />

      <header className="mt-4 max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {event.isFeatured && (
            <Badge variant="accent" className="shrink-0">
              Nổi bật
            </Badge>
          )}
          {event.topicName && <TopicBadge name={event.topicName} slug={event.topicSlug} />}
        </div>
        <h1 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
          {event.title}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-lg font-medium text-gold-deep">
          {event.dateText}
          <DatePrecisionBadge precision={event.datePrecision} />
        </p>
        <p className="mt-4 text-lg text-muted-foreground">{event.summary}</p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {paragraphs.length > 0 && (
            <section aria-labelledby="noi-dung">
              <h2 id="noi-dung" className="mb-4 font-serif text-2xl font-bold text-foreground">
                Nội dung
              </h2>
              <div className="flex max-w-3xl flex-col gap-4 leading-relaxed text-foreground">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          )}

          {event.media.length > 0 && (
            <section aria-labelledby="tu-lieu">
              <h2 id="tu-lieu" className="mb-4 font-serif text-2xl font-bold text-foreground">
                Hình ảnh và tư liệu
              </h2>
              <MediaGallery media={event.media} />
            </section>
          )}

          <section aria-labelledby="nguon">
            <h2 id="nguon" className="mb-4 font-serif text-2xl font-bold text-foreground">
              Nguồn tham khảo
            </h2>
            <SourceList sources={event.sources} />
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-8" aria-label="Thông tin liên quan">
          <section aria-labelledby="dia-diem" className="flex flex-col gap-3">
            <h2 id="dia-diem" className="font-serif text-xl font-bold text-foreground">
              Địa điểm
            </h2>
            {mapLocations.length > 0 && (
              <MiniMapLazy locations={mapLocations} fullMapHref={`/ban-do?su-kien=${event.slug}`} />
            )}
            {event.locations.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {event.locations.map((location) => (
                  <li key={location.slug} className="flex flex-col gap-1">
                    <Link
                      href={`/dia-diem/${location.slug}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {location.name}
                    </Link>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {location.isPrimary && <span>Địa điểm chính</span>}
                      {location.role && <span>{location.role}</span>}
                      <AccuracyBadge level={location.accuracyLevel} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có địa điểm được công bố.</p>
            )}
          </section>

          <section aria-labelledby="nhan-vat" className="flex flex-col gap-3">
            <h2 id="nhan-vat" className="font-serif text-xl font-bold text-foreground">
              Nhân vật
            </h2>
            {event.figures.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {event.figures.map((figure) => {
                  const lifespan = formatLifespan(figure.birthYear, figure.deathYear);
                  return (
                    <li key={figure.slug} className="flex flex-col">
                      <Link
                        href={`/nhan-vat/${figure.slug}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {figure.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {[lifespan, figure.relationship].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có nhân vật được công bố.</p>
            )}
          </section>
        </aside>
      </div>

      {(previous || next) && (
        <nav
          aria-label="Sự kiện trước và sau trên dòng thời gian"
          className="mt-14 grid grid-cols-1 gap-4 border-t border-border pt-8 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={`/su-kien/${previous.slug}`}
              className="group flex flex-col gap-1 rounded-card border border-border bg-surface p-4 hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Sự kiện trước · {previous.dateText}
              </span>
              <span className="font-serif font-semibold text-surface-foreground group-hover:text-accent">
                {previous.title}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {next && (
            <Link
              href={`/su-kien/${next.slug}`}
              className="group flex flex-col items-end gap-1 rounded-card border border-border bg-surface p-4 text-right hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:col-start-2"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Sự kiện sau · {next.dateText}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="font-serif font-semibold text-surface-foreground group-hover:text-accent">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      )}

      {sameTopic.length > 0 && (
        <section aria-labelledby="cung-chu-de" className="mt-12">
          <h2 id="cung-chu-de" className="mb-4 font-serif text-2xl font-bold text-foreground">
            Sự kiện cùng chủ đề
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sameTopic.map((item) => (
              <li key={item.slug}>
                <EventCard {...item} showFeaturedBadge={false} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
