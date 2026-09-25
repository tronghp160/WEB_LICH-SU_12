import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapFilmPlayer } from "@/components/mapfilm/MapFilmPlayer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getMapFilm, mapFilms } from "@/lib/mapfilm";

// Kịch bản viết cứng trong code; slug lạ trả 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(mapFilms).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/ban-do-3d/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const film = getMapFilm(slug);
  if (!film) return { title: "Không tìm thấy nội dung" };
  return {
    title: film.title,
    description: `${film.scenario.title} (${film.scenario.dateText}) diễn ra trên bản đồ địa hình 3D theo từng giai đoạn, có thuyết minh tiếng Việt và phụ đề.`,
  };
}

/** Trang trình chiếu riêng của bản đồ 3D; `?debug=1` bật `window.__mapfilm` cho kiểm thử tự động. */
export default async function MapFilmPage({ params, searchParams }: PageProps<"/ban-do-3d/[slug]">) {
  const { slug } = await params;
  const film = getMapFilm(slug);
  if (!film) notFound();
  const debug = (await searchParams).debug === "1";
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: film.lesson.title, href: film.lesson.href }, { label: "Bản đồ 3D" }]} />
      <h1 className="mt-4 font-serif text-3xl font-bold text-foreground sm:text-4xl">{film.title}</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">
        {film.scenario.dateText}. Bấm từng giai đoạn để xem chiến dịch diễn ra ngay trên bản đồ; kéo chuột để xoay, cuộn để phóng to bất cứ lúc nào.
      </p>
      <div className="mt-6">
        <MapFilmPlayer slug={film.slug} debug={debug} />
      </div>
      <p className="mt-6">
        <Link href={film.lesson.href} className="font-medium text-accent hover:underline">
          ← Quay lại bài học {film.lesson.title}
        </Link>
      </p>
    </div>
  );
}
