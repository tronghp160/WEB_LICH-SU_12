import type { Metadata } from "next";
import { pickCover } from "@/lib/media";
import { shareImage } from "@/lib/site";
import { notFound } from "next/navigation";
import { LocationDetailView } from "@/components/content/detail/LocationDetailView";
import { getLocationDetail } from "@/lib/queries/locations";
import { truncateForMeta } from "@/lib/utils/text";

type LocationPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const location = await getLocationDetail(slug);
  if (!location) return { title: "Không tìm thấy nội dung" };

  const description = truncateForMeta(
    location.description ?? `${location.name} — địa điểm trong chương trình Lịch sử Việt Nam lớp 12.`,
  );
  return {
    title: location.name,
    description,
    openGraph: {
      title: location.name,
      description,
      type: "website",
      images: [shareImage("dia-diem", location.slug, location.name, pickCover(location.media) !== null)],
    },
  };
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { slug } = await params;
  const location = await getLocationDetail(slug);
  if (!location) notFound();

  return <LocationDetailView location={location} />;
}
