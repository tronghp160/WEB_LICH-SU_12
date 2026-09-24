import { FileText } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import type { EventDetail } from "@/lib/queries/event-detail";
import { resizeCommonsImage } from "@/lib/utils/text";

type MediaGalleryProps = {
  media: EventDetail["media"];
};

/**
 * Ảnh/tài liệu của sự kiện: mỗi ảnh có chú thích (`caption`), chữ thay thế
 * (`alt_text`) và nguồn. Ảnh thiếu `alt_text` vẫn hiện nhưng dùng chú thích làm
 * chữ thay thế (Phase 10 sẽ bắt buộc nhập `alt_text`).
 */
export function MediaGallery({ media }: MediaGalleryProps) {
  if (media.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {media.map((item) => (
        <li key={item.id} className="overflow-hidden rounded-card border border-border bg-surface">
          {item.type === "image" ? (
            <figure>
              <SafeImage
                src={resizeCommonsImage(item.url, 1000)}
                alt={item.altText ?? item.caption ?? ""}
                className="aspect-[4/3] w-full bg-muted object-cover"
                fallbackClassName="aspect-[4/3] w-full"
              />
              <figcaption className="flex flex-col gap-1 p-3 text-sm">
                {item.caption && <span className="text-surface-foreground">{item.caption}</span>}
                {item.sourceTitle && (
                  <span className="text-xs text-muted-foreground">Nguồn: {item.sourceTitle}</span>
                )}
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
