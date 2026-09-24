import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

type TopicBadgeProps = {
  name: string;
  slug?: string;
};

/**
 * Badge chủ đề của sự kiện; có slug thì bấm được tới trang chủ đề (Phase 7).
 * Tên dài được rút gọn bằng "…" (xem đủ ở tooltip `title`).
 */
export function TopicBadge({ name, slug }: TopicBadgeProps) {
  if (slug) {
    return (
      <Link href={`/chu-de/${slug}`} title={name} className="relative z-10 min-w-0 max-w-full">
        <Badge variant="muted" className="hover:bg-gold hover:text-gold-foreground">
          {name}
        </Badge>
      </Link>
    );
  }

  return (
    <Badge variant="muted" title={name}>
      {name}
    </Badge>
  );
}
