import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamRoom } from "@/components/exams/runner/ExamRoom";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { examPaths } from "@/lib/exams/exam";
import { getPublishedExamSet } from "@/lib/queries/exams";

export async function generateMetadata({ params }: PageProps<"/luyen-thi/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const set = await getPublishedExamSet(slug);
  return set ? { title: `${set.title} — Luyện thi THPT`, description: set.description ?? undefined } : {};
}

export default async function ExamSetPage({ params }: PageProps<"/luyen-thi/[slug]">) {
  const { slug } = await params;
  const set = await getPublishedExamSet(slug);
  if (!set) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: set.title }]} />
      <header className="mb-6 mt-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">
          {set.product_id === null ? "Đề miễn phí" : "Gói luyện thi"}
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-foreground">{set.title}</h1>
        {set.description && <p className="mt-2 text-muted-foreground">{set.description}</p>}
      </header>
      <ExamRoom slug={set.slug} title={set.title} durationMin={set.duration_min} free={set.product_id === null} format={set.format} />
    </div>
  );
}
