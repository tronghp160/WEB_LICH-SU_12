"use client";

import { LocateFixed, MapPin, Navigation, School } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccuracyBadge } from "@/components/content/AccuracyBadge";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { Select } from "@/components/ui/Select";
import { googleMapsLink } from "@/lib/media";
import { PROVINCES } from "@/lib/provinces";
import type { MapLocation } from "@/lib/queries/locations";
import { cn } from "@/lib/utils/cn";
import { formatDistanceKm, nearbyLocations } from "@/lib/utils/map";
import { responsiveImage } from "@/lib/utils/text";

const RADII_KM = [25, 50, 100, 200] as const;
const DEFAULT_RADIUS_KM = 50;

type Center = { lat: number; lng: number; label: string };
type LocateStatus = "idle" | "locating" | "error";

/** Làm tròn 2 chữ số thập phân (~1 km): đủ để tính khoảng cách, không cần giữ vị trí chính xác của học sinh. */
const coarse = (value: number) => Math.round(value * 100) / 100;

function locateErrorMessage(error: GeolocationPositionError | null): string {
  if (error?.code === 1) return "Em chưa cho phép trang web biết vị trí. Em có thể chọn tỉnh/thành bên dưới.";
  if (error?.code === 3) return "Lấy vị trí lâu quá. Em thử lại, hoặc chọn tỉnh/thành bên dưới.";
  return "Máy này không lấy được vị trí. Em chọn tỉnh/thành bên dưới nhé.";
}

/**
 * "Di tích gần em" (GĐ4.5): lấy vị trí (hoặc tỉnh/thành) rồi gợi ý di tích trong bán kính, kèm ảnh. Khoảng cách tính
 * ngay trên trình duyệt từ danh sách địa điểm đã công bố — vị trí của em không gửi lên máy chủ và không được lưu lại.
 */
export function NearbySites({ locations }: { locations: MapLocation[] }) {
  const [center, setCenter] = useState<Center | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [status, setStatus] = useState<LocateStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [province, setProvince] = useState("");

  function locate() {
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setStatus("error");
      setError(locateErrorMessage(null));
      return;
    }
    setStatus("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("idle");
        setProvince("");
        setCenter({ lat: coarse(position.coords.latitude), lng: coarse(position.coords.longitude), label: "vị trí của em" });
      },
      (positionError) => {
        setStatus("error");
        setError(locateErrorMessage(positionError));
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  }

  function chooseProvince(name: string) {
    setProvince(name);
    const found = PROVINCES.find((item) => item.name === name);
    if (!found) return;
    setError(null);
    setStatus("idle");
    const label = found.center === found.name ? found.name : `${found.name} (trung tâm: ${found.center})`;
    setCenter({ lat: found.lat, lng: found.lng, label });
  }

  const result = center ? nearbyLocations(locations, center, radiusKm) : null;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="chon-vi-tri" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
        <h2 id="chon-vi-tri" className="font-serif text-xl font-bold text-foreground">
          Em đang ở đâu?
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Button size="lg" onClick={locate} disabled={status === "locating"}>
            <LocateFixed className="h-5 w-5" aria-hidden="true" />
            {status === "locating" ? "Đang lấy vị trí…" : "Dùng vị trí của em"}
          </Button>
          <span className="text-sm text-muted-foreground sm:pb-3">hoặc</span>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="chon-tinh" className="text-sm font-medium text-foreground">
              Chọn tỉnh/thành
            </label>
            <Select id="chon-tinh" value={province} onChange={(event) => chooseProvince(event.target.value)} className="h-12">
              <option value="">— 34 tỉnh, thành phố —</option>
              {PROVINCES.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-accent">
            {error}
          </p>
        )}
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="mb-2 text-sm font-medium text-foreground">Trong bán kính</legend>
          {RADII_KM.map((km) => (
            <button
              key={km}
              type="button"
              aria-pressed={radiusKm === km}
              onClick={() => setRadiusKm(km)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                radiusKm === km ? "border-accent bg-accent text-accent-foreground" : "border-border text-foreground hover:bg-muted",
              )}
            >
              {km} km
            </button>
          ))}
        </fieldset>
        <p className="text-xs text-muted-foreground">
          Vị trí chỉ dùng ngay trên máy em để tính khoảng cách (làm tròn khoảng 1 km) — không gửi lên máy chủ, không lưu lại.
        </p>
      </section>

      {center && result && (
        <section aria-labelledby="ket-qua-gan-em" aria-live="polite">
          <h2 id="ket-qua-gan-em" className="font-serif text-2xl font-bold text-foreground">
            {result.withinRadius
              ? `Trong ${radiusKm} km quanh ${center.label} có ${result.items.length} di tích`
              : `Chưa có di tích nào trong ${radiusKm} km quanh ${center.label}`}
          </h2>
          <p className="mb-5 mt-1 text-muted-foreground">
            {result.withinRadius
              ? "Khoảng cách đường chim bay, gần nhất trước."
              : "Kho dữ liệu đang được bổ sung dần. Đây là những di tích gần em nhất hiện có:"}
          </p>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((location) => {
              const maps = googleMapsLink(location.latitude, location.longitude, location.accuracyLevel);
              return (
                <li key={location.slug} className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
                  <div className="relative aspect-[16/9] bg-muted">
                    {location.cover ? (
                      <SafeImage
                        {...responsiveImage(location.cover.url, 400)}
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        alt={location.cover.alt}
                        className="h-full w-full object-cover"
                        style={location.cover.focalPoint ? { objectPosition: location.cover.focalPoint } : undefined}
                        fallbackClassName="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gold-deep">
                        <MapPin className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-sm font-bold text-white">
                      {formatDistanceKm(location.distanceM)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/dia-diem/${location.slug}`} className="font-serif text-lg font-bold text-foreground hover:text-accent">
                        {location.name}
                      </Link>
                      <AccuracyBadge level={location.accuracyLevel} />
                    </div>
                    {location.historicalName && <p className="text-sm text-muted-foreground">Tên cũ: {location.historicalName}</p>}
                    {location.events.length > 0 && (
                      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                        {location.events.slice(0, 3).map((event) => (
                          <li key={event.slug}>
                            <Link href={`/su-kien/${event.slug}`} className="text-foreground underline decoration-border hover:text-accent">
                              {event.title}
                            </Link>{" "}
                            <span className="text-muted-foreground">({event.dateText})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm font-medium">
                      <Link href={`/dia-diem/${location.slug}`} className="text-accent underline">
                        Xem di tích
                      </Link>
                      <Link href={`/ban-do?dia-diem=${location.slug}`} className="text-accent underline">
                        Trên bản đồ
                      </Link>
                      <a href={maps.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline">
                        <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                        {maps.label}
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <aside aria-labelledby="goi-y-trai-nghiem" className="flex gap-4 rounded-card border border-border bg-muted p-5">
        <School className="mt-1 h-6 w-6 shrink-0 text-gold-deep" aria-hidden="true" />
        <div className="flex flex-col gap-2 text-sm text-foreground">
          <h2 id="goi-y-trai-nghiem" className="font-serif text-lg font-bold">
            Gợi ý cho hoạt động trải nghiệm
          </h2>
          <p>
            Thầy cô có thể chọn một di tích gần trường cho buổi tham quan thực tế: cho học sinh đọc trước trang sự kiện, làm
            trắc nghiệm của chủ đề, rồi đến nơi chụp ảnh đối chiếu với ảnh tư liệu (phần “Xưa và nay”). Trước khi đi nên kiểm
            tra giờ mở cửa với ban quản lý di tích.
          </p>
        </div>
      </aside>
    </div>
  );
}
