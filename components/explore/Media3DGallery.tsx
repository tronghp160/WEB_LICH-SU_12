import Link from "next/link";
import { Box, Cpu, ScanLine } from "lucide-react";
import { lessons } from "@/lib/lessons";
import type { LessonScan3D } from "@/lib/lessons/types";
import { placementForFeature } from "@/lib/sgk/curriculum";

type Media3DItem = {
  key: string;
  title: string;
  href: string;
  poster?: string;
  /** "quét thật": mô hình quét từ vật/di tích thật; "minh họa": dựng bằng máy tính. */
  kind: "scan" | "illustration";
  note: string;
  sizeMb?: number;
  credit?: string;
  lessonLabel?: string;
};

function scanItems(): Media3DItem[] {
  return lessons.flatMap((lesson) => {
    const placement = placementForFeature(lesson.slug);
    const scans: { title: string; scan: LessonScan3D }[] = [
      ...(lesson.resultsScan ? [{ title: "Sa bàn lòng chảo", scan: lesson.resultsScan }] : []),
      ...(lesson.artifacts ?? []).flatMap((item) => (item.scan ? [{ title: item.title, scan: item.scan }] : [])),
      ...(lesson.todayScans ?? []).flatMap((item) => (item.scan ? [{ title: item.title, scan: item.scan }] : [])),
    ];
    return scans.map(({ title, scan }) => ({
      key: scan.sketchfabId,
      title,
      // Mở thẳng chương "Tư liệu" của chuyên đề (components/lesson/ChapterShell tự mở chương chứa neo).
      href: `/bai-hoc/${lesson.slug}#tu-lieu`,
      poster: scan.poster,
      kind: "scan" as const,
      note: scan.note,
      sizeMb: scan.sizeMb,
      credit: scan.author,
      lessonLabel: placement ? `Bài ${placement.lesson.number} · ${lesson.title}` : lesson.title,
    }));
  });
}

const ILLUSTRATIONS: Media3DItem[] = [
  {
    key: "ban-do-3d-dbp",
    title: "Điện Biên Phủ trên bản đồ 3D",
    href: "/ban-do-3d/dien-bien-phu",
    kind: "illustration",
    note: "Chiến dịch diễn ra trên địa hình thật, dừng ở từng giai đoạn; quân, pháo, cứ điểm là hình minh họa.",
    lessonLabel: "Bài 7 · Chiến dịch Điện Biên Phủ",
  },
];

/**
 * Phòng tư liệu 3D (mục 6.8): lưới thẻ cho mọi mô hình 3D — ghi rõ dung lượng tải, yêu cầu máy, "quét thật" hay
 * "minh họa", thuộc bài nào. Không tải trình xem 3D ở trang này: bấm thẻ mới mở chỗ xem.
 */
export function Media3DGallery() {
  const items = [...scanItems(), ...ILLUSTRATIONS];
  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ScanLine className="h-4 w-4 text-success" aria-hidden="true" />
          Quét thật: mô hình quét từ hiện vật, di tích thật
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Cpu className="h-4 w-4 text-warning" aria-hidden="true" />
          Minh họa: dựng bằng máy tính
        </span>
        <span>Cần trình duyệt hỗ trợ WebGL; mô hình lớn nên mở khi có Wi-Fi.</span>
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow hover:border-border-strong hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <div className="relative aspect-[4/3] bg-sunken">
                {item.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước của Sketchfab (ảnh ngoài, không qua tối ưu ảnh)
                  <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gold-deep">
                    <Box className="h-12 w-12" aria-hidden="true" />
                  </div>
                )}
                <span
                  className={
                    item.kind === "scan"
                      ? "absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-success-bg px-2 py-0.5 text-xs font-semibold text-success"
                      : "absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning"
                  }
                >
                  {item.kind === "scan" ? <ScanLine className="h-3.5 w-3.5" aria-hidden="true" /> : <Cpu className="h-3.5 w-3.5" aria-hidden="true" />}
                  {item.kind === "scan" ? "Quét thật · 360°" : "Minh họa"}
                </span>
                {item.sizeMb !== undefined && (
                  <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">~{item.sizeMb} MB</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                {item.lessonLabel && <span className="text-xs font-medium uppercase tracking-wide text-gold-deep">{item.lessonLabel}</span>}
                <span className="font-serif text-lg font-bold text-foreground group-hover:text-accent">{item.title}</span>
                <span className="line-clamp-3 text-sm text-muted-foreground">{item.note}</span>
                {item.credit && <span className="mt-auto pt-2 text-xs text-muted-foreground">Mô hình: {item.credit} (Sketchfab)</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
