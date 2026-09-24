import Link from "next/link";
import { ArrowRight, History as HistoryIcon, Map as MapIcon, Search as SearchIcon } from "lucide-react";
import type { ComponentType } from "react";
import { Card } from "@/components/ui/Card";

type Entry = {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
};

const ENTRIES: Entry[] = [
  {
    href: "/dong-thoi-gian",
    title: "Dòng thời gian",
    description: "Xem các sự kiện theo trình tự thời gian, lọc theo chủ đề.",
    icon: HistoryIcon,
  },
  {
    href: "/ban-do",
    title: "Bản đồ",
    description: "Xem sự kiện theo địa điểm và tìm các địa điểm trong một bán kính.",
    icon: MapIcon,
  },
  {
    href: "/tra-cuu",
    title: "Tra cứu",
    description: "Tìm sự kiện, nhân vật và địa điểm theo từ khóa.",
    icon: SearchIcon,
  },
];

/** Ba lối vào lớn của hệ thống (UC01): Dòng thời gian / Bản đồ / Tra cứu. */
export function EntryCards() {
  return (
    <section aria-label="Lối vào chính" className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ENTRIES.map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group block h-full rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <Card className="h-full p-6 transition-all group-hover:-translate-y-0.5 group-hover:border-accent group-hover:shadow-lg">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-accent">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-serif text-xl font-semibold text-surface-foreground">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                  Mở {title.toLowerCase()}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
