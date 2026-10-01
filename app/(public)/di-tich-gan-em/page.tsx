import type { Metadata } from "next";
import { NearbySites } from "@/components/nearby/NearbySites";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMapLocations } from "@/lib/queries/locations";

export const metadata: Metadata = {
  title: "Di tích gần em",
  description: "Tìm các di tích lịch sử lớp 12 quanh nơi em sống — kèm ảnh, sự kiện gắn với di tích và đường đi.",
};

export default async function NearbySitesPage() {
  const locations = await getMapLocations();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Bản đồ", href: "/ban-do" }, { label: "Di tích gần em" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">Di tích gần em</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Lịch sử không chỉ ở trong sách: có thể ngay gần nhà em đã từng diễn ra một sự kiện trong chương trình lớp 12.
        </p>
      </header>
      {locations.length === 0 ? (
        <EmptyState title="Chưa có di tích nào" description="Nội dung đang được biên soạn. Vui lòng quay lại sau." />
      ) : (
        <NearbySites locations={locations} />
      )}
    </div>
  );
}
