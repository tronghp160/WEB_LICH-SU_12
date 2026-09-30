import { FileText } from "lucide-react";
import { LightboxTrigger } from "@/components/content/Lightbox";
import { MediaCredit, MediaLabels } from "@/components/content/MediaCredit";
import { SafeImage } from "@/components/ui/SafeImage";
import type { MediaItem } from "@/lib/media";
import { responsiveImage } from "@/lib/utils/text";

type MediaGalleryProps = {
  media: MediaItem[];
};

/**
 * Ảnh/tài liệu: mỗi ảnh có nhãn trung thực (ảnh tư liệu / ngày nay / minh họa, cảnh dựng lại, tô màu),
 * chú thích, chữ thay thế và dòng ghi công (tác giả · giấy phép · trang gốc).
 */
export function MediaGallery({ media }: MediaGalleryProps) {
  if (media.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {media.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-card border border-border bg-surface">
          {item.type === "image" ? (
            <figure>
              <LightboxTrigger mediaId={item.id} label={item.caption ?? item.altText ?? ""}>
                <SafeImage
                  {...responsiveImage(item.url, 600)}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  width={item.width ?? undefined}
                  height={item.height ?? undefined}
                  alt={item.altText ?? item.caption ?? ""}
                  className="aspect-[4/3] w-full bg-muted object-cover"
                  style={item.focalPoint ? { objectPosition: item.focalPoint } : undefined}
                  fallbackClassName="aspect-[4/3] w-full"
                />
              </LightboxTrigger>
              <figcaption className="flex flex-col gap-1.5 p-3 text-sm">
                <MediaLabels item={item} />
                {item.caption && <span className="text-surface-foreground">{item.caption}</span>}
                <MediaCredit item={item} />
              </figcaption>
            </figure>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
            >
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
              <span>
                <span className="block font-medium text-accent">
                  {item.caption ?? "Tài liệu đính kèm"}
                </span>
                {item.sourceTitle && (
                  <span className="text-xs text-muted-foreground">Nguồn: {item.sourceTitle}</span>
                )}
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
