import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HandbookGate } from "@/components/exams/handbook/HandbookGate";
import { HandbookView } from "@/components/exams/handbook/HandbookView";
import { PrintButton } from "@/components/sgk/PrintButton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { hasAccountPack } from "@/lib/exams/attempts-server";
import { examPaths } from "@/lib/exams/exam";
import { FREE_HANDBOOK_LESSON } from "@/lib/exams/handbook";
import { loadHandbook } from "@/lib/queries/handbook";
import { getSgkLesson, sgkPaths } from "@/lib/sgk/curriculum";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/luyen-thi/so-tay/[bai]">): Promise<Metadata> {
  const { bai } = await params;
  const lesson = getSgkLesson(bai);
  if (!lesson) return {};
  return {
    title: `Sổ tay ôn thi Bài ${lesson.number}: ${lesson.shortTitle}`,
    description: `Mốc thời gian, sự kiện theo từng mục, nhân vật và câu hay bị nhầm của Bài ${lesson.number} — Lịch sử 12.`,
    robots: bai === FREE_HANDBOOK_LESSON ? undefined : { index: false, follow: true },
  };
}

// Sổ tay ôn thi một bài (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8). Bài xem thử: ai cũng xem. Bài khác: gói của tài
// khoản (kiểm phía server) hoặc mã trên máy (HandbookGate tải qua API).
export default async function HandbookLessonPage({ params }: PageProps<"/luyen-thi/so-tay/[bai]">) {
  const { bai } = await params;
  const lesson = getSgkLesson(bai);
  if (!lesson) notFound();
  const free = bai === FREE_HANDBOOK_LESSON;
  let open = free;
  if (!open) {
    const { data } = await (await createClient()).auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    open = userId ? await hasAccountPack(userId) : false;
  }
  const handbook = open ? await loadHandbook(bai) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 print:p-0">
      <div className="print:hidden">
        <Breadcrumb items={[{ label: "Luyện thi THPT", href: examPaths.hub }, { label: "Sổ tay ôn thi", href: examPaths.handbook }, { label: `Bài ${lesson.number}` }]} />
      </div>
      <header className="mb-6 mt-4 flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-deep">
          Sổ tay ôn thi{free && " · Xem thử miễn phí"}
        </p>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Bài {lesson.number}. {lesson.title}
        </h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground print:hidden">
          <Link href={sgkPaths.lesson(lesson.slug)} className="text-accent underline">
            Đọc bài đầy đủ
          </Link>
          <Link href={examPaths.practiceLesson(lesson.slug)} className="text-accent underline">
            Luyện câu hỏi bài này
          </Link>
          {handbook && <PrintButton label="In sổ tay" />}
        </p>
      </header>
      {handbook ? <HandbookView handbook={handbook} /> : <HandbookGate lessonSlug={lesson.slug} />}
    </div>
  );
}
