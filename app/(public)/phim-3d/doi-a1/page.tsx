import type { Metadata } from "next";
import Link from "next/link";
import { CinemaPlayer } from "@/components/cinema3d/CinemaPlayer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { FILM_TITLE } from "@/lib/cinema/film-a1-text";

export const metadata: Metadata = {
  title: `Phim 3D: ${FILM_TITLE}`,
  description: "Trận đánh đồi A1 (Điện Biên Phủ, 6/5/1954) dựng lại bằng đồ họa 3D trên địa hình thật, có âm thanh, thuyết minh tiếng Việt và phụ đề.",
};

/** Trang riêng của phim 3D; `?debug=1` bật `window.__cinema` cho kiểm thử tự động. */
export default async function Cinema3dPage({ searchParams }: PageProps<"/phim-3d/doi-a1">) {
  const params = await searchParams;
  const debug = params.debug === "1";
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Bài học tương tác", href: "/bai-hoc/chien-dich-dien-bien-phu" }, { label: FILM_TITLE }]} />
      <h1 className="mt-4 font-serif text-3xl font-bold text-foreground sm:text-4xl">{FILM_TITLE}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">Xem trận đánh diễn ra như một thước phim 3D: từ đường hầm bộc phá dưới chân đồi đến lúc lá cờ tung bay trên đỉnh A1.</p>
      <div className="mt-6">
        <CinemaPlayer posterSrc="/lessons/dien-bien-phu/ho-boc-pha-a1.webp" posterAlt="Hố bộc phá trên đồi A1 ngày nay" debug={debug} />
      </div>
      <p className="mt-6">
        <Link href="/bai-hoc/chien-dich-dien-bien-phu" className="font-medium text-accent hover:underline">
          ← Quay lại bài học Chiến dịch Điện Biên Phủ
        </Link>
      </p>
    </div>
  );
}
