import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { contentPaths, contentKindLabels, type ContentKind } from "@/lib/admin/content-kinds";
import type { ContentListItem } from "@/lib/queries/admin-content";
import { workflowStatusLabels, type WorkflowStatus } from "@/lib/utils/labels";

type ContentListProps = {
  kind: ContentKind;
  items: ContentListItem[];
  /** Có điều kiện lọc đang áp dụng (để phân biệt "chưa có gì" với "không khớp bộ lọc"). */
  filtered: boolean;
  status: WorkflowStatus | null;
  query: string;
  canCreate: boolean;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

/** Bộ lọc (form GET, không cần JS) + danh sách thẻ, dùng được ở 360px. */
export function ContentList({ kind, items, filtered, status, query, canCreate }: ContentListProps) {
  const labels = contentKindLabels[kind];
  const listPath = contentPaths.list(kind);

  return (
    <div className="flex flex-col gap-6">
      <form method="get" role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="loc-tu-khoa" className="text-sm font-medium text-foreground">
            Tìm theo tên
          </label>
          <Input id="loc-tu-khoa" name="q" defaultValue={query} placeholder="Gõ có dấu hoặc không dấu" maxLength={100} />
        </div>
        <div className="flex flex-col gap-1.5 sm:w-52">
          <label htmlFor="loc-trang-thai" className="text-sm font-medium text-foreground">
            Trạng thái
          </label>
          <Select id="loc-trang-thai" name="trang-thai" defaultValue={status ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(workflowStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary">
            Lọc
          </Button>
          {filtered && (
            <Link href={listPath} className="text-sm font-medium text-accent hover:underline">
              Xóa lọc
            </Link>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title={filtered ? "Không có kết quả phù hợp" : `Chưa có ${labels.singular} nào`}
          description={
            filtered
              ? "Thử đổi từ khóa hoặc bỏ bộ lọc trạng thái."
              : canCreate
                ? `Bấm “${labels.newLabel}” để tạo bản nháp đầu tiên.`
                : "Chưa có nội dung nào."
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {items.length} {labels.singular}
          </p>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-card border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    href={contentPaths.edit(kind, item.id)}
                    className="min-w-0 font-serif text-lg font-semibold text-surface-foreground hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                  >
                    {item.title}
                  </Link>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{item.slug}</span>
                  {item.meta && <span>{item.meta}</span>}
                  {item.updatedAt && <span>Cập nhật {formatDateTime(item.updatedAt)}</span>}
                </p>
                {item.reviewNote && item.status === "needs_revision" && (
                  <p className="mt-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-900 dark:text-orange-200">
                    <span className="font-semibold">Lý do trả sửa: </span>
                    {item.reviewNote}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
