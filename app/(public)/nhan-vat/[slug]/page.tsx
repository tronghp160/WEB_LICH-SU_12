import type { Metadata } from "next";
import { pickCover } from "@/lib/media";
import { shareImage } from "@/lib/site";
import { notFound } from "next/navigation";
import { FigureDetailView } from "@/components/content/detail/FigureDetailView";
import { getFigureDetail } from "@/lib/queries/figures";
import { truncateForMeta } from "@/lib/utils/text";

type FigurePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: FigurePageProps): Promise<Metadata> {
  const { slug } = await params;
  const figure = await getFigureDetail(slug);
  if (!figure) return { title: "Không tìm thấy nội dung" };

  const description = truncateForMeta(
    figure.biography ?? `${figure.name} trong chương trình Lịch sử Việt Nam lớp 12.`,
  );
  return {
    title: figure.name,
    description,
    openGraph: {
      title: figure.name,
      description,
      type: "profile",
      images: [shareImage("nhan-vat", figure.slug, figure.name, pickCover(figure.media) !== null)],
    },
  };
}

export default async function FigurePage({ params }: FigurePageProps) {
  const { slug } = await params;
  const figure = await getFigureDetail(slug);
  if (!figure) notFound();

  return <FigureDetailView figure={figure} />;
}
