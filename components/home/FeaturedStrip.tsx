import Link from "next/link";
import { ArrowRight, Box } from "lucide-react";
import { FeatureCard } from "@/components/sgk/FeatureCard";
import { lessons } from "@/lib/lessons";
import { placementForFeature } from "@/lib/sgk/curriculum";

/** "Nổi bật" (mục 6.1): các chuyên đề tương tác (kèm thuộc bài nào) + một tư liệu 3D. Tối đa 3 thẻ, thay lưới 10 sự kiện. */
export function FeaturedStrip() {
  return (
    <section aria-labelledby="featured-heading" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
      <h2 id="featured-heading" className="mb-5 font-serif text-2xl font-bold text-foreground sm:text-[1.75rem]">
        Nổi bật: học sâu với chuyên đề tương tác
      </h2>
      <ul className="grid gap-4 lg:grid-cols-2">
        {lessons.map((lesson) => {
          const placement = placementForFeature(lesson.slug);
          return (
            <li key={lesson.slug} className="flex flex-col gap-1.5">
              <FeatureCard lesson={lesson} />
              {placement && (
                <p className="px-1 text-sm text-muted-foreground">
                  Thuộc Bài {placement.lesson.number} · mục {placement.section.numeral} — {placement.lesson.shortTitle}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <Link
        href="/ban-do-3d/dien-bien-phu"
        className="group mt-4 flex items-center gap-4 rounded-card border border-border bg-sunken p-4 hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-gold-deep">
          <Box className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tư liệu 3D · cần máy hỗ trợ WebGL</span>
          <span className="block font-medium text-foreground">Điện Biên Phủ trên bản đồ 3D: chiến dịch diễn ra trên địa hình thật</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
