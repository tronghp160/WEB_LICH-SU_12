import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { OnThisDay } from "@/lib/queries/home";

function lead(result: OnThisDay): string {
  const dayLabel = `${result.day}/${result.month}`;
  if (result.kind === "today") return `Hôm nay, ${dayLabel}`;
  if (result.kind === "upcoming") return result.distance === 1 ? `Ngày mai, ${dayLabel}` : `Còn ${result.distance} ngày nữa là ${dayLabel}`;
  return result.distance === 1 ? `Hôm qua, ${dayLabel}` : `${result.distance} ngày trước, ${dayLabel}`;
}

/** "Hôm nay trong lịch sử" dạng một dải gọn (mục 6.1). Không có dữ liệu → không hiện gì. */
export function OnThisDayStrip({ result }: { result: OnThisDay | null }) {
  if (!result || result.items.length === 0) return null;
  return (
    <section aria-labelledby="on-this-day-heading" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <h2 id="on-this-day-heading" className="flex shrink-0 items-center gap-2 font-serif text-lg font-bold text-foreground">
          <CalendarDays className="h-5 w-5 text-gold-deep" aria-hidden="true" />
          Hôm nay trong lịch sử
        </h2>
        <p className="text-foreground">
          <span className="font-medium text-gold-deep">{lead(result)}</span>
          {" — "}
          {result.items.map((item, index) => (
            <span key={item.slug}>
              {index > 0 && "; "}
              kỷ niệm {item.yearsAgo} năm{" "}
              <Link href={`/su-kien/${item.slug}`} className="font-medium text-accent underline-offset-4 hover:underline">
                {item.title}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
