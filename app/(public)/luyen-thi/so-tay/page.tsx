import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Badge } from "@/components/ui/Badge";
import { examPaths } from "@/lib/exams/exam";
import { FREE_HANDBOOK_LESSON } from "@/lib/exams/handbook";
import { SGK_12 } from "@/lib/sgk/curriculum";

export const metadata: Metadata = {
  title: "Sổ tay ôn thi Lịch sử 12",
  description: "Sổ tay ôn thi từng bài Lịch sử 12: mốc thời gian, sự kiện theo mục, nhân vật, câu hay bị nhầm. In được. Xem thử miễn phí Bài 6.",
};

// Mục lục sổ tay ôn thi (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8). Trang công khai; nội dung từng bài thuộc gói trừ bài xem thử.
export default function HandbookIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Sổ tay ôn thi" }]} />
      <header className="mb-6 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Sổ tay ôn thi</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mỗi bài một trang gọn để ôn nhanh và in ra giấy: cần nắm được gì, mốc thời gian, sự kiện theo từng mục, nhân vật, câu hay bị nhầm. Dựng từ nội dung đã
          kiểm duyệt trên web. Thuộc Gói luyện thi — Bài 6 xem thử miễn phí.
        </p>
      </header>
      <div className="flex flex-col gap-6">
        {SGK_12.map((topic) => (
          <section key={topic.slug} aria-labelledby={`so-tay-${topic.slug}`} className="flex flex-col gap-2">
            <h2 id={`so-tay-${topic.slug}`} className="font-serif text-xl font-semibold text-foreground">
              Chủ đề {topic.number}: {topic.shortTitle}
            </h2>
            <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
              {topic.lessons.map((lesson) => (
                <li key={lesson.slug}>
                  <Link href={examPaths.handbookLesson(lesson.slug)} className="flex h-full items-start justify-between gap-2 rounded-card border border-border bg-surface p-3 hover:border-accent">
                    <span className="text-foreground">
                      <strong>Bài {lesson.number}.</strong> {lesson.shortTitle}
                    </span>
                    {lesson.slug === FREE_HANDBOOK_LESSON && <Badge variant="gold">Xem thử</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
