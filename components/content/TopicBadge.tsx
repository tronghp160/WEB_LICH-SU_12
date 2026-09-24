import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

type TopicBadgeProps = {
  name: string;
  slug?: string;
};

/** Badge chủ đề của sự kiện; có slug thì bấm được tới trang chủ đề (Phase 7). */
export function TopicBadge({ name, slug }: TopicBadgeProps) {
  if (slug) {
    return (
      <Link href={`/chu-de/${slug}`}>
        <Badge variant="muted" className="hover:bg-gold hover:text-gold-foreground">
          {name}
        </Badge>
      </Link>
    );
  }

  return <Badge variant="muted">{name}</Badge>;
}
