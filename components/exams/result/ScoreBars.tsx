import Link from "next/link";

export type ScoreRow = { key: string; label: string; earned: number; max: number; n: number; href?: string };

/**
 * Tỉ lệ điểm đạt theo nhóm (bài, mức độ, dạng câu): thanh ngang MỘT màu (một chuỗi số liệu → không cần chú giải), rãnh nhạt
 * cùng tông, giá trị bằng chữ cạnh mỗi thanh (đọc được khi không thấy màu), di chuột hiện điểm cụ thể. Sắp từ yếu → mạnh
 * khi `sorted` (để thấy ngay chỗ cần ôn).
 */
export function ScoreBars({ title, rows, sorted = false }: { title: string; rows: ScoreRow[]; sorted?: boolean }) {
  const shown = rows.filter((row) => row.max > 0);
  if (shown.length === 0) return null;
  const ordered = sorted ? [...shown].sort((a, b) => a.earned / a.max - b.earned / b.max) : shown;
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-foreground">{title}</figcaption>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {ordered.map((row) => {
          const ratio = row.earned / row.max;
          const percent = Math.round(ratio * 100);
          const detail = `${(row.earned / 1000).toLocaleString("vi-VN")} / ${(row.max / 1000).toLocaleString("vi-VN")} điểm · ${row.n} câu`;
          return (
            <li key={row.key} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem] items-center gap-2 text-sm" title={detail}>
              <span className="truncate text-foreground">{row.href ? <Link href={row.href} className="hover:underline">{row.label}</Link> : row.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-accent/15" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(percent, ratio > 0 ? 2 : 0)}%` }} />
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {percent}%<span className="sr-only"> — {detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
