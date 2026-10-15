import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { examPaths } from "@/lib/exams/exam";

export const metadata: Metadata = {
  title: "Kỹ năng làm bài thi Lịch sử",
  description: "Cách làm câu Đúng/Sai và câu có đoạn tư liệu trong đề thi tốt nghiệp THPT môn Lịch sử, kèm ví dụ có lời giải. Miễn phí.",
};

// Chuyên đề kỹ năng (docs/ke-hoach-luyen-thi.md, mục 4.8 — GĐ8): miễn phí, công khai.
export default function SkillsHubPage() {
  const card = "flex flex-col gap-1 rounded-card border border-border bg-surface p-5 hover:border-accent";
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: "Kỹ năng làm bài" }]} />
      <header className="mb-6 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Kỹ năng làm bài</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Hai dạng hay mất điểm nhất trong đề thi tốt nghiệp môn Lịch sử từ năm 2025. Miễn phí, không cần đăng nhập.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={examPaths.skillTrueFalse} className={card}>
          <span className="font-serif text-xl font-semibold text-foreground">Câu Đúng/Sai</span>
          <span className="text-sm text-muted-foreground">Cách tính điểm, 5 bẫy thường gặp, 5 ví dụ có lời giải từng ý.</span>
        </Link>
        <Link href={examPaths.skillSources} className={card}>
          <span className="font-serif text-xl font-semibold text-foreground">Đọc tư liệu</span>
          <span className="text-sm text-muted-foreground">5 bước đọc một đoạn tư liệu, phân biệt “trong” và “ngoài” tư liệu, 5 ví dụ.</span>
        </Link>
      </div>
    </div>
  );
}
