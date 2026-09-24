"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MiniMapLocation } from "@/components/map/MiniMap";

// Leaflet cần `window` nên chỉ nạp ở trình duyệt (ssr: false — chỉ được phép trong Client Component).
const MiniMap = dynamic(() => import("@/components/map/MiniMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

type MiniMapLazyProps = {
  locations: MiniMapLocation[];
  /** Đường dẫn tới bản đồ lớn đã tập trung vào nội dung này. */
  fullMapHref: string;
};

/** Khung bản đồ nhỏ có tiêu đề, giữ chiều cao cố định để trang không "nhảy" khi bản đồ tải xong. */
export function MiniMapLazy({ locations, fullMapHref }: MiniMapLazyProps) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="region"
        aria-label="Bản đồ vị trí"
        className="h-64 overflow-hidden rounded-card border border-border"
      >
        <MiniMap locations={locations} />
      </div>
      <Link href={fullMapHref} className="text-sm font-medium text-accent hover:underline">
        Xem trên bản đồ lớn
      </Link>
    </div>
  );
}
