import type { MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils/cn";

/** Nhãn trung thực trên ảnh: "Ảnh tư liệu 1954", "Cảnh dựng lại", "Ảnh tô màu"… */
export function MediaLabels({ item, className }: { item: MediaItem; className?: string }) {
  if (item.labels.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Loại ảnh">
      {item.labels.map((label) => (
        <li
          key={label}
          className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

const linkClass = "underline decoration-dotted underline-offset-2 hover:text-foreground";

/**
 * Dòng ghi công: tác giả · giấy phép (có link) · trang gốc. Ảnh cũ chưa có các cột này thì
 * rơi về "Nguồn: <tiêu đề nguồn>" như trước.
 */
export function MediaCredit({ item, className }: { item: MediaItem; className?: string }) {
  const parts: React.ReactNode[] = [];
  if (item.photographer) parts.push(<span key="author">Ảnh: {item.photographer}</span>);
  if (item.license) {
    parts.push(
      item.licenseUrl ? (
        <a key="license" href={item.licenseUrl} target="_blank" rel="noopener noreferrer license" className={linkClass}>
          {item.license}
        </a>
      ) : (
        <span key="license">{item.license}</span>
      ),
    );
  }
  if (item.sourcePageUrl) {
    parts.push(
      <a key="page" href={item.sourcePageUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Trang gốc
      </a>,
    );
  }
  if (parts.length === 0 && item.sourceTitle) parts.push(<span key="source">Nguồn: {item.sourceTitle}</span>);
  if (parts.length === 0) return null;

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          {part}
        </span>
      ))}
    </p>
  );
}
