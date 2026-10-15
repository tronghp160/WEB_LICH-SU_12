import { formatDuration } from "@/lib/exams/room";

/**
 * Thời gian làm từng câu: cột một màu theo thứ tự câu, chỉ ghi nhãn câu lâu nhất (không ghi số trên mọi cột); di chuột vào
 * cột hiện thời gian. Mô tả cho trình đọc màn hình nằm trong aria-label của khung.
 */
export function TimeBars({ times }: { times: number[] }) {
  const total = times.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;
  const max = Math.max(...times);
  const slowest = times.indexOf(max);
  const average = total / times.length;
  const summary = `Câu lâu nhất: câu ${slowest + 1} (${formatDuration(max)}); trung bình ${formatDuration(average)} một câu.`;
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-foreground">Thời gian từng câu</figcaption>
      <div role="img" aria-label={summary} className="flex h-28 items-end gap-0.5 border-b border-border">
        {times.map((value, index) => (
          <span
            key={index}
            title={`Câu ${index + 1}: ${formatDuration(value)}`}
            className={index === slowest ? "flex-1 rounded-t bg-accent" : "flex-1 rounded-t bg-accent/45"}
            style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{summary}</p>
    </figure>
  );
}
