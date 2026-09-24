import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONTENT_KINDS, contentKindLabels, type ContentKind } from "@/lib/admin/content-kinds";
import { REVIEW_TABS, reviewPaths, type ReviewItem, type ReviewTab } from "@/lib/queries/review";
import { cn } from "@/lib/utils/cn";

const tabLabels: Record<ReviewTab, string> = {
  pending_review: "Chờ duyệt",
  published: "Đã công bố",
  hidden: "Đã ẩn",
};

const emptyMessages: Record<ReviewTab, { title: string; description: string }> = {
  pending_review: { title: "Hàng đợi trống", description: "Hiện không có nội dung nào chờ duyệt." },
  published: { title: "Chưa có nội dung đã công bố", description: "Nội dung được công bố sẽ hiện ở đây để bạn có thể ẩn khi cần." },
  hidden: { title: "Không có nội dung bị ẩn", description: "Nội dung bị ẩn sẽ hiện ở đây để bạn công bố lại khi cần." },
};

function href(tab: ReviewTab, kind: ContentKind | null): string {
  const params = new URLSearchParams();
  if (tab !== "pending_review") params.set("tab", tab);
  if (kind) params.set("loai", kind);
  const query = params.toString();
  return query ? `${reviewPaths.queue}?${query}` : reviewPaths.queue;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

type ReviewQueueProps = {
  items: ReviewItem[];
  counts: Record<ReviewTab, number>;
  tab: ReviewTab;
  kind: ContentKind | null;
};

/** Hàng đợi kiểm duyệt (UC10): tab theo trạng thái, lọc theo loại, danh sách thẻ dùng được ở 360px. */
export function ReviewQueue({ items, counts, tab, kind }: ReviewQueueProps) {
  const chip = "inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Trạng thái nội dung" className="flex flex-wrap gap-2">
        {REVIEW_TABS.map((option) => (
          <Link
            key={option}
            href={href(option, kind)}
            aria-current={option === tab ? "page" : undefined}
            className={cn(
              chip,
              option === tab
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-surface-foreground hover:bg-muted",
            )}
          >
            {tabLabels[option]}
            <span className="ml-1.5 opacity-80">({counts[option]})</span>
          </Link>
        ))}
      </nav>

      <nav aria-label="Lọc theo loại nội dung" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Loại:</span>
        {([null, ...CONTENT_KINDS] as const).map((option) => (
          <Link
            key={option ?? "tat-ca"}
            href={href(tab, option)}
            aria-current={option === kind ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
              option === kind ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            {option === null ? "Tất cả" : contentKindLabels[option].plural}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState {...emptyMessages[tab]} />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {items.length} nội dung{tab === "pending_review" ? " — gửi sớm nhất xếp trước" : ""}
          </p>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="rounded-card border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    href={reviewPaths.item(item.kind, item.id)}
                    className="min-w-0 font-serif text-lg font-semibold text-surface-foreground hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    {item.title}
                  </Link>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {contentKindLabels[item.kind].singular}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{item.slug}</span>
                  {item.meta && <span>{item.meta}</span>}
                  {item.updatedAt && <span>Cập nhật {formatDateTime(item.updatedAt)}</span>}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
