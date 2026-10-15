import type { Metadata } from "next";
import Link from "next/link";
import { SkillExampleCard } from "@/components/exams/SkillExampleCard";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LinkButton } from "@/components/ui/Button";
import { examPaths } from "@/lib/exams/exam";
import { SOURCE_EXAMPLES, SOURCE_STEPS } from "@/lib/exams/skills";

export const metadata: Metadata = {
  title: "Cách đọc tư liệu trong đề thi Lịch sử",
  description: "5 bước đọc một đoạn tư liệu lịch sử, phân biệt thông tin trong tư liệu và suy luận ngoài tư liệu, kèm 5 ví dụ có lời giải.",
};

// Chuyên đề kỹ năng đọc tư liệu (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8). Miễn phí. Nội dung do web biên soạn.
export default function SourceSkillPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Luyện thi THPT", href: examPaths.hub }, { label: "Kỹ năng làm bài", href: "/luyen-thi/ky-nang" }, { label: "Đọc tư liệu" }]} />
      <header className="mb-8 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Cách đọc tư liệu</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Nhiều câu trong đề thi cho sẵn một đoạn tư liệu: trích văn kiện, lời kêu gọi, hiệp định… Đọc đúng cách thì đáp án thường nằm ngay trong đoạn văn.
        </p>
      </header>

      <section aria-labelledby="buoc" className="flex flex-col gap-3">
        <h2 id="buoc" className="font-serif text-2xl font-semibold text-foreground">
          5 bước đọc tư liệu
        </h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {SOURCE_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-card border border-border bg-surface p-4">
              <span className="font-serif text-2xl font-bold text-gold-deep" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <span className="font-semibold text-foreground">{step.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="vi-du" className="mt-8 flex flex-col gap-3">
        <h2 id="vi-du" className="font-serif text-2xl font-semibold text-foreground">
          Ví dụ có lời giải
        </h2>
        <p className="text-sm text-muted-foreground">
          Trích dẫn nguyên văn lấy từ văn kiện công khai; đoạn ghi “tóm lược” là lời của web. Ví dụ để luyện tập, không phải đề thi chính thức.
        </p>
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {SOURCE_EXAMPLES.map((example, index) => (
            <SkillExampleCard key={example.id} example={example} number={index + 1} />
          ))}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <LinkButton href={examPaths.practice}>Luyện câu có tư liệu</LinkButton>
        <Link href={examPaths.skillTrueFalse} className="text-accent underline">
          ← Kỹ năng câu Đúng/Sai
        </Link>
      </div>
    </div>
  );
}
