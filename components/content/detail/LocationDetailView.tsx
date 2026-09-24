import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { CompactTimeline } from "@/components/content/CompactTimeline";
import { MiniMapLazy } from "@/components/map/MiniMapLazy";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LocationDetail } from "@/lib/queries/locations";
import { splitParagraphs } from "@/lib/utils/text";

type LocationDetailViewProps = {
  location: LocationDetail;
  /** Xem trước ở màn hình duyệt: bố cục một cột vừa khung, không breadcrumb. */
  preview?: boolean;
};

/** Nội dung trang chi tiết địa điểm (UC05) — dùng chung cho trang công khai và xem trước ở màn hình duyệt. */
export function LocationDetailView({ location, preview = false }: LocationDetailViewProps) {
  const paragraphs = splitParagraphs(location.description);
  const hasCoordinates = location.latitude !== null && location.longitude !== null;

  return (
    <article className={preview ? "" : "mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6"}>
      {!preview && (
        <Breadcrumb
          items={[{ label: "Trang chủ", href: "/" }, { label: "Địa điểm" }, { label: location.name }]}
        />
      )}

      <header className={preview ? "max-w-3xl" : "mt-4 max-w-3xl"}>
        <h1 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
          {location.name}
        </h1>
        {location.historicalName && (
          <p className="mt-2 text-lg text-gold-deep">Tên lịch sử: {location.historicalName}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Độ chính xác tọa độ:</span>
          <AccuracyBadge level={location.accuracyLevel} />
        </div>
        {location.accuracyNote && (
          <p className="mt-2 text-sm text-muted-foreground">{location.accuracyNote}</p>
        )}
      </header>

      <div className={preview ? "mt-8 flex flex-col gap-10" : "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]"}>
        <div className="flex min-w-0 flex-col gap-10">
          {paragraphs.length > 0 && (
            <section aria-labelledby="gioi-thieu">
              <h2 id="gioi-thieu" className="mb-4 font-serif text-2xl font-bold text-foreground">
                Giới thiệu
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

          <section aria-labelledby="su-kien-tai-day">
            <h2 id="su-kien-tai-day" className="mb-4 font-serif text-2xl font-bold text-foreground">
              Sự kiện tại địa điểm này
            </h2>
            {location.events.length > 0 ? (
              <CompactTimeline
                label={`Sự kiện diễn ra tại ${location.name}`}
                events={location.events.map((event) => ({
                  ...event,
                  note: event.isPrimary ? "Địa điểm chính" : event.role,
                }))}
              />
            ) : (
              <EmptyState
                title="Chưa có sự kiện"
                description="Chưa có sự kiện đã công bố nào gắn với địa điểm này."
              />
            )}
          </section>
        </div>

        <aside aria-label="Vị trí trên bản đồ">
          {hasCoordinates ? (
            <MiniMapLazy
              locations={[
                {
                  slug: location.slug,
                  name: location.name,
                  latitude: location.latitude!,
                  longitude: location.longitude!,
                  accuracyLevel: location.accuracyLevel,
                  isCurrent: true,
                },
              ]}
              fullMapHref={`/ban-do?dia-diem=${location.slug}`}
            />
          ) : (
            <p className="rounded-card border border-dashed border-border p-4 text-sm text-muted-foreground">
              Địa điểm này chưa có tọa độ nên chưa hiển thị trên bản đồ.
            </p>
          )}
        </aside>
      </div>
    </article>
  );
}
