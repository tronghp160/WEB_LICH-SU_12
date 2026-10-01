"use client";

import { ChevronUp, LocateFixed, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import type { MapFocus } from "@/components/map/HistoryMap";
import { RadiusSearch } from "@/components/map/RadiusSearch";
import { useRadiusSearch } from "@/components/map/useRadiusSearch";
import { TopicFilter, type TopicFilterOption } from "@/components/timeline/TopicFilter";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MapLocation } from "@/lib/queries/locations";
import { cn } from "@/lib/utils/cn";
import { findLocationForEvent } from "@/lib/utils/map";
import {
  TOPIC_FILTER_PARAM,
  buildFilterUrl,
  parseTopicFilter,
  toggleTopic,
} from "@/lib/utils/timeline";

// Leaflet cần `window` nên chỉ nạp ở trình duyệt (ssr: false — chỉ được phép trong Client Component).
const HistoryMap = dynamic(() => import("@/components/map/HistoryMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  return (
    <div role="status" aria-label="Đang tải bản đồ" className="h-full w-full">
      <Skeleton className="h-full w-full rounded-none" />
    </div>
  );
}

type MapExplorerProps = {
  locations: MapLocation[];
  topics: TopicFilterOption[];
};

/** Sự kiện/địa điểm được yêu cầu qua URL (`?su-kien=` / `?dia-diem=`), xác định một lần khi mở trang. */
function resolveInitialFocus(
  locations: MapLocation[],
  eventSlug: string | null,
  locationSlug: string | null,
): { focus: MapFocus | null; notice: string | null } {
  if (locationSlug) {
    return locations.some((item) => item.slug === locationSlug)
      ? { focus: { slug: locationSlug, nonce: 1 }, notice: null }
      : { focus: null, notice: "Không tìm thấy địa điểm này trên bản đồ." };
  }
  if (eventSlug) {
    const location = findLocationForEvent(locations, eventSlug);
    return location
      ? { focus: { slug: location.slug, nonce: 1 }, notice: null }
      : {
          focus: null,
          notice: "Sự kiện này chưa có địa điểm nào có tọa độ trên bản đồ.",
        };
  }
  return { focus: null, notice: null };
}

/**
 * Trang bản đồ (UC03): bản đồ + panel (desktop: cột phải; điện thoại: bottom
 * sheet). Bộ lọc chủ đề dùng chung cách làm với dòng thời gian (`?chu-de=`).
 */
