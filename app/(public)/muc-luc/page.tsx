import type { Metadata } from "next";
import { PrintButton } from "@/components/sgk/PrintButton";
import { SgkToc } from "@/components/sgk/SgkToc";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getCurriculum } from "@/lib/queries/sgk";
import { lessonStatuses, SGK_SERIES } from "@/lib/sgk/curriculum";

export const metadata: Metadata = {
  title: "Mục lục SGK Lịch sử 12",
  description: "Mục lục 6 chủ đề, 17 bài của SGK Lịch sử 12 (Kết nối tri thức): mở từng bài để học với sự kiện, bản đồ, ảnh tư liệu và trắc nghiệm.",
};

/** Mục lục SGK — "trang đầu cuốn sách" (mục 6.2). Trạng thái nội dung từng bài theo cách gán sự kiện hiện hành. */
export default async function TocPage() {
  const { topics } = await getCurriculum();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Mục lục" }]} />
      <header className="mb-8 mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">{SGK_SERIES}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-foreground sm:text-[2.5rem]">Mục lục</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            6 chủ đề, 17 bài theo đúng thứ tự sách giáo khoa. Chọn một bài để học; tiến độ được lưu trên trình duyệt này.
          </p>
        </div>
        <PrintButton label="In mục lục" />
      </header>
      <SgkToc statuses={lessonStatuses(topics)} />
    </div>
  );
}
