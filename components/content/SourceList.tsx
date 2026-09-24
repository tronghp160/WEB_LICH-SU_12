import { sourceTypeLabels, type SourceType } from "@/lib/utils/labels";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export type SourceListItem = {
  id: string;
  title: string;
  citation: string;
  url?: string | null;
  sourceType: SourceType;
  sourceNote?: string | null;
  /** Ghi chú về độ tin cậy của thông tin lấy từ nguồn này (`event_sources.confidence_note`). */
  confidenceNote?: string | null;
};

type SourceListProps = {
  sources: SourceListItem[];
};

/** Danh sách nguồn tham khảo của một sự kiện/nội dung (Mục "Nguồn tham khảo", Phase 7). */
export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <EmptyState
        title="Chưa có nguồn tham khảo"
        description="Nội dung này chưa được gắn nguồn — không nên công bố khi thiếu nguồn."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {sources.map((source) => (
        <li key={source.id} className="rounded-card border border-border bg-surface p-4">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{sourceTypeLabels[source.sourceType]}</Badge>
            <span className="font-serif font-semibold text-surface-foreground">
              {source.title}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{source.citation}</p>
          {source.sourceNote && (
            <p className="mt-1 text-sm text-muted-foreground italic">{source.sourceNote}</p>
          )}
          {source.confidenceNote && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-surface-foreground">Độ tin cậy: </span>
              {source.confidenceNote}
            </p>
          )}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-accent hover:underline"
            >
              Xem nguồn gốc
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
