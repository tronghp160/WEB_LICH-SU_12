import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamResult } from "@/components/exams/result/ExamResult";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { isAttemptId } from "@/lib/exams/attempt";
import { examPaths } from "@/lib/exams/exam";

// Kết quả một lượt luyện thi (docs/ke-hoach-luyen-thi.md, mục 4.2). Trang riêng tư: không lập chỉ mục, không chia sẻ công
// khai — dữ liệu chỉ tải được bằng mã thiết bị / phiên của người làm bài.
export const metadata: Metadata = { title: "Kết quả luyện thi", robots: { index: false, follow: false } };

export default async function ExamResultPage({ params, searchParams }: PageProps<"/luyen-thi/ket-qua/[id]">) {
  const { id } = await params;
  if (!isAttemptId(id)) notFound();
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Kết quả" }]} />
      <h1 className="mb-6 mt-4 font-serif text-3xl font-bold text-foreground">Kết quả luyện thi</h1>
      <ExamResult id={id} timedOut={query["het-gio"] === "1"} />
    </div>
  );
}
