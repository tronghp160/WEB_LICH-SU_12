import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaperAnswerEntry } from "@/components/exams/paper/PaperAnswerEntry";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { isAttemptId } from "@/lib/exams/attempt";
import { examPaths } from "@/lib/exams/exam";
import { getPublishedExamSet } from "@/lib/queries/exams";

export const metadata: Metadata = { title: "Nhập đáp án bài làm giấy", robots: { index: false, follow: false } };

// Nhập đáp án đã làm trên giấy rồi chấm (docs/ke-hoach-luyen-thi.md, mục 4.9 — GĐ8). ?luot=<id lượt in>.
export default async function PaperEntryPage({ params, searchParams }: PageProps<"/luyen-thi/[slug]/nhap-dap-an">) {
  const set = await getPublishedExamSet((await params).slug);
  if (!set) notFound();
  const luot = (await searchParams).luot;
  const attemptId = typeof luot === "string" && isAttemptId(luot) ? luot : null;
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Luyện thi THPT", href: examPaths.hub }, { label: set.title, href: examPaths.set(set.slug) }, { label: "Nhập đáp án" }]} />
      <h1 className="mb-4 mt-4 font-serif text-3xl font-bold text-foreground">Nhập đáp án bài làm giấy</h1>
      <PaperAnswerEntry slug={set.slug} attemptId={attemptId} />
    </div>
  );
}
