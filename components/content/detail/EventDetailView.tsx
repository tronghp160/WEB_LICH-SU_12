import Link from "next/link";
import { ArrowLeft, ArrowRight, PlayCircle } from "lucide-react";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { BeforeAfterSlider } from "@/components/content/BeforeAfterSlider";
import { DetailCover } from "@/components/content/DetailCover";
import { LightboxProvider } from "@/components/content/Lightbox";
import { DatePrecisionBadge } from "@/components/content/DatePrecisionBadge";
import { EventCard } from "@/components/content/EventCard";
import { MediaFigure, MediaGallery } from "@/components/content/MediaGallery";
import { RichContent } from "@/components/content/RichContent";
import { SourceList } from "@/components/content/SourceList";
import { TopicBadge } from "@/components/content/TopicBadge";
import { MiniMapLazy } from "@/components/map/MiniMapLazy";
import { SgkPlacementNote } from "@/components/sgk/SgkPlacementNote";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getLessonForEvent } from "@/lib/lessons";
import { arrangeMedia } from "@/lib/media";
import type { EventDetail } from "@/lib/queries/event-detail";
import type { TimelineEvent } from "@/lib/queries/events";
import { parseRichText } from "@/lib/utils/rich-text";
import { formatLifespan } from "@/lib/utils/text";

type EventDetailViewProps = {
  event: EventDetail;
  previous?: TimelineEvent;
  next?: TimelineEvent;
  sameTopic?: TimelineEvent[];
  /**
   * Chế độ xem trước ở màn hình duyệt (Phase 11): bố cục một cột vừa khung, không có breadcrumb,
   * và các nhân vật/địa điểm liên kết CHƯA công bố được gắn nhãn (trang công khai sẽ ẩn chúng).
   */
  preview?: boolean;
};

function NotPublishedBadge() {
  return (
    <Badge variant="outline" className="shrink-0">
      Chưa công bố
    </Badge>
  );
}

