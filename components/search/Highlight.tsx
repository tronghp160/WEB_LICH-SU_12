import { highlightSegments } from "@/lib/utils/search";

type HighlightProps = {
  text: string;
  /** Các từ khóa đã "gấp" (không dấu, chữ thường) — kết quả của `toTokens`. */
  tokens: readonly string[];
};

/** Tô sáng từ khóa trong văn bản; tìm không phân biệt dấu nhưng giữ nguyên chữ gốc khi hiển thị. */
export function Highlight({ text, tokens }: HighlightProps) {
  return (
    <>
      {highlightSegments(text, tokens).map((segment, index) =>
        segment.match ? (
          <mark key={index} className="rounded-sm bg-gold/35 px-0.5 text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
