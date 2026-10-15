import type { Metadata } from "next";
import { PracticeRoom } from "@/components/exams/practice/PracticeRoom";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { isAttemptId } from "@/lib/exams/attempt";
import { examPaths } from "@/lib/exams/exam";

export const metadata: Metadata = {
  title: "Luyện tập theo bài — Luyện thi THPT",
  description: "Luyện câu trắc nghiệm và Đúng/Sai môn Lịch sử theo bài SGK, dạng câu, mức độ; chấm và giải thích ngay từng câu.",
};

// Luyện tập (docs/ke-hoach-luyen-thi.md, mục 4.3 — GĐ4). ?on-tap=1: ôn câu đến hạn trong sổ câu sai; ?tu-luot=<id>:
// làm lại câu chưa đạt của một lượt.
export default async function PracticePage({ searchParams }: PageProps<"/luyen-thi/luyen-tap">) {
  const query = await searchParams;
  const retry = typeof query["tu-luot"] === "string" && isAttemptId(query["tu-luot"]) ? query["tu-luot"] : null;
  const mode = query["on-tap"] === "1" ? "review" : retry ? "retry" : "practice";
  const title = mode === "review" ? "Ôn câu đến hạn" : mode === "retry" ? "Làm lại câu sai" : "Luyện tập theo bài";
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Luyện thi THPT", href: examPaths.hub }, { label: title }]} />
      <header className="mb-6 mt-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {mode === "practice"
            ? "Chọn bài, dạng câu, mức độ rồi luyện từng câu: bấm “Kiểm tra” để xem ngay đúng sai và lời giải. Không bấm giờ."
            : "Bấm “Kiểm tra” sau mỗi câu. Câu đúng được giãn lịch ôn, câu sai quay lại ôn từ ngày mai."}
        </p>
      </header>
      <PracticeRoom initialMode={mode} retryFrom={retry} />
    </div>
  );
}
