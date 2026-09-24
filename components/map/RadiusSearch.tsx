"use client";

import { Crosshair, X } from "lucide-react";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { useRadiusSearch } from "@/components/map/useRadiusSearch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { parseAccuracyLevel } from "@/lib/utils/labels";
import { RADIUS_PRESETS_KM, formatDistanceKm } from "@/lib/utils/map";
import { cn } from "@/lib/utils/cn";

type RadiusSearchProps = {
  search: ReturnType<typeof useRadiusSearch>;
  picking: boolean;
  onTogglePicking: () => void;
  onFocusLocation: (slug: string) => void;
};

/**
 * Khung "Tìm trong bán kính": chọn tâm (bấm lên bản đồ hoặc "Tìm quanh đây" ở
 * popup), chọn/nhập bán kính, xem danh sách kết quả kèm khoảng cách.
 */
export function RadiusSearch({ search, picking, onTogglePicking, onFocusLocation }: RadiusSearchProps) {
  const { center, radiusInput, setRadiusInput, status, results, error, applied } = search;
  const busy = status === "loading";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (center) void search.search(center);
  }

  return (
    <section aria-labelledby="radius-heading" className="flex flex-col gap-3">
      <h2 id="radius-heading" className="font-serif text-lg font-semibold text-foreground">
        Tìm trong bán kính
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={picking ? "primary" : "secondary"}
          size="sm"
          aria-pressed={picking}
          onClick={onTogglePicking}
        >
          <Crosshair className="h-4 w-4" aria-hidden="true" />
          {picking ? "Bấm lên bản đồ…" : "Chọn tâm trên bản đồ"}
        </Button>
        {center && (
          <Button variant="ghost" size="sm" onClick={search.clear}>
            <X className="h-4 w-4" aria-hidden="true" />
            Xóa tâm
          </Button>
        )}
      </div>

      {center ? (
        <p className="text-sm text-muted-foreground">
          Tâm: <span className="font-medium text-foreground">{center.label ?? "điểm đã chọn trên bản đồ"}</span>{" "}
          ({center.lat.toFixed(4)}; {center.lng.toFixed(4)})
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chọn tâm rồi chọn bán kính để xem các địa điểm ở gần đó.
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
        <label htmlFor="radius-input" className="text-sm font-medium text-foreground">
          Bán kính (km)
        </label>
        <div className="flex gap-2">
          <Input
            id="radius-input"
            inputMode="decimal"
            value={radiusInput}
            onChange={(event) => setRadiusInput(event.target.value)}
            aria-invalid={status === "error" && error !== null}
            aria-describedby={error ? "radius-error" : undefined}
            className="w-28"
          />
          <Button type="submit" disabled={!center || busy}>
            {busy ? "Đang tìm…" : "Tìm"}
          </Button>
        </div>
        <div role="group" aria-label="Bán kính gợi ý" className="flex flex-wrap gap-1.5">
          {RADIUS_PRESETS_KM.map((km) => (
            <button
              key={km}
              type="button"
              disabled={busy}
              onClick={() => {
                setRadiusInput(String(km));
                if (center) void search.search(center, String(km));
              }}
              className={cn(
                "min-h-8 rounded-full border px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50",
                radiusInput.trim() === String(km)
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-surface-foreground hover:bg-muted",
              )}
            >
              {km} km
            </button>
          ))}
        </div>
      </form>

      <div aria-live="polite" className="text-sm">
        {status === "error" && error && (
          <p id="radius-error" role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-accent">
            {error}
          </p>
        )}
        {status === "loading" && <p className="text-muted-foreground">Đang tìm địa điểm…</p>}
        {status === "done" && applied && (
          <p className="text-muted-foreground">
            {results.length > 0
              ? `Có ${results.length} địa điểm trong bán kính ${applied.km.toLocaleString("vi-VN")} km:`
              : `Không có địa điểm nào trong bán kính ${applied.km.toLocaleString("vi-VN")} km. Hãy thử bán kính lớn hơn.`}
          </p>
        )}
      </div>

      {status === "done" && results.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => onFocusLocation(result.slug)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-surface-foreground">{result.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceKm(result.distance_m)}
                  </span>
                </span>
                <AccuracyBadge level={parseAccuracyLevel(result.accuracy_level)} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
