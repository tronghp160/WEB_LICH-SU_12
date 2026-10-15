import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperPrint } from "@/components/exams/paper/PaperPrint";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { examPaths } from "@/lib/exams/exam";
import { getPublishedExamSet } from "@/lib/queries/exams";

export async function generateMetadata({ params }: PageProps<"/luyen-thi/[slug]/in">): Promise<Metadata> {
  const set = await getPublishedExamSet((await params).slug);
  return set ? { title: `In đề: ${set.title}`, robots: { index: false, follow: false } } : {};
}

// Bản in đề + phiếu trả lời (docs/ke-hoach-luyen-thi.md, mục 4.9 — GĐ8). Câu hỏi tải phía trình duyệt (lượt `paper` gắn với
// máy / tài khoản, cần mã kích hoạt trong header với đề trong gói); trang chủ yếu dùng để in.
export default async function PrintExamPage({ params }: PageProps<"/luyen-thi/[slug]/in">) {
  const set = await getPublishedExamSet((await params).slug);
  if (!set) notFound();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 print:p-0">
      <div className="print:hidden">
        <Breadcrumb items={[{ label: "Luyện thi THPT", href: examPaths.hub }, { label: set.title, href: examPaths.set(set.slug) }, { label: "Bản in" }]} />
        <h1 className="mb-4 mt-4 font-serif text-3xl font-bold text-foreground">In đề làm trên giấy</h1>
      </div>
      <PaperPrint slug={set.slug} title={set.title} durationMin={set.duration_min} />
    </div>
  );
}
