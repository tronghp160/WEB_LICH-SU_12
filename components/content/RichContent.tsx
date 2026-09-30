import { Fragment, type ReactNode } from "react";
import type { Block, Inline, RichSection } from "@/lib/utils/rich-text";

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.bold ? (
          <strong key={index} className="font-semibold text-foreground">
            {part.text}
          </strong>
        ) : part.italic ? (
          <em key={index}>{part.text}</em>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.type === "list") {
    return (
      <ul className="flex list-disc flex-col gap-1.5 pl-6 marker:text-gold-deep">
        {block.items.map((item, index) => (
          <li key={index}>
            <Inlines parts={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote className="border-l-4 border-gold bg-surface px-5 py-3 font-serif text-lg italic text-foreground">
        <p className="whitespace-pre-line">
          <Inlines parts={block.inlines} />
        </p>
        {block.cite && <footer className="mt-2 font-sans text-sm not-italic text-muted-foreground">— {block.cite}</footer>}
      </blockquote>
    );
  }
  return (
    <p>
      <Inlines parts={block.inlines} />
    </p>
  );
}

/** Mục "Câu chuyện nhỏ", "Em có biết?" được làm nổi bật như một hộp riêng. */
function isCallout(heading: string | null): boolean {
  return heading !== null && /^(câu chuyện|em có biết)/i.test(heading);
}

/**
 * Nội dung có cấu trúc (GĐ3). `between(index)` chèn thêm phần tử SAU mục thứ `index` — dùng để đặt ảnh
 * xen giữa các mục thay vì dồn hết xuống cuối trang.
 */
export function RichContent({
  sections,
  headingLevel = 2,
  between,
}: {
  sections: RichSection[];
  headingLevel?: 2 | 3;
  between?: (index: number) => ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section, index) => (
        <Fragment key={index}>
          <section
            className={
              isCallout(section.heading)
                ? "rounded-card border border-gold/40 bg-gold/10 p-5"
                : undefined
            }
          >
            {section.heading && (
              <Heading className="mb-3 font-serif text-2xl font-bold text-foreground">{section.heading}</Heading>
            )}
            <div className="flex max-w-3xl flex-col gap-4 leading-relaxed text-foreground">
              {section.blocks.map((block, blockIndex) => (
                <BlockView key={blockIndex} block={block} />
              ))}
            </div>
          </section>
          {between?.(index)}
        </Fragment>
      ))}
    </div>
  );
}
