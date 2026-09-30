import { SafeImage } from "@/components/ui/SafeImage";
import type { QuizImage } from "@/lib/quiz/types";
import { responsiveImage } from "@/lib/utils/text";

type QuizImageFigureProps = {
  image: QuizImage;
  /** Đã trả lời: hiện mô tả, chú thích và nhãn đầy đủ (có năm chụp). */
  revealed: boolean;
  /** Chữ thay thế trong lúc hỏi, không được lộ đáp án. */
  hiddenAlt?: string;
};

/**
 * Ảnh của câu hỏi. Ghi công (tác giả, giấy phép, trang gốc) và nhãn trung thực (ảnh dựng lại, tô màu…) LUÔN hiện;
 * chú thích, mô tả và năm chụp chỉ hiện sau khi trả lời vì chúng thường chứa đáp án.
 */
export function QuizImageFigure({ image, revealed, hiddenAlt = "Ảnh của câu hỏi (mô tả hiện sau khi em trả lời)" }: QuizImageFigureProps) {
  const labels = revealed ? image.labels : image.neutralLabels;
  const credit = [image.photographer, image.license].filter(Boolean).join(" · ");

  return (
    <figure className="m-0 overflow-hidden rounded-card border border-border bg-surface">
      <div className="relative bg-muted">
        <SafeImage
          {...responsiveImage(image.url, 1200)}
          sizes="(min-width: 768px) 720px, 100vw"
          alt={revealed ? image.alt : hiddenAlt}
          width={image.width ?? undefined}
          height={image.height ?? undefined}
          className="mx-auto max-h-[52vh] w-full object-contain"
          fallbackClassName="aspect-[4/3] w-full"
          priority
        />
        {labels.length > 0 && (
          <ul className="absolute left-2 top-2 m-0 flex list-none flex-wrap gap-1 p-0">
            {labels.map((label) => (
              <li key={label} className="rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                {label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <figcaption className="flex flex-col gap-1 px-3 py-2 text-xs text-muted-foreground">
        {revealed && image.caption && <span className="text-sm text-foreground">{image.caption}</span>}
        {(credit || image.sourcePageUrl) && (
          <span>
            {credit && <>Ảnh: {credit}</>}
            {image.sourcePageUrl && (
              <>
                {credit && " · "}
                <a href={image.sourcePageUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">
                  Trang gốc
                </a>
              </>
            )}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
