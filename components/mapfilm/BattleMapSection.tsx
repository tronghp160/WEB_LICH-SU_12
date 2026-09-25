"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ExternalLink, Map as MapIcon, Mountain } from "lucide-react";
import { useState } from "react";
import { BattleReenactment } from "@/components/battle/BattleReenactment";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BattleScenario } from "@/lib/battles/types";
import { cn } from "@/lib/utils/cn";

// Trình phát 3D chỉ nạp khi người xem chọn "3D"; MapLibre, Three.js và địa hình còn nạp muộn hơn nữa (lúc bắt đầu chạy).
const MapFilmPlayer = dynamic(() => import("@/components/mapfilm/MapFilmPlayer").then((mod) => mod.MapFilmPlayer), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[4/5] w-full sm:aspect-video" />,
});

type BattleMapSectionProps = {
  scenario: BattleScenario;
  /** Slug phim trên bản đồ 3D (lib/mapfilm); không có thì chỉ hiện bản đồ 2D. */
  mapFilm?: string;
};

/** Mục "Diễn biến trên bản đồ" của bài học: chuyển giữa bản đồ 2D (nhẹ, mặc định) và bản đồ 3D chạy như một thước phim. */
export function BattleMapSection({ scenario, mapFilm }: BattleMapSectionProps) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  if (!mapFilm) return <BattleReenactment scenario={scenario} />;

  const option = (value: "2d" | "3d", label: string, Icon: typeof MapIcon) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        mode === value ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
      )}
      data-testid={`map-mode-${value}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Kiểu bản đồ" className="inline-flex rounded-full border border-border bg-surface p-1">
          {option("2d", "Bản đồ 2D", MapIcon)}
          {option("3d", "Bản đồ 3D như phim", Mountain)}
        </div>
        {mode === "3d" && (
          <Link href={`/ban-do-3d/${mapFilm}`} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Mở trang riêng để trình chiếu
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {mode === "2d" ? (
        <BattleReenactment scenario={scenario} />
      ) : (
        <MapFilmPlayer slug={mapFilm} autoStart onFallback={() => setMode("2d")} />
      )}
    </div>
  );
}
