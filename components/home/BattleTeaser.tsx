import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { bachDang938 } from "@/lib/battles/bach-dang-938";

/** Lối vào phụ: tái hiện trận đánh trên bản đồ hoạt hình. */
export function BattleTeaser() {
  return (
    <section aria-label="Tái hiện trận đánh" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <Link
        href={`/tai-hien/${bachDang938.slug}`}
        className="group block rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <Card className="flex items-center gap-4 p-5 transition-all group-hover:border-accent group-hover:shadow-lg">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
            <Swords className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-lg font-semibold text-surface-foreground">
              Tái hiện trận Bạch Đằng năm 938
            </span>
            <span className="block text-sm text-muted-foreground">
              Xem thủy triều và bãi cọc ngầm đánh tan thủy quân Nam Hán qua từng bước trên bản đồ.
            </span>
          </span>
          <ArrowRight
            className="h-5 w-5 shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Card>
      </Link>
    </section>
  );
}