export function MapExplorer({ locations, topics }: MapExplorerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const radiusSearch = useRadiusSearch();

  const [initial] = useState(() =>
    resolveInitialFocus(locations, searchParams.get("su-kien"), searchParams.get("dia-diem")),
  );
  const [focus, setFocus] = useState<MapFocus | null>(initial.focus);
  const [notice, setNotice] = useState<string | null>(initial.notice);
  const [picking, setPicking] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedTopics = parseTopicFilter(
    searchParams.get(TOPIC_FILTER_PARAM),
    topics.map((topic) => topic.slug),
  );

  // Có lọc chủ đề: chỉ giữ địa điểm có sự kiện thuộc chủ đề đó, và chỉ liệt kê các sự kiện ấy.
  const visibleLocations =
    selectedTopics.length === 0
      ? locations
      : locations.flatMap((location) => {
          const events = location.events.filter(
            (event) => event.topicSlugs.some((slug) => selectedTopics.includes(slug)),
          );
          return events.length > 0 ? [{ ...location, events }] : [];
        });

  function updateFilter(next: string[]) {
    window.history.replaceState(null, "", buildFilterUrl(pathname, next));
  }

  function focusLocation(slug: string) {
    setNotice(null);
    setFocus((current) => ({ slug, nonce: (current?.nonce ?? 0) + 1 }));
    setSheetOpen(false); // điện thoại: thu sheet lại để thấy bản đồ
  }

  function pickCenter(lat: number, lng: number) {
    setPicking(false);
    void radiusSearch.search({ lat, lng });
  }

  function searchAround(location: MapLocation) {
    setPicking(false);
    void radiusSearch.search({ lat: location.latitude, lng: location.longitude, label: location.name });
  }

  const summary =
    radiusSearch.status === "done" && radiusSearch.applied
      ? `${radiusSearch.results.length} địa điểm trong ${radiusSearch.applied.km.toLocaleString("vi-VN")} km`
      : `${visibleLocations.length} địa điểm`;

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-[32rem] flex-col md:flex-row">
      <div className="relative min-h-0 flex-1">
        <HistoryMap
          locations={visibleLocations}
          focus={focus}
          radius={radiusSearch.applied}
          center={radiusSearch.center}
          pickingCenter={picking}
          onPickCenter={pickCenter}
          onSearchAround={searchAround}
        />

        {picking && (
          <div
            role="status"
            className="absolute inset-x-0 top-3 z-[1000] mx-auto flex w-fit max-w-[calc(100%-6rem)] items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-lg"
          >
            Bấm lên bản đồ để chọn tâm
            <button
              type="button"
              onClick={() => setPicking(false)}
              aria-label="Hủy chọn tâm"
              className="rounded-full p-0.5 hover:bg-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <aside
        aria-label="Bảng điều khiển bản đồ"
        className={cn(
          // Điện thoại: bottom sheet phủ lên đáy bản đồ. Desktop (md+): cột phải cố định.
          "absolute inset-x-0 bottom-0 z-[1100] flex max-h-[75%] flex-col rounded-t-2xl border-t border-border bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.15)]",
          "md:static md:z-auto md:max-h-none md:w-96 md:shrink-0 md:rounded-none md:border-l md:border-t-0 md:shadow-none",
        )}
      >
        <button
          type="button"
          aria-expanded={sheetOpen}
          aria-controls="map-panel-body"
          onClick={() => setSheetOpen((open) => !open)}
          className="flex min-h-14 w-full items-center justify-between gap-2 px-4 text-left md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
        >
          <span className="font-serif text-base font-semibold text-foreground">Bản đồ sự kiện</span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {summary}
            <ChevronUp
              className={cn("h-5 w-5 transition-transform", sheetOpen ? "rotate-180" : "")}
              aria-hidden="true"
            />
          </span>
        </button>

        <div
          id="map-panel-body"
          className={cn(
            "min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 pt-2 md:flex md:pt-5",
            sheetOpen ? "flex" : "hidden",
          )}
        >
          <header className="hidden md:block">
            <h1 className="font-serif text-2xl font-bold text-foreground">Bản đồ sự kiện</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bấm vào một ghim để xem sự kiện xảy ra tại địa điểm đó.
            </p>
          </header>

          {notice && (
            <p role="status" className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
              {notice}
            </p>
          )}

          <section aria-labelledby="map-topic-heading" className="flex flex-col gap-2">
            <h2 id="map-topic-heading" className="font-serif text-lg font-semibold text-foreground">
              Lọc theo chủ đề
            </h2>
            <TopicFilter
              topics={topics}
              selected={selectedTopics}
              onToggle={(slug) => updateFilter(toggleTopic(selectedTopics, slug))}
              onClear={() => updateFilter([])}
            />
          </section>

          <RadiusSearch
            search={radiusSearch}
            picking={picking}
            onTogglePicking={() => {
              setPicking((value) => !value);
              setSheetOpen(false);
            }}
            onFocusLocation={focusLocation}
          />

          <Link href="/di-tich-gan-em" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline">
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            Di tích gần em: tìm theo vị trí của em
          </Link>

          <section aria-labelledby="map-list-heading" className="flex flex-col gap-2">
            <h2 id="map-list-heading" className="font-serif text-lg font-semibold text-foreground">
              Địa điểm ({visibleLocations.length})
            </h2>
            {visibleLocations.length === 0 ? (
              <EmptyState
                title="Không có địa điểm phù hợp"
                description="Chưa có địa điểm nào thuộc các chủ đề đã chọn."
                action={
                  <Button variant="secondary" onClick={() => updateFilter([])}>
                    Xóa bộ lọc
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
                {visibleLocations.map((location) => (
                  <li key={location.slug}>
                    <button
                      type="button"
                      onClick={() => focusLocation(location.slug)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-surface-foreground">
                          {location.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {location.events.length} sự kiện
                        </span>
                      </span>
                      <AccuracyBadge level={location.accuracyLevel} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="map-legend-heading" className="flex flex-col gap-2">
            <h2 id="map-legend-heading" className="font-serif text-lg font-semibold text-foreground">
              Chú giải
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="map-legend map-legend--exact" />
                Ghim đặc: tọa độ chính xác
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="map-legend map-legend--approximate" />
                Ghim viền: tọa độ gần đúng
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="map-legend map-legend--region" />
                Vòng tròn mờ: chỉ xác định được khu vực
              </li>
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
