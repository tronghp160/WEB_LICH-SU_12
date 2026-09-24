import { CompactTimeline } from "@/components/content/CompactTimeline";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { SafeImage } from "@/components/ui/SafeImage";
import type { FigureDetail } from "@/lib/queries/figures";
import { formatLifespan, resizeCommonsImage, splitParagraphs } from "@/lib/utils/text";

type FigureDetailViewProps = {
  figure: FigureDetail;
  /** Xem trước ở màn hình duyệt: bố cục một cột vừa khung, không breadcrumb. */
  preview?: boolean;
};

/** Nội dung trang chi tiết nhân vật (UC05) — dùng chung cho trang công khai và xem trước ở màn hình duyệt. */
export function FigureDetailView({ figure, preview = false }: FigureDetailViewProps) {
  const lifespan = formatLifespan(figure.birthYear, figure.deathYear);
  const paragraphs = splitParagraphs(figure.biography);

  return (
    <article className={preview ? "" : "mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6"}>
      {!preview && (
        <Breadcrumb
          items={[{ label: "Trang chủ", href: "/" }, { label: "Nhân vật" }, { label: figure.name }]}
        />
      )}

      <header className={preview ? "flex flex-col gap-6 sm:flex-row sm:items-start" : "mt-4 flex flex-col gap-6 sm:flex-row sm:items-start"}>
        {figure.portraitUrl && (
          <SafeImage
            src={resizeCommonsImage(figure.portraitUrl, 400)}
            alt={`Chân dung ${figure.name}`}
            className="aspect-[3/4] w-40 shrink-0 rounded-card border border-border bg-muted object-cover sm:w-48"
            fallbackClassName="aspect-[3/4] w-40 shrink-0 rounded-card border border-border sm:w-48"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-balance font-serif text-3xl font-bold text-foreground sm:text-4xl">
            {figure.name}
          </h1>
          {lifespan && <p className="mt-2 text-lg font-medium text-gold-deep">{lifespan}</p>}
          {figure.otherNames && (
            <p className="mt-1 text-muted-foreground">Còn được biết đến: {figure.otherNames}</p>
          )}
        </div>
      </header>

      <div className={preview ? "mt-8 flex flex-col gap-10" : "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]"}>
        <section aria-labelledby="tieu-su">
          <h2 id="tieu-su" className="mb-4 font-serif text-2xl font-bold text-foreground">
            Tiểu sử
          </h2>
          {paragraphs.length > 0 ? (
            <div className="flex max-w-3xl flex-col gap-4 leading-relaxed text-foreground">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Chưa có tiểu sử được công bố.</p>
          )}
        </section>

        <section aria-labelledby="su-kien-lien-quan">
          <h2 id="su-kien-lien-quan" className="mb-4 font-serif text-2xl font-bold text-foreground">
            Sự kiện liên quan
          </h2>
          {figure.events.length > 0 ? (
            <CompactTimeline
              label={`Sự kiện liên quan đến ${figure.name}`}
              events={figure.events.map((event) => ({ ...event, note: event.relationship }))}
            />
          ) : (
            <EmptyState
              title="Chưa có sự kiện liên quan"
              description="Chưa có sự kiện đã công bố nào gắn với nhân vật này."
            />
          )}
        </section>
      </div>
    </article>
  );
}