/** Nội dung trang chi tiết sự kiện (UC05) — dùng chung cho trang công khai và xem trước ở màn hình duyệt. */
export function EventDetailView({ event, previous, next, sameTopic = [], preview = false }: EventDetailViewProps) {
  const sections = parseRichText(event.content);
  const structured = sections.some((section) => section.heading !== null);
  const { cover, pairs, gallery } = arrangeMedia(event.media);
  // Nội dung có các mục: đặt ảnh xen sau mỗi mục thường (bỏ mục cuối và các hộp "Câu chuyện nhỏ"/"Em có biết?"),
  // phần ảnh còn lại dồn xuống "Hình ảnh và tư liệu".
  const galleryImages = gallery.filter((item) => item.type === "image");
  const slots = structured
    ? sections
        .map((section, index) => ({ section, index }))
        .filter(({ section, index }) => index < sections.length - 1 && section.heading !== null && !/^(câu chuyện|em có biết)/i.test(section.heading))
        .map(({ index }) => index)
    : [];
  const inline = new Map(slots.slice(0, galleryImages.length).map((sectionIndex, i) => [sectionIndex, galleryImages[i]]));
  const inlineIds = new Set([...inline.values()].map((item) => item.id));
  const remaining = gallery.filter((item) => !inlineIds.has(item.id));
  // Bài học tương tác chỉ dành cho trang công khai (không hiện ở màn hình xem trước của kiểm duyệt viên).
  const lesson = preview ? undefined : getLessonForEvent(event.slug);
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
    <LightboxProvider items={event.media}>
    <article className={preview ? "" : "mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6"}>
      {!preview && (
        <Breadcrumb
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Dòng thời gian", href: "/dong-thoi-gian" },
            { label: event.title },
          ]}
        />
      )}

      <header className={cover ? "" : preview ? "max-w-3xl" : "mt-4 max-w-3xl"}>
        {cover ? (
          // Ảnh thật đi trước: ảnh bìa toàn chiều ngang, tiêu đề chồng lên ảnh.
          <DetailCover cover={cover}>
            <EventHeading event={event} onImage />
          </DetailCover>
        ) : (
          <EventHeading event={event} />
        )}
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{event.summary}</p>
        {!preview && <SgkPlacementNote eventSlug={event.slug} />}
        {lesson && (
          <Link
            href={`/bai-hoc/${lesson.slug}`}
            className="mt-6 inline-flex items-center gap-3 rounded-card border-2 border-accent bg-surface px-5 py-3 font-semibold text-accent shadow-card transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <PlayCircle className="h-6 w-6" aria-hidden="true" />
            <span>
              Xem chuyên đề tương tác
              <span className="block text-sm font-normal">Bản đồ diễn biến, ảnh tư liệu, video và thẻ ghi nhớ</span>
            </span>
          </Link>
        )}
      </header>

      <div className={preview ? "mt-8 flex flex-col gap-10" : "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]"}>
        <div className="flex min-w-0 flex-col gap-10">
          {structured ? (
            <RichContent
              sections={sections}
              between={(index) => {
                const item = inline.get(index);
                return item ? (
                  <div className="max-w-3xl overflow-hidden rounded-card border border-border bg-surface">
                    <MediaFigure item={item} wide />
                  </div>
                ) : null;
              }}
            />
          ) : (
            sections.length > 0 && (
              <section aria-labelledby="noi-dung">
                <h2 id="noi-dung" className="mb-4 font-serif text-2xl font-bold text-foreground">
                  Nội dung
                </h2>
                <RichContent sections={sections} />
              </section>
            )
          )}

          {pairs.length > 0 && (
            <section aria-labelledby="xua-va-nay">
              <h2 id="xua-va-nay" className="mb-1 font-serif text-2xl font-bold text-foreground">
                Xưa và nay
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">Kéo thanh giữa ảnh để so sánh nơi này năm ấy và bây giờ.</p>
              <div className="flex flex-col gap-8">
                {pairs.map((pair) => (
                  <BeforeAfterSlider key={pair.before.id} before={pair.before} after={pair.after} />
                ))}
              </div>
            </section>
          )}

          {remaining.length > 0 && (
            <section aria-labelledby="tu-lieu">
              <h2 id="tu-lieu" className="mb-4 font-serif text-2xl font-bold text-foreground">
                Hình ảnh và tư liệu
              </h2>
              <MediaGallery media={remaining} />
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
                      {preview && location.status !== "published" && <NotPublishedBadge />}
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
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {[lifespan, figure.relationship].filter(Boolean).join(" · ")}
                        {preview && figure.status !== "published" && <NotPublishedBadge />}
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
    </LightboxProvider>
  );
}

/** Nhãn, tiêu đề và ngày tháng của sự kiện; onImage: chữ sáng để đặt chồng lên ảnh bìa. */
function EventHeading({ event, onImage = false }: { event: EventDetail; onImage?: boolean }) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {event.isFeatured && (
          <Badge variant="accent" className="shrink-0">
            Nổi bật
          </Badge>
        )}
        {event.topicName && <TopicBadge name={event.topicName} slug={event.topicSlug} />}
        {event.secondaryTopics.map((topic) => (
          <TopicBadge key={topic.slug} name={topic.name} slug={topic.slug} />
        ))}
      </div>
      <h1
        className={
          onImage
            ? "max-w-3xl text-balance font-serif text-3xl font-bold text-white drop-shadow sm:text-5xl"
            : "text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl"
        }
      >
        {event.title}
      </h1>
      <p
        className={
          onImage
            ? "mt-3 flex flex-wrap items-center gap-2 text-lg font-medium text-[#f3d9a4]"
            : "mt-3 flex flex-wrap items-center gap-2 text-lg font-medium text-gold-deep"
        }
      >
        {event.dateText}
        <DatePrecisionBadge precision={event.datePrecision} />
      </p>
    </>
  );
}
