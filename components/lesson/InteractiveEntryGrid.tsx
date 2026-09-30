import Link from "next/link";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { InteractiveEntry } from "@/lib/lessons";

/** Lưới thẻ bài học/trải nghiệm tương tác; thẻ có ảnh thì chữ trắng đè lên ảnh. */
export function InteractiveEntryGrid({ entries, actionLabel = "Vào học" }: { entries: InteractiveEntry[]; actionLabel?: string }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {entries.map((entry) => (
        <li key={entry.href}>
          <Link
            href={entry.href}
            className="group block h-full rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <Card className="relative flex h-full min-h-44 flex-col justify-end overflow-hidden p-5 transition-all group-hover:border-accent group-hover:shadow-lg">
              {entry.image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh đã nén trong public/ */}
                  <img
                    src={entry.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/5" aria-hidden="true" />
                </>
              )}
              <span className={entry.image ? "relative text-white" : "relative"}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className={entry.image ? "text-sm font-medium text-[#f3d9a4]" : "text-sm font-medium text-gold-deep"}>
                    {entry.dateText}
                  </span>
                  {entry.badge && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {entry.badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex items-center gap-2 font-serif text-xl font-semibold">
                  {!entry.image && <MapIcon className="h-5 w-5 text-accent" aria-hidden="true" />}
                  {entry.title}
                </span>
                <span className={entry.image ? "mt-1 block text-sm text-white/85" : "mt-1 block text-sm text-muted-foreground"}>
                  {entry.description}
                </span>
                <span className={entry.image ? "mt-3 inline-flex items-center gap-1 text-sm font-medium text-white" : "mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent"}>
                  {actionLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </span>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
